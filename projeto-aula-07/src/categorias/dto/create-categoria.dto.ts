import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoriaDto {
  @ApiProperty({ example: 'Ferramentas Manuais' })
  nome: string;

  @ApiProperty({
    example:
      'Ferramentas operadas manualmente, sem motor.',
    required: false,
  })
  descricao?: string;
}
