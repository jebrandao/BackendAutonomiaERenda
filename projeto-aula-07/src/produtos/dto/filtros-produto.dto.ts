import { ApiPropertyOptional } from '@nestjs/swagger';

// Aula 22: Atividade Prática "O Catálogo Inteligente".
// Parâmetros capturados via @Query(): sempre chegam como string.
export class FiltrosProdutoDto {
  @ApiPropertyOptional({
    description: '_id de uma categoria',
    example: '64f3a1b2c9e0d1f2a3b4c5d6',
  })
  categoria?: string;

  @ApiPropertyOptional({
    enum: ['preco_asc', 'preco_desc'],
  })
  ordenar?: 'preco_asc' | 'preco_desc';

  @ApiPropertyOptional({
    description:
      'Página de resultados (5 itens por página)',
    example: '1',
  })
  pagina?: string;
}
