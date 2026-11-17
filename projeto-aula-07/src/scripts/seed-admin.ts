import { Role } from '../auth/role.enum.js';

// Aula 37: lógica do Seed do usuário Admin, separada do script
// que sobe o Nest (seed.ts) para poder ser testada sem MongoDB.

export interface CredenciaisAdmin {
  email: string;
  senha: string;
}

// Só o que o seed precisa do Model do Mongoose. Assim os testes
// usam um Model falso e o seed.ts passa o Model de verdade.
export interface UsuarioModelDoSeed {
  findOne(
    filtro: Record<string, unknown>,
  ): PromiseLike<{ email: string } | null>;
  create(
    dados: Record<string, unknown>,
  ): PromiseLike<unknown>;
}

// Mesmos valores de exemplo recusados na Aula 36.
const EXEMPLO = /troque|exemplo|changeme/i;
const TAMANHO_MINIMO_SENHA = 12;

// Lê ADMIN_EMAIL e ADMIN_SENHA do ambiente e recusa o que for
// inválido ANTES de tocar no banco ("falhar rápido").
export function lerCredenciaisAdmin(
  env: Record<string, string | undefined>,
): CredenciaisAdmin {
  const email = (env.ADMIN_EMAIL ?? '')
    .trim()
    .toLowerCase();
  const senha = env.ADMIN_SENHA ?? '';
  const problemas: string[] = [];

  if (!email)
    problemas.push('ADMIN_EMAIL está ausente');
  else if (!email.includes('@'))
    problemas.push('ADMIN_EMAIL não parece um e-mail');

  if (!senha) {
    problemas.push('ADMIN_SENHA está ausente');
  } else if (senha.length < TAMANHO_MINIMO_SENHA) {
    // Um "#" sem aspas no .env corta o valor (dotenv trata
    // "#" como comentário): a senha chega curta, sem aviso.
    problemas.push(
      `ADMIN_SENHA é curta demais (mínimo ${TAMANHO_MINIMO_SENHA} caracteres). ` +
        'Se ela tem "#", espaço ou outro símbolo, ' +
        'coloque o valor entre aspas no .env',
    );
  } else if (EXEMPLO.test(senha)) {
    problemas.push(
      'ADMIN_SENHA ainda é o valor de exemplo: defina uma senha própria',
    );
  }

  if (problemas.length > 0) {
    throw new Error(
      `Seed inválido:\n - ${problemas.join('\n - ')}`,
    );
  }
  return { email, senha };
}

// Idempotente: pode rodar quantas vezes quiser. Se já existe
// um Admin, não faz nada. Se não existe, cria um.
export async function garantirAdmin(
  usuarioModel: UsuarioModelDoSeed,
  credenciais: CredenciaisAdmin,
): Promise<{ criado: boolean; email: string }> {
  const adminExistente = await usuarioModel.findOne({
    roles: Role.ADMIN,
  });
  if (adminExistente) {
    return {
      criado: false,
      email: adminExistente.email,
    };
  }

  // Sem Admin, mas o e-mail já é de uma conta comum ativa:
  // criar de novo estouraria o índice único (Aula 35).
  const emailOcupado = await usuarioModel.findOne({
    email: credenciais.email,
    ativo: true,
  });
  if (emailOcupado) {
    throw new Error(
      `O e-mail ${credenciais.email} já pertence a uma conta ` +
        'que não é Admin. Use outro ADMIN_EMAIL.',
    );
  }

  // create() aciona o hook pre('save') do Schema (Aula 26):
  // a senha é gravada com hash bcrypt, sem hash manual aqui.
  await usuarioModel.create({
    nome: 'Admin',
    email: credenciais.email,
    senha: credenciais.senha,
    roles: [Role.ADMIN],
  });
  return {
    criado: true,
    email: credenciais.email,
  };
}
