import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { RequisicaoAutenticada } from '../auth/requisicao-autenticada.js';
import { ROLES_KEY } from '../auth/roles.decorator.js';
import { ProdutosController } from './produtos.controller.js';
import { ProdutosService } from './produtos.service.js';

describe('ProdutosController', () => {
  let controller: ProdutosController;
  // Service falso: o controller é testado sem o Mongoose.
  const produtosService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [ProdutosController],
        providers: [
          {
            provide: ProdutosService,
            useValue: produtosService,
          },
        ],
      }).compile();

    controller = module.get<ProdutosController>(
      ProdutosController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('está protegido pelo JwtAuthGuard (Aula 31)', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      ProdutosController,
    );
    expect(guards?.includes(JwtAuthGuard)).toBe(true);
  });

  it('DELETE exige o perfil admin e o RolesGuard (Aula 32)', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      ProdutosController.prototype.remover,
    );
    expect(roles).toEqual(['admin']);
    const guards = Reflect.getMetadata(
      '__guards__',
      ProdutosController.prototype.remover,
    );
    expect(
      guards?.map((g: { name: string }) => g.name),
    ).toEqual(['RolesGuard']);
  });

  it('só o DELETE é restrito: findAll não tem @Roles', () => {
    expect(
      Reflect.getMetadata(
        ROLES_KEY,
        ProdutosController.prototype.findAll,
      ),
    ).toBeUndefined();
  });

  it('buscarPorId deve devolver o produto', async () => {
    produtosService.findOne.mockResolvedValue({
      nome: 'Mouse',
    });
    const produto = await controller.buscarPorId('abc');
    expect(
      produtosService.findOne,
    ).toHaveBeenCalledWith('abc');
    expect(produto).toMatchObject({ nome: 'Mouse' });
  });

  it('atualizar deve repassar o id e os campos', async () => {
    produtosService.update.mockResolvedValue({
      preco: 2500,
    });
    const resultado = await controller.atualizar(
      'abc',
      {
        preco: 2500,
      },
    );
    expect(produtosService.update).toHaveBeenCalledWith(
      'abc',
      { preco: 2500 },
    );
    expect(resultado).toEqual({ preco: 2500 });
  });

  // Aula 39: requisição falsa já autenticada (como o JwtAuthGuard deixa).
  const req = {
    user: {
      userId: 'u1',
      email: 'larissa.prado@empresa.com',
      roles: [],
    },
  } as unknown as RequisicaoAutenticada;

  it('criar deve devolver o documento criado', async () => {
    const dto = {
      nome: 'Torno CNC X200',
      preco: 15000,
      categoria: 'Ferramentas',
    };
    produtosService.create.mockResolvedValue({
      _id: 'abc123',
      ...dto,
    });
    const criado = await controller.criar(dto, req);
    expect(produtosService.create).toHaveBeenCalledWith(
      dto,
    );
    expect(criado).toMatchObject({ _id: 'abc123' });
  });

  it('criar registra um log INFO com o id do produto e o userId, sem o e-mail (Aulas 39 e 40)', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    produtosService.create.mockResolvedValue({
      _id: 'abc123',
    });
    await controller.criar(
      { nome: 'X', preco: 1, categoria: 'Y' },
      req,
    );
    expect(log).toHaveBeenCalledTimes(1);
    const mensagem = String(log.mock.calls[0]?.[0]);
    expect(mensagem).toContain('produtoId: abc123');
    expect(mensagem).toContain('usuario: u1');
    expect(mensagem).not.toContain('larissa.prado');
    log.mockRestore();
  });

  it('criar NÃO loga quando o service falha (nada foi cadastrado)', async () => {
    const log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    produtosService.create.mockRejectedValue(
      new Error('falhou'),
    );
    await expect(
      controller.criar(
        { nome: 'X', preco: 1, categoria: 'Y' },
        req,
      ),
    ).rejects.toThrow('falhou');
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('findAll deve repassar os filtros ao service', async () => {
    const filtros = { categoria: 'EPI', pagina: '2' };
    produtosService.findAll.mockResolvedValue([
      { nome: 'Luva' },
    ]);
    const lista = await controller.findAll(filtros);
    expect(
      produtosService.findAll,
    ).toHaveBeenCalledWith(filtros);
    expect(lista).toHaveLength(1);
  });

  it('remover deve chamar o service e não devolver corpo', async () => {
    produtosService.delete.mockResolvedValue(undefined);
    await expect(
      controller.remover('abc'),
    ).resolves.toBeUndefined();
    expect(produtosService.delete).toHaveBeenCalledWith(
      'abc',
    );
  });
});
