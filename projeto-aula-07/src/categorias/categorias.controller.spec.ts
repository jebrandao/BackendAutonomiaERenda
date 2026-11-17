import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { CategoriasController } from './categorias.controller.js';
import { CategoriasService } from './categorias.service.js';

describe('CategoriasController', () => {
  let controller: CategoriasController;
  // Service falso: o controller é testado sem o Mongoose.
  const categoriasService = {
    create: vi.fn(),
    findAll: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [CategoriasController],
        providers: [
          {
            provide: CategoriasService,
            useValue: categoriasService,
          },
        ],
      }).compile();

    controller = module.get<CategoriasController>(
      CategoriasController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('criar deve repassar os dados ao service', async () => {
    const dto = { nome: 'Ferramentas Manuais' };
    categoriasService.create.mockResolvedValue({
      _id: 'abc123',
      ...dto,
    });
    const criada = await controller.criar(dto);
    expect(
      categoriasService.create,
    ).toHaveBeenCalledWith(dto);
    expect(criada).toMatchObject({ _id: 'abc123' });
  });

  it('listar deve devolver as categorias', async () => {
    categoriasService.findAll.mockResolvedValue([
      { nome: 'EPI' },
    ]);
    await expect(
      controller.listar(),
    ).resolves.toHaveLength(1);
  });
});
