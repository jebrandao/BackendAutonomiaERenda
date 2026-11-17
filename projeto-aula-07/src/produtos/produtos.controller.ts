import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Role } from '../auth/role.enum.js';
import type { RequisicaoAutenticada } from '../auth/requisicao-autenticada.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { ProdutosService } from './produtos.service.js';
import { CreateProdutoDto } from './dto/create-produto.dto.js';
import { UpdateProdutoDto } from './dto/update-produto.dto.js';
import { FiltrosProdutoDto } from './dto/filtros-produto.dto.js';

@ApiTags('produtos')
// Aula 31: toda rota deste controller exige um token válido.
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('produtos')
export class ProdutosController {
  // Aula 39: Logger nativo do Nest (nível, contexto e timestamp).
  private readonly logger = new Logger(
    ProdutosController.name,
  );

  constructor(
    private readonly produtosService: ProdutosService,
  ) {}

  // POST /produtos
  @Post()
  @ApiOperation({ summary: 'Cria um novo produto' })
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados recusados pelo Schema.',
  })
  @ApiResponse({
    status: 409,
    description: 'Produto já registrado.',
  })
  async criar(
    @Body() createProdutoDto: CreateProdutoDto,
    @Req() req: RequisicaoAutenticada,
  ) {
    const produto = await this.produtosService.create(
      createProdutoDto,
    );
    // Aula 39: log INFO de auditoria. Quem cadastrou vem do token
    // (req.user), que só existe na camada HTTP. Aula 40: registra
    // o userId, não o e-mail (e-mail é dado pessoal, LGPD).
    this.logger.log(
      `Produto cadastrado - produtoId: ${String(produto._id)}, ` +
        `usuario: ${req.user.userId}`,
    );
    return produto;
  }

  // GET /produtos?categoria=<id>&ordenar=preco_asc&pagina=2
  @Get()
  @ApiOperation({
    summary:
      'Lista produtos com filtro, ordenação e paginação (5 por página)',
  })
  @ApiQuery({
    name: 'categoria',
    required: false,
    description: '_id de uma categoria',
  })
  @ApiQuery({
    name: 'ordenar',
    required: false,
    enum: ['preco_asc', 'preco_desc'],
  })
  @ApiQuery({
    name: 'pagina',
    required: false,
    example: '1',
  })
  findAll(@Query() filtros: FiltrosProdutoDto) {
    return this.produtosService.findAll(filtros);
  }

  // GET /produtos/:id
  @Get(':id')
  @ApiOperation({ summary: 'Busca um produto pelo ID' })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID em formato inválido.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado.',
  })
  buscarPorId(@Param('id') id: string) {
    return this.produtosService.findOne(id);
  }

  // PATCH /produtos/:id
  @Patch(':id')
  @ApiOperation({
    summary:
      'Atualiza parcialmente um produto existente',
  })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado com sucesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'ID ou dados inválidos.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe um produto com este nome.',
  })
  atualizar(
    @Param('id') id: string,
    @Body() updateProdutoDto: UpdateProdutoDto,
  ) {
    return this.produtosService.update(
      id,
      updateProdutoDto,
    );
  }

  // DELETE /produtos/:id
  @Delete(':id')
  // Aula 32: só admin remove. O JwtAuthGuard vem da classe
  // e roda primeiro; depois roda o RolesGuard.
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Remove um produto (somente se o estoque estiver zerado)',
  })
  @ApiResponse({
    status: 204,
    description: 'Produto removido com sucesso.',
  })
  @ApiResponse({
    status: 403,
    description: 'Perfil sem permissão (exige admin).',
  })
  @ApiResponse({
    status: 400,
    description:
      'ID inválido ou produto ainda possui itens em estoque.',
  })
  @ApiResponse({
    status: 404,
    description: 'Produto não encontrado.',
  })
  async remover(@Param('id') id: string) {
    await this.produtosService.delete(id);
  }
}
