import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './auth/public.decorator.js';

@Controller('api')
export class AppController {
  constructor(
    private readonly appService: AppService,
  ) {}

  // Aula 40: rota de boas-vindas, pública.
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
