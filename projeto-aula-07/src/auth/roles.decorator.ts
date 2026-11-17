import { SetMetadata } from '@nestjs/common';
import { Role } from './role.enum.js';

// Nome do "rótulo" que o RolesGuard procura em cada rota.
export const ROLES_KEY = 'roles';

// Aula 32: @Roles(Role.ADMIN) diz quem pode usar a rota.
export const Roles = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);
