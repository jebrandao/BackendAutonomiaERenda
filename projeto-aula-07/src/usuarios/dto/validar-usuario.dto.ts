import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

// Aula 34: mesma proteção do LoginDto.
export class ValidarUsuarioDto {
  @ApiProperty({ example: 'diego.alves@empresa.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'senai123' })
  @IsString()
  @IsNotEmpty()
  senha: string;
}
