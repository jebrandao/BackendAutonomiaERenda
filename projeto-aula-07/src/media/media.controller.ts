import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('media')
export class MediaController {
  // POST /media/upload
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const nomeUnico = `${randomUUID()}${extname(file.originalname)}`;
          callback(null, nomeUnico);
        },
      }),
    }),
  )
  uploadFile(
    @UploadedFile()
    file: Express.Multer.File | undefined,
  ) {
    // Aula 40: sem arquivo é erro do CLIENTE (400), não do servidor.
    if (!file) {
      throw new BadRequestException(
        'Envie um arquivo no campo "file".',
      );
    }
    return {
      filename: file.filename,
      size: file.size,
    };
  }
}
