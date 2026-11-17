import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  Error as MongooseError,
  mongo,
} from 'mongoose';
import type { Response } from 'express';

// Aula 27: camada de tradução. Captura os erros TÉCNICOS do
// MongoDB/Mongoose e devolve ao cliente só uma mensagem de
// negócio, sem expor coleção, índice, stack trace etc.
@Catch(
  mongo.MongoServerError,
  MongooseError.CastError,
  MongooseError.ValidationError,
  mongo.MongoNetworkError,
  mongo.MongoServerSelectionError,
  MongooseError.MongooseServerSelectionError,
)
export class MongoExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(
    MongoExceptionFilter.name,
  );

  catch(exception: Error, host: ArgumentsHost) {
    const response = host
      .switchToHttp()
      .getResponse<Response>();

    // O erro técnico completo fica só no log do servidor.
    this.logger.error(
      `Erro no banco: ${exception.message}`,
      exception.stack,
    );

    // E11000: valor duplicado em campo unique.
    if (
      exception instanceof mongo.MongoServerError &&
      exception.code === 11000
    ) {
      return response.status(HttpStatus.CONFLICT).json({
        error: 'Conflito de Dados',
        message: 'O valor informado já está em uso.',
      });
    }

    // CastError: ID (ou outro campo) em formato inválido.
    if (exception instanceof MongooseError.CastError) {
      return response
        .status(HttpStatus.BAD_REQUEST)
        .json({
          error: 'Requisição Inválida',
          message:
            'O formato do Identificador (ID) é inválido.',
        });
    }

    // ValidationError: o Schema recusou o dado.
    if (
      exception instanceof MongooseError.ValidationError
    ) {
      const mensagens = Object.values(
        exception.errors,
      ).map((e) => e.message);
      return response
        .status(HttpStatus.UNPROCESSABLE_ENTITY)
        .json({
          error: 'Dados Inválidos',
          message: mensagens.join(', '),
        });
    }

    // Conexão: banco fora do ar, rede, credenciais...
    // (e qualquer outro erro do driver sem tratamento acima)
    return response
      .status(HttpStatus.SERVICE_UNAVAILABLE)
      .json({
        error: 'Serviço Indisponível',
        message:
          'Não foi possível completar a operação no momento.',
      });
  }
}
