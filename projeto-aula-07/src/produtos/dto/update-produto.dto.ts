import { ApiPropertyOptional } from '@nestjs/swagger';

// Aula 23: todos os campos são opcionais; o cliente envia
// só o que quer alterar (PATCH). Campos como _id e createdAt
// ficam de fora de propósito: não podem ser editados.
export class UpdateProdutoDto {
  @ApiPropertyOptional({ example: 'Torno CNC X200' })
  nome?: string;

  @ApiPropertyOptional({ example: 25.9 })
  preco?: number;

  @ApiPropertyOptional({
    example: '64f3a1b2c9e0d1f2a3b4c5d6',
    description: '_id de uma categoria',
  })
  categoria?: string;

  @ApiPropertyOptional({ example: 3 })
  estoque?: number;

  @ApiPropertyOptional({ example: true })
  ativo?: boolean;
}
