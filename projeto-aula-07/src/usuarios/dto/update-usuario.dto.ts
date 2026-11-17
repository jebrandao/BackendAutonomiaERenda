import { ApiPropertyOptional } from '@nestjs/swagger';

// Todos opcionais: o cliente envia só o que quer alterar.
export class UpdateUsuarioDto {
  @ApiPropertyOptional({ example: 'Bruno Lima Silva' })
  nome?: string;

  @ApiPropertyOptional({ example: 'bruno@empresa.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'outraSenhaNova456' })
  senha?: string;
}
