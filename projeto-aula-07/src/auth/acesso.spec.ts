import { ForbiddenException } from '@nestjs/common';
import { exigirTitularOuAdmin } from './acesso.js';
import { Role } from './role.enum.js';

describe('exigirTitularOuAdmin (Aula 40)', () => {
  const ID = 'conta-1';

  it('o titular passa', () => {
    expect(() =>
      exigirTitularOuAdmin(
        { userId: ID, roles: [] },
        ID,
      ),
    ).not.toThrow();
  });

  it('um admin passa em conta alheia', () => {
    expect(() =>
      exigirTitularOuAdmin(
        { userId: 'outro', roles: [Role.ADMIN] },
        ID,
      ),
    ).not.toThrow();
  });

  it('outro usuário comum recebe 403', () => {
    expect(() =>
      exigirTitularOuAdmin(
        { userId: 'outro', roles: [Role.OPERADOR] },
        ID,
      ),
    ).toThrow(ForbiddenException);
  });

  it('usa a mensagem informada', () => {
    expect(() =>
      exigirTitularOuAdmin(
        { userId: 'outro', roles: [] },
        ID,
        'Sem acesso.',
      ),
    ).toThrow('Sem acesso.');
  });
});
