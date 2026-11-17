import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

// Aula 25: Atividade Prática "O Catálogo Estruturado".
// Os dados da categoria ficam centralizados aqui; o Produto
// guarda apenas o _id (referência).
@Schema()
export class Categoria {
  @Prop({ required: true, trim: true })
  nome: string;

  @Prop()
  descricao: string;
}

export const CategoriaSchema =
  SchemaFactory.createForClass(Categoria);
