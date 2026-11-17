import {
  arquivoDeEnv,
  validarEnv,
} from './env.config.js';

const forte = 'a'.repeat(40);
const outra = 'b'.repeat(40);
const ok = {
  DATABASE_URL: 'mongodb://localhost:27017/x',
  JWT_SECRET: 'segredo-curto',
  JWT_REFRESH_SECRET: 'outro-curto',
};
const prod = {
  NODE_ENV: 'production',
  PORT: '3001',
  DATABASE_URL: 'mongodb://localhost:27017/producao',
  JWT_SECRET: forte,
  JWT_REFRESH_SECRET: outra,
};

describe('arquivoDeEnv (Aula 36)', () => {
  it('produção usa .env.production', () => {
    expect(arquivoDeEnv('production')).toBe(
      '.env.production',
    );
  });

  it('qualquer outro ambiente usa .env', () => {
    for (const e of [
      undefined,
      '',
      'development',
      'test',
      'staging',
    ]) {
      expect(arquivoDeEnv(e)).toBe('.env');
    }
  });
});

describe('validarEnv (Aula 36)', () => {
  it('aceita a configuração de desenvolvimento (chaves curtas)', () => {
    expect(validarEnv(ok)).toEqual(ok);
  });

  it('aceita a configuração de produção válida', () => {
    expect(validarEnv(prod)).toEqual(prod);
  });

  it('lista TODAS as variáveis obrigatórias ausentes', () => {
    expect(() => validarEnv({})).toThrow(
      /DATABASE_URL está ausente/,
    );
    expect(() => validarEnv({})).toThrow(
      /JWT_SECRET está ausente/,
    );
    expect(() => validarEnv({})).toThrow(
      /JWT_REFRESH_SECRET está ausente/,
    );
  });

  it('trata valor vazio ou só espaços como ausente', () => {
    expect(() =>
      validarEnv({ ...ok, DATABASE_URL: '   ' }),
    ).toThrow(/DATABASE_URL está ausente/);
  });

  it('a mensagem diz qual arquivo conferir', () => {
    expect(() =>
      validarEnv({ NODE_ENV: 'production' }),
    ).toThrow(/\.env\.production/);
    expect(() => validarEnv({})).toThrow(/\(\.env\)/);
  });

  it('recusa PORT inválida', () => {
    for (const p of ['abc', '0', '70000', '3.5']) {
      expect(() =>
        validarEnv({ ...ok, PORT: p }),
      ).toThrow(/PORT/);
    }
  });

  it('Aula 38: recusa TRUST_PROXY e KEEP_ALIVE inválidos', () => {
    for (const [nome, valor] of [
      ['TRUST_PROXY', 'abc'],
      ['TRUST_PROXY', '-1'],
      ['KEEP_ALIVE_TIMEOUT_MS', '10'],
      ['KEEP_ALIVE_TIMEOUT_MS', 'x'],
    ]) {
      expect(() =>
        validarEnv({ ...ok, [nome]: valor }),
      ).toThrow(new RegExp(nome));
    }
  });

  it('Aula 38: aceita TRUST_PROXY=1 e KEEP_ALIVE=65000', () => {
    expect(() =>
      validarEnv({
        ...ok,
        TRUST_PROXY: '1',
        KEEP_ALIVE_TIMEOUT_MS: '65000',
      }),
    ).not.toThrow();
  });

  it('em produção recusa chave curta', () => {
    expect(() =>
      validarEnv({ ...prod, JWT_SECRET: 'curta' }),
    ).toThrow(/JWT_SECRET é curta demais/);
  });

  it('em produção recusa o valor de exemplo', () => {
    expect(() =>
      validarEnv({
        ...prod,
        JWT_REFRESH_SECRET:
          'troque-por-outra-chave-longa-e-aleatoria',
      }),
    ).toThrow(
      /JWT_REFRESH_SECRET ainda é o valor de exemplo/,
    );
  });

  it('em produção recusa as duas chaves iguais', () => {
    expect(() =>
      validarEnv({
        ...prod,
        JWT_REFRESH_SECRET: forte,
      }),
    ).toThrow(/DIFERENTES/);
  });

  it('em desenvolvimento NÃO exige chave longa nem diferente', () => {
    expect(() =>
      validarEnv({
        ...ok,
        JWT_SECRET: 'igual',
        JWT_REFRESH_SECRET: 'igual',
      }),
    ).not.toThrow();
  });
});
