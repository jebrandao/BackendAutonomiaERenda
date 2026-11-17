import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriasService } from './categorias.service.js';
import { CreateCategoriaDto } from './dto/create-categoria.dto.js';

@ApiTags('categorias')
@Controller('categorias')
export class CategoriasController {
  constructor(
    private readonly categoriasService: CategoriasService,
  ) {}

  // POST /categorias
  @Post()
  @ApiOperation({ summary: 'Cria uma categoria' })
  @ApiResponse({
    status: 201,
    description: 'Categoria criada.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos.',
  })
  criar(@Body() dto: CreateCategoriaDto) {
    return this.categoriasService.create(dto);
  }

  // GET /categorias
  @Get()
  @ApiOperation({ summary: 'Lista as categorias' })
  listar() {
    return this.categoriasService.findAll();
  }
}
