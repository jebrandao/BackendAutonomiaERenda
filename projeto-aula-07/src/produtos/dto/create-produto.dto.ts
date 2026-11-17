import { ApiProperty } from '@nestjs/swagger';

// Aula 17: os exemplos aparecem prontos no Swagger UI.
// Aula 21: campo categoria acrescentado.
export class CreateProdutoDto {
  @ApiProperty({ example: 'Torno CNC X200' })
  nome: string;

  @ApiProperty({ example: 25.9 })
  preco: number;

  // Aula 25: o _id de uma Categoria já cadastrada.
  @ApiProperty({
    example: '64f3a1b2c9e0d1f2a3b4c5d6',
    description:
      '_id de uma categoria (POST /categorias)',
  })
  categoria: string;
}
