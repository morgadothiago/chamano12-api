import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Status do motorista.
 * "rejeitado" é soft delete: preserva o registro para auditoria, nunca remove
 * do banco (decisão de produto confirmada — ver docs/business-rules.md).
 */
export const driverStatusEnum = pgEnum('driver_status', [
  'ativo',
  'inativo',
  'pendente',
  'rejeitado',
]);

export const documentTipoEnum = pgEnum('document_tipo', ['cnh', 'crlv', 'foto_veiculo']);

export const documentStatusEnum = pgEnum('document_status', ['aprovado', 'pendente', 'rejeitado']);

export const rideStatusEnum = pgEnum('ride_status', [
  'solicitada',
  'aceita',
  'iniciada',
  'finalizada',
  'cancelada',
]);

export const rideCanceladoPorEnum = pgEnum('ride_cancelado_por', ['motorista', 'passageiro', 'sistema']);

export const rideFormaPagamentoEnum = pgEnum('ride_forma_pagamento', ['dinheiro', 'cartao', 'pix']);
