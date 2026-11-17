import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard.js';

describe('AuthController', () => {
  let controller: AuthController;
  // Service falso: o controller é testado sem JWT nem banco.
  const authService = {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          {
            provide: AuthService,
            useValue: authService,
          },
        ],
      }).compile();
    controller = module.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('login deve repassar e-mail e senha ao service', async () => {
    authService.login.mockResolvedValue({
      access_token: 'token',
    });
    await expect(
      controller.login({
        email: 'a@a.com',
        senha: '123',
      }),
    ).resolves.toEqual({ access_token: 'token' });
    expect(authService.login).toHaveBeenCalledWith(
      'a@a.com',
      '123',
    );
  });

  it('refresh repassa o usuário validado ao service', async () => {
    authService.refresh.mockResolvedValue({
      access_token: 'novo',
    });
    const user = {
      userId: 'abc',
      email: 'a@a.com',
      roles: [],
    };
    await expect(
      controller.refresh(
        { user },
        { refresh_token: 'x' },
      ),
    ).resolves.toEqual({ access_token: 'novo' });
    expect(authService.refresh).toHaveBeenCalledWith(
      user,
    );
  });

  it('logout apaga as sessões do usuário logado', async () => {
    await controller.logout({
      user: { userId: 'abc' },
    });
    expect(authService.logout).toHaveBeenCalledWith(
      'abc',
    );
  });

  it('refresh usa o JwtRefreshAuthGuard e logout o JwtAuthGuard', () => {
    const guards = (nome: 'refresh' | 'logout') =>
      Reflect.getMetadata(
        '__guards__',
        AuthController.prototype[nome],
      );
    expect(guards('refresh')).toEqual([
      JwtRefreshAuthGuard,
    ]);
    expect(guards('logout')).toEqual([JwtAuthGuard]);
  });

  it('login continua aberto: sem guard', () => {
    expect(
      Reflect.getMetadata(
        '__guards__',
        AuthController.prototype.login,
      ),
    ).toBeUndefined();
  });
});
