import {
  compareToken,
  hashToken,
} from './token-hash.js';

describe('token-hash', () => {
  // Dois "tokens" com os mesmos 100 primeiros caracteres.
  const comeco = 'x'.repeat(100);
  const antigo = `${comeco}-ANTIGO`;
  const novo = `${comeco}-NOVO`;

  it('o hash confere com o próprio token', async () => {
    const hash = await hashToken(antigo);
    await expect(
      compareToken(antigo, hash),
    ).resolves.toBe(true);
  });

  it('o hash é um bcrypt e não contém o token', async () => {
    const hash = await hashToken(antigo);
    expect(hash.startsWith('$2')).toBe(true);
    expect(hash).toHaveLength(60);
    expect(hash).not.toContain(antigo);
  });

  it('token diferente NÃO confere, mesmo com o início igual (limite de 72 bytes do bcrypt)', async () => {
    const hash = await hashToken(antigo);
    await expect(
      compareToken(novo, hash),
    ).resolves.toBe(false);
  });

  it('dois hashes do mesmo token são diferentes (salt)', async () => {
    const [a, b] = await Promise.all([
      hashToken(antigo),
      hashToken(antigo),
    ]);
    expect(a).not.toBe(b);
  });
});
