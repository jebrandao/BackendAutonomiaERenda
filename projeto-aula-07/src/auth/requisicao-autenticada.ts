import type { Request } from 'express';
import type { Role } from './role.enum.js';

// Aula 39: o que o JwtStrategy.validate() coloca em req.user
// (Aula 31). O tipo ajuda o TypeScript a conferir req.user.email.
export interface RequisicaoAutenticada extends Request {
  user: {
    userId: string;
    email: string;
    roles: Role[];
  };
}
