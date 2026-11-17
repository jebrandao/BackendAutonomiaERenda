import { rateLimit } from 'express-rate-limit';

// Aula 34: limita as tentativas de login por IP (força bruta).
// A 11ª tentativa dentro de 1 minuto recebe 429.
// Fábrica: cada chamada cria um contador novo (útil nos testes).
export const criarLoginRateLimit = (
  mensagem = 'Muitas tentativas de login. Tente novamente em instantes.',
) =>
  rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    // Devolve RateLimit-* nos cabeçalhos (padrão atual).
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: mensagem },
  });

export const loginRateLimit = criarLoginRateLimit();

// Aula 40: POST /usuarios/validar também confere senha, então
// também precisa de limite. Contador PRÓPRIO: login e validar
// não dividem as 10 tentativas.
export const validarRateLimit = criarLoginRateLimit(
  'Muitas tentativas de validação. Tente novamente em instantes.',
);
