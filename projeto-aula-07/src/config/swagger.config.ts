// Aula 40 (correção dos débitos): o Swagger (/docs) mostra o mapa
// inteiro da API. Em produção ele fica DESLIGADO.
export function swaggerHabilitado(
  nodeEnv: string | undefined,
): boolean {
  return nodeEnv !== 'production';
}
