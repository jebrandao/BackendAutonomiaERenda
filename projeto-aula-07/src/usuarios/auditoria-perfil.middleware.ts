import {
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import type {
  NextFunction,
  Request,
  Response,
} from 'express';

// Um _id do MongoDB: 24 caracteres hexadecimais.
const OBJECT_ID = /^[a-f\d]{24}$/i;

// Aula 35: Atividade Prática "Auditoria LGPD". Registra QUEM
// teve o perfil consultado e QUANDO (GET /usuarios/:id).
@Injectable()
export class AuditoriaPerfilMiddleware implements NestMiddleware {
  // Aula 40: Logger do Nest no lugar do console.log.
  private readonly logger = new Logger(
    'AuditoriaPerfil',
  );

  use(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    const id = String(req.params['id'] ?? '');
    // O id vem da URL: é texto do cliente. Se não for um _id
    // válido, vai entre aspas (JSON.stringify) para ninguém
    // forjar linhas de log com quebras de linha.
    const userId = OBJECT_ID.test(id)
      ? id
      : JSON.stringify(id);
    this.logger.log(
      `Perfil acessado - userId: ${userId}, ` +
        `timestamp: ${new Date().toISOString()}, ip: ${req.ip}`,
    );
    next();
  }
}
