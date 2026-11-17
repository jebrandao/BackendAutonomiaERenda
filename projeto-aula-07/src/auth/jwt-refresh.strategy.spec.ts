import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { vi } from 'vitest';
import { JwtRefreshStrategy } from './jwt-refresh.strategy.js';
import { hashToken } from './token-hash.js';

describe('JwtRefreshStrategy', () => {
  const config = {
    get: () => 'segredo-refresh',
  } as unknown as ConfigService;
  // Service falso: o banco não é necessário.
  const usuariosService = {
    buscarParaRefresh: vi.fn(),
  };
  const strategy = new JwtRefreshStrategy(
    config,
    usuariosService as never,
  );
  const req = (corpo: unknown) =>
    ({ body: corpo }) as never;
  const TOKEN = 'um.refresh.token';

  beforeEach(() =>
    usuariosService.buscarParaRefresh.mockReset(),
  );

  it('valida quando o token confere com o hash do banco', async () => {
    usuariosService.buscarParaRefresh.mockResolvedValue(
      {
        email: 'a@a.com',
        roles: ['admin'],
        refreshTokenHash: await hashToken(TOKEN),
      },
    );
    await expect(
      strategy.validate(req({ refresh_token: TOKEN }), {
        sub: 'abc',
      }),
    ).resolves.toEqual({
      userId: 'abc',
      email: 'a@a.com',
      roles: ['admin'],
    });
  });

  it('recusa token diferente do guardado (401)', async () => {
    usuariosService.buscarParaRefresh.mockResolvedValue(
      {
        refreshTokenHash:
          await hashToken('outro.token'),
      },
    );
    await expect(
      strategy.validate(req({ refresh_token: TOKEN }), {
        sub: 'abc',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa quando o usuário não tem hash (depois do logout)', async () => {
    usuariosService.buscarParaRefresh.mockResolvedValue(
      {
        email: 'a@a.com',
      },
    );
    await expect(
      strategy.validate(req({ refresh_token: TOKEN }), {
        sub: 'abc',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa quando o usuário não existe mais', async () => {
    usuariosService.buscarParaRefresh.mockResolvedValue(
      null,
    );
    await expect(
      strategy.validate(req({ refresh_token: TOKEN }), {
        sub: 'abc',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa corpo sem refresh_token ou com tipo errado', async () => {
    usuariosService.buscarParaRefresh.mockResolvedValue(
      {
        refreshTokenHash: await hashToken(TOKEN),
      },
    );
    for (const corpo of [
      undefined,
      {},
      { refresh_token: 123 },
    ]) {
      await expect(
        strategy.validate(req(corpo), { sub: 'abc' }),
      ).rejects.toThrow(UnauthorizedException);
    }
  });

  it('usuário sem roles vira roles vazias', async () => {
    usuariosService.buscarParaRefresh.mockResolvedValue(
      {
        email: 'a@a.com',
        refreshTokenHash: await hashToken(TOKEN),
      },
    );
    const r = await strategy.validate(
      req({ refresh_token: TOKEN }),
      { sub: 'abc' },
    );
    expect(r.roles).toEqual([]);
  });
});
