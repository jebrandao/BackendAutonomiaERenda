import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Aula 39: rede de segurança. @Catch() SEM argumentos pega
// qualquer exceção. O MongoExceptionFilter (Aula 27) só cobre
// erros de banco; um TypeError qualquer cairia no tratamento
// padrão do Nest sem o log que queremos.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(
    AllExceptionsFilter.name,
  );

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host
      .switchToHttp()
      .getResponse<Response>();

    // Erros de negócio já tratados (guards, services,
    // ValidationPipe) são HttpException: repassa como estão.
    if (exception instanceof HttpException) {
      const corpo = exception.getResponse();
      return response
        .status(exception.getStatus())
        .json(
          typeof corpo === 'string'
            ? {
                statusCode: exception.getStatus(),
                message: corpo,
              }
            : corpo,
        );
    }

    // Erro inesperado: mensagem + stack trace SÓ no log
    // do servidor (nível ERROR).
    const erro =
      exception instanceof Error
        ? exception
        : new Error(String(exception));
    this.logger.error(
      `Erro não tratado: ${erro.message}`,
      erro.stack,
    );

    // O cliente recebe uma resposta genérica, sem detalhes.
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        error: 'Erro Interno',
        message:
          'Ocorreu um erro inesperado. Tente novamente mais tarde.',
      });
  }
}
