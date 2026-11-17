import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditoriaPerfilMiddleware } from './usuarios/auditoria-perfil.middleware.js';
import {
  arquivoDeEnv,
  validarEnv,
} from './config/env.config.js';
import {
  loginRateLimit,
  validarRateLimit,
} from './common/rate-limit.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Connection } from 'mongoose';
import {
  Produto,
  ProdutoSchema,
} from './produtos/schemas/produto.schema.js';
import {
  Categoria,
  CategoriaSchema,
} from './categorias/schemas/categoria.schema.js';
import { CategoriasController } from './categorias/categorias.controller.js';
import { CategoriasService } from './categorias/categorias.service.js';
import {
  Usuario,
  UsuarioSchema,
} from './usuarios/schemas/usuario.schema.js';
import { UsuariosController } from './usuarios/usuarios.controller.js';
import { UsuariosService } from './usuarios/usuarios.service.js';
import { AuthController } from './auth/auth.controller.js';
import { AuthService } from './auth/auth.service.js';
import { JwtStrategy } from './auth/jwt.strategy.js';
import { JwtRefreshStrategy } from './auth/jwt-refresh.strategy.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConvidadosController } from './convidados/convidados.controller.js';
import { ConvidadosService } from './convidados/convidados.service.js';
import { LivrosController } from './livros/livros.controller.js';
import { LivrosService } from './livros/livros.service.js';
import { MediaController } from './media/media.controller.js';
import { SegurancaController } from './seguranca/seguranca.controller.js';
import { AdminController } from './admin/admin.controller.js';
import { LoggerMiddleware } from './logger/logger.middleware.js';
import { ProdutosController } from './produtos/produtos.controller.js';
import { ProdutosService } from './produtos/produtos.service.js';
import { ColaboradoresController } from './colaboradores/colaboradores.controller.js';
import { StatusController } from './status/status.controller.js';

@Module({
  imports: [
    // Aula 18: variáveis de ambiente em toda a aplicação.
    // Aula 36: em produção lê o .env.production (NODE_ENV vem do
    // shell) e o app só sobe com a configuração completa e válida.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: arquivoDeEnv(process.env.NODE_ENV),
      validate: validarEnv,
    }),
    // Aula 19: conexão com o MongoDB gerenciada pelo Nest
    // (substitui o mongoose.connect() manual do main.ts).
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
        // Sem isto, cada tentativa espera até 30 s.
        serverSelectionTimeoutMS: 3000,
        // O Nest usa createConnection(): os eventos NÃO
        // disparam em mongoose.connection (a global).
        onConnectionCreate: (
          connection: Connection,
        ) => {
          connection.on('connected', () => {
            console.log(
              'Mongoose conectado ao MongoDB com sucesso!',
            );
          });
          connection.on('error', (error: Error) => {
            console.error(
              'Erro na conexão do Mongoose:',
              error.message,
            );
          });
          connection.on('disconnected', () => {
            console.warn(
              'Mongoose desconectado do MongoDB.',
            );
          });
          return connection;
        },
      }),
      inject: [ConfigService],
    }),
    // Aula 30: assina os tokens JWT. A chave vem do .env
    // (nunca no código). Aula 33: o Access Token agora vale 15 min
    // (JWT_ACCESS_EXPIRES_IN no .env permite trocar).
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
          ) ?? '15m') as never,
        },
      }),
      inject: [ConfigService],
    }),
    // Aula 31: base do Passport (estratégias de login).
    PassportModule,
    // Aula 20: registra o Schema/Model de Produto.
    MongooseModule.forFeature([
      { name: Produto.name, schema: ProdutoSchema },
      // Aula 25: Model da Categoria (referenciada pelo Produto).
      { name: Categoria.name, schema: CategoriaSchema },
      // Aula 26: Model do Usuário (com o hook pre-save).
      { name: Usuario.name, schema: UsuarioSchema },
    ]),
  ],
  controllers: [
    AppController,
    ConvidadosController,
    LivrosController,
    MediaController,
    SegurancaController,
    AdminController,
    ProdutosController,
    ColaboradoresController,
    CategoriasController,
    UsuariosController,
    AuthController,
    // Aula 37: health check GET /status.
    StatusController,
  ],
  providers: [
    // Aula 40: guards GLOBAIS. Toda rota exige JWT, a menos que
    // tenha @Public(). A ordem importa: JwtAuthGuard primeiro
    // (preenche request.user), RolesGuard depois (confere @Roles).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    AppService,
    ConvidadosService,
    LivrosService,
    ProdutosService,
    CategoriasService,
    UsuariosService,
    AuthService,
    // Aula 31: a estratégia que valida o token JWT.
    JwtStrategy,
    // Aula 33: a estratégia que valida o Refresh Token.
    JwtRefreshStrategy,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Aplicado a todas as rotas da aplicação.
    consumer.apply(LoggerMiddleware).forRoutes('*');
    // Aula 35: registra cada consulta ao perfil (GET /usuarios/:id).
    consumer
      .apply(AuditoriaPerfilMiddleware)
      .forRoutes({
        path: 'usuarios/:id',
        method: RequestMethod.GET,
      });
    // Aula 34: no máximo 10 logins por minuto por IP.
    consumer
      .apply(loginRateLimit)
      .forRoutes('auth/login');
    // Aula 40: a validação de senha também tem limite próprio.
    consumer
      .apply(validarRateLimit)
      .forRoutes('usuarios/validar');
  }
}
