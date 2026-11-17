import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from './role.enum.js';

// O que o login (Aula 30) colocou dentro do token.
export interface JwtPayload {
  sub: string;
  email: string;
  // Aula 32: tokens antigos (da Aula 30) não trazem roles.
  roles?: Role[];
}

// Aula 31: ensina o Passport a ler e conferir o token JWT.
@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
) {
  constructor(configService: ConfigService) {
    super({
      // Lê "Authorization: Bearer <token>" do cabeçalho.
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Token vencido é recusado (401).
      ignoreExpiration: false,
      // A MESMA chave que assinou o token na Aula 30.
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? '',
    });
  }

  // Só roda se a assinatura e a validade estiverem OK.
  // O que for devolvido aqui vira req.user.
  validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
    };
  }
}
