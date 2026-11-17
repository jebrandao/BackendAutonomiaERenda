import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { vi } from 'vitest';
import { AuditoriaPerfilMiddleware } from './auditoria-perfil.middleware.js';

describe('AuditoriaPerfilMiddleware (Aula 35)', () => {
  const middleware = new AuditoriaPerfilMiddleware();
  const ID = '64f3a1b2c9e0d1f2a3b4c5d6';
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    vi.useFakeTimers();
    vi.setSystemTime(
      new Date('2026-01-15T14:32:00.000Z'),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    log.mockRestore();
  });

  const rodar = (id: string) => {
    const next = vi.fn();
    middleware.use(
      {
        params: { id },
        ip: '192.168.1.10',
      } as unknown as Request,
      {} as Response,
      next,
    );
    return next;
  };

  it('registra o id do perfil, o timestamp e o IP', () => {
    rodar(ID);
    expect(log).toHaveBeenCalledTimes(1);
    const linha = String(log.mock.calls[0][0]);
    expect(linha).toContain(`userId: ${ID}`);
    expect(linha).toContain(
      'timestamp: 2026-01-15T14:32:00.000Z',
    );
    expect(linha).toContain('ip: 192.168.1.10');
  });

  it('deixa a requisição seguir (chama next uma vez)', () => {
    expect(rodar(ID)).toHaveBeenCalledTimes(1);
  });

  it('id malicioso com quebra de linha não forja linhas de log', () => {
    rodar('abc\n[FALSO] linha forjada');
    const linha = String(log.mock.calls[0][0]);
    expect(linha).not.toContain('\n');
    expect(linha).toContain(
      'userId: "abc\\n[FALSO] linha forjada"',
    );
  });

  it('id que não é um _id válido vai entre aspas', () => {
    rodar('xyz');
    expect(String(log.mock.calls[0][0])).toContain(
      'userId: "xyz"',
    );
  });
});
