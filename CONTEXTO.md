# Conta-gotas

App pessoal de controle financeiro. Os gastos chegam dos bancos via Open Finance (Pluggy), ficam no Supabase e são classificados em categorias. O usuário define renda, gastos fixos e metas por categoria, acompanha faturas de cartão, investimentos, abatimentos, cobranças e objetivos.

## Convenções

- Código sem comentários e sem emojis, a menos que o usuário peça.
- Textos da interface em português do Brasil. Nomes de código em inglês.
- Commits em inglês, no formato conventional commits. Projeto pessoal: commits direto na `main`.
- Preferir mudanças pequenas e pontuais. Não reestruturar o que funciona sem pedido.
- Nunca colocar secrets em arquivos do repositório. `web/config.js` está no `.gitignore`; localmente é copiado de `web/config.example.js`, e no deploy é gerado pelo workflow a partir dos secrets `SUPABASE_URL` e `SUPABASE_ANON_KEY` do GitHub.
- O usuário (Henrique) responde em português, costuma mandar prints e dá feedback visual direto. Prefere resultado funcionando a explicações longas.

## Arquitetura

```
Banco (Nubank, BTG) -> Meu Pluggy -> conector MeuPluggy -> Pluggy API
                                                              |
                         Edge Functions (Supabase, Deno) <----+
                         pluggy / pluggy-webhook
                                   |
                         Postgres (Supabase) com RLS
                                   |
                         web/ (HTML + JS estático, supabase-js, realtime)
```

- Supabase project ref: `zklopoelneukhaacbfus`, região `sa-east-1`. A CLI já está linkada (`npx supabase ... --linked`).
- O app roda localmente com `npx serve web` em `http://localhost:3000` e é publicado no GitHub Pages por `.github/workflows/pages.yml` (push na `main`).
- Login por link mágico (Supabase Auth). Redirect URLs: `http://localhost:3000/**` e a URL do GitHub Pages.
- O `supabase db query --linked "<sql>"` funciona para consultar ou alterar o banco real direto do terminal.

## Estrutura

```
supabase/migrations/   6 migrações, todas aplicadas no banco remoto
supabase/functions/_shared/cors.ts       headers CORS e helper json()
supabase/functions/_shared/pluggy.ts     auth no Pluggy (cache da apiKey por 90 min) e fetch
supabase/functions/_shared/classify.ts   regras, palavras-chave, mapa de categorias do Pluggy, IA
supabase/functions/_shared/sync.ts       sincroniza contas, faturas, investimentos e transações de um item
supabase/functions/pluggy/index.ts       função autenticada (JWT do usuário), roteada por body.action
supabase/functions/pluggy-webhook/index.ts  recebe webhooks do Pluggy, sem JWT, token na URL
web/index.html   estrutura, abas e diálogos
web/styles.css   tema escuro, animações, fundo de ondas
web/app.js       toda a lógica do app (ES module, ~1300 linhas)
web/config.js    SUPABASE_URL, SUPABASE_ANON_KEY, PLUGGY_CONNECT_SRC, PLUGGY_SANDBOX (fora do git)
web/config.example.js  modelo do config.js
.github/workflows/pages.yml  deploy no GitHub Pages, gera o config.js a partir dos secrets
CONTEXTO.md      este arquivo
```

## Banco de dados (todas com RLS `auth.uid() = user_id`)

- `settings (user_id pk, data jsonb, updated_at)`. `data` guarda `{ income, fixed: [{id,name,amount,cat,since}], goals: {catId: valor}, rules: {merchantKey: catId}, bankNames: {itemId: apelido}, objectives: [{id,name,target,deadline,manual,inv:[idsDeInvestimento],kind,color}] }`.
- `pluggy_items (id = itemId do Pluggy, user_id, connector_name, status, last_sync_at)`: leitura própria via RLS, escrita só pelas funções.
- `transactions (id pk, user_id, item_id, account_id, date, description, amount > 0, category, pluggy_category, ai, manual, source, raw jsonb)`. `amount` sempre positivo, só gastos. Prefixos de id: `p_` Pluggy, `i_` importação OFX/CSV, `m_` manual. `manual = true` quando o usuário escolheu a categoria. `raw` é o registro completo do Pluggy.
- `pluggy_accounts (id, user_id, item_id, name, type, subtype, number, balance, credit_limit, available_credit, minimum_payment, close_date, due_date, brand, raw)`.
- `pluggy_bills (id `b_...`, account_id, due_date, total, minimum_payment, raw)`: faturas fechadas dos cartões.
- `pluggy_investments (id `v_...`, item_id, name, type, subtype, issuer, balance, amount_original, amount_profit, amount_withdrawal, quantity, unit_value, annual_rate, last_month_rate, last_twelve_months_rate, due_date, raw)`.
- `pluggy_investment_transactions (id `vt_...`, investment_id, type, date, description, quantity, unit_value, amount, ...)`.
- `offsets (id, user_id, date, amount, note, person, status 'pending'|'received', received_at, allocations jsonb [{tx, amount}])`: serve para abatimentos (recebidos) e lembretes de cobrança (pendentes).
- `transactions`, `pluggy_items`, `pluggy_accounts` e `pluggy_bills` estão na publicação `supabase_realtime`. O app escuta e recarrega.

## Edge Functions

Função `pluggy`. Exige JWT do usuário e checa `ALLOWED_EMAILS`. Ações em `body.action`: `connect-token`, `item-saved` (grava o item e faz a primeira sincronização), `sync`, `remove-item`, `classify`.

Função `pluggy-webhook`: deploy com `--no-verify-jwt`, valida `?token=` contra `PLUGGY_WEBHOOK_TOKEN`, responde 200 na hora e sincroniza em segundo plano.

Secrets configurados: `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_WEBHOOK_TOKEN`, `ALLOWED_EMAILS`. **`ANTHROPIC_API_KEY` não está configurada**, então a classificação por IA está desligada.

Deploy (as duas importam `_shared`, qualquer mudança lá exige publicar as duas):

```bash
npx supabase db push
npx supabase functions deploy pluggy
npx supabase functions deploy pluggy-webhook --no-verify-jwt
```

Logs: painel do Supabase, Edge Functions > (função) > Logs.

## O que se descobriu sobre o Pluggy

- `GET /transactions` é 410, usar `GET /v2/transactions`. A v2 não aceita `from` nem `pageSize`; o filtro de data é feito no código (`sync.ts`).
- A aplicação é **demo**: só conecta Sandbox ou MeuPluggy. Os dados reais chegam pelo MeuPluggy, cujo conector se chama "MeuPluggy", por isso o app permite apelidar cada banco.
- Contas de cartão (`type CREDIT`): `balance` é o saldo devedor total **incluindo parcelas futuras** (Nubank R$ 7.691,79, BTG R$ 960,21). `balanceCloseDate` vem `null`; `balanceDueDate` é a data da última fatura fechada.
- `/bills?accountId=` traz as faturas fechadas (valor total, vencimento).
- Os lançamentos do Nubank incluem **parcelas futuras com data futura** (ex.: "Escola de Musica 180 B 4/12" em 19/11/2026 até 07/2027). As parcelas já cobradas ficam datadas no dia do fechamento (dia 9). `creditCardMetadata` veio `null`.
- Problema não resolvido: nem todos os lançamentos de cartão chegam ao banco. A soma dos lançamentos fica abaixo das faturas reais (outubro Nubank: R$ 2.326,56 contra R$ 3.744,01 do Pluggy). Provável causa: filtro `isIgnored` por categoria "loan" ou parcelamento, ou o Pluggy não listar tudo. A sync já não aplica `isIgnored` em contas de cartão e guarda o `raw` para investigar.
- Por isso a aba Faturas mostra só o **restante a pagar** (saldo do cartão) e as faturas anteriores do Pluggy. Foram tentados e descartados: cálculo por fechamento, inferência do dia de fechamento e soma por mês (valores não bateram com o app do banco).
- Não confirmado: `DELETE /items/{id}` para MeuPluggy, nomes exatos dos eventos de webhook, se o webhook chega, se o MeuPluggy entrega `/investments` e as movimentações dos investimentos (o investimento Tesouro Direto LFT do BTG apareceu com valor investido, mas sem histórico).

## Regras de sincronização (`sync.ts`)

- Primeira sincronização: últimos 90 dias. Depois: a partir de `last_sync_at` menos 10 dias. Se existirem transações do Pluggy sem `raw`, volta a janela de 90 dias para preencher.
- Entra como gasto: `type === "DEBIT"`, valor em módulo. Fica de fora, fora de cartões: categorias do Pluggy que batem com `credit card payment|same person transfer|investment|proceeds|loan` e descrições de pagamento de fatura, aplicação ou resgate.
- Transações já existentes não são sobrescritas, para preservar correções do usuário.
- A sync também grava contas, faturas, investimentos e movimentações de investimento, cada etapa com `try/catch` próprio (falha numa não derruba as outras).

## Classificação

Ordem, no servidor (`classify.ts`) e no cliente (`classifyLocal` em `app.js`): 1) `rules[merchantKey]`, 2) palavras-chave `KEYWORDS` (a ordem importa), 3) categoria do Pluggy (`PLUGGY_MAP`), só no servidor, 4) IA via API da Anthropic se houver chave. As `KEYWORDS` e categorias estão **duplicadas** em `app.js` e `classify.ts`; ao mudar uma, mudar a outra.

Categorias (ids fixos): `mercado`, `restaurantes` (nome exibido: **Alimentação**), `transporte`, `moradia`, `contas`, `saude`, `lazer`, `compras`, `assinaturas`, `educacao`, `outros`.

## Interface (`web/app.js`)

Abas: **Resumo**, **Faturas**, **Investimentos**, **Objetivos**, **Metas**, **Lançamentos**, **Ajustes**.

- **Resumo**: valor livre do mês, rosca por categoria (legenda clicável filtra Lançamentos) e barras dos últimos 6 meses com linha da renda. Totais usam o valor líquido (descontando abatimentos).
- **Faturas**: um cartão visual por cartão de crédito (cores por banco e categoria, efeito tilt 3D com o mouse), "Restante a pagar", barra de limite e faturas anteriores.
- **Investimentos**: valor atual, aplicado e rendimento; cartão de indicadores do Banco Central (API SGS, sem chave, direto do navegador: Selic 432, CDI a.a. 4389, IPCA 433, dólar 1, CDI mensal 4391, cache de 6 h no localStorage); comparação da carteira com CDI e IPCA; gráfico de aportes por mês (estimado pela data de emissão quando não há movimentações); barras por banco e por tipo; lista por banco. Clique num investimento abre um dialog com fatos, barra única aporte x rendimento animada, comparação com CDI/IPCA, aportes por mês, valor acumulado e movimentações. Investimentos com saldo zero são ocultados.
- **Objetivos**: metas de patrimônio com valor-alvo, prazo, valor guardado à parte e investimentos vinculados (um investimento só em um objetivo). Mostra progresso animado e "guardar R$ X por mês". Botão de reserva de emergência (alvo = 6 x a média de gasto dos últimos 3 meses). Fica em `settings.data.objectives`.
- **Metas**: modos Pizza e Barras (tubos com onda e bolhas). Clicar numa categoria abre Lançamentos em Gastos com filtro dela.
- **Lançamentos**: três sub-abas. *Gastos* (lista por dia, seletor de categoria, filtro por categoria, valor original riscado quando há abatimento). *Abatimentos* (valor recebido que abate um ou mais lançamentos, com valores parciais; guarda em `offsets` com `status received`). *Cobranças* (lembrete: pessoa, valor, lançamentos cobertos; vira abatimento ao clicar "Recebi"; enquanto pendente só reserva o valor).
- **Ajustes**: bancos conectados (nome editável por banco, loader durante a conexão), renda, gastos fixos, metas por categoria com sliders + campo numérico + rosca ao vivo, conta.
- Importação OFX e CSV no cliente.
- Estado em memória: `S` (settings), `TX` (cache por mês), `items`, `accounts`, `bills`, `INV`, `INVTX`, `OFF`, `ABAT`/`RESERVED` (mapas de abatimento por lançamento), `IND` (indicadores). `refresh(force)` carrega 6 meses. `net(t)` é o valor líquido de um lançamento.
- Animações: elementos nascem no estado inicial e `animateIn()` aplica o final via `data-top`, `data-dash`, `data-h`, `data-w`. Há loader na abertura (`booting`/`loadingData`), toast persistente com spinner durante a conexão de banco, fundo com três ondas SVG que deslizam, entrada escalonada dos blocos e respeito a `prefers-reduced-motion`.
- Tema: preto acinzentado (`--bg: #151517`), roxo `--accent #8C8EFF`, fontes Bricolage Grotesque (números e títulos) e Figtree.
- Cuidado ao editar com scripts de substituição: a função `viewBancos` é o marcador onde blocos de view são inseridos; um corte entre `viewFaturas` e `viewBancos` já apagou por engano o bloco de investimentos uma vez.

## Estado atual e pendências

- Banco de dados foi resetado em 15/10/2026 (dados e ajustes apagados; login mantido). O usuário já reconectou o BTG.
- Pendente investigar: lançamentos de cartão faltando (ver seção do Pluggy). Passos: sincronizar, ver logs da função `pluggy`, comparar a lista de lançamentos com a fatura aberta no app do banco.
- Configurar `ANTHROPIC_API_KEY` para ligar a classificação por IA (`npx supabase secrets set ANTHROPIC_API_KEY=...`).

## Ideias já discutidas e ainda não feitas

- Patrimônio e saldos: saldo das contas correntes (`pluggy_accounts` tipo BANK já são gravadas), total líquido e evolução com snapshot diário.
- Carteira manual de ações, FIIs e cripto com cotação (brapi.dev, CoinGecko).
- Parcelas futuras dos cartões mês a mês e projeção do que sobra (as parcelas futuras já estão em `transactions` com data futura).
- Receitas e recorrências (hoje créditos são descartados), alertas por e-mail ou Telegram, hospedagem e PWA.
