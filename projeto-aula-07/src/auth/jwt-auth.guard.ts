import {
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator.js';

// Aula 31: o "porteiro". 'jwt' é o nome da JwtStrategy.
// Sem token, com token vencido ou adulterado: 401.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Extra: rota com @Public() passa sem token.
    // O método vale mais que a classe (getAllAndOverride).
    const publica =
      this.reflector.getAllAndOverride<boolean>(
        IS_PUBLIC_KEY,
        [context.getHandler(), context.getClass()],
      );
    if (publica) {
      return true;
    }
    return super.canActivate(context);
  }
}
