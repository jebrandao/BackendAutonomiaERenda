import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { ValidarUsuarioDto } from '../../usuarios/dto/validar-usuario.dto.js';
import { LoginDto } from './login.dto.js';

// O pipe de verdade, o mesmo registrado no main.ts.
const pipe = new ValidationPipe();

// Devolve as mensagens de erro (ou [] se passou).
const erros = async (
  metatype: ArgumentMetadata['metatype'],
  corpo: unknown,
): Promise<string[]> => {
  try {
    await pipe.transform(corpo, {
      type: 'body',
      metatype,
    });
    return [];
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return (
      (e as BadRequestException).getResponse() as {
        message: string[];
      }
    ).message;
  }
};

describe.each([
  ['LoginDto', LoginDto],
  ['ValidarUsuarioDto', ValidarUsuarioDto],
])('%s (Aula 34)', (_nome, Dto) => {
  const ok = { email: 'a@a.com', senha: 'minhaSenha1' };

  it('aceita e-mail e senha em texto', async () => {
    await expect(erros(Dto, ok)).resolves.toEqual([]);
  });

  it('recusa senha como objeto {"$ne": null}', async () => {
    await expect(
      erros(Dto, { ...ok, senha: { $ne: null } }),
    ).resolves.toEqual(['senha must be a string']);
  });

  it('recusa e-mail como objeto {"$gt": ""}', async () => {
    await expect(
      erros(Dto, { ...ok, email: { $gt: '' } }),
    ).resolves.toEqual(['email must be a string']);
  });

  it('recusa os dois campos como objetos', async () => {
    const msgs = await erros(Dto, {
      email: { $gt: '' },
      senha: { $gt: '' },
    });
    expect(msgs).toEqual(
      expect.arrayContaining([
        'email must be a string',
        'senha must be a string',
      ]),
    );
  });

  it('recusa números, arrays e booleanos', async () => {
    for (const valor of [123, ['x'], true]) {
      const msgs = await erros(Dto, {
        ...ok,
        senha: valor,
      });
      expect(msgs).toContain('senha must be a string');
    }
  });

  it('recusa campos vazios ou ausentes', async () => {
    expect(
      (await erros(Dto, { ...ok, senha: '' })).length,
    ).toBeGreaterThan(0);
    expect(
      (await erros(Dto, { email: 'a@a.com' })).length,
    ).toBeGreaterThan(0);
    expect(
      (await erros(Dto, {})).length,
    ).toBeGreaterThan(0);
  });
});
