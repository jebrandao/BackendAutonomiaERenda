import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { vi } from 'vitest';
import { ProdutosService } from './produtos.service.js';
import { Produto } from './schemas/produto.schema.js';

describe('ProdutosService', () => {
  let service: ProdutosService;
  // Model falso: os testes não precisam do MongoDB.
  const produtoModel = {
    create: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };
  // Cadeia find().select().sort().skip().limit().exec() falsa.
  const consulta = {
    select: vi.fn(),
    populate: vi.fn(),
    sort: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
    exec: vi.fn(),
  };

  const dto = {
    nome: 'Torno CNC X200',
    preco: 15000,
    categoria: 'Ferramentas',
  };

  beforeEach(async () => {
    produtoModel.create.mockReset();
    produtoModel.findById.mockReset();
    produtoModel.findByIdAndUpdate.mockReset();
    produtoModel.findByIdAndDelete.mockReset();
    produtoModel.find
      .mockReset()
      .mockReturnValue(consulta);
    for (const metodo of [
      'select',
      'populate',
      'sort',
      'skip',
      'limit',
    ]) {
      consulta[metodo as 'select']
        .mockReset()
        .mockReturnValue(consulta);
    }
    consulta.exec.mockReset().mockResolvedValue([]);
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          ProdutosService,
          {
            provide: getModelToken(Produto.name),
            useValue: produtoModel,
          },
        ],
      }).compile();

    service = module.get<ProdutosService>(
      ProdutosService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create deve devolver o documento gravado', async () => {
    produtoModel.create.mockResolvedValue({
      _id: 'abc123',
      ...dto,
    });
    const criado = await service.create(dto);
    expect(produtoModel.create).toHaveBeenCalledWith(
      dto,
    );
    expect(criado).toMatchObject({ _id: 'abc123' });
  });

  it('create deve repassar outros erros', async () => {
    const falha = new Error('banco fora do ar');
    produtoModel.create.mockRejectedValue(falha);
    await expect(service.create(dto)).rejects.toBe(
      falha,
    );
  });

  it('findAll deve filtrar, ordenar e paginar', async () => {
    await service.findAll({
      categoria: 'EPI',
      ordenar: 'preco_asc',
      pagina: '2',
    });
    expect(produtoModel.find).toHaveBeenCalledWith({
      categoria: 'EPI',
    });
    expect(consulta.select).toHaveBeenCalledWith(
      '-__v',
    );
    expect(consulta.sort).toHaveBeenCalledWith({
      preco: 1,
    });
    expect(consulta.skip).toHaveBeenCalledWith(5);
    expect(consulta.limit).toHaveBeenCalledWith(5);
  });

  it('findAll sem filtros usa a página 1 e não filtra', async () => {
    await service.findAll({});
    expect(produtoModel.find).toHaveBeenCalledWith({});
    expect(consulta.sort).toHaveBeenCalledWith({});
    expect(consulta.skip).toHaveBeenCalledWith(0);
  });

  it('findAll ordena por preço decrescente', async () => {
    await service.findAll({ ordenar: 'preco_desc' });
    expect(consulta.sort).toHaveBeenCalledWith({
      preco: -1,
    });
  });

  it('findAll volta à página 1 se a página for inválida', async () => {
    await service.findAll({ pagina: 'abc' });
    expect(consulta.skip).toHaveBeenCalledWith(0);
    await service.findAll({ pagina: '-3' });
    expect(consulta.skip).toHaveBeenLastCalledWith(0);
  });

  // Consulta falsa: findById(...).select(...) devolve o valor.
  const consultaCom = (
    resultado: unknown,
    erro = false,
  ) => ({
    select: erro
      ? vi.fn().mockRejectedValue(resultado)
      : vi.fn().mockResolvedValue(resultado),
  });
  const ID = '64f3a1b2c9e0d1f2a3b4c5d6';
  // findById(...).select(...).populate(...) falso.
  const comPopulate = (
    resultado: unknown,
    erro = false,
  ) => ({
    select: () => ({
      populate: erro
        ? vi.fn().mockRejectedValue(resultado)
        : vi.fn().mockResolvedValue(resultado),
    }),
  });
  const erroDeId = {
    name: 'CastError',
    path: '_id',
    message: 'Cast to ObjectId failed',
  };

  it('findOne deve devolver o produto do banco', async () => {
    const doc = { _id: ID, nome: 'Mouse' };
    produtoModel.findById.mockReturnValue(
      comPopulate(doc),
    );
    await expect(service.findOne(ID)).resolves.toBe(
      doc,
    );
    expect(produtoModel.findById).toHaveBeenCalledWith(
      ID,
    );
  });

  it('findOne deve lançar 404 se não existir', async () => {
    produtoModel.findById.mockReturnValue(
      comPopulate(null),
    );
    await expect(service.findOne(ID)).rejects.toThrow(
      new NotFoundException(
        `Produto com ID ${ID} não encontrado`,
      ),
    );
  });

  describe('update', () => {
    let log: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      log = vi
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);
    });
    afterEach(() => log.mockRestore());

    const atualizacao = (
      resultado: unknown,
      erro = false,
    ) =>
      produtoModel.findByIdAndUpdate.mockReturnValue(
        consultaCom(resultado, erro),
      );

    it('deve devolver o documento já atualizado', async () => {
      const doc = { _id: ID, preco: 2500 };
      atualizacao(doc);
      await expect(
        service.update(ID, { preco: 2500 }),
      ).resolves.toBe(doc);
      expect(
        produtoModel.findByIdAndUpdate,
      ).toHaveBeenCalledWith(
        ID,
        { $set: { preco: 2500 } },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      );
    });

    it('deve ignorar campos protegidos (_id, createdAt)', async () => {
      atualizacao({ _id: ID });
      await service.update(ID, {
        preco: 10,
        _id: 'outro',
        createdAt: '2000-01-01',
      } as never);
      expect(
        produtoModel.findByIdAndUpdate,
      ).toHaveBeenCalledWith(
        ID,
        { $set: { preco: 10 } },
        expect.anything(),
      );
    });

    it('deve lançar 404 se o ID não existir', async () => {
      atualizacao(null);
      await expect(
        service.update(ID, { preco: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve alertar estoque crítico (menor que 5)', async () => {
      atualizacao({ _id: ID, estoque: 3 });
      await service.update(ID, { estoque: 3 });
      expect(log).toHaveBeenCalledWith(
        'Atenção: Estoque Crítico',
      );
    });

    it('não deve alertar com estoque 5 ou sem estoque', async () => {
      atualizacao({ _id: ID });
      await service.update(ID, { estoque: 5 });
      await service.update(ID, { preco: 9 });
      expect(log).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deve apagar o produto com estoque zerado', async () => {
      produtoModel.findById.mockReturnValue(
        comPopulate({ _id: ID, estoque: 0 }),
      );
      produtoModel.findByIdAndDelete.mockResolvedValue(
        {},
      );
      await expect(
        service.delete(ID),
      ).resolves.toBeUndefined();
      expect(
        produtoModel.findByIdAndDelete,
      ).toHaveBeenCalledWith(ID);
    });

    it('deve lançar 404 se o produto não existir', async () => {
      produtoModel.findById.mockReturnValue(
        comPopulate(null),
      );
      await expect(service.delete(ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(
        produtoModel.findByIdAndDelete,
      ).not.toHaveBeenCalled();
    });
  });

  describe('erros do banco (Aula 27)', () => {
    // O service não traduz mais: o erro bruto sobe até o
    // MongoExceptionFilter, que é testado à parte.
    it('create deixa o erro 11000 subir intacto', async () => {
      const bruto = { code: 11000 };
      produtoModel.create.mockRejectedValue(bruto);
      await expect(service.create(dto)).rejects.toBe(
        bruto,
      );
    });

    it('findOne deixa o CastError subir intacto', async () => {
      const bruto = { name: 'CastError', path: '_id' };
      produtoModel.findById.mockReturnValue(
        comPopulate(bruto, true),
      );
      await expect(service.findOne('abc')).rejects.toBe(
        bruto,
      );
    });

    it('update deixa o ValidationError subir intacto', async () => {
      const bruto = {
        name: 'ValidationError',
        errors: {},
      };
      produtoModel.findByIdAndUpdate.mockReturnValue(
        consultaCom(bruto, true),
      );
      await expect(
        service.update(ID, { preco: -1 }),
      ).rejects.toBe(bruto);
    });

    it('findAll deixa o CastError do filtro subir intacto', async () => {
      const bruto = { name: 'CastError' };
      consulta.exec.mockRejectedValue(bruto);
      await expect(
        service.findAll({
          categoria: 'nao-e-objectid',
        }),
      ).rejects.toBe(bruto);
    });

    it('delete recusa (400) produto com estoque', async () => {
      produtoModel.findById.mockReturnValue(
        comPopulate({ _id: ID, estoque: 3 }),
      );
      await expect(service.delete(ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(
        produtoModel.findByIdAndDelete,
      ).not.toHaveBeenCalled();
    });
  });
});
