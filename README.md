# Conta-gotas

Controle de gastos com Open Finance (via Pluggy), Supabase e classificação automática por categoria.

```
conta-gotas/
├── supabase/
│   ├── migrations/20261013000000_init.sql   tabelas, RLS e realtime
│   └── functions/
│       ├── pluggy/                          token de conexão, sincronização, classificação
│       ├── pluggy-webhook/                  recebe avisos do Pluggy e sincroniza sozinho
│       └── _shared/                         cliente Pluggy, sync e classificação
└── web/                                     o app (HTML, CSS e JS estáticos)
    └── config.js                            URL e anon key do Supabase
```

## Como funciona

1. Você entra no app com seu e-mail (link mágico do Supabase Auth).
2. Em **Ajustes > Conectar banco**, o app pede à função `pluggy` um token temporário e abre o widget do Pluggy. Você escolhe o banco e autoriza no app do banco.
3. A função salva a conexão e busca os últimos 90 dias de transações. Só entram saídas de dinheiro (`type = DEBIT`). Pagamento de fatura, transferência entre contas próprias e investimentos ficam de fora, para não contar o mesmo gasto duas vezes.
4. Depois disso, quando o banco atualiza, o Pluggy chama a função `pluggy-webhook`, que grava os gastos novos. O app recebe a mudança em tempo real.
5. Cada gasto novo é classificado nesta ordem: categorias que você corrigiu antes, palavras-chave de estabelecimentos, categoria que o próprio Pluggy informa e, por último, a API da Anthropic (opcional).

## 1. Supabase

1. Crie um projeto em https://supabase.com (o plano gratuito serve).
2. Crie as tabelas. Opção mais simples: abra **SQL Editor**, cole o conteúdo de `supabase/migrations/20261013000000_init.sql` e execute.

   Ou pela CLI, na raiz do projeto:

   ```bash
   supabase init
   supabase login
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```

   O `supabase init` só cria o `supabase/config.toml`; ele não mexe nas pastas `migrations` e `functions`.

## 2. Secrets

Cadastre em **Edge Functions > Secrets** no painel, ou pela CLI:

```bash
supabase secrets set PLUGGY_CLIENT_ID=...
supabase secrets set PLUGGY_CLIENT_SECRET=...
supabase secrets set PLUGGY_WEBHOOK_TOKEN=$(openssl rand -hex 32)
supabase secrets set ALLOWED_EMAILS=seu@email.com
supabase secrets set ANTHROPIC_API_KEY=...
```

| Secret | Obrigatório | Para que serve |
|---|---|---|
| `PLUGGY_CLIENT_ID` | sim | credencial do Pluggy |
| `PLUGGY_CLIENT_SECRET` | sim | credencial do Pluggy |
| `PLUGGY_WEBHOOK_TOKEN` | sim | valor aleatório que protege a URL do webhook; sem ele, a sincronização automática fica desligada |
| `ALLOWED_EMAILS` | recomendado | e-mails (separados por vírgula) que podem usar as funções; impede que outra pessoa gaste sua conta do Pluggy |
| `ANTHROPIC_API_KEY` | não | classifica com IA o que as regras não resolveram |
| `ANTHROPIC_MODEL` | não | modelo usado na classificação; padrão `claude-haiku-5-5` |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem nas Edge Functions hospedadas e não precisam ser cadastrados.

Nunca coloque esses valores em `web/config.js` nem faça commit deles.

## 3. Deploy das funções

```bash
supabase functions deploy pluggy
supabase functions deploy pluggy-webhook --no-verify-jwt
```

O webhook roda sem JWT porque quem chama é o Pluggy; a proteção é o `PLUGGY_WEBHOOK_TOKEN` na URL. A função `pluggy` exige o login do app.

## 4. Configurar o app

Para rodar localmente, copie `web/config.example.js` para `web/config.js` e preencha com os dados de **Project Settings > API** (o `config.js` está no `.gitignore` e não vai para o repositório):

```js
export const SUPABASE_URL = "https://abcdefgh.supabase.co";
export const SUPABASE_ANON_KEY = "eyJ...";
export const PLUGGY_CONNECT_SRC = "https://cdn.pluggy.ai/pluggy-connect/latest/pluggy-connect.js";
export const PLUGGY_SANDBOX = true;
```

A anon key é pública por natureza; quem protege os dados são as políticas de RLS da migration.

## 5. Login

1. Em **Authentication > URL Configuration**, coloque em **Site URL** e **Redirect URLs** o endereço onde o app vai rodar (por exemplo `http://localhost:3000` para testar e a URL final depois).
2. Rode o app localmente:

   ```bash
   npx serve web
   ```

3. Abra `http://localhost:3000`, entre com seu e-mail e clique no link recebido.
4. Depois do seu primeiro login, desative novos cadastros em **Authentication > Sign In / Providers** (opção de permitir novos usuários). Assim só você entra.

## 6. Testar com o sandbox do Pluggy

Com `PLUGGY_SANDBOX = true`, o widget mostra os conectores de teste do Pluggy. As credenciais de teste estão na documentação deles. Conecte, confira se os gastos aparecem em **Lançamentos** e clique em **Sincronizar agora** para testar a sincronização manual.

Quando estiver tudo certo, troque para `false` e conecte seus bancos reais.

## 7. Hospedar (GitHub Pages)

O workflow `.github/workflows/pages.yml` publica a pasta `web` a cada push na `main`. O `config.js` é gerado na hora do deploy a partir dos secrets do repositório.

1. No repositório, em **Settings > Secrets and variables > Actions**, crie os secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
2. Opcional, em **Variables**: `PLUGGY_SANDBOX` (`true` ou `false`) e `PLUGGY_CONNECT_SRC`.
3. Em **Settings > Pages**, escolha **Source: GitHub Actions**.
4. Faça push na `main` (ou rode o workflow em **Actions**). A URL fica `https://USUARIO.github.io/REPOSITORIO/`.
5. No Supabase, em **Authentication > URL Configuration**, troque o **Site URL** pela URL do Pages e adicione `https://USUARIO.github.io/REPOSITORIO/**` em **Redirect URLs**.

A anon key continua visível para quem abre o site, porque o navegador precisa dela. Ela fica fora do repositório, mas quem protege os dados são o RLS, o `ALLOWED_EMAILS` e o cadastro de novos usuários desativado.

## Pontos para validar no primeiro teste

O código segue a API do Pluggy, mas não foi testado contra ela. Confira na documentação (https://docs.pluggy.ai) e ajuste se algo divergir:

- Endpoints usados: `POST /auth`, `POST /connect_token` (com `options.clientUserId` e `options.webhookUrl`), `GET /items/{id}`, `GET /accounts?itemId=`, `GET /transactions?accountId=&from=&pageSize=&page=`, `DELETE /items/{id}`. Estão todos em `supabase/functions/_shared/pluggy.ts` e `sync.ts`.
- Regra de gasto: `type === "DEBIT"`, com o valor em módulo. Confira se as compras do cartão de crédito chegam assim.
- Nomes das categorias do Pluggy usados para mapear e para ignorar pagamentos de fatura (`PLUGGY_MAP` e `IGNORED_CATEGORY` em `_shared/classify.ts`).
- Eventos do webhook tratados (`SYNC_EVENTS` em `pluggy-webhook/index.ts`).
- Versão do script do widget em `PLUGGY_CONNECT_SRC`. Prefira fixar uma versão específica em vez de `latest`.
- Condições do Pluggy para uso em produção com bancos reais (plano, aprovação e custo).

Logs das funções: **Edge Functions > (função) > Logs** no painel.
