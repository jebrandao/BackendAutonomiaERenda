import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { compareToken } from './token-hash.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;
  // Service falso: o login é testado sem o banco.
  const usuariosService = {
    validarCredenciais: vi.fn(),
    salvarRefreshTokenHash: vi.fn(),
    limparRefreshTokenHash: vi.fn(),
  };
  const SEGREDO = 'segredo-de-teste';
  const SEGREDO_REFRESH = 'segredo-refresh-de-teste';
  const usuario = {
    _id: '64f3a1b2c9e0d1f2a3b4c5d6',
    email: 'elisa@empresa.com',
    roles: ['operador'],
  };

  beforeEach(async () => {
    for (const m of Object.values(usuariosService))
      m.mockReset();
    const module: TestingModule =
      await Test.createTestingModule({
        // JwtService REAL: o token é assinado de verdade.
        imports: [
          JwtModule.register({
            secret: SEGREDO,
            signOptions: { expiresIn: '15m' },
          }),
        ],
        providers: [
          AuthService,
          {
            provide: UsuariosService,
            useValue: usuariosService,
          },
          {
            provide: ConfigService,
            useValue: {
              get: (chave: string) =>
                chave === 'JWT_REFRESH_SECRET'
                  ? SEGREDO_REFRESH
                  : undefined,
            },
          },
        ],
      }).compile();
    service = module.get(AuthService);
    jwt = module.get(JwtService);
  });

  it('login deve devolver access_token e refresh_token', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      usuario,
    );
    const tokens = await service.login('a', 'b');
    expect(Object.keys(tokens)).toEqual([
      'access_token',
      'refresh_token',
    ]);
  });

  it('o access_token leva sub, email e roles', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      {
        ...usuario,
        roles: ['admin'],
      },
    );
    const { access_token } = await service.login(
      'a',
      'b',
    );
    const payload = await jwt.verifyAsync(access_token);
    expect(payload.sub).toBe(usuario._id);
    expect(payload.email).toBe(usuario.email);
    expect(payload.roles).toEqual(['admin']);
  });

  it('o access_token vale 15 min (exp - iat = 900)', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      usuario,
    );
    const { access_token } = await service.login(
      'a',
      'b',
    );
    const payload = await jwt.verifyAsync(access_token);
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('o payload nunca contém a senha', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      {
        ...usuario,
        senha: '$2b$10$hash',
      },
    );
    const { access_token, refresh_token } =
      await service.login('a', 'b');
    for (const t of [access_token, refresh_token]) {
      const [, p] = t.split('.');
      const texto = Buffer.from(
        p,
        'base64url',
      ).toString();
      expect(texto).not.toContain('senha');
      expect(texto).not.toContain('$2b$');
    }
  });

  it('usuário sem roles gera access_token com roles vazias', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      {
        _id: 'abc',
        email: 'a@a.com',
      },
    );
    const { access_token } = await service.login(
      'a',
      'b',
    );
    const payload = await jwt.verifyAsync(access_token);
    expect(payload.roles).toEqual([]);
  });

  it('o refresh_token vale 7 dias e só leva o sub', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      usuario,
    );
    const { refresh_token } = await service.login(
      'a',
      'b',
    );
    const payload = await jwt.verifyAsync(
      refresh_token,
      {
        secret: SEGREDO_REFRESH,
      },
    );
    expect(payload.exp - payload.iat).toBe(604800);
    expect(Object.keys(payload).sort()).toEqual([
      'exp',
      'iat',
      'sub',
    ]);
  });

  it('o refresh_token usa uma chave DIFERENTE da do access_token', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      usuario,
    );
    const { access_token, refresh_token } =
      await service.login('a', 'b');
    await expect(
      jwt.verifyAsync(refresh_token),
    ).rejects.toThrow('invalid signature');
    await expect(
      jwt.verifyAsync(access_token, {
        secret: SEGREDO_REFRESH,
      }),
    ).rejects.toThrow('invalid signature');
  });

  it('grava só o HASH do refresh_token, nunca o token', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      usuario,
    );
    const { refresh_token } = await service.login(
      'a',
      'b',
    );
    expect(
      usuariosService.salvarRefreshTokenHash,
    ).toHaveBeenCalledTimes(1);
    const [id, hash] =
      usuariosService.salvarRefreshTokenHash.mock
        .calls[0];
    expect(id).toBe(usuario._id);
    expect(hash).not.toBe(refresh_token);
    expect(hash.startsWith('$2')).toBe(true);
    await expect(
      compareToken(refresh_token, hash),
    ).resolves.toBe(true);
  });

  it('login deve lançar 401 se as credenciais não conferem', async () => {
    usuariosService.validarCredenciais.mockResolvedValue(
      null,
    );
    await expect(
      service.login('x@x.com', 'errada'),
    ).rejects.toThrow(
      new UnauthorizedException(
        'E-mail ou senha inválidos',
      ),
    );
    expect(
      usuariosService.salvarRefreshTokenHash,
    ).not.toHaveBeenCalled();
  });

  it('refresh emite só um access_token novo, sem tocar no banco', async () => {
    const resultado = await service.refresh({
      userId: 'abc',
      email: 'a@a.com',
      roles: ['admin'] as never,
    });
    expect(Object.keys(resultado)).toEqual([
      'access_token',
    ]);
    const payload = await jwt.verifyAsync(
      resultado.access_token,
    );
    expect(payload.sub).toBe('abc');
    expect(payload.roles).toEqual(['admin']);
    expect(
      usuariosService.salvarRefreshTokenHash,
    ).not.toHaveBeenCalled();
  });

  it('logout apaga o hash do usuário', async () => {
    await service.logout('abc');
    expect(
      usuariosService.limparRefreshTokenHash,
    ).toHaveBeenCalledWith('abc');
  });
});
