import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy.js';
import { Role } from './role.enum.js';

describe('JwtStrategy', () => {
  const config = {
    get: () => 'segredo-de-teste',
  } as unknown as ConfigService;

  it('validate deve devolver userId e email do payload', () => {
    const strategy = new JwtStrategy(config);
    expect(
      strategy.validate({
        sub: '64f3a1b2c9e0d1f2a3b4c5d6',
        email: 'fabio.nunes@empresa.com',
      }),
    ).toEqual({
      userId: '64f3a1b2c9e0d1f2a3b4c5d6',
      email: 'fabio.nunes@empresa.com',
      roles: [],
    });
  });

  it('validate deve repassar as roles do token (Aula 32)', () => {
    const strategy = new JwtStrategy(config);
    expect(
      strategy.validate({
        sub: 'abc',
        email: 'helena@empresa.com',
        roles: [Role.ADMIN],
      }).roles,
    ).toEqual(['admin']);
  });

  it('validate não deve repassar iat nem exp', () => {
    const strategy = new JwtStrategy(config);
    const usuario = strategy.validate({
      sub: 'abc',
      email: 'a@a.com',
      iat: 1,
      exp: 2,
    } as never);
    expect(Object.keys(usuario)).toEqual([
      'userId',
      'email',
      'roles',
    ]);
  });
});
