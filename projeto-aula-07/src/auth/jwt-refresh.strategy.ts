import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { compareToken } from './token-hash.js';

// Aula 33: estratégia SÓ para o Refresh Token. O nome
// 'jwt-refresh' a separa da 'jwt' (Access Token).
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    configService: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    super({
      // O token vem no corpo: { "refresh_token": "..." }.
      jwtFromRequest: ExtractJwt.fromBodyField(
        'refresh_token',
      ),
      ignoreExpiration: false,
      // Chave PRÓPRIA: vazar uma não compromete a outra.
      secretOrKey:
        configService.get<string>(
          'JWT_REFRESH_SECRET',
        ) ?? '',
      // Entrega a requisição ao validate() (para ler o corpo).
      passReqToCallback: true,
    });
  }

  // Só roda se a assinatura e a validade estiverem OK.
  // Falta conferir se este token é o que está no banco.
  async validate(
    req: Request,
    payload: { sub: string },
  ) {
    const refreshToken: unknown =
      req.body?.refresh_token;
    const usuario =
      await this.usuariosService.buscarParaRefresh(
        payload.sub,
      );
    if (
      typeof refreshToken !== 'string' ||
      !usuario?.refreshTokenHash
    ) {
      throw new UnauthorizedException();
    }
    const confere = await compareToken(
      refreshToken,
      usuario.refreshTokenHash,
    );
    if (!confere) {
      throw new UnauthorizedException();
    }
    // Roles ATUAIS do banco: o novo Access Token já nasce
    // com elas (inclusive depois de uma promoção).
    return {
      userId: payload.sub,
      email: usuario.email,
      roles: [...(usuario.roles ?? [])],
    };
  }
}
