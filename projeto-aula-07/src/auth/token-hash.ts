import { createHash } from 'node:crypto';
import * as bcrypt from 'bcrypt';

// Aula 33: guardamos só o HASH do Refresh Token, como na senha.
// O bcrypt lê apenas os 72 primeiros bytes. Um JWT tem ~200
// caracteres e o começo dele (cabeçalho + início do payload) é
// igual em todos os tokens do mesmo usuário: sem o SHA-256 antes,
// um token ANTIGO passaria na conferência do token novo.
const resumo = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const hashToken = (token: string) =>
  bcrypt.hash(resumo(token), 10);

export const compareToken = (
  token: string,
  hash: string,
) => bcrypt.compare(resumo(token), hash);
