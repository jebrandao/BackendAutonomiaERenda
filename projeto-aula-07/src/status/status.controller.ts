import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator.js';
import type { Connection } from 'mongoose';

// Aula 38: a versão vem do package.json (um valor a menos para
// sincronizar a cada release). De src/status e de dist/status,
// o package.json fica dois níveis acima.
function lerVersao(): string {
  try {
    const arquivo = join(
      import.meta.dirname,
      '..',
      '..',
      'package.json',
    );
    const pacote = JSON.parse(
      readFileSync(arquivo, 'utf8'),
    ) as { version?: string };
    return pacote.version ?? 'desconhecida';
  } catch {
    return 'desconhecida';
  }
}
const VERSAO = lerVersao();

// Aula 37: Health Check. Depois do deploy, quem chama GET /status
// (você, o balanceador, um monitor) descobre se a API está viva
// e se o banco responde. Rota pública e SEM segredos na resposta.
@ApiTags('status')
@Controller('status')
export class StatusController {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  // Aula 40: o health check precisa ser público (balanceadores
  // e monitores não têm token).
  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Health check: API no ar e banco conectado?',
  })
  verificar() {
    // readyState 1 = conectado (0 desconectado, 2 conectando).
    const conectado = this.connection.readyState === 1;
    const corpo = {
      status: conectado ? 'ok' : 'erro',
      database: conectado
        ? 'connected'
        : 'disconnected',
      timestamp: new Date().toISOString(),
      version: VERSAO,
    };
    // 503: um monitor ou balanceador entende que NÃO deve
    // mandar tráfego para esta instância.
    if (!conectado) {
      throw new ServiceUnavailableException(corpo);
    }
    return corpo;
  }
}
