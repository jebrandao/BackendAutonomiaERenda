import {
  Controller,
  Get,
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import helmet from 'helmet';
import { vi } from 'vitest';
import { AuthController } from '../auth/auth.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { criarLoginRateLimit } from './rate-limit.js';

// Service falso: nenhum banco; só queremos ver SE ele é chamado.
const authService = {
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
};

// Uma rota qualquer, fora do /auth/login.
@Controller('ping')
class PingController {
  @Get()
  ping() {
    return { ok: true };
  }
}

// Contador novo a cada teste (o do AppModule vive na memória).
let limitador = criarLoginRateLimit();

// Mesmo desenho do AppModule: rate limit só em auth/login.
@Module({
  controllers: [AuthController, PingController],
  providers: [
    { provide: AuthService, useValue: authService },
  ],
})
class ModuloDeTeste implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(limitador).forRoutes('auth/login');
  }
}

describe('Segurança HTTP (Aula 34): helmet, ValidationPipe e rate limit', () => {
  let app: INestApplication;
  let base: string;

  beforeEach(async () => {
    limitador = criarLoginRateLimit();
    authService.login.mockReset();
    authService.login.mockResolvedValue({
      access_token: 'a',
      refresh_token: 'r',
    });
    const module = await Test.createTestingModule({
      imports: [ModuloDeTeste],
    }).compile();
    app = module.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(new ValidationPipe());
    await app.listen(0);
    base = await app.getUrl();
  });

  afterEach(async () => {
    await app.close();
  });

  const login = (corpo: unknown) =>
    fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
  const normal = () =>
    login({ email: 'a@a.com', senha: 'x' });

  it('login normal passa: 200', async () => {
    const res = await normal();
    expect(res.status).toBe(200);
    expect(authService.login).toHaveBeenCalledWith(
      'a@a.com',
      'x',
    );
  });

  it('ataque {"senha":{"$ne":null}}: 400 e o service NUNCA é chamado', async () => {
    const res = await login({
      email: 'a@a.com',
      senha: { $ne: null },
    });
    expect(res.status).toBe(400);
    expect((await res.json()).message).toEqual([
      'senha must be a string',
    ]);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('ataque no e-mail {"$gt":""}: 400 e o service NUNCA é chamado', async () => {
    const res = await login({
      email: { $gt: '' },
      senha: { $gt: '' },
    });
    expect(res.status).toBe(400);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('helmet: cabeçalhos de segurança presentes, sem X-Powered-By', async () => {
    const res = await normal();
    expect(res.headers.get('x-powered-by')).toBeNull();
    expect(res.headers.get('x-frame-options')).toBe(
      'SAMEORIGIN',
    );
    expect(
      res.headers.get('x-content-type-options'),
    ).toBe('nosniff');
    expect(
      res.headers.get('content-security-policy'),
    ).toContain("default-src 'self'");
  });

  it('as 10 primeiras tentativas passam e a 11ª recebe 429', async () => {
    const codigos: number[] = [];
    for (let i = 0; i < 12; i++) {
      codigos.push((await normal()).status);
    }
    expect(codigos.slice(0, 10)).toEqual(
      Array(10).fill(200),
    );
    expect(codigos.slice(10)).toEqual([429, 429]);
  });

  it('o 429 traz a mensagem em português e o cabeçalho RateLimit', async () => {
    for (let i = 0; i < 10; i++) await normal();
    const res = await normal();
    expect(res.status).toBe(429);
    expect((await res.json()).message).toContain(
      'Muitas tentativas de login',
    );
    expect(res.headers.get('ratelimit-limit')).toBe(
      '10',
    );
    expect(res.headers.get('ratelimit-remaining')).toBe(
      '0',
    );
    expect(
      res.headers.get('x-ratelimit-limit'),
    ).toBeNull();
  });

  it('tentativas inválidas (400) TAMBÉM contam no limite', async () => {
    for (let i = 0; i < 10; i++)
      await login({
        email: 'a@a.com',
        senha: { $ne: null },
      });
    expect((await normal()).status).toBe(429);
  });

  it('o limite vale só para /auth/login, não para outras rotas', async () => {
    for (let i = 0; i < 11; i++) await normal();
    const res = await fetch(`${base}/ping`);
    expect(res.status).toBe(200);
  });
});
