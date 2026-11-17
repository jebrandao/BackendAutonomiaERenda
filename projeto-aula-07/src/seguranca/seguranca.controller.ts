import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '../auth/role.enum.js';
import { Roles } from '../auth/roles.decorator.js';

// Aula 40: a chave "SENAI-2026" estava escrita no código e
// qualquer cliente podia enviá-la. Agora a rota exige login e o
// perfil admin, sem segredo no código-fonte.
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class SegurancaController {
  // GET /secreto
  @Get('secreto')
  acessarSecreto() {
    return { mensagem: 'Conteúdo Secreto' };
  }
}
