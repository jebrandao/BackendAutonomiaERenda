import {
  ArgumentsHost,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  let filtro: AllExceptionsFilter;
  let status: ReturnType<typeof vi.fn>;
  let json: ReturnType<typeof vi.fn>;
  let logError: ReturnType<typeof vi.fn>;
  let host: ArgumentsHost;

  beforeEach(() => {
    filtro = new AllExceptionsFilter();
    logError = vi
      .spyOn(filtro['logger'], 'error')
      .mockImplementation(() => undefined);
    json = vi.fn();
    status = vi.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('TypeError vira 500 com mensagem genérica', () => {
    filtro.catch(
      new TypeError(
        "Cannot read properties of null (reading 'nome')",
      ),
      host,
    );
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: 'Erro Interno',
      message:
        'Ocorreu um erro inesperado. Tente novamente mais tarde.',
    });
  });

  it('não vaza a mensagem nem o stack ao cliente', () => {
    filtro.catch(new Error('segredo interno'), host);
    const corpo = JSON.stringify(json.mock.calls);
    expect(corpo).not.toContain('segredo interno');
    expect(corpo).not.toContain('at ');
  });

  it('loga ERROR com a mensagem e o stack trace', () => {
    const erro = new TypeError('falhou');
    filtro.catch(erro, host);
    expect(logError).toHaveBeenCalledWith(
      'Erro não tratado: falhou',
      erro.stack,
    );
  });

  it('aceita lançar algo que não é Error (ex.: string)', () => {
    filtro.catch('texto solto', host);
    expect(status).toHaveBeenCalledWith(500);
    expect(logError).toHaveBeenCalledWith(
      'Erro não tratado: texto solto',
      expect.any(String),
    );
  });

  it('HttpException é repassada com o próprio status', () => {
    filtro.catch(new NotFoundException('Sumiu'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Sumiu' }),
    );
  });

  it('HttpException não vira 500 nem é logada como erro', () => {
    filtro.catch(
      new BadRequestException('Dado ruim'),
      host,
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(logError).not.toHaveBeenCalled();
  });
});
