import {
  Controller,
  Get,
  INestApplication,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { Public } from './public.decorator.js';

const SEGREDO = 'segredo-de-teste';

// Controller de mentira, protegido pelo guard de verdade.
@Controller('cofre')
@UseGuards(JwtAuthGuard)
class CofreController {
  @Get()
  abrir(@Req() req: { user: unknown }) {
    return { ola: req.user };
  }
}

// Extra: guard em TODA a classe; só /aberta é pública.
@Controller('vitrine')
@UseGuards(JwtAuthGuard)
class VitrineController {
  @Public()
  @Get('aberta')
  aberta() {
    return { ok: true };
  }

  @Get('fechada')
  fechada() {
    return { ok: true };
  }
}

describe('JwtAuthGuard (HTTP real)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let base: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: SEGREDO,
          signOptions: { expiresIn: '1d' },
        }),
      ],
      controllers: [CofreController, VitrineController],
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: () => SEGREDO },
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

  const chamar = (token?: string) =>
    fetch(`${base}/cofre`, {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : {},
    });

  it('sem token responde 401', async () => {
    expect((await chamar()).status).toBe(401);
  });

  it('com token válido responde 200 e preenche req.user', async () => {
    const token = await jwt.signAsync({
      sub: 'abc',
      email: 'a@a.com',
    });
    const res = await chamar(token);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ola: {
        userId: 'abc',
        email: 'a@a.com',
        roles: [],
      },
    });
  });

  it('token com 1 letra alterada responde 401', async () => {
    const token = await jwt.signAsync({ sub: 'abc' });
    const ruim =
      token.slice(0, -1) +
      (token.endsWith('A') ? 'B' : 'A');
    expect((await chamar(ruim)).status).toBe(401);
  });

  it('token vencido responde 401', async () => {
    const vencido = await jwt.signAsync(
      { sub: 'abc' },
      { expiresIn: -10 },
    );
    expect((await chamar(vencido)).status).toBe(401);
  });

  it('token assinado com outra chave responde 401', async () => {
    const falso = await jwt.signAsync(
      { sub: 'abc' },
      { secret: 'outra-chave' },
    );
    expect((await chamar(falso)).status).toBe(401);
  });

  it('esquema diferente de Bearer responde 401', async () => {
    const token = await jwt.signAsync({ sub: 'abc' });
    const res = await fetch(`${base}/cofre`, {
      headers: { Authorization: `Basic ${token}` },
    });
    expect(res.status).toBe(401);
  });

  it('@Public() libera a rota sem token (extra)', async () => {
    const res = await fetch(`${base}/vitrine/aberta`);
    expect(res.status).toBe(200);
  });

  it('rota sem @Public() continua exigindo token', async () => {
    const res = await fetch(`${base}/vitrine/fechada`);
    expect(res.status).toBe(401);
  });
});
