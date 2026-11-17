import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateCategoriaDto } from './dto/create-categoria.dto.js';
import { Categoria } from './schemas/categoria.schema.js';

// Aula 27: sem try/catch: um erro de validação do banco sobe
// até o MongoExceptionFilter global (422).
@Injectable()
export class CategoriasService {
  constructor(
    @InjectModel(Categoria.name)
    private readonly categoriaModel: Model<Categoria>,
  ) {}

  create(dto: CreateCategoriaDto) {
    return this.categoriaModel.create(dto);
  }

  findAll() {
    return this.categoriaModel
      .find()
      .select('-__v')
      .sort({ nome: 1 })
      .exec();
  }
}
