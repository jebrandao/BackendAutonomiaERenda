# README_DEPLOY: guia de implantação e handover técnico

API **Backend NestJS** do curso Codificação para Back-End (SENAI-CRTI), projeto `projeto-aula-07`.
Explica como colocar a API no ar, o que ela precisa, quais rotas estão protegidas (de verdade) e o
que a próxima pessoa precisa saber.

> Convenção: **(testado)** = executado na máquina de desenvolvimento (Windows, PowerShell, Node
> v24.20.0, MongoDB local). **(não testado)** = roteiro de referência, sem a ferramenta ou conta.

---

## 1. Arquitetura e requisitos

```text
 Cliente (Postman, front-end)
        |  HTTPS (443)
        v
 Proxy reverso ou plataforma (Nginx, Render)   <- termina o TLS e repassa ao app
        |  HTTP (porta PORT)
        v
 API NestJS (Node.js)  -->  MongoDB (local ou Atlas)
        |
        +-- logs no stdout e stderr (PM2 ou painel da plataforma)
```

- **Node.js:** v24.x (testado com v24.20.0 e npm 11).
- **Banco:** MongoDB (testado no Community Server local; Atlas **não testado**).
- **Memória:** não medida. Em teste, o processo (PM2) ocupou de 64 a 110 MB nos primeiros segundos.
- **Portas:** `PORT` da API (testes: 3104); 27017 do MongoDB (interna); 80 e 443 no proxy.
- **Firewall:** só 80 e 443 abertas ao público. A porta da API e a do MongoDB ficam internas.

---

## 2. Guia de Inicialização Rápida (produção)

Depois de clonar o repositório, dentro de `projeto-aula-07`:

```powershell
# 1. Dependências (todas: o build precisa das de desenvolvimento)
npm ci

# 2. Configuração: copie o modelo e preencha com valores REAIS (nunca commite)
Copy-Item .env.production.example .env.production

# 3. Build
npm run build

# 4. Conta Admin inicial (idempotente) (testado)
$env:NODE_ENV = 'production'
npm run seed

# 5. Subir a API
node dist/main.js
```

Com **PM2** (gerenciador de processos) **(testado)**:

```powershell
$env:NODE_ENV = 'production'
pm2 start dist/main.js --name backend-nestjs
pm2 logs backend-nestjs
pm2 restart backend-nestjs
pm2 delete backend-nestjs
```

Pontos de atenção:

- `NODE_ENV=production` precisa estar no **ambiente do processo**: é ele que faz a API ler o
  `.env.production` e exigir a configuração completa. Se faltar algo, a API **recusa subir** e
  lista o que falta (fail-fast da Aula 36).
- Na Cloud (Render e similares) não se usa arquivo: as variáveis vão no painel (Aula 38).
- Valores com `#` no `.env.production` precisam de aspas, senão o dotenv corta o valor.
- Depois do deploy, `GET /status` deve responder `200` com `"database":"connected"`.

---

## 3. Tabela de Configuração (variáveis de ambiente)

Todas as variáveis que o código realmente lê (conferido no código-fonte):

- `NODE_ENV` (obrigatória em produção): `production` escolhe o `.env.production` e liga as
  validações rígidas. Lida em `src/config/env.config.ts` e `src/app.module.ts`.
- `PORT` (opcional, padrão 3000): porta HTTP da API. Lida em `src/main.ts`.
- `DATABASE_URL` (obrigatória): URI do MongoDB, local ou Atlas. Lida em `src/app.module.ts`.
- `JWT_SECRET` (obrigatória): chave do Access Token; em produção, mínimo de 32 caracteres.
  Lida em `src/app.module.ts` e `src/auth/jwt.strategy.ts`.
- `JWT_REFRESH_SECRET` (obrigatória): chave do Refresh Token, **diferente** da `JWT_SECRET`.
  Lida em `src/auth/`.
- `JWT_ACCESS_EXPIRES_IN` (opcional, padrão `15m`): validade do Access Token.
  Lida em `src/app.module.ts`.
- `ADMIN_EMAIL` (só no seed): e-mail do Admin criado por `npm run seed`.
  Lida em `src/scripts/seed-admin.ts`.
- `ADMIN_SENHA` (só no seed): senha do Admin, mínimo de 12 caracteres; recusa valores de exemplo.
  Lida em `src/scripts/seed-admin.ts`.
- `TRUST_PROXY` (opcional): número de proxies confiáveis à frente da API (`1` atrás de Nginx ou
  Render). Lida em `src/config/servidor.config.ts`.
- `KEEP_ALIVE_TIMEOUT_MS` (opcional, padrão 65000): keep-alive do servidor, acima dos ~60 s dos
  balanceadores. Lida em `src/config/servidor.config.ts`.
- `HOST` (opcional): interface de escuta. `127.0.0.1` fecha a porta para a rede (Nginx na mesma
  máquina). **Não defina na Cloud.** Lida em `src/config/servidor.config.ts`.

Gerar uma chave forte:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Mapa de Rotas Protegidas

Desde a correção dos débitos (seção 9), **toda rota exige JWT por padrão**: o `JwtAuthGuard` e o
`RolesGuard` são globais (`APP_GUARD` em `src/app.module.ts`). Só vale sem token o que tem
`@Public()`. Conferido por requisições reais, em modo produção, na porta 3104 **(testado)**.
`401` = sem token; `403` = logado, mas sem permissão.

**Públicas (`@Public()`)**

| Rota | Observação |
| --- | --- |
| `GET /status` | Health check, sem segredos |
| `GET /api` | Boas-vindas |
| `POST /auth/login` | Limite de 10 por minuto por IP |
| `POST /auth/refresh` | Protegida pelo Refresh Token (`JwtRefreshAuthGuard`) |
| `POST /usuarios` | Cadastro (nasce como `operador`) |
| `POST /usuarios/validar` | Limite próprio de 10 por minuto por IP |

**Exigem perfil `admin`**

| Rota | Operador | Admin |
| --- | --- | --- |
| `GET /usuarios` (lista de pessoas) | 403 | 200 |
| `GET /admin` | 403 | 200 |
| `GET /secreto` | 403 | 200 |
| `DELETE /produtos/:id` | 403 | 204 |

**Exigem JWT, e só o titular (ou um admin) acessa**

| Rota | Titular | Outra pessoa | Admin |
| --- | --- | --- | --- |
| `GET /usuarios/:id` | 200 | 403 | 200 |
| `PATCH /usuarios/:id` | 200 | 403 | 200 |
| `DELETE /usuarios/:id` | 204 | 403 | 204 |

**Exigem JWT (qualquer usuário logado)**

- `/produtos` (todas as rotas), `/categorias`, `/convidados`, `/livros/:id`, `/colaboradores`.
- `POST /media/upload` (sem arquivo: `400`) e `POST /auth/logout`.

Fora do sistema de guards:

- `GET /docs` (Swagger): **desligado em produção** (`404`); continua ligado em desenvolvimento.
- `/uploads/<arquivo>`: arquivos estáticos, **públicos** para quem souber o nome (ver seção 9).

Perfis: `operador` é o padrão do cadastro; `admin` é criado pelo `npm run seed`.

---

## 5. Evidência de Validação (UAT)

Em modo **produção**, com a API sob **PM2**, build real e banco descartável **(testado)**. Os dados
de teste foram apagados ao final (`dropDatabase`).

**Sanity Check**

- `npm run build`: sem erros.
- `npm run seed` duas vezes: a 1ª cria o Admin; a 2ª avisa que já existe (idempotente).
- `pm2 start dist/main.js`: processo `online`.
- `GET /status`: `200`, `{"status":"ok","database":"connected",...,"version":"0.0.1"}`.

**Fluxo E2E**

- `POST /usuarios` (cadastro): `201`, `roles: ["operador"]`.
- `POST /auth/login`: `200`, com `access_token` e `refresh_token`.
- `POST /produtos` (com token): `201`.
- `GET /produtos` (com token): `200`.
- `PATCH /produtos/:id` (com token): `200`.

**Verificação de Segurança**

- Senha no banco: hash bcrypt (`$2b$10$...`, 60 caracteres), nunca texto puro.
- HTTPS: **não verificável** neste teste (HTTP em `localhost`); depende do proxy ou da plataforma.

**Reteste após as correções (Aula 40, parte 2)**

- Mesma bateria, com guards globais: sem token, todas as rotas fora das públicas devolvem `401`.
- Operadora: lista de usuários `403`; o próprio perfil `200`; perfil alheio `403`.
- Admin: `/usuarios`, `/admin` e `/secreto` devolvem `200`.
- `POST /auth/refresh` `200` e `POST /auth/logout` `204` continuam funcionando.
- `/docs` `404` em produção e `200` em desenvolvimento.

**Teste de Permissão**

- `DELETE /produtos/:id` com token de **operador**: `403 Forbidden` (RolesGuard funcionando).
- `DELETE /produtos/:id` com token de **admin**: `204 No Content`.

---

## 6. Instrução de Backup (MongoDB)

**(não testado: o `mongodump` não estava instalado na máquina de desenvolvimento)**

Instale o *MongoDB Database Tools* e rode (no Atlas, use a URI `mongodb+srv://...`):

```powershell
# Backup (gera uma pasta com os dados)
mongodump --uri="$env:DATABASE_URL" --out=backup-AAAA-MM-DD

# Restauração
mongorestore --uri="$env:DATABASE_URL" backup-AAAA-MM-DD
```

- No **Atlas**, ative os *Cloud Backups* (snapshots) do cluster e confira a retenção.
- Automatize o dump e guarde as cópias **fora** do servidor da API.
- **Nunca commite dumps**: contêm dados pessoais (LGPD). Inclua `backup-*` no `.gitignore`.
- Teste a restauração em um banco de teste antes de depender do backup.

---

## 7. Plano de Rollback

**(não testado: roteiro de referência)**

1. Antes de cada deploy, marque a versão no ar (tag do Git) e faça um dump (seção 6).
2. Se o deploy falhar (`/status` fora do ar, erro no log): `git checkout <tag-anterior>`.
3. `npm ci` e `npm run build`.
4. `pm2 restart backend-nestjs` (ou refaça o deploy da versão anterior no painel).
5. Confirme `GET /status` e o login.
6. Só restaure o dump se a nova versão alterou dados de forma incompatível.

---

## 8. Checklist de encerramento e handover

- [ ] Dados de teste removidos do banco de produção (`dropDatabase` só em banco **de teste**).
- [ ] Credenciais entregues por canal seguro ao responsável pela infraestrutura: `JWT_SECRET`,
      `JWT_REFRESH_SECRET`, `DATABASE_URL` e a senha do Admin. Nunca em texto puro por e-mail.
- [ ] Senha do Admin trocada depois do primeiro acesso.
- [ ] `.env.production` fora do Git (confira o `.gitignore`).
- [ ] A equipe de manutenção recebeu este documento, o mapa de rotas (seção 4) e os riscos que
      continuam (seção 9).
- [ ] `GET /status` monitorado (logs e alertas da Aula 39).

---

## 9. Débitos técnicos: situação (leia antes de ir para produção)

Os dez itens abaixo foram encontrados ao levantar o mapa de rotas (Aula 40) e **corrigidos em
seguida**, com testes automatizados e verificação em servidor real. Tudo **(testado)**, exceto o
item 10.

1. **`GET /usuarios` e `GET /usuarios/:id` públicos.** CORRIGIDO: a lista é só do admin; o perfil
   é só do titular ou de um admin.
2. **`PATCH /usuarios/:id` público.** CORRIGIDO: só o titular ou um admin. O perfil (`roles`)
   continua sem poder ser alterado por essa rota.
3. **`/categorias`, `/convidados`, `/media/upload`, `/colaboradores`, `/livros` públicos.**
   CORRIGIDO: guard global; exigem JWT.
4. **`/admin` e `/secreto` com cabeçalho forjável e chave no código.** CORRIGIDO: exigem JWT e
   perfil admin. A chave `SENAI-2026` saiu do código-fonte e o bloqueio por cabeçalho saiu do
   `LoggerMiddleware`.
5. **`/docs` (Swagger) público em produção.** CORRIGIDO: desligado quando `NODE_ENV=production`.
6. **`POST /media/upload` sem arquivo devolvia `500`.** CORRIGIDO: devolve `400`.
7. **`POST /usuarios/validar` sem limite de tentativas.** CORRIGIDO: 10 por minuto por IP, com
   contador próprio (não divide com o login).
8. **Logs com `console.log`.** CORRIGIDO: `LoggerMiddleware` e `AuditoriaPerfilMiddleware` usam o
   Logger do Nest (hora, nível e contexto).
9. **E-mail do usuário no log do cadastro de produto.** CORRIGIDO: o log registra o `userId`.
10. **HTTPS, backup e rollback não verificados.** CONTINUA ABERTO: dependem do ambiente real
    (proxy ou plataforma, Database Tools, Atlas). Veja as seções 5, 6 e 7.

**Riscos que continuam (conhecidos, não corrigidos):**

- **Cadastro público + JWT para tudo.** Qualquer pessoa pode se cadastrar (vira `operador`) e então
  ler e escrever em `/produtos`, `/categorias`, `/convidados`. Se isso não é desejado, restrinja
  o cadastro ou exija o perfil admin nas rotas sensíveis.
- **Upload sem limites.** `POST /media/upload` aceita qualquer tipo e tamanho de arquivo, e os
  arquivos ficam públicos em `/uploads/`. Limite tipo e tamanho antes de ir para produção.
- **Rate limit só por IP**, em memória: com várias instâncias da API, cada uma conta separado.
- **Tentativas barradas ainda geram log.** O `AuditoriaPerfilMiddleware` registra "Perfil acessado"
  antes do guard decidir, então uma tentativa recusada (403) também aparece no log.
