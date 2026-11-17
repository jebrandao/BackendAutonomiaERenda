// Aula 05: "OperaÃ§Ã£o Cofre Aberto" - ponto de partida
// inseguro.
// PERIGO: chave de API "hardcoded" diretamente no
// cÃ³digo-fonte. Se este
// arquivo for versionado, a chave fica exposta para
// qualquer pessoa com
// acesso ao repositÃ³rio â€” e permanece no histÃ³rico do
// Git mesmo se
// removida depois.
const API_KEY =
  'CHAVE-FICTICIA-DE-EXEMPLO-NAO-USAR';

function chamarApiExterna() {
  console.log(
    `Chamando API externa com a chave: ${API_KEY}`,
  );
}

chamarApiExterna();
