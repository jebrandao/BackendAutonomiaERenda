import {
  Body,
  Controller,
  HttpCode,
  INestApplication,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard.js';
import { JwtRefreshStrategy } from './jwt-refresh.strategy.js';
import { hashToken } from './token-hash.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

const SEGREDO = 'segredo-de-acesso';
const SEGREDO_REFRESH = 'segredo-de-refresh';

// Controller de mentira, protegido pelo guard de verdade.
@Controller('sessao')
class SessaoController {
  @Post('renovar')
  @HttpCode(200)
  @UseGuards(JwtRefreshAuthGuard)
  renovar(
    @Req() req: { user: unknown },
    @Body() _corpo: unknown,
  ) {
    return { ola: req.user };
  }
}

describe('JwtRefreshAuthGuard (HTTP real)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let base: string;
  // "Banco" falso: guarda o hash do usuário "abc".
  const banco: { refreshTokenHash?: string } = {};

  const novoRefresh = (opcoes = {}) =>
    jwt.signAsync(
      { sub: 'abc' },
      {
        secret: SEGREDO_REFRESH,
        expiresIn: '7d',
        ...opcoes,
      },
    );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({ secret: SEGREDO }),
      ],
      controllers: [SessaoController],
      providers: [
        JwtRefreshStrategy,
        {
          provide: ConfigService,
          useValue: { get: () => SEGREDO_REFRESH },
        },
        {
          provide: UsuariosService,
          useValue: {
            buscarParaRefresh: async (id: string) =>
              id === 'abc'
                ? {
                    email: 'a@a.com',
                    roles: ['operador'],
                    refreshTokenHash:
                      banco.refreshTokenHash,
                  }
                : null,
          },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0);
    base = await app.getUrl();
    jwt = module.get(JwtService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    banco.refreshTokenHash = undefined;
  });

  const renovar = (corpo?: unknown) =>
    fetch(`${base}/sessao/renovar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:
        corpo === undefined
          ? undefined
          : JSON.stringify(corpo),
    });

  it('token válido e hash conferindo: 200 e req.user', async () => {
    const token = await novoRefresh();
    banco.refreshTokenHash = await hashToken(token);
    const res = await renovar({ refresh_token: token });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ola: {
        userId: 'abc',
        email: 'a@a.com',
        roles: ['operador'],
      },
    });
  });

  it('sem corpo: 401', async () => {
    expect((await renovar()).status).toBe(401);
  });

  it('corpo {} sem refresh_token: 401', async () => {
    expect((await renovar({})).status).toBe(401);
  });

  it('token com 1 letra alterada: 401', async () => {
    const token = await novoRefresh();
    banco.refreshTokenHash = await hashToken(token);
    const ruim =
      token.slice(0, -1) +
      (token.endsWith('A') ? 'B' : 'A');
    expect(
      (await renovar({ refresh_token: ruim })).status,
    ).toBe(401);
  });

  it('refresh_token vencido: 401', async () => {
    const vencido = await novoRefresh({
      expiresIn: -10,
    });
    banco.refreshTokenHash = await hashToken(vencido);
    expect(
      (await renovar({ refresh_token: vencido }))
        .status,
    ).toBe(401);
  });

  it('um ACCESS token não serve como refresh_token: 401', async () => {
    const access = await jwt.signAsync(
      { sub: 'abc' },
      { expiresIn: '15m' },
    );
    banco.refreshTokenHash = await hashToken(access);
    expect(
      (await renovar({ refresh_token: access })).status,
    ).toBe(401);
  });

  it('assinatura boa, mas hash diferente no banco: 401 (token antigo)', async () => {
    const antigo = await novoRefresh();
    const novo = await novoRefresh({ expiresIn: '6d' });
    banco.refreshTokenHash = await hashToken(novo);
    expect(
      (await renovar({ refresh_token: antigo })).status,
    ).toBe(401);
    expect(
      (await renovar({ refresh_token: novo })).status,
    ).toBe(200);
  });

  it('sem hash no banco (depois do logout): 401', async () => {
    const token = await novoRefresh();
    banco.refreshTokenHash = undefined;
    expect(
      (await renovar({ refresh_token: token })).status,
    ).toBe(401);
  });

  it('usuário que não existe mais: 401', async () => {
    const token = await jwt.signAsync(
      { sub: 'fantasma' },
      { secret: SEGREDO_REFRESH, expiresIn: '7d' },
    );
    expect(
      (await renovar({ refresh_token: token })).status,
    ).toBe(401);
  });
});
