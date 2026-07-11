import { PartialType } from '@nestjs/swagger';
import { CreateDriverDto } from './create-driver.dto';

/**
 * PATCH /drivers/:id — mesmo shape do create, todos os campos opcionais.
 *
 * DECISÃO (documentada no spec): este DTO deliberadamente NÃO tem os campos
 * status/metrics/documentos/corridas/localizacaoAtual. Combinado com o
 * ValidationPipe global `{ whitelist: true, forbidNonWhitelisted: true }`
 * (ver main.ts), qualquer tentativa de enviar esses campos no body é
 * REJEITADA com 400 (em vez de silenciosamente ignorada) — essa é a decisão
 * tomada entre as duas opções que o spec deixou em aberto.
 */
export class UpdateDriverDto extends PartialType(CreateDriverDto) {}
