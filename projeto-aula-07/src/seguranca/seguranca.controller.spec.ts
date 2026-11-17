import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../auth/role.enum.js';
import { ROLES_KEY } from '../auth/roles.decorator.js';
import { SegurancaController } from './seguranca.controller.js';

describe('SegurancaController (Aula 40)', () => {
  let controller: SegurancaController;

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [SegurancaController],
      }).compile();

    controller = module.get<SegurancaController>(
      SegurancaController,
    );
  });

  it('devolve o conteúdo secreto', () => {
    expect(controller.acessarSecreto()).toEqual({
      mensagem: 'Conteúdo Secreto',
    });
  });

  it('exige o perfil admin (@Roles)', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        SegurancaController,
      ),
    ).toEqual([Role.ADMIN]);
  });
});
