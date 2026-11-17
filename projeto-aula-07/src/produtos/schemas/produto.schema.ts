import * as mongoose from 'mongoose';
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import { Categoria } from '../../categorias/schemas/categoria.schema.js';

// Aula 20: Atividade Prática "Modelagem de Inventário
// Industrial". Contrato do Produto gravado no MongoDB.
@Schema({ timestamps: true })
export class Produto {
  // Aula 21: unique impede dois produtos com o mesmo nome
  // (erro 11000 do MongoDB).
  @Prop({ required: true, trim: true, unique: true })
  nome: string;

  @Prop({ required: true, min: 0 })
  preco: number;

  // Aula 25: antes um texto fixo (enum); agora uma referência
  // (ObjectId) a um documento da coleção Categoria.
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Categoria.name,
    required: true,
  })
  categoria: Categoria;

  @Prop({ default: 0, min: 0 })
  estoque: number;

  @Prop({ default: true })
  ativo: boolean;
}

export const ProdutoSchema =
  SchemaFactory.createForClass(Produto);
