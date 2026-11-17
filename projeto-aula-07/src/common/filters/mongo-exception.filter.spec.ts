import { ArgumentsHost } from '@nestjs/common';
import { vi } from 'vitest';
import mongoose, {
  Error as MongooseError,
  mongo,
} from 'mongoose';
import { MongoExceptionFilter } from './mongo-exception.filter.js';

describe('MongoExceptionFilter', () => {
  let filtro: MongoExceptionFilter;
  let status: ReturnType<typeof vi.fn>;
  let json: ReturnType<typeof vi.fn>;
  let host: ArgumentsHost;

  beforeEach(() => {
    filtro = new MongoExceptionFilter();
    // Não polui a saída dos testes com o log de erro.
    vi.spyOn(
      filtro['logger'],
      'error',
    ).mockImplementation(() => undefined);
    json = vi.fn();
    status = vi.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('E11000 vira 409 Conflict, sem vazar o índice', () => {
    const erro = new mongo.MongoServerError({
      message:
        'E11000 duplicate key error collection: db.usuarios index: email_1',
      code: 11000,
    });
    filtro.catch(erro, host);
    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith({
      error: 'Conflito de Dados',
      message: 'O valor informado já está em uso.',
    });
    expect(
      JSON.stringify(json.mock.calls),
    ).not.toContain('email_1');
  });

  it('CastError vira 400 Bad Request', () => {
    const erro = new MongooseError.CastError(
      'ObjectId',
      'abc-123',
      '_id',
    );
    filtro.catch(erro, host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'Requisição Inválida',
      message:
        'O formato do Identificador (ID) é inválido.',
    });
  });

  it('ValidationError vira 422 com as mensagens do Schema', () => {
    const Modelo = mongoose.model(
      'Teste27',
      new mongoose.Schema({
        nome: { type: String, required: true },
      }),
    );
    const erro = new Modelo({}).validateSync();
    filtro.catch(
      erro as MongooseError.ValidationError,
      host,
    );
    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      error: 'Dados Inválidos',
      message: 'Path `nome` is required.',
    });
  });

  it('erro de rede vira 503 Service Unavailable', () => {
    filtro.catch(
      new mongo.MongoNetworkError('ECONNREFUSED'),
      host,
    );
    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith({
      error: 'Serviço Indisponível',
      message:
        'Não foi possível completar a operação no momento.',
    });
  });

  it('banco inacessível (MongoServerSelectionError) vira 503', () => {
    filtro.catch(
      new mongo.MongoServerSelectionError(
        'sem servidor',
        new Map() as never,
      ),
      host,
    );
    expect(status).toHaveBeenCalledWith(503);
  });

  it('falha de seleção de servidor vira 503', () => {
    filtro.catch(
      new MongooseError.MongooseServerSelectionError(
        'sem servidor',
      ),
      host,
    );
    expect(status).toHaveBeenCalledWith(503);
  });

  it('registra o erro técnico (com stack) no log, não na resposta', () => {
    const erro = new MongooseError.CastError(
      'ObjectId',
      'x',
      '_id',
    );
    filtro.catch(erro, host);
    expect(filtro['logger'].error).toHaveBeenCalledWith(
      expect.stringContaining('Erro no banco:'),
      erro.stack,
    );
    expect(
      JSON.stringify(json.mock.calls),
    ).not.toContain('at ');
  });
});
