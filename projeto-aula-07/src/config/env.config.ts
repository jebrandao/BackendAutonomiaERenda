// Aula 36: qual arquivo de variáveis cada ambiente usa.
// Só vale se NODE_ENV já estiver definido NO PROCESSO antes de
// o app subir (o ConfigModule lê process.env.NODE_ENV antes de
// abrir qualquer arquivo .env). Por isso NODE_ENV é exportado no
// shell, nunca dentro do próprio .env.
export const arquivoDeEnv = (
  nodeEnv: string | undefined,
): string =>
  nodeEnv === 'production' ? '.env.production' : '.env';

// Valores de exemplo do .env.example: nunca podem ir ao ar.
const EXEMPLO = /troque|exemplo|changeme/i;

const OBRIGATORIAS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

// Aula 36: "falhar rápido". Se faltar configuração, o app NÃO
// sobe e diz exatamente o que corrigir, em vez de quebrar depois
// com um erro obscuro (ou, pior, rodar com chave fraca).
export function validarEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const problemas: string[] = [];
  const texto = (nome: string) => {
    const valor = config[nome];
    return typeof valor === 'string'
      ? valor.trim()
      : '';
  };

  for (const nome of OBRIGATORIAS) {
    if (!texto(nome))
      problemas.push(`${nome} está ausente`);
  }

  const porta = texto('PORT');
  if (porta) {
    const n = Number(porta);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      problemas.push(
        'PORT deve ser um número de 1 a 65535',
      );
    }
  }

  // Aula 38: inteiros opcionais de ajuste do servidor.
  const inteiroOpcional = (
    nome: string,
    minimo: number,
  ) => {
    const valor = texto(nome);
    if (!valor) return;
    const n = Number(valor);
    if (!Number.isInteger(n) || n < minimo) {
      problemas.push(
        `${nome} deve ser um inteiro maior ou igual a ${minimo}`,
      );
    }
  };
  inteiroOpcional('TRUST_PROXY', 0);
  inteiroOpcional('KEEP_ALIVE_TIMEOUT_MS', 1000);

  if (config['NODE_ENV'] === 'production') {
    for (const nome of [
      'JWT_SECRET',
      'JWT_REFRESH_SECRET',
    ] as const) {
      const valor = texto(nome);
      if (!valor) continue;
      if (valor.length < 32) {
        problemas.push(
          `${nome} é curta demais para produção (mínimo 32 caracteres)`,
        );
      }
      if (EXEMPLO.test(valor)) {
        problemas.push(
          `${nome} ainda é o valor de exemplo: gere uma chave nova`,
        );
      }
    }
    if (
      texto('JWT_SECRET') &&
      texto('JWT_SECRET') ===
        texto('JWT_REFRESH_SECRET')
    ) {
      problemas.push(
        'JWT_SECRET e JWT_REFRESH_SECRET devem ser DIFERENTES',
      );
    }
  }

  if (problemas.length > 0) {
    throw new Error(
      `Configuração inválida (${arquivoDeEnv(
        config['NODE_ENV'] as string | undefined,
      )}):\n - ${problemas.join('\n - ')}`,
    );
  }
  return config;
}
