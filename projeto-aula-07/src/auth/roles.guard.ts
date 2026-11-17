import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from './role.enum.js';
import { ROLES_KEY } from './roles.decorator.js';

// Aula 32: o "porteiro do andar". Roda DEPOIS do
// JwtAuthGuard, que já colocou o usuário em request.user.
// Perfil insuficiente: devolve false e o Nest responde 403.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<
        Role[] | undefined
      >(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    // Rota sem @Roles(): qualquer usuário autenticado.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { roles?: Role[] } }>();
    // "user?." evita erro 500 se o JwtAuthGuard faltar.
    return requiredRoles.some((role) =>
      user?.roles?.includes(role),
    );
  }
}
