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

        // Painel admin: sala separada pra broadcast de eventos de corrida
        // em tempo real (ver `admin:ride-event`), sem tocar nas salas de
        // motorista/passageiro.
        if (payload.role === 'admin') {
          client.join('admin');
          this.logger.log(`Admin conectado: ${payload.email}`);
          return;
        }

        // Passageiro logado (JWT) — usa o `users.id` real como identidade,
        // em vez do deviceId anônimo. Sem isso, `rides.passengerId` nunca
        // batia com `users.id`, e coisas como a foto de perfil do
        // passageiro nunca chegavam pro motorista mesmo pra quem tinha
        // conta com avatar cadastrado.
        if (payload.role === 'passenger') {
          client.passengerId = payload.sub;
          client.join(`passenger:${payload.sub}`);
          this.logger.log(`Passageiro conectado (logado): ${payload.email}`);
          return;
        }

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
            //
            // Se a entrada nem existir mais (socket caiu de vez em algum
            // momento — app em background, rede instável — e o GPS falhou
            // bem na hora da reconexão automática do client), reconstrói
            // ela aqui a partir da última localização salva no banco. Sem
            // isso o motorista "sumia" pro dispatcher pra sempre: mesmo o
            // botão mostrando Online, `driver:complete-ride` não achava
            // nada pra marcar como `available` de novo (`if (entry)` virava
            // no-op), e só um toggle manual (offline -> online) resolvia.
            const entry = this.locationStore.get(payload.sub);
            if (entry) {
              entry.status = 'busy';
            } else if (driverRecord.localizacaoLat && driverRecord.localizacaoLng) {
              this.locationStore.set(payload.sub, {
                driverId: payload.sub,
                driverName: driverRecord.nome,
                vehicle: `${driverRecord.veiculoModelo} ${driverRecord.veiculoPlaca}`,
                lat: Number(driverRecord.localizacaoLat),
                lng: Number(driverRecord.localizacaoLng),
                status: 'busy',
              });
            }
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

    // Persiste no banco pra `passenger:get-active-ride` conseguir restaurar
    // a última posição conhecida do motorista depois que o passageiro
    // recarrega o app — sem isso a rota some após reload (só existia em
    // memória no `locationStore`, que o restore não lê).
    await this.driversRepository.updateLocation(driverRecord.id, payload.lat, payload.lng);

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
        driverAvatarUrl: driver.avatarUrl,
        vehicle: entry?.vehicle ?? '',
        lat: entry?.lat ?? 0,
        lng: entry?.lng ?? 0,
      });
      this.server.to('admin').emit('admin:ride-event', { type: 'accepted', rideId: ride.id });

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
      this.server.to('admin').emit('admin:ride-event', { type: 'started', rideId: ride.id });
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
      this.server.to('admin').emit('admin:ride-event', { type: 'completed', rideId: ride.id });
    } catch (e: any) {
      throw new WsException(e?.message ?? 'Erro ao finalizar corrida.');
    }
  }

  /**
   * Restaura a corrida em andamento ao reabrir/recarregar o app do
   * motorista — sem isso a corrida sumia da tela no reload mesmo
   * continuando ativa no banco (só o passageiro tinha esse restore).
   */
  @SubscribeMessage('driver:get-active-ride')
  async handleDriverGetActiveRide(client: AppSocket) {
    const user = this.requireDriver(client);
    const driverRecord = await this.driversRepository.findByUserId(user.sub);
    if (!driverRecord) {
      client.emit('driver:active-ride', null);
      return;
    }

    const ride = await this.ridesRepository.findActiveByDriver(driverRecord.id);
    if (!ride) {
      client.emit('driver:active-ride', null);
      return;
    }

    const passengerAvatarUrl = ride.passengerId
      ? await this.ridesRepository.findPassengerAvatarUrl(ride.passengerId)
      : null;

    client.join(`ride:${ride.id}`);

    client.emit('driver:active-ride', {
      rideId: ride.id,
      status: ride.status === 'iniciada' ? 'started' : 'accepted',
      passengerName: ride.passengerName,
      passengerAvatarUrl,
      origem: ride.origem,
      origemLat: Number(ride.origemLat),
      origemLng: Number(ride.origemLng),
      destino: ride.destino,
      destinoLat: Number(ride.destinoLat),
      destinoLng: Number(ride.destinoLng),
      valor: ride.valor ? Number(ride.valor) : 0,
      formaPagamento: ride.formaPagamento ?? 'dinheiro',
    });
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
    let driverAvatarUrl: string | null = null;
    let vehicle = '';
    let driverLat: number | null = null;
    let driverLng: number | null = null;
    if (ride.driverId) {
      const driver = await this.driversRepository.findById(ride.driverId);
      if (driver) {
        driverName = driver.nome;
        driverAvatarUrl = driver.avatarUrl;
        vehicle = `${driver.veiculoModelo} ${driver.veiculoPlaca}`;
        driverLat = driver.localizacaoLat ? Number(driver.localizacaoLat) : null;
        driverLng = driver.localizacaoLng ? Number(driver.localizacaoLng) : null;
      }
      client.join(`ride:${ride.id}`);
    }

    client.emit('passenger:active-ride', {
      rideId: ride.id,
      status: ride.status === 'iniciada' ? 'started' : 'accepted',
      driverId: ride.driverId,
      driverName,
      driverAvatarUrl,
      vehicle,
      lat: driverLat,
      lng: driverLng,
      origem: ride.origem,
      origemLat: Number(ride.origemLat),
      origemLng: Number(ride.origemLng),
      destino: ride.destino,
      destinoLat: Number(ride.destinoLat),
      destinoLng: Number(ride.destinoLng),
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

    this.server.to('admin').emit('admin:ride-event', { type: 'new-request', rideId: ride.id });

    const nearby = this.locationStore.findNearby(payload.origemLat, payload.origemLng, 5);

    if (nearby.length === 0) {
      client.emit('ride:no-drivers-nearby', { rideId: ride.id });
      return;
    }

    const passengerAvatarUrl = await this.ridesRepository.findPassengerAvatarUrl(passengerId);

    for (const driver of nearby) {
      client.to(`user:${driver.driverId}`).emit('ride:new-request', {
        rideId: ride.id,
        passengerName: payload.passengerName,
        passengerAvatarUrl,
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
      // `ride.driverId` é o `drivers.id`, mas o locationStore é indexado
      // por `users.id` (JWT sub) — sem essa conversão o driver nunca era
      // liberado depois do cancelamento.
      const driverRecord = await this.driversRepository.findById(ride.driverId);
      if (driverRecord?.userId) {
        const entry = this.locationStore.get(driverRecord.userId);
        if (entry) entry.status = 'available';
      }
    }

    // Antes, quando o passageiro cancelava só notificava o motorista (sem
    // emitir pro próprio passageiro) — o app do passageiro ficava travado
    // num estado intermediário porque `handleCancelled` nunca disparava.
    client.emit('ride:cancelled', {
      rideId: ride.id,
      canceladoPor,
      motivo: payload.motivo,
    });
    this.server.to('admin').emit('admin:ride-event', { type: 'cancelled', rideId: ride.id });

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
    } else if (ride.passengerId) {
      // motorista ou sistema: notifica o passageiro
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

  // Método público para o RidesController emitir eventos de admin quando
  // o painel web completa/cancela via REST (sem depender de socket do admin).
  emitAdminEvent(type: string, rideId: string): void {
    this.server.to('admin').emit('admin:ride-event', { type, rideId });
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
