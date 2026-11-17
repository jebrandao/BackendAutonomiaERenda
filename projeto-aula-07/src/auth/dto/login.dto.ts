import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // Aula 34: @IsString() recusa objetos como {"$ne": null}
  // (NoSQL Injection). Só vale com o ValidationPipe do main.ts.
  @ApiProperty({ example: 'elisa.prado@empresa.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'minhaSenha789' })
  @IsString()
  @IsNotEmpty()
  senha: string;
}
