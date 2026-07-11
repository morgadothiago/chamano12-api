import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Marca um endpoint como restrito a determinados papéis. Hoje só existe o
 * papel "admin" no sistema, então nenhum endpoint usa este decorator ainda
 * — mas o RolesGuard já está plugado globalmente para quando RBAC
 * multi-papel for confirmado com o cliente (ver Roadmap Fase 1 / vault).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
