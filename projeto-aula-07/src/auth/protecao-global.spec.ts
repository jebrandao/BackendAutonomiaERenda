import {
  INestApplication,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AdminController } from '../admin/admin.controller.js';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';
import { criarLoginRateLimit } from '../common/rate-limit.js';
import { SegurancaController } from '../seguranca/seguranca.controller.js';
import { UsuariosController } from '../usuarios/usuarios.controller.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { Role } from './role.enum.js';
import { RolesGuard } from './roles.guard.js';

const SEGREDO = 'segredo-de-teste';
const ID_ANA = '64f3a1b2c9e0d1f2a3b4c5d6';
const ID_BIA = '64f3a1b2c9e0d1f2a3b4c5d7';

const usuariosService = {
  create: vi.fn().mockResolvedValue({ _id: 'novo' }),
  findAll: vi.fn().mockResolvedValue([]),
  findOne: vi.fn().mockResolvedValue({ nome: 'Ana' }),
  update: vi.fn().mockResolvedValue({ nome: 'Novo' }),
  validar: vi
    .fn()
    .mockResolvedValue('Acesso Permitido'),
  remover: vi.fn().mockResolvedValue(undefined),
};

let limitadorValidar = criarLoginRateLimit();

// Mesmo desenho do AppModule da Aula 40: dois guards GLOBAIS
// (JWT primeiro, perfil depois) e rate limit no validar.
@Module({
  imports: [
    PassportModule,
    JwtModule.register({ secret: SEGREDO }),
  ],
  controllers: [
    AdminController,
    SegurancaController,
    UsuariosController,
    AppController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    JwtStrategy,
    AppService,
    {
      provide: UsuariosService,
      useValue: usuariosService,
    },
    {
      provide: ConfigService,
      useValue: { get: () => SEGREDO },
    },
  ],
})
class ModuloDeTeste implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(limitadorValidar)
      .forRoutes('usuarios/validar');
  }
}

describe('Proteção global das rotas (Aula 40)', () => {
  let app: INestApplication;
  let base: string;
  let token: (id: string, roles: Role[]) => string;

  beforeEach(async () => {
    limitadorValidar = criarLoginRateLimit();
    Object.values(usuariosService).forEach((f) =>
      f.mockClear(),
    );
    const module = await Test.createTestingModule({
      imports: [ModuloDeTeste],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0);
    base = await app.getUrl();
    const jwt = module.get(JwtService);
    token = (id, roles) =>
      jwt.sign({ sub: id, email: 'x@x.com', roles });
  });

  afterEach(async () => {
    await app.close();
  });

  const chamar = (
    metodo: string,
    caminho: string,
    opcoes: {
      token?: string;
      cabecalhos?: Record<string, string>;
      corpo?: unknown;
    } = {},
  ) =>
    fetch(`${base}${caminho}`, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(opcoes.token
          ? { Authorization: `Bearer ${opcoes.token}` }
          : {}),
        ...opcoes.cabecalhos,
      },
      body:
        opcoes.corpo === undefined
          ? undefined
          : JSON.stringify(opcoes.corpo),
    });

  describe('sem token', () => {
    it.each([
      ['GET', '/admin'],
      ['GET', '/secreto'],
      ['GET', '/usuarios'],
      ['GET', `/usuarios/${ID_ANA}`],
      ['PATCH', `/usuarios/${ID_ANA}`],
      ['DELETE', `/usuarios/${ID_ANA}`],
    ])('%s %s devolve 401', async (metodo, caminho) => {
      const res = await chamar(metodo, caminho, {
        corpo: metodo === 'PATCH' ? {} : undefined,
      });
      expect(res.status).toBe(401);
    });

    it('cabeçalhos forjados NÃO abrem /admin nem /secreto', async () => {
      const admin = await chamar('GET', '/admin', {
        cabecalhos: { 'x-user-role': 'supervisor' },
      });
      const secreto = await chamar('GET', '/secreto', {
        cabecalhos: { 'x-api-key': 'SENAI-2026' },
      });
      expect(admin.status).toBe(401);
      expect(secreto.status).toBe(401);
    });

    it('nenhum service é chamado quando o guard barra', async () => {
      await chamar('GET', '/usuarios');
      expect(
        usuariosService.findAll,
      ).not.toHaveBeenCalled();
    });
  });

  describe('rotas públicas', () => {
    it('GET /api responde sem token', async () => {
      expect((await chamar('GET', '/api')).status).toBe(
        200,
      );
    });

    it('POST /usuarios (cadastro) responde sem token', async () => {
      const res = await chamar('POST', '/usuarios', {
        corpo: {
          nome: 'Ana',
          email: 'a@a.com',
          senha: 'x',
        },
      });
      expect(res.status).toBe(201);
    });

    it('POST /usuarios/validar é público, mas tem rate limit', async () => {
      const corpo = { email: 'a@a.com', senha: 'x' };
      for (let i = 0; i < 10; i++) {
        const ok = await chamar(
          'POST',
          '/usuarios/validar',
          {
            corpo,
          },
        );
        expect(ok.status).toBe(200);
      }
      const barrada = await chamar(
        'POST',
        '/usuarios/validar',
        { corpo },
      );
      expect(barrada.status).toBe(429);
    });
  });

  describe('perfil operador', () => {
    const operador = () =>
      token(ID_ANA, [Role.OPERADOR]);

    it('não entra em /admin, /secreto nem na lista (403)', async () => {
      for (const caminho of [
        '/admin',
        '/secreto',
        '/usuarios',
      ]) {
        const res = await chamar('GET', caminho, {
          token: operador(),
        });
        expect(res.status).toBe(403);
      }
    });

    it('vê e altera o PRÓPRIO perfil', async () => {
      const ver = await chamar(
        'GET',
        `/usuarios/${ID_ANA}`,
        {
          token: operador(),
        },
      );
      const alterar = await chamar(
        'PATCH',
        `/usuarios/${ID_ANA}`,
        { token: operador(), corpo: { nome: 'Novo' } },
      );
      expect(ver.status).toBe(200);
      expect(alterar.status).toBe(200);
    });

    it('NÃO vê nem altera o perfil de outra pessoa (403)', async () => {
      const ver = await chamar(
        'GET',
        `/usuarios/${ID_BIA}`,
        {
          token: operador(),
        },
      );
      const alterar = await chamar(
        'PATCH',
        `/usuarios/${ID_BIA}`,
        { token: operador(), corpo: { nome: 'Hack' } },
      );
      expect(ver.status).toBe(403);
      expect(alterar.status).toBe(403);
      expect(
        usuariosService.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('perfil admin', () => {
    const admin = () => token(ID_BIA, [Role.ADMIN]);

    it.each(['/admin', '/secreto', '/usuarios'])(
      'GET %s devolve 200',
      async (caminho) => {
        const res = await chamar('GET', caminho, {
          token: admin(),
        });
        expect(res.status).toBe(200);
      },
    );

    it('vê o perfil de qualquer pessoa', async () => {
      const res = await chamar(
        'GET',
        `/usuarios/${ID_ANA}`,
        {
          token: admin(),
        },
      );
      expect(res.status).toBe(200);
    });
  });
});
