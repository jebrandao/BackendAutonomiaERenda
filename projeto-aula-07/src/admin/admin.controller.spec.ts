import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/role.enum.js';
import { ROLES_KEY } from '../auth/roles.decorator.js';
import { AdminController } from './admin.controller.js';

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [AdminController],
      }).compile();

    controller = module.get<AdminController>(
      AdminController,
    );
  });

  it('deve devolver o painel administrativo', () => {
    expect(controller.painel()).toEqual({
      mensagem: 'Bem-vindo ao painel administrativo.',
    });
  });

  it('exige o perfil admin (@Roles), Aula 40', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, AdminController),
    ).toEqual([Role.ADMIN]);
  });
});
