import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from '../auth/public.decorator.js';
import { Role } from '../auth/role.enum.js';
import { ROLES_KEY } from '../auth/roles.decorator.js';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  // Service falso: o controller é testado sem o Mongoose.
  const usuariosService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    validar: vi.fn(),
    remover: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [UsuariosController],
        providers: [
          {
            provide: UsuariosService,
            useValue: usuariosService,
          },
        ],
      }).compile();
    controller = module.get<UsuariosController>(
      UsuariosController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('criar deve repassar os dados ao service', async () => {
    const dto = {
      nome: 'Bruno',
      email: 'b@empresa.com',
      senha: '123',
    };
    usuariosService.create.mockResolvedValue({
      _id: 'abc',
    });
    await expect(
      controller.criar(dto),
    ).resolves.toEqual({
      _id: 'abc',
    });
    expect(usuariosService.create).toHaveBeenCalledWith(
      dto,
    );
  });

  it('listar, buscar e atualizar repassam ao service', async () => {
    usuariosService.findAll.mockResolvedValue([]);
    usuariosService.findOne.mockResolvedValue({
      _id: 'abc',
    });
    usuariosService.update.mockResolvedValue({
      nome: 'Novo',
    });
    const titular = {
      user: { userId: 'abc', roles: [] as Role[] },
    };
    await expect(controller.listar()).resolves.toEqual(
      [],
    );
    await expect(
      controller.buscar('abc', titular),
    ).resolves.toEqual({
      _id: 'abc',
    });
    await controller.atualizar(
      'abc',
      { nome: 'Novo' },
      titular,
    );
    expect(usuariosService.update).toHaveBeenCalledWith(
      'abc',
      {
        nome: 'Novo',
      },
    );
  });

  it('validar deve repassar e-mail e senha ao service', async () => {
    usuariosService.validar.mockResolvedValue(
      'Acesso Permitido',
    );
    await expect(
      controller.validar({
        email: 'a@b.com',
        senha: 'senai123',
      }),
    ).resolves.toBe('Acesso Permitido');
    expect(
      usuariosService.validar,
    ).toHaveBeenCalledWith('a@b.com', 'senai123');
  });

  describe('titular ou admin (Aula 40)', () => {
    const req = (userId: string, roles: Role[]) => ({
      user: { userId, roles },
    });

    it('buscar: outro usuário comum recebe 403', () => {
      expect(() =>
        controller.buscar('abc', req('outro', [])),
      ).toThrow(ForbiddenException);
    });

    it('buscar: um admin vê conta alheia', async () => {
      usuariosService.findOne.mockResolvedValue({});
      await expect(
        controller.buscar(
          'abc',
          req('x', [Role.ADMIN]),
        ),
      ).resolves.toEqual({});
    });

    it('atualizar: outro usuário comum recebe 403 e nada é alterado', () => {
      usuariosService.update.mockClear();
      expect(() =>
        controller.atualizar(
          'abc',
          { nome: 'Hack' },
          req('outro', [Role.OPERADOR]),
        ),
      ).toThrow(ForbiddenException);
      expect(
        usuariosService.update,
      ).not.toHaveBeenCalled();
    });

    it('listar exige o perfil admin', () => {
      expect(
        Reflect.getMetadata(
          ROLES_KEY,
          UsuariosController.prototype.listar,
        ),
      ).toEqual([Role.ADMIN]);
    });

    it('cadastro e validar são públicos', () => {
      for (const metodo of [
        UsuariosController.prototype.criar,
        UsuariosController.prototype.validar,
      ]) {
        expect(
          Reflect.getMetadata(IS_PUBLIC_KEY, metodo),
        ).toBe(true);
      }
    });
  });

  describe('excluir (Aula 35)', () => {
    const ID = '64f3a1b2c9e0d1f2a3b4c5d6';
    const OUTRO = '64f3a1b2c9e0d1f2a3b4c5d7';
    const req = (userId: string, roles: Role[]) => ({
      user: { userId, roles },
    });

    beforeEach(() =>
      usuariosService.remover.mockReset(),
    );

    it('o titular exclui a própria conta', async () => {
      await controller.excluir(
        ID,
        req(ID, [Role.OPERADOR]),
      );
      expect(
        usuariosService.remover,
      ).toHaveBeenCalledWith(ID);
    });

    it('um admin exclui a conta de outra pessoa', async () => {
      await controller.excluir(
        ID,
        req(OUTRO, [Role.ADMIN]),
      );
      expect(
        usuariosService.remover,
      ).toHaveBeenCalledWith(ID);
    });

    it('um usuário comum NÃO exclui a conta de outro (403)', async () => {
      await expect(
        controller.excluir(
          ID,
          req(OUTRO, [Role.OPERADOR]),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(
        usuariosService.remover,
      ).not.toHaveBeenCalled();
    });

    it('usuário sem roles também recebe 403 em conta alheia', async () => {
      await expect(
        controller.excluir(ID, req(OUTRO, [])),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a rota exige login (JwtAuthGuard)', () => {
      expect(
        Reflect.getMetadata(
          '__guards__',
          UsuariosController.prototype.excluir,
        ),
      ).toEqual([JwtAuthGuard]);
    });
  });
});
