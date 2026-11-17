import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Aula 33: o porteiro do POST /auth/refresh.
// 'jwt-refresh' é o nome da JwtRefreshStrategy.
@Injectable()
export class JwtRefreshAuthGuard extends AuthGuard(
  'jwt-refresh',
) {}
