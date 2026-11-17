import { randomBytes } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUsuarioDto } from './dto/create-usuario.dto.js';
import { UpdateUsuarioDto } from './dto/update-usuario.dto.js';
import { Usuario } from './schemas/usuario.schema.js';
import type { UsuarioDocument } from './schemas/usuario.schema.js';

// Aula 35: o que sobra no lugar dos dados pessoais.
const ANONIMO = 'USUÁRIO_ANONIMIZADO';

// Hash bcrypt (custo 10) de uma senha qualquer: usado só para
// igualar o tempo de resposta quando o e-mail não existe.
const HASH_FALSO =
  '$2b$10$KcdZ7uDvIXunCKX0M0AxLew9yWGGdFaBxsxAAk0mDF37g76BBHME6';

// Aula 27: os erros do banco (E11000, CastError...) sobem
// intactos até o MongoExceptionFilter global.
@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<Usuario>,
  ) {}

  async create(dto: CreateUsuarioDto) {
    // Aula 32: copia SÓ os campos permitidos. O TypeScript não
    // filtra o corpo em runtime: sem isto, quem enviasse
    // {"roles":["admin"]} no cadastro viraria admin.
    const { nome, email, senha } = dto;
    // create() usa save() por baixo: o hook roda.
    await this.usuarioModel.create({
      nome,
      email,
      senha,
    });
    // Devolve sem a senha (nem o hash).
    return this.usuarioModel
      .findOne({
        email: dto.email.trim().toLowerCase(),
      })
      .select('-senha -__v');
  }

  // Aula 33: dados para validar um Refresh Token. O hash fica
  // fora das consultas normais; aqui pedimos de propósito.
  buscarParaRefresh(id: string) {
    return this.usuarioModel
      .findById(id)
      .select('+refreshTokenHash')
      .exec();
  }

  // Aula 33: guarda o hash do Refresh Token (login).
  async salvarRefreshTokenHash(
    id: string,
    hash: string,
  ) {
    await this.usuarioModel.updateOne(
      { _id: id },
      { $set: { refreshTokenHash: hash } },
    );
  }

  // Aula 33: logout global. Sem hash, nenhum token vale.
  async limparRefreshTokenHash(id: string) {
    await this.usuarioModel.updateOne(
      { _id: id },
      { $unset: { refreshTokenHash: '' } },
    );
  }

  // Aula 35: Direito ao Esquecimento. Anonimiza em vez de apagar:
  // o _id continua, para não quebrar referências de outros dados.
  async remover(id: string): Promise<void> {
    const usuario =
      await this.usuarioModel.findById(id);
    if (!usuario) {
      throw new NotFoundException(
        `Usuário com ID ${id} não encontrado`,
      );
    }
    // Já excluído: nada a fazer (e a data original é mantida).
    if (usuario.ativo === false) return;

    usuario.nome = ANONIMO;
    usuario.email = ANONIMO;
    // A senha também é dado do titular: troca por um valor
    // aleatório (o hook do Schema transforma em hash). Sem isto, o
    // hash da senha antiga seguiria no banco e a conta anonimizada
    // continuaria acessível.
    usuario.senha = randomBytes(32).toString('hex');
    // Sem hash, /auth/refresh deixa de emitir tokens.
    usuario.refreshTokenHash = undefined;
    usuario.dataExclusao = new Date();
    usuario.ativo = false;
    await usuario.save();
  }

  findAll() {
    return this.usuarioModel
      .find()
      .select('-senha -__v')
      .exec();
  }

  async findOne(id: string) {
    const usuario = await this.usuarioModel
      .findById(id)
      .select('-senha -__v');
    if (!usuario) {
      throw new NotFoundException(
        `Usuário com ID ${id} não encontrado`,
      );
    }
    return usuario;
  }

  // Atenção: findByIdAndUpdate NÃO dispara o hook pre('save').
  // Por isso buscamos o documento, alteramos e usamos save().
  async update(id: string, dto: UpdateUsuarioDto) {
    const usuario =
      await this.usuarioModel.findById(id);
    if (!usuario) {
      throw new NotFoundException(
        `Usuário com ID ${id} não encontrado`,
      );
    }

    // Só os campos editáveis (o isModified decide a senha).
    if (dto.nome !== undefined) usuario.nome = dto.nome;
    if (dto.email !== undefined)
      usuario.email = dto.email;
    if (dto.senha !== undefined)
      usuario.senha = dto.senha;

    await usuario.save();
    return this.findOne(id);
  }

  // Aula 30: a conferência de e-mail e senha foi extraída
  // para cá, para ser reaproveitada pelo login (AuthService).
  // Devolve o usuário se as credenciais conferem, ou null.
  async validarCredenciais(
    email: string,
    senha: string,
  ): Promise<UsuarioDocument | null> {
    // Corpo sem e-mail ou senha (ou de outro tipo): recusa.
    if (
      typeof email !== 'string' ||
      typeof senha !== 'string'
    ) {
      return null;
    }

    // Aqui o hash é necessário: não usamos select('-senha').
    // Aula 35: conta excluída (ativo: false) nunca entra. $ne e não
    // true: contas antigas, criadas antes da Aula 35, não têm o campo.
    const usuario = await this.usuarioModel.findOne({
      email: email.trim().toLowerCase(),
      ativo: { $ne: false },
    });

    // Sem usuário, comparamos com um hash falso só para gastar
    // o mesmo tempo: assim o tempo de resposta não revela se o
    // e-mail existe.
    const hash = usuario ? usuario.senha : HASH_FALSO;
    const senhaValida = await bcrypt.compare(
      senha,
      hash,
    );

    return usuario && senhaValida ? usuario : null;
  }

  // Aula 29: Verificação Extra. Agora é só uma casca sobre o
  // validarCredenciais(); o comportamento público não mudou.
  async validar(
    email: string,
    senha: string,
  ): Promise<string> {
    const usuario = await this.validarCredenciais(
      email,
      senha,
    );
    return usuario
      ? 'Acesso Permitido'
      : 'Senha Incorreta';
  }
}
