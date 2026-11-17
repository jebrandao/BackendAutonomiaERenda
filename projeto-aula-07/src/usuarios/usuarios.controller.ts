import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { exigirTitularOuAdmin } from '../auth/acesso.js';
import { Public } from '../auth/public.decorator.js';
import { Role } from '../auth/role.enum.js';
import { Roles } from '../auth/roles.decorator.js';
import { UsuariosService } from './usuarios.service.js';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { ValidarUsuarioDto } from './dto/validar-usuario.dto.js';

@ApiTags('usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
  ) {}

  // POST /usuarios
  // Aula 40: o cadastro é público (quem se cadastra ainda não tem token).
  @Public()
  @Post()
  @ApiOperation({ summary: 'Cadastra um usuário' })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos.',
  })
  @ApiResponse({
    status: 409,
    description: 'E-mail já cadastrado.',
  })
  criar(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  // GET /usuarios
  // Aula 40: a lista de pessoas só para admin (LGPD).
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({
    summary: 'Lista os usuários (sem a senha)',
  })
  listar() {
    return this.usuariosService.findAll();
  }

  // GET /usuarios/:id
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Busca um usuário pelo ID' })
  @ApiResponse({
    status: 404,
    description: 'Não encontrado.',
  })
  buscar(
    @Param('id') id: string,
    @Req()
    req: { user: { userId: string; roles: Role[] } },
  ) {
    // Aula 40: só o titular ou um admin vê o perfil.
    exigirTitularOuAdmin(req.user, id);
    return this.usuariosService.findOne(id);
  }

  // PATCH /usuarios/:id
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza parcialmente um usuário',
  })
  @ApiResponse({
    status: 404,
    description: 'Não encontrado.',
  })
  @ApiResponse({
    status: 409,
    description: 'E-mail já cadastrado.',
  })
  atualizar(
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioDto,
    @Req()
    req: { user: { userId: string; roles: Role[] } },
  ) {
    // Aula 40: só o titular ou um admin altera a conta.
    exigirTitularOuAdmin(req.user, id);
    return this.usuariosService.update(id, dto);
  }

  // DELETE /usuarios/:id  (Aula 35: direito ao esquecimento)
  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Exclui (anonimiza) a conta do próprio usuário',
  })
  @ApiResponse({
    status: 204,
    description: 'Conta anonimizada.',
  })
  @ApiResponse({
    status: 401,
    description: 'Sem token válido.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Só o titular (ou um admin) pode excluir.',
  })
  @ApiResponse({
    status: 404,
    description: 'Não encontrado.',
  })
  async excluir(
    @Param('id') id: string,
    @Req()
    req: { user: { userId: string; roles: Role[] } },
  ) {
    // Estar logado NÃO basta: sem esta checagem, qualquer usuário
    // apagaria a conta de qualquer outro (pelo _id).
    exigirTitularOuAdmin(
      req.user,
      id,
      'Só o titular da conta (ou um admin) pode excluí-la.',
    );
    await this.usuariosService.remover(id);
  }

  // POST /usuarios/validar
  // Aula 40: continua público, mas com rate limit (app.module.ts).
  @Public()
  @Post('validar')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Confere e-mail e senha (bcrypt.compare)',
  })
  @ApiResponse({
    status: 200,
    description:
      '"Acesso Permitido" ou "Senha Incorreta".',
  })
  validar(@Body() dto: ValidarUsuarioDto) {
    return this.usuariosService.validar(
      dto.email,
      dto.senha,
    );
  }
}
