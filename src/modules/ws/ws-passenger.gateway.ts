import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RidesService } from '../rides/rides.service';
import { RidesRepository } from '../rides/rides.repository';
import { DriversRepository } from '../drivers/drivers.repository';
import { UsersRepository } from '../auth/users.repository';
import { DriverLocationStore } from '../../shared/location/driver-location.store';
import { SessionKickService } from '../../shared/session-kick/session-kick.service';

/**
 * Gateway único /ws que aceita:
 * - Motoristas: auth com JWT (role=driver)
 * - Passageiros: query param deviceId (anônimo)
 */
interface AppSocket extends Socket {
  user?: { sub: string; email: string; name: string; role: string; sv: number };
  passengerId?: string;
}

@Injectable()
@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
})
export class WsAppGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(WsAppGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly ridesService: RidesService,
    private readonly ridesRepository: RidesRepository,
    private readonly driversRepository: DriversRepository,
    private readonly usersRepository: UsersRepository,
    private readonly locationStore: DriverLocationStore,
    private readonly sessionKickService: SessionKickService,
  ) {}

  onModuleInit(): void {
    // Login novo em outro aparelho derruba o socket antigo na hora — sem
    // isso, a conta antiga continuava online/recebendo corridas até cair
    // sozinha (fechar o app, perder rede etc.).
    this.sessionKickService.onKick((userId) => {
      this.server.to(`user:${userId}`).emit('error', {
        code: 'SESSION_EXPIRED',
        message: 'Sua sessão expirou porque a conta foi acessada em outro aparelho.',
      });
      this.server.in(`user:${userId}`).disconnectSockets(true);
    });
  }

  async handleConnection(client: AppSocket): Promise<void> {
    // Tenta autenticar como motorista (JWT)
    const token = this.extractToken(client);
    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token);
        const user = await this.usersRepository.findById(payload.sub);
        if (!user || user.sessionVersion !== payload.sv) {
          // Conta foi acessada em outro aparelho depois desse token ser
          // emitido — mesma regra de sessão única aplicada no REST.
          client.emit('error', {
            code: 'SESSION_EXPIRED',
            message: 'Sua sessão expirou porque a conta foi acessada em outro aparelho.',
          });
          client.disconnect();
          return;
        }
        client.user = payload;
        client.join(`user:${payload.sub}`);

        // Sem isso, o motorista nunca reentra na sala `ride:${id}` quando o
        // socket reconecta (comum no mobile: app em background, troca de
        // rede) — ele fica online normalmente, mas para de receber chat da
        // corrida em andamento porque só o passageiro tem esse "rejoin"
        // automático (via passenger:get-active-ride a cada conexão).
        const driverRecord = await this.driversRepository.findByUserId(payload.sub);
        if (driverRecord) {
          const activeRide = await this.ridesRepository.findActiveByDriver(driverRecord.id);
          if (activeRide) {
            client.join(`ride:${activeRide.id}`);
            // Sem isso, reconectar (background, troca de rede, restart do
            // backend) sobrescrevia esse motorista como "available" no
            // próximo driver:go-online, mesmo já estando em corrida —
            // voltava a receber ride:new-request de outros passageiros.
            const entry = this.locationStore.get(payload.sub);
            if (entry) entry.status = 'busy';
          }
        }

        this.logger.log(`Motorista conectado: ${payload.email}`);
        return;
      } catch {
        client.emit('error', { code: 'INVALID_TOKEN', message: 'Token inválido.' });
        client.disconnect();
        return;
      }
    }

    // Tenta autenticar como passageiro (deviceId)
    const deviceId = client.handshake.query.deviceId as string | undefined;
    if (deviceId) {
      client.passengerId = deviceId;
      client.join(`passenger:${deviceId}`);
      this.logger.log(`Passageiro conectado: ${deviceId}`);
      return;
    }

    client.emit('error', {
      code: 'AUTH_REQUIRED',
      message: 'Envie JWT (motorista) ou deviceId (passageiro).',
    });
    client.disconnect();
  }

  handleDisconnect(client: AppSocket): void {
    if (client.user) {
      this.locationStore.delete(client.user.sub);
      this.logger.log(`Motorista desconectado: ${client.user.name}`);
    }
    if (client.passengerId) {
      this.logger.log(`Passageiro desconectado: ${client.passengerId}`);
    }
  }

  // ── Motorista ─────────────────────────────────────────────────────────

  @SubscribeMessage('driver:go-online')
  async handleDriverGoOnline(
    client: AppSocket,
    payload: { lat: number; lng: number },
  ) {
    const user = this.requireDriver(client);
    const driver = await this.driversRepository.findByUserId(user.sub);
    if (!driver || driver.status !== 'ativo') {
      throw new WsException('Motorista não encontrado ou não está ativo.');
    }
    const vehicle = `${driver.veiculoModelo} ${driver.veiculoPlaca}`;
    this.locationStore.set(user.sub, {
      driverId: user.sub,
      driverName: user.name,
      vehicle,
      lat: payload.lat,
      lng: payload.lng,
      status: 'available',
    });
    client.join('drivers');
    client.emit('driver:online-confirmed', { driverId: user.sub });
    this.logger.log(`Motorista online: ${user.name}`);
  }

  @SubscribeMessage('driver:location-update')
  async handleDriverLocationUpdate(
    client: AppSocket,
    payload: { lat: number; lng: number },
  ) {
    const user = this.requireDriver(client);
    const entry = this.locationStore.get(user.sub);
    if (!entry) throw new WsException('Motorista não está online.');
    entry.lat = payload.lat;
    entry.lng = payload.lng;
    this.locationStore.set(user.sub, entry);

    // Busca o registro do motorista na tabela `drivers` para obter o
    // `drivers.id` (que é o valor usado em `rides.driverId`), já que
    // `user.sub` é o `users.id` (JWT sub).
    const driverRecord = await this.driversRepository.findByUserId(user.sub);
    if (!driverRecord) return;

    // Busca a corrida ativa (aceita ou iniciada) para enviar a localização
    // ao passageiro no room `passenger:${deviceId}`.
    const activeRide = await this.ridesRepository.findActiveByDriver(driverRecord.id);
    if (activeRide?.passengerId) {
      this.server.to(`passenger:${activeRide.passengerId}`).emit('ride:driver-location', {
        driverId: user.sub,
        lat: payload.lat,
        lng: payload.lng,
      });
    }
  }

  @SubscribeMessage('driver:go-offline')
  async handleDriverGoOffline(client: AppSocket) {
    const user = this.requireDriver(client);
    this.locationStore.delete(user.sub);
    client.leave('drivers');
    client.emit('driver:offline-confirmed', { driverId: user.sub });
    this.logger.log(`Motorista offline: ${user.name}`);
  }

  @SubscribeMessage('driver:accept-ride')
  async handleDriverAcceptRide(
    client: AppSocket,
    payload: { rideId: string },
  ) {
    const user = this.requireDriver(client);
    try {
      const driver = await this.driversRepository.findByUserId(user.sub);
      if (!driver) throw new WsException('Motorista não encontrado.');

      // locationStore ('busy') é só cache em memória — se o processo reiniciar
      // ou o estado se perder, essa checagem contra o banco impede aceitar
      // duas corridas ao mesmo tempo.
      const activeRide = await this.ridesRepository.findActiveByDriver(driver.id);
      if (activeRide) throw new WsException('Você já tem uma corrida em andamento.');

      const ride = await this.ridesService.acceptRide(payload.rideId, driver.id);

      const entry = this.locationStore.get(user.sub);
      if (entry) entry.status = 'busy';

      client.join(`ride:${ride.id}`);

      // Join the passenger to the ride room too, so chat messages work
      // reliably without depending on user→driver ID mapping.
      try {
        const passengerSockets = await this.server.in(`passenger:${ride.passengerId}`).fetchSockets();
        for (const s of passengerSockets) {
          s.join(`ride:${ride.id}`);
        }
      } catch {
        this.logger.warn(`Falha ao conectar passageiro à sala ride:${ride.id}`);
      }

      this.server.to(`passenger:${ride.passengerId}`).emit('ride:accepted', {
        rideId: ride.id,
        driverId: user.sub,
        driverName: user.name,
        vehicle: entry?.vehicle ?? '',
        lat: entry?.lat ?? 0,
        lng: entry?.lng ?? 0,
      });

      this.logger.log(`Corrida ${ride.id} aceita por ${user.name}`);
    } catch (e: any) {
      throw new WsException(e?.message ?? 'Erro ao aceitar corrida.');
    }
  }

  @SubscribeMessage('driver:start-ride')
  async handleDriverStartRide(
    client: AppSocket,
    payload: { rideId: string },
  ) {
    const user = this.requireDriver(client);
    try {
      const ride = await this.ridesService.startRide(payload.rideId);
      this.server.to(`passenger:${ride.passengerId}`).emit('ride:started', {
        rideId: ride.id,
        status: 'iniciada',
      });
    } catch (e: any) {
      throw new WsException(e?.message ?? 'Erro ao iniciar corrida.');
    }
  }

  @SubscribeMessage('driver:complete-ride')
  async handleDriverCompleteRide(
    client: AppSocket,
    payload: { rideId: string; pago?: boolean },
  ) {
    const user = this.requireDriver(client);
    try {
      const ride = await this.ridesService.completeRide(payload.rideId);
      const entry = this.locationStore.get(user.sub);
      if (entry) entry.status = 'available';
      client.leave(`ride:${ride.id}`);

      // "Não pagou" — só registra o valor no saldo devedor do passageiro,
      // não bloqueia corrida nova (decisão de produto).
      if (payload.pago === false && ride.passengerId && ride.valor) {
        await this.usersRepository.incrementSaldoDevedor(ride.passengerId, ride.valor);
      }

      const payloadCompleted = {
        rideId: ride.id,
        status: 'finalizada',
        valor: ride.valor ?? 0,
        formaPagamento: ride.formaPagamento,
        pago: payload.pago !== false,
      };
      this.server.to(`passenger:${ride.passengerId}`).emit('ride:completed', payloadCompleted);
      // O motorista também precisa do valor/forma pra mostrar no próprio
      // resumo — antes só o passageiro recebia esse evento.
      client.emit('ride:completed', payloadCompleted);
    } catch (e: any) {
      throw new WsException(e?.message ?? 'Erro ao finalizar corrida.');
    }
  }

  // ── Passageiro ─────────────────────────────────────────────────────────

  /**
   * Restaura a corrida em andamento ao reabrir o app (o passageiro é
   * anônimo via deviceId, então isso é o único jeito de saber se ele já
   * tinha uma corrida ativa). Responde null se não houver nenhuma.
   */
  @SubscribeMessage('passenger:get-active-ride')
  async handleGetActiveRide(client: AppSocket) {
    const passengerId = client.passengerId;
    if (!passengerId) throw new WsException('Passageiro não identificado.');

    const ride = await this.ridesRepository.findActiveByPassenger(passengerId);
    if (!ride) {
      client.emit('passenger:active-ride', null);
      return;
    }

    let driverName = '';
    let vehicle = '';
    if (ride.driverId) {
      const driver = await this.driversRepository.findById(ride.driverId);
      if (driver) {
        driverName = driver.nome;
        vehicle = `${driver.veiculoModelo} ${driver.veiculoPlaca}`;
      }
      client.join(`ride:${ride.id}`);
    }

    client.emit('passenger:active-ride', {
      rideId: ride.id,
      status: ride.status === 'iniciada' ? 'started' : 'accepted',
      driverId: ride.driverId,
      driverName,
      vehicle,
      origem: ride.origem,
      destino: ride.destino,
      valor: ride.valor ? Number(ride.valor) : 0,
      distanciaKm: ride.distanciaKm ? Number(ride.distanciaKm) : null,
      formaPagamento: ride.formaPagamento,
    });
  }

  @SubscribeMessage('passenger:request-ride')
  async handlePassengerRequestRide(
    client: AppSocket,
    payload: {
      passengerName: string;
      origem: string;
      origemLat: number;
      origemLng: number;
      destino: string;
      destinoLat: number;
      destinoLng: number;
      distanciaKm?: number;
      valor?: number;
      formaPagamento?: 'dinheiro' | 'cartao' | 'pix';
    },
  ) {
    const passengerId = client.passengerId;
    if (!passengerId) throw new WsException('Passageiro não identificado.');

    const ride = await this.ridesService.createRideRequest({
      passengerId,
      passengerName: payload.passengerName,
      origem: payload.origem,
      origemLat: payload.origemLat,
      origemLng: payload.origemLng,
      destino: payload.destino,
      destinoLat: payload.destinoLat,
      destinoLng: payload.destinoLng,
      distanciaKm: payload.distanciaKm,
      valor: payload.valor,
      formaPagamento: payload.formaPagamento,
    });

    const nearby = this.locationStore.findNearby(payload.origemLat, payload.origemLng, 5);

    if (nearby.length === 0) {
      client.emit('ride:no-drivers-nearby', { rideId: ride.id });
      return;
    }

    for (const driver of nearby) {
      client.to(`user:${driver.driverId}`).emit('ride:new-request', {
        rideId: ride.id,
        passengerName: payload.passengerName,
        origem: payload.origem,
        origemLat: payload.origemLat,
        origemLng: payload.origemLng,
        destino: payload.destino,
        destinoLat: payload.destinoLat,
        destinoLng: payload.destinoLng,
        distanciaKm: payload.distanciaKm ?? 0,
        valor: payload.valor ?? 0,
        formaPagamento: payload.formaPagamento ?? 'dinheiro',
      });
    }

    client.emit('ride:searching-drivers', {
      rideId: ride.id,
      driversNotified: nearby.length,
    });

    setTimeout(async () => {
      try {
        const current = await this.ridesRepository.findById(ride.id);
        if (current && current.status === 'solicitada') {
          await this.ridesService.cancelRide(ride.id, 'sistema', 'Tempo limite excedido');
          client.emit('ride:timed-out', { rideId: ride.id });
        }
      } catch {}
    }, 30000);
  }

  @SubscribeMessage('ride:cancel')
  async handleCancel(client: AppSocket, payload: { rideId: string; motivo?: string }) {
    let canceladoPor: 'motorista' | 'passageiro' | 'sistema';
    if (client.user) canceladoPor = 'motorista';
    else if (client.passengerId) canceladoPor = 'passageiro';
    else throw new WsException('Não autorizado.');

    let ride;
    try {
      ride = await this.ridesService.cancelRide(payload.rideId, canceladoPor, payload.motivo);
    } catch (e: any) {
      throw new WsException(e?.message ?? 'Erro ao cancelar corrida.');
    }

    if (ride!.driverId) {
      const entry = this.locationStore.get(ride.driverId);
      if (entry) entry.status = 'available';
    }

    if (canceladoPor === 'passageiro' && ride.driverId) {
      const driverRecord = await this.driversRepository.findById(ride.driverId);
      const driverUserId = driverRecord?.userId;
      if (driverUserId) {
        client.to(`user:${driverUserId}`).emit('ride:cancelled', {
          rideId: ride.id,
          canceladoPor,
          motivo: payload.motivo,
        });
      }
    } else {
      client.to(`passenger:${ride.passengerId}`).emit('ride:cancelled', {
        rideId: ride.id,
        canceladoPor,
        motivo: payload.motivo,
      });
    }
  }

  // ── Chat (básico: sem persistência, só enquanto a corrida está ativa) ────

  @SubscribeMessage('chat:send-message')
  async handleChatMessage(client: AppSocket, payload: { rideId: string; texto: string }) {
    const ride = await this.ridesRepository.findById(payload.rideId);
    if (!ride) throw new WsException('Corrida não encontrada.');

    let remetente: 'motorista' | 'passageiro';
    let nomeRemetente: string;
    if (client.user) {
      remetente = 'motorista';
      nomeRemetente = client.user.name;
    } else if (client.passengerId) {
      remetente = 'passageiro';
      nomeRemetente = ride.passengerName;
    } else {
      throw new WsException('Não autorizado.');
    }

    const mensagem = {
      rideId: payload.rideId,
      texto: payload.texto,
      remetente,
      nomeRemetente,
      enviadaEm: new Date().toISOString(),
    };

    // Usa a sala ride:${rideId} como canal único — tanto motorista quanto
    // passageiro estão nela (motorista ao aceitar, passageiro na aceitação
    // ou ao restaurar corrida ativa). Elimina a dependência do mapeamento
    // driverId → userId que quebrava o chat passageiro→motorista.
    client.to(`ride:${payload.rideId}`).emit('chat:new-message', mensagem);

    // Eco pro próprio remetente — a UI não precisa duplicar a mensagem localmente.
    client.emit('chat:new-message', mensagem);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token as string | undefined;
    if (auth) return auth;
    const header = client.handshake.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return null;
  }

  private requireDriver(client: AppSocket) {
    if (!client.user || client.user.role !== 'driver') {
      throw new WsException('Apenas motoristas autenticados.');
    }
    return client.user;
  }
}
