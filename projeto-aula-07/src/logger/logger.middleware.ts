import {
  Injectable,
  Logger,
  NestMiddleware,
} from '@nestjs/common';
import type {
  Request,
  Response,
  NextFunction,
} from 'express';

// Aula 13: registra cada requisição que passa.
// Aula 40: usa o Logger do Nest (hora, nível e contexto) em vez
// de console.log, e NÃO barra mais o /admin: quem protege o /admin
// agora é o JwtAuthGuard + @Roles (um cabeçalho forjável não é
// segurança).
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(
    req: Request,
    _res: Response,
    next: NextFunction,
  ) {
    this.logger.log(`${req.method} ${req.originalUrl}`);
    next();
  }
}
