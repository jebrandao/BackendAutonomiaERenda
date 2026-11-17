import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../app.module.js';
import { Usuario } from '../usuarios/schemas/usuario.schema.js';
import {
  garantirAdmin,
  lerCredenciaisAdmin,
  type UsuarioModelDoSeed,
} from './seed-admin.js';

// Aula 37: Seed do usuário Admin. Rode DEPOIS do build:
//   $env:NODE_ENV = 'production'; npm run seed
async function executar() {
  // Sobe o Nest SEM servidor HTTP: só os módulos, o ConfigModule
  // (que escolhe o .env certo, Aula 36) e a conexão com o banco.
  const app =
    await NestFactory.createApplicationContext(
      AppModule,
      {
        logger: ['error', 'warn'],
      },
    );
  try {
    // O Model do Mongoose, direto (e não o UsuariosService): o
    // cadastro público não aceita roles de propósito (Aula 32).
    const usuarioModel = app.get<UsuarioModelDoSeed>(
      getModelToken(Usuario.name),
    );
    const credenciais = lerCredenciaisAdmin(
      process.env,
    );
    const resultado = await garantirAdmin(
      usuarioModel,
      credenciais,
    );
    console.log(
      resultado.criado
        ? `Usuário Admin criado com sucesso: ${resultado.email}`
        : `Usuário Admin já existe (${resultado.email}) — nada a fazer.`,
    );
  } finally {
    await app.close();
  }
}

try {
  await executar();
} catch (erro) {
  console.error(
    erro instanceof Error ? erro.message : erro,
  );
  process.exitCode = 1;
}
