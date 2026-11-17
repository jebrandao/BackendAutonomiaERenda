import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateProdutoDto } from './dto/create-produto.dto.js';
import { UpdateProdutoDto } from './dto/update-produto.dto.js';
import { FiltrosProdutoDto } from './dto/filtros-produto.dto.js';
import { Produto } from './schemas/produto.schema.js';

// Aula 22: tamanho fixo da página.
const ITENS_POR_PAGINA = 5;
// Aula 23: abaixo disto o estoque é considerado crítico.
const ESTOQUE_CRITICO = 5;

// Aula 27: este service NÃO trata mais os erros do banco
// (E11000, CastError, ValidationError). Eles sobem intactos
// até o MongoExceptionFilter global, que os traduz.
@Injectable()
export class ProdutosService {
  // Aula 21: o Model do Mongoose é injetado no Service.
  constructor(
    @InjectModel(Produto.name)
    private readonly produtoModel: Model<Produto>,
  ) {}

  // Aula 21: Atividade Prática "Cadastro de Maquinário
  // Industrial". Grava de verdade no MongoDB.
  create(createProdutoDto: CreateProdutoDto) {
    // categoria chega como texto (o _id); o Mongoose converte
    // para ObjectId ao gravar.
    return this.produtoModel.create(
      createProdutoDto as unknown as Produto,
    );
  }

  // Aula 22: filtro por categoria, ordenação por preço e
  // paginação de 5 itens. select('-__v') impede que o campo
  // de versão do Mongoose apareça na resposta.
  findAll(filtros: FiltrosProdutoDto) {
    const pagina =
      Number(filtros.pagina) > 0
        ? Number(filtros.pagina)
        : 1;
    const skip = (pagina - 1) * ITENS_POR_PAGINA;

    const query: Record<string, unknown> = {};
    if (filtros.categoria) {
      query.categoria = filtros.categoria;
    }

    const sort: Record<string, 1 | -1> = {};
    if (filtros.ordenar === 'preco_asc') sort.preco = 1;
    if (filtros.ordenar === 'preco_desc')
      sort.preco = -1;

    return (
      this.produtoModel
        .find(query)
        .select('-__v')
        // Aula 25: população seletiva: só o nome da categoria.
        .populate('categoria', 'nome')
        .sort(sort)
        .skip(skip)
        .limit(ITENS_POR_PAGINA)
        .exec()
    );
  }

  // Aula 23: o GET por ID agora também lê do MongoDB.
  async findOne(id: string) {
    const produto = await this.produtoModel
      .findById(id)
      .select('-__v')
      // Aula 25: troca o ID da categoria pelo documento completo.
      .populate('categoria');
    if (!produto) {
      throw new NotFoundException(
        `Produto com ID ${id} não encontrado`,
      );
    }
    return produto;
  }

  // Aula 23: Atividade Prática "Atualização de Status
  // Industrial".
  async update(id: string, dto: UpdateProdutoDto) {
    // Só os campos editáveis entram no $set: _id, createdAt
    // e __v nunca são alterados, mesmo que venham no corpo.
    const campos: UpdateProdutoDto = {};
    if (dto.nome !== undefined) campos.nome = dto.nome;
    if (dto.preco !== undefined)
      campos.preco = dto.preco;
    if (dto.categoria !== undefined)
      campos.categoria = dto.categoria;
    if (dto.estoque !== undefined)
      campos.estoque = dto.estoque;
    if (dto.ativo !== undefined)
      campos.ativo = dto.ativo;

    const atualizado = await this.produtoModel
      .findByIdAndUpdate(
        id,
        { $set: campos },
        {
          returnDocument: 'after',
          runValidators: true,
        },
      )
      .select('-__v');
    if (!atualizado) {
      throw new NotFoundException(
        `Produto com ID ${id} não encontrado`,
      );
    }

    // Regra de negócio: alerta de estoque crítico.
    if (
      campos.estoque !== undefined &&
      campos.estoque < ESTOQUE_CRITICO
    ) {
      console.log('Atenção: Estoque Crítico');
    }
    return atualizado;
  }

  // Aula 24: Atividade Prática "Limpeza Segura de Estoque".
  // Reaproveita o findOne() para validar o ID (400) e a
  // existência (404) e para ler o estoque antes de apagar.
  async delete(id: string): Promise<void> {
    const produto = await this.findOne(id);

    // Regra de segurança: nunca excluir com itens em estoque.
    if (produto.estoque > 0) {
      throw new BadRequestException(
        'Não é possível excluir produtos com itens em estoque',
      );
    }

    await this.produtoModel.findByIdAndDelete(id);
  }
}
