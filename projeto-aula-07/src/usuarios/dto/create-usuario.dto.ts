import { ApiProperty } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ example: 'Bruno Lima' })
  nome: string;

  @ApiProperty({ example: 'bruno.lima@empresa.com' })
  email: string;

  @ApiProperty({ example: 'minhaSenha123' })
  senha: string;
}
