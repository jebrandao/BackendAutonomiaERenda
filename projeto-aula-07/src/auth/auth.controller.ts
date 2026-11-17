import {
  Body,
  Controller,
  HttpCode,
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
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard.js';
import { Public } from './public.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Role } from './role.enum.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  // POST /auth/login
  // Aula 40: pública (ainda não existe token para quem faz login).
  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Faz login e devolve os dois tokens',
  })
  @ApiResponse({
    status: 200,
    description:
      '{ "access_token": "...", "refresh_token": "..." }',
  })
  @ApiResponse({
    status: 401,
    description: 'E-mail ou senha inválidos.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.senha);
  }

  // POST /auth/refresh: novo Access Token, sem senha.
  // Aula 40: pública para o guard GLOBAL (que confere o Access
  // Token); quem protege aqui é o JwtRefreshAuthGuard.
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshAuthGuard)
  @ApiOperation({
    summary:
      'Troca o refresh_token por um novo access_token',
  })
  @ApiResponse({
    status: 200,
    description: '{ "access_token": "..." }',
  })
  @ApiResponse({
    status: 401,
    description:
      'Refresh Token ausente, inválido, vencido ou revogado.',
  })
  refresh(
    @Req()
    req: {
      user: {
        userId: string;
        email: string;
        roles: Role[];
      };
    },
    // O corpo já foi lido pelo guard; o DTO documenta no Swagger.
    @Body() _dto: RefreshTokenDto,
  ) {
    return this.authService.refresh(req.user);
  }

  // POST /auth/logout: encerra TODAS as sessões do usuário.
  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout global: revoga o refresh token',
  })
  @ApiResponse({
    status: 204,
    description: 'Sessões encerradas.',
  })
  @ApiResponse({
    status: 401,
    description: 'Token ausente ou inválido.',
  })
  async logout(
    @Req() req: { user: { userId: string } },
  ) {
    await this.authService.logout(req.user.userId);
  }
}
