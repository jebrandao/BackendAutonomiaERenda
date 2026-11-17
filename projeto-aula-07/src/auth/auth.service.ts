import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { Role } from './role.enum.js';
import { hashToken } from './token-hash.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Aula 30: "Fábrica de Tokens". Aula 33: agora são DOIS tokens.
  async login(
    email: string,
    senha: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const usuario =
      await this.usuariosService.validarCredenciais(
        email,
        senha,
      );
    // Mensagem única: não revela se errou o e-mail ou a senha.
    if (!usuario) {
      throw new UnauthorizedException(
        'E-mail ou senha inválidos',
      );
    }

    const userId = String(usuario._id);
    return {
      access_token: await this.gerarAccessToken(
        userId,
        usuario.email,
        usuario.roles,
      ),
      refresh_token:
        await this.gerarRefreshToken(userId),
    };
  }

  // Aula 33: POST /auth/refresh. A JwtRefreshStrategy já
  // validou o token E o hash; aqui só emitimos o novo Access
  // Token, sem pedir a senha de novo.
  async refresh(usuario: {
    userId: string;
    email: string;
    roles: Role[];
  }): Promise<{ access_token: string }> {
    return {
      access_token: await this.gerarAccessToken(
        usuario.userId,
        usuario.email,
        usuario.roles,
      ),
    };
  }

  // Aula 33: logout global. Apaga o hash do banco: nenhum
  // Refresh Token do usuário funciona mais.
  async logout(userId: string): Promise<void> {
    await this.usuariosService.limparRefreshTokenHash(
      userId,
    );
  }

  // Access Token: vida CURTA (15 min por padrão).
  // Payload: sub = id; email; roles (lidas pelo RolesGuard).
  // NUNCA coloque a senha aqui: o payload é só Base64.
  private gerarAccessToken(
    userId: string,
    email: string,
    roles: Role[] | undefined,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      roles: [...(roles ?? [])],
    });
  }

  // Refresh Token: vida LONGA (7 dias), chave própria. Só o
  // HASH dele vai para o banco; o token puro vai ao cliente.
  private async gerarRefreshToken(
    userId: string,
  ): Promise<string> {
    const refreshToken =
      await this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.get<string>(
            'JWT_REFRESH_SECRET',
          ),
          expiresIn: '7d',
        },
      );
    await this.usuariosService.salvarRefreshTokenHash(
      userId,
      await hashToken(refreshToken),
    );
    return refreshToken;
  }
}
