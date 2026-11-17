// Aula 38: ajustes do servidor HTTP para rodar ATRÁS de um proxy
// reverso ou balanceador (Nginx, Render, AWS...). Tudo opcional:
// sem as variáveis, o comportamento é o de sempre.

export interface ServidorHttp {
  keepAliveTimeout: number;
  headersTimeout: number;
}

// Só o que precisamos do app Express: facilita testar sem subir nada.
export interface AppDoServidor {
  set(nome: string, valor: unknown): unknown;
  getHttpServer(): ServidorHttp;
}

// Balanceadores costumam fechar conexões ociosas após ~60 s. O Node
// fecha em 5 s por padrão: ele derruba a conexão ANTES do balanceador
// e o usuário recebe 502. 65 s fica acima dos 60 s.
export const KEEP_ALIVE_PADRAO_MS = 65_000;

// "1" = confiar em 1 proxy à frente do app. Vazio = não confiar.
export function lerTrustProxy(
  valor: string | undefined,
): number | false {
  const texto = (valor ?? '').trim();
  return texto === '' ? false : Number(texto);
}

export function lerKeepAliveMs(
  valor: string | undefined,
): number {
  const texto = (valor ?? '').trim();
  return texto === ''
    ? KEEP_ALIVE_PADRAO_MS
    : Number(texto);
}

// Vazio = todas as interfaces (padrão). "127.0.0.1" = só local.
export function lerHost(
  valor: string | undefined,
): string | undefined {
  const texto = (valor ?? '').trim();
  return texto === '' ? undefined : texto;
}

// Aplica as configurações e devolve o host em que escutar.
export function configurarServidor(
  app: AppDoServidor,
  env: Record<string, string | undefined>,
): string | undefined {
  const proxies = lerTrustProxy(env.TRUST_PROXY);
  // Sem isso, atrás de um proxy todo cliente parece ter o IP do
  // proxy e o limite de login (Aula 34) vale para todos juntos.
  if (proxies !== false)
    app.set('trust proxy', proxies);

  const servidor = app.getHttpServer();
  servidor.keepAliveTimeout = lerKeepAliveMs(
    env.KEEP_ALIVE_TIMEOUT_MS,
  );
  // O Node exige headersTimeout MAIOR que keepAliveTimeout.
  servidor.headersTimeout =
    servidor.keepAliveTimeout + 1000;

  return lerHost(env.HOST);
}
