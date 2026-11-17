import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { join } from 'path';
import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configurarServidor } from './config/servidor.config.js';
import { swaggerHabilitado } from './config/swagger.config.js';
import { MongoExceptionFilter } from './common/filters/mongo-exception.filter.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  // Aula 38: trust proxy, keep-alive e host (tudo opcional, por
  // variáveis de ambiente). Veja src/config/servidor.config.ts.
  const host = configurarServidor(app, process.env);

  // Aula 34: cabeçalhos HTTP de segurança (X-Frame-Options,
  // nosniff, CSP...) e remove o X-Powered-By.
  app.use(helmet());

  // Aula 34: faz valer os decorators do class-validator
  // (@IsString() etc.) e responde 400 sozinho. SEM whitelist:
  // os DTOs antigos, sem decorators, continuam passando intactos.
  app.useGlobalPipes(new ValidationPipe());

  // Serve os arquivos salvos em ./uploads diretamente via HTTP.
  app.useStaticAssets(
    join(import.meta.dirname, '..', 'uploads'),
    {
      prefix: '/uploads/',
    },
  );

  // Aula 17: documentação Swagger/OpenAPI, disponível em /docs.
  // Aula 40: desligada em produção (expõe o mapa da API).
  if (swaggerHabilitado(process.env.NODE_ENV)) {
    const config = new DocumentBuilder()
      .setTitle(
        'Backend NestJS - Codificação para Back-End',
      )
      .setDescription(
        'API construída ao longo das aulas do curso SENAI-CRTI.',
      )
      .setVersion('1.0')
      .addTag('produtos')
      // Aula 31: botão "Authorize" para colar o token no /docs.
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(
      app,
      config,
    );
    SwaggerModule.setup('docs', app, document);
  }

  // Aula 27: traduz erros do MongoDB/Mongoose em respostas
  // seguras, em toda a aplicação. Aula 39: AllExceptionsFilter
  // é a rede de segurança para qualquer outro erro (500).
  // O Nest inverte esta lista internamente: o ÚLTIMO passado
  // aqui é o PRIMEIRO tentado. O catch-all vem primeiro na
  // chamada para rodar por último de verdade.
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new MongoExceptionFilter(),
  );

  const porta = process.env.PORT ?? 3000;
  if (host) await app.listen(porta, host);
  else await app.listen(porta);
}
await bootstrap();
