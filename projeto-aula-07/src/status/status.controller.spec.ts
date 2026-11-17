import { ServiceUnavailableException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Connection } from 'mongoose';
import { StatusController } from './status.controller.js';

const comEstado = (readyState: number) =>
  new StatusController({
    readyState,
  } as Connection);

describe('StatusController (Aula 37)', () => {
  it('banco conectado: status ok', () => {
    const r = comEstado(1).verificar();
    expect(r.status).toBe('ok');
    expect(r.database).toBe('connected');
  });

  it('devolve timestamp ISO e versão', () => {
    const r = comEstado(1).verificar();
    expect(new Date(r.timestamp).toISOString()).toBe(
      r.timestamp,
    );
    expect(typeof r.version).toBe('string');
  });

  it('banco desconectado: 503 com status erro', () => {
    for (const estado of [0, 2, 3]) {
      try {
        comEstado(estado).verificar();
        throw new Error('deveria ter lançado');
      } catch (e) {
        expect(e).toBeInstanceOf(
          ServiceUnavailableException,
        );
        expect(
          (
            e as ServiceUnavailableException
          ).getResponse(),
        ).toMatchObject({
          status: 'erro',
          database: 'disconnected',
        });
      }
    }
  });

  it('a versão é a do package.json (Aula 38)', () => {
    const pacote = JSON.parse(
      readFileSync(
        join(
          import.meta.dirname,
          '..',
          '..',
          'package.json',
        ),
        'utf8',
      ),
    ) as { version: string };
    expect(comEstado(1).verificar().version).toBe(
      pacote.version,
    );
  });

  it('não vaza segredos na resposta', () => {
    const texto = JSON.stringify(
      comEstado(1).verificar(),
    );
    expect(texto).not.toMatch(
      /JWT|senha|mongodb:\/\//i,
    );
  });
});
