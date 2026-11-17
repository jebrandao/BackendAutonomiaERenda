import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { vi } from 'vitest';
import { CategoriasService } from './categorias.service.js';
import { Categoria } from './schemas/categoria.schema.js';

describe('CategoriasService', () => {
  let service: CategoriasService;
  // Model falso: os testes não precisam do MongoDB.
  const categoriaModel = {
    create: vi.fn(),
    find: vi.fn(),
  };
  const consulta = {
    select: vi.fn(),
    sort: vi.fn(),
    exec: vi.fn(),
  };

  beforeEach(async () => {
    categoriaModel.create.mockReset();
    categoriaModel.find
      .mockReset()
      .mockReturnValue(consulta);
    consulta.select
      .mockReset()
      .mockReturnValue(consulta);
    consulta.sort.mockReset().mockReturnValue(consulta);
    consulta.exec.mockReset().mockResolvedValue([]);

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          CategoriasService,
          {
            provide: getModelToken(Categoria.name),
            useValue: categoriaModel,
          },
        ],
      }).compile();

    service = module.get<CategoriasService>(
      CategoriasService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create deve devolver a categoria gravada', async () => {
    const dto = { nome: 'Ferramentas Manuais' };
    categoriaModel.create.mockResolvedValue({
      _id: 'abc123',
      ...dto,
    });
    await expect(
      service.create(dto),
    ).resolves.toMatchObject({
      _id: 'abc123',
    });
    expect(categoriaModel.create).toHaveBeenCalledWith(
      dto,
    );
  });

  it('findAll deve listar por nome, sem o __v', async () => {
    await service.findAll();
    expect(consulta.select).toHaveBeenCalledWith(
      '-__v',
    );
    expect(consulta.sort).toHaveBeenCalledWith({
      nome: 1,
    });
  });

  it('create deixa o ValidationError subir intacto', async () => {
    const bruto = {
      name: 'ValidationError',
      errors: {},
    };
    categoriaModel.create.mockRejectedValue(bruto);
    await expect(
      service.create({ nome: '' }),
    ).rejects.toBe(bruto);
  });
});
