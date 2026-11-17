import {
  Controller,
  Delete,
  ExecutionContext,
  Get,
  INestApplication,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtStrategy } from './jwt.strategy.js';
import { Role } from './role.enum.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './roles.guard.js';

const SEGREDO = 'segredo-de-teste';

// Controller de mentira, igual ao ProdutosController:
// JwtAuthGuard na classe, RolesGuard só no DELETE.
@Controller('fabrica')
@UseGuards(JwtAuthGuard)
class FabricaController {
  @Get()
  listar() {
    return { ok: true };
  }

  @Delete()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  apagar() {
    return { apagado: true };
  }
}

// Controller SEM JwtAuthGuard: o RolesGuard fica sem usuário.
@Controller('sem-jwt')
class SemJwtController {
  @Delete()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  apagar() {
    return { apagado: true };
  }
}

describe('RolesGuard (unitário)', () => {
  const guard = new RolesGuard(new Reflector());

  // Contexto falso: uma rota com (ou sem) @Roles e um usuário.
  const contexto = (
    roles: Role[] | undefined,
    user: unknown,
  ) => {
    class Rota {
      handler() {}
    }
    if (roles) Roles(...roles)(Rota.prototype.handler);
    return {
      getHandler: () => Rota.prototype.handler,
      getClass: () => Rota,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('rota sem @Roles() libera qualquer usuário', () => {
    expect(
      guard.canActivate(contexto(undefined, {})),
    ).toBe(true);
  });

  it('libera quando o usuário tem a role exigida', () => {
    expect(
      guard.canActivate(
        contexto([Role.ADMIN], { roles: ['admin'] }),
      ),
    ).toBe(true);
  });

  it('libera se tiver ao menos UMA das roles exigidas', () => {
    expect(
      guard.canActivate(
        contexto([Role.ADMIN, Role.OPERADOR], {
          roles: ['operador'],
        }),
      ),
    ).toBe(true);
  });

  it('bloqueia quem não tem a role exigida', () => {
    expect(
      guard.canActivate(
        contexto([Role.ADMIN], { roles: ['operador'] }),
      ),
    ).toBe(false);
  });

  it('bloqueia usuário sem roles', () => {
    expect(
      guard.canActivate(contexto([Role.ADMIN], {})),
    ).toBe(false);
  });

  it('bloqueia (e não quebra) quando não há usuário', () => {
    expect(
      guard.canActivate(
        contexto([Role.ADMIN], undefined),
      ),
    ).toBe(false);
  });
});

describe('RolesGuard (HTTP real)', () => {
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
      controllers: [
        FabricaController,
        SemJwtController,
      ],
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

  const chamar = async (
    metodo: string,
    rota: string,
    roles?: string[] | null,
  ) => {
    const headers: Record<string, string> = {};
    if (roles !== null) {
      const payload =
        roles === undefined
          ? { sub: 'abc', email: 'a@a.com' }
          : { sub: 'abc', email: 'a@a.com', roles };
      const token = await jwt.signAsync(payload);
      headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${base}${rota}`, {
      method: metodo,
      headers,
    });
  };

  it('sem token: 401 (quem é você?)', async () => {
    expect(
      (await chamar('DELETE', '/fabrica', null)).status,
    ).toBe(401);
  });

  it('operador no DELETE: 403 (sei quem é, mas não pode)', async () => {
    const res = await chamar('DELETE', '/fabrica', [
      'operador',
    ]);
    expect(res.status).toBe(403);
    expect((await res.json()).message).toBe(
      'Forbidden resource',
    );
  });

  it('admin no DELETE: 200', async () => {
    expect(
      (await chamar('DELETE', '/fabrica', ['admin']))
        .status,
    ).toBe(200);
  });

  it('operador no GET continua liberado: 200', async () => {
    expect(
      (await chamar('GET', '/fabrica', ['operador']))
        .status,
    ).toBe(200);
  });

  it('token antigo, sem roles, no DELETE: 403', async () => {
    expect(
      (await chamar('DELETE', '/fabrica', undefined))
        .status,
    ).toBe(403);
  });

  it('role inventada no token não abre a rota: 403', async () => {
    expect(
      (await chamar('DELETE', '/fabrica', ['root']))
        .status,
    ).toBe(403);
  });

  it('RolesGuard sem JwtAuthGuard dá 403, não 500', async () => {
    expect(
      (await chamar('DELETE', '/sem-jwt', null)).status,
    ).toBe(403);
  });
});
