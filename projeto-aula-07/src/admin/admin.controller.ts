import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '../auth/role.enum.js';
import { Roles } from '../auth/roles.decorator.js';

// Aula 40: o painel agora exige login (guard global) E o perfil
// admin (@Roles). Antes, era um cabeçalho que o cliente forjava.
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  // GET /admin
  @Get()
  painel() {
    return {
      mensagem: 'Bem-vindo ao painel administrativo.',
    };
  }
}
