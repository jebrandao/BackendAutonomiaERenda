import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { vi } from 'vitest';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service.js';
import { Usuario } from './schemas/usuario.schema.js';

describe('UsuariosService', () => {
  let service: UsuariosService;
  // Model falso: os testes não precisam do MongoDB.
  const usuarioModel = {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findById: vi.fn(),
    updateOne: vi.fn(),
  };
  const ID = '64f3a1b2c9e0d1f2a3b4c5d6';
  const dto = {
    nome: 'Bruno Lima',
    email: 'Bruno.Lima@empresa.com ',
    senha: 'minhaSenha123',
  };

  // Consulta falsa: x().select(...) devolve o valor.
  const comSelect = (valor: unknown, erro = false) => ({
    select: erro
      ? vi.fn().mockRejectedValue(valor)
      : vi.fn().mockResolvedValue(valor),
  });

  beforeEach(async () => {
    for (const m of Object.values(usuarioModel))
      m.mockReset();
    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          UsuariosService,
          {
            provide: getModelToken(Usuario.name),
            useValue: usuarioModel,
          },
        ],
      }).compile();
    service = module.get<UsuariosService>(
      UsuariosService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create deve gravar e devolver sem a senha', async () => {
    usuarioModel.create.mockResolvedValue({});
    const sel = comSelect({
      _id: ID,
      nome: 'Bruno Lima',
    });
    usuarioModel.findOne.mockReturnValue(sel);
    await expect(
      service.create(dto),
    ).resolves.toMatchObject({
      _id: ID,
    });
    expect(usuarioModel.create).toHaveBeenCalledWith(
      dto,
    );
    expect(usuarioModel.findOne).toHaveBeenCalledWith({
      email: 'bruno.lima@empresa.com',
    });
    expect(sel.select).toHaveBeenCalledWith(
      '-senha -__v',
    );
  });

  it('create ignora campos extras como roles (Aula 32)', async () => {
    usuarioModel.create.mockResolvedValue({});
    usuarioModel.findOne.mockReturnValue(comSelect({}));
    await service.create({
      ...dto,
      roles: ['admin'],
      _id: 'forjado',
    } as never);
    expect(usuarioModel.create).toHaveBeenCalledWith({
      nome: dto.nome,
      email: dto.email,
      senha: dto.senha,
    });
  });

  describe('exclusão com anonimização (Aula 35)', () => {
    const ativo = () => ({
      nome: 'Lia Antiga',
      email: 'lia@empresa.com',
      senha: '$2b$10$hashDaSenhaAntiga',
      refreshTokenHash: '$2b$10$hashDoRefresh',
      ativo: true,
      dataExclusao: undefined as Date | undefined,
      save: vi.fn().mockResolvedValue(undefined),
    });

    it('troca nome e e-mail por USUÁRIO_ANONIMIZADO e grava', async () => {
      const doc = ativo();
      usuarioModel.findById.mockResolvedValue(doc);
      await service.remover(ID);
      expect(doc.nome).toBe('USUÁRIO_ANONIMIZADO');
      expect(doc.email).toBe('USUÁRIO_ANONIMIZADO');
      expect(doc.save).toHaveBeenCalledTimes(1);
    });

    it('marca ativo: false e registra dataExclusao', async () => {
      const doc = ativo();
      usuarioModel.findById.mockResolvedValue(doc);
      await service.remover(ID);
      expect(doc.ativo).toBe(false);
      expect(doc.dataExclusao).toBeInstanceOf(Date);
    });

    it('descarta o hash da senha antiga (valor aleatório novo)', async () => {
      const a = ativo();
      const b = ativo();
      usuarioModel.findById
        .mockResolvedValueOnce(a)
        .mockResolvedValueOnce(b);
      await service.remover(ID);
      await service.remover(ID);
      expect(a.senha).not.toBe(
        '$2b$10$hashDaSenhaAntiga',
      );
      expect(a.senha).toMatch(/^[0-9a-f]{64}$/);
      expect(a.senha).not.toBe(b.senha);
    });

    it('apaga o hash do refresh token', async () => {
      const doc = ativo();
      usuarioModel.findById.mockResolvedValue(doc);
      await service.remover(ID);
      expect(doc.refreshTokenHash).toBeUndefined();
    });

    it('lança 404 se o usuário não existe', async () => {
      usuarioModel.findById.mockResolvedValue(null);
      await expect(service.remover(ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('conta já excluída: não faz nada (mantém a data original)', async () => {
      const antes = new Date('2026-01-01');
      const doc = {
        ...ativo(),
        ativo: false,
        dataExclusao: antes,
      };
      usuarioModel.findById.mockResolvedValue(doc);
      await service.remover(ID);
      expect(doc.save).not.toHaveBeenCalled();
      expect(doc.dataExclusao).toBe(antes);
    });

    it('conta antiga, sem o campo ativo, também pode ser excluída', async () => {
      const doc = {
        ...ativo(),
        ativo: undefined as never,
      };
      usuarioModel.findById.mockResolvedValue(doc);
      await service.remover(ID);
      expect(doc.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('refresh token (Aula 33)', () => {
    it('buscarParaRefresh pede o hash de propósito (+refreshTokenHash)', async () => {
      const consulta = {
        select: vi.fn().mockReturnThis(),
        exec: vi
          .fn()
          .mockResolvedValue({ email: 'a@a.com' }),
      };
      usuarioModel.findById.mockReturnValue(consulta);
      await expect(
        service.buscarParaRefresh(ID),
      ).resolves.toEqual({ email: 'a@a.com' });
      expect(
        usuarioModel.findById,
      ).toHaveBeenCalledWith(ID);
      expect(consulta.select).toHaveBeenCalledWith(
        '+refreshTokenHash',
      );
    });

    it('salvarRefreshTokenHash grava o hash com $set', async () => {
      usuarioModel.updateOne.mockResolvedValue({});
      await service.salvarRefreshTokenHash(
        ID,
        '$2b$hash',
      );
      expect(
        usuarioModel.updateOne,
      ).toHaveBeenCalledWith(
        { _id: ID },
        { $set: { refreshTokenHash: '$2b$hash' } },
      );
    });

    it('limparRefreshTokenHash remove o campo com $unset', async () => {
      usuarioModel.updateOne.mockResolvedValue({});
      await service.limparRefreshTokenHash(ID);
      expect(
        usuarioModel.updateOne,
      ).toHaveBeenCalledWith(
        { _id: ID },
        { $unset: { refreshTokenHash: '' } },
      );
    });
  });

  it('findAll nunca deve pedir a senha', async () => {
    const consulta = {
      select: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    };
    usuarioModel.find.mockReturnValue(consulta);
    await service.findAll();
    expect(consulta.select).toHaveBeenCalledWith(
      '-senha -__v',
    );
  });

  it('findOne deve lançar 404 se não existir', async () => {
    usuarioModel.findById.mockReturnValue(
      comSelect(null),
    );
    await expect(service.findOne(ID)).rejects.toThrow(
      NotFoundException,
    );
  });

  describe('update', () => {
    it('deve usar save() (para disparar o hook), não findByIdAndUpdate', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const doc = { nome: 'Velho', save };
      // 1ª chamada: findById() puro; 2ª: findOne() com select.
      usuarioModel.findById
        .mockReturnValueOnce(Promise.resolve(doc))
        .mockReturnValueOnce(
          comSelect({ _id: ID, nome: 'Novo' }),
        );
      const r = await service.update(ID, {
        nome: 'Novo',
      });
      expect(doc.nome).toBe('Novo');
      expect(save).toHaveBeenCalledTimes(1);
      expect(r).toMatchObject({ nome: 'Novo' });
    });

    it('só altera os campos enviados', async () => {
      const doc = {
        nome: 'A',
        email: 'a@a.com',
        senha: 'hash',
        save: vi.fn().mockResolvedValue(undefined),
      };
      usuarioModel.findById
        .mockReturnValueOnce(Promise.resolve(doc))
        .mockReturnValueOnce(comSelect({}));
      await service.update(ID, { nome: 'B' });
      expect(doc.email).toBe('a@a.com');
      expect(doc.senha).toBe('hash');
    });

    it('deve lançar 404 se o usuário não existir', async () => {
      usuarioModel.findById.mockReturnValue(
        Promise.resolve(null),
      );
      await expect(
        service.update(ID, { nome: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('erros do banco (Aula 27)', () => {
    // O service não traduz mais: o erro bruto sobe até o
    // MongoExceptionFilter.
    it('create deixa o erro 11000 subir intacto', async () => {
      const bruto = { code: 11000 };
      usuarioModel.create.mockRejectedValue(bruto);
      await expect(service.create(dto)).rejects.toBe(
        bruto,
      );
    });

    it('findOne deixa o CastError subir intacto', async () => {
      const bruto = { name: 'CastError' };
      usuarioModel.findById.mockReturnValue(
        comSelect(bruto, true),
      );
      await expect(service.findOne('abc')).rejects.toBe(
        bruto,
      );
    });

    it('update deixa o erro 11000 do save() subir intacto', async () => {
      const bruto = { code: 11000 };
      const doc = {
        save: vi.fn().mockRejectedValue(bruto),
      };
      usuarioModel.findById.mockReturnValue(
        Promise.resolve(doc),
      );
      await expect(
        service.update(ID, { email: 'repetido@a.com' }),
      ).rejects.toBe(bruto);
    });
  });

  describe('validarCredenciais (Aula 30)', () => {
    it('devolve o usuário quando e-mail e senha conferem', async () => {
      const hash = await bcrypt.hash('senai123', 4);
      const doc = {
        _id: ID,
        email: 'a@a.com',
        senha: hash,
      };
      usuarioModel.findOne.mockResolvedValue(doc);
      await expect(
        service.validarCredenciais(
          'a@a.com',
          'senai123',
        ),
      ).resolves.toBe(doc);
    });

    it('devolve null com a senha errada', async () => {
      const hash = await bcrypt.hash('senai123', 4);
      usuarioModel.findOne.mockResolvedValue({
        senha: hash,
      });
      await expect(
        service.validarCredenciais('a@a.com', 'errada'),
      ).resolves.toBeNull();
    });

    it('devolve null com e-mail inexistente ou corpo inválido', async () => {
      usuarioModel.findOne.mockResolvedValue(null);
      await expect(
        service.validarCredenciais(
          'x@x.com',
          'qualquer',
        ),
      ).resolves.toBeNull();
      await expect(
        service.validarCredenciais(
          undefined as never,
          undefined as never,
        ),
      ).resolves.toBeNull();
    });
  });

  describe('validar (Aula 29)', () => {
    it('corpo sem e-mail ou senha é recusado sem consultar o banco', async () => {
      await expect(
        service.validar(
          undefined as never,
          undefined as never,
        ),
      ).resolves.toBe('Senha Incorreta');
      expect(
        usuarioModel.findOne,
      ).not.toHaveBeenCalled();
    });

    it('e-mail inexistente também gasta o tempo do bcrypt', async () => {
      usuarioModel.findOne.mockResolvedValue(null);
      const t0 = performance.now();
      await service.validar('ninguem@empresa.com', 'x');
      // Custo 10 leva dezenas de ms; sem o hash falso seria ~0.
      expect(performance.now() - t0).toBeGreaterThan(
        15,
      );
    });

    it('deve devolver "Acesso Permitido" com a senha certa', async () => {
      const hash = await bcrypt.hash('senai123', 4);
      usuarioModel.findOne.mockResolvedValue({
        senha: hash,
      });
      await expect(
        service.validar(
          'Diego@Empresa.com ',
          'senai123',
        ),
      ).resolves.toBe('Acesso Permitido');
      expect(usuarioModel.findOne).toHaveBeenCalledWith(
        {
          email: 'diego@empresa.com',
          ativo: { $ne: false },
        },
      );
    });

    it('deve devolver "Senha Incorreta" com a senha errada', async () => {
      const hash = await bcrypt.hash('senai123', 4);
      usuarioModel.findOne.mockResolvedValue({
        senha: hash,
      });
      await expect(
        service.validar('diego@empresa.com', 'errada'),
      ).resolves.toBe('Senha Incorreta');
    });

    it('e-mail inexistente responde igual a senha errada', async () => {
      usuarioModel.findOne.mockResolvedValue(null);
      await expect(
        service.validar(
          'ninguem@empresa.com',
          'qualquer',
        ),
      ).resolves.toBe('Senha Incorreta');
    });
  });
});
