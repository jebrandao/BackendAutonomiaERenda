import { ForbiddenException } from '@nestjs/common';
import { Role } from './role.enum.js';

// Aula 40 (correção dos débitos): estar logado NÃO basta para mexer
// numa conta. Só o titular (ou um admin) passa; os outros levam 403.
export function exigirTitularOuAdmin(
  user: { userId: string; roles: Role[] },
  idDaConta: string,
  mensagem = 'Só o titular da conta (ou um admin) pode acessá-la.',
): void {
  const titular = user.userId === idDaConta;
  const admin = user.roles.includes(Role.ADMIN);
  if (!titular && !admin) {
    throw new ForbiddenException(mensagem);
  }
}
