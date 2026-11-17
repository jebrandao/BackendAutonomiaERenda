import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import type { HydratedDocument } from 'mongoose';
import { Role } from '../../auth/role.enum.js';

// Custo do hash: cada +1 dobra o tempo de cálculo.
const SALT_ROUNDS = 10;

// Aula 26: Atividade Prática "O Guardião de Acessos".
@Schema({ timestamps: true })
export class Usuario {
  @Prop({ required: true, trim: true })
  nome: string;

  // Aula 35: sem unique:true aqui. A unicidade passou para o
  // índice PARCIAL no fim do arquivo (só contas ativas).
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  email: string;

  @Prop({ required: true })
  senha: string;

  // Aula 32: perfis do usuário. O Mongoose recusa valores
  // fora do enum; quem se cadastra recebe só 'operador'.
  @Prop({
    type: [String],
    enum: Role,
    default: [Role.OPERADOR],
  })
  roles: Role[];

  // Aula 33: hash do Refresh Token vigente. Sem default: só
  // existe depois do 1º login. select: false = NUNCA sai nas
  // consultas normais (só com .select('+refreshTokenHash')).
  @Prop({ select: false })
  refreshTokenHash?: string;

  // Aula 35: quando a conta foi "excluída" (anonimizada).
  @Prop()
  dataExclusao?: Date;

  // Aula 35: false depois da exclusão. Serve ao índice parcial.
  @Prop({ default: true })
  ativo: boolean;
}

// Tipo de um documento Usuario vindo do banco (com _id etc.).
export type UsuarioDocument = HydratedDocument<Usuario>;

export const UsuarioSchema =
  SchemaFactory.createForClass(Usuario);

// Aula 35: e-mail único SÓ entre contas ativas. Contas anonimizadas
// ficam todas com o mesmo e-mail e não podem colidir. O MongoDB só
// aceita igualdade num índice parcial (nunca $exists: false),
// por isso o campo ativo: true.
UsuarioSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { ativo: true },
  },
);

// Hook pre('save'): roda ANTES de gravar o documento.
// function (e não arrow): precisa do "this" do documento.
UsuarioSchema.pre('save', async function () {
  // Só criptografa se a senha foi criada ou alterada.
  // Sem isto, o hash seria "hasheado" de novo a cada save.
  if (!this.isModified('senha')) return;

  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  this.senha = await bcrypt.hash(this.senha, salt);
});
