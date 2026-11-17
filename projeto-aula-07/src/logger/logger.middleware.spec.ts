import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { LoggerMiddleware } from './logger.middleware.js';

function criarReq(metodo: string, url: string) {
  return {
    method: metodo,
    originalUrl: url,
    path: '/',
    headers: {},
  } as unknown as Request;
}

describe('LoggerMiddleware (Aula 13, revisto na Aula 40)', () => {
  let middleware: LoggerMiddleware;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    middleware = new LoggerMiddleware();
    log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => log.mockRestore());

  it('chama next() para uma rota comum', () => {
    const next = vi.fn();
    middleware.use(
      criarReq('GET', '/livros/1'),
      {} as Response,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('loga o método e a URL com o Logger do Nest', () => {
    middleware.use(
      criarReq('GET', '/livros/1'),
      {} as Response,
      vi.fn(),
    );
    expect(log).toHaveBeenCalledWith('GET /livros/1');
  });

  it('NÃO usa mais console.log', () => {
    const consoleLog = vi
      .spyOn(console, 'log')
      .mockImplementation(() => undefined);
    middleware.use(
      criarReq('POST', '/produtos'),
      {} as Response,
      vi.fn(),
    );
    expect(consoleLog).not.toHaveBeenCalled();
    consoleLog.mockRestore();
  });

  it('não barra mais o /admin por cabeçalho: quem protege é o guard', () => {
    const next = vi.fn();
    const status = vi.fn();
    const res = { status } as unknown as Response;
    middleware.use(
      criarReq('GET', '/admin'),
      res,
      next,
    );
    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });
});
