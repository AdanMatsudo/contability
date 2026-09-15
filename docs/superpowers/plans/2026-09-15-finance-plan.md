> Cópia do plano aprovado em 2026-09-15 (origem: `~/.claude/plans/certo-gostei-de-como-velvety-corbato.md`). O andamento por fase fica em `docs/STATUS.md`, não aqui. Este arquivo só muda quando uma decisão de desenho muda.

# Finance — app de finanças pessoais (BRL, um usuário, custo zero)

## Contexto

Projeto novo, separado do projeto do trabalho. Objetivo: um lugar só pra registrar todo gasto e toda entrada, separar por categoria, importar extrato do banco, ter orçamento por categoria e ver as contas recorrentes, com **custo recorrente zero** (só free tier, sem cartão cadastrado). A direção visual foi aprovada no canvas (https://claude.ai/artifact/WHACscpBcobvqDx6kNdYKG, versão 3): navegação flutuante no centro, número gigante da sobra do mês, gráfico de barras diárias + linha de saldo acumulado, três cards de resumo, tabela filtrável; Importar em 3 passos; Lançamentos com painel lateral pra gasto manual e foto da nota.

Decisões já fechadas (não reabrir):

| Tema | Decisão |
|---|---|
| Usuários / hospedagem | Só você, na nuvem. Vercel Hobby + Neon Postgres free tier. |
| Login | Auth.js v5 com Google, um e-mail permitido (variável de ambiente). Sem tabela de auth (sessão JWT). |
| Stack | Next.js 16 App Router + TypeScript, React 19, Prisma 7, Tailwind v4, Vitest 5, Node 24. |
| Arquitetura | "B": `services/` (regra pura) → `repositories/` (só Prisma) → `adapters/` (BrasilAPI, Gemini, parsers). Server Actions finas. |
| Categorias | Lista plana, você gerencia, vem com padrão. Orçamento = centavos por mês na categoria. |
| Escopo | Gastos + receitas + orçamento por categoria + recorrentes. |
| Entradas | Importar CSV/OFX (Nubank conta e cartão primeiro), digitação manual, foto da nota. |
| Categorização | Regras aprendidas → CNPJ na descrição → BrasilAPI CNAE → mapa; Gemini free tier como último recurso, atrás do flag `AI_ENABLED`. |
| Nota fiscal | Gemini vision (flag) preenche o formulário; imagem redimensionada no navegador e guardada como bytes no Postgres. |
| Barra de IA | Última fase, opcional, mesmo flag. |
| Extratos reais | Você passa exports mascarados do Nubank quando a fase de importação começar. |
| Infra local | Postgres local pra dev e testes de integração (já tem na máquina). Neon só em produção. |
| Idioma | Textos da tela em português; código, comentários, commits e docs em inglês. Fonte Geist. |
| Pasta | `C:\Users\Admin\Documents\finance` (repositório git novo). Você commita; eu nunca rodo `git commit`. |

## Isolamento total do projeto do trabalho (regra número um)

Nada deste projeto encosta no trabalho: outro repositório, outro remoto, outra identidade de commit, outro banco, outras contas de nuvem. E sem precisar deslogar de nada, porque cada separação é automática por pasta ou por host.

| Camada | Hoje (lido na máquina) | Como fica no finance | Por que não precisa deslogar |
|---|---|---|---|
| Identidade do commit | global `user.email` = e-mail do trabalho | `git config --local user.name/user.email` com seus dados pessoais dentro de `Documents/finance` | Config local do repositório vence a global. Na pasta do projeto do trabalho continua o e-mail do trabalho. |
| Remoto | projeto do trabalho → host git da empresa via HTTPS | GitHub pessoal, repositório privado, via HTTPS | O Git Credential Manager guarda credencial por host: o host da empresa e `github.com` não se misturam. No primeiro push ele abre o navegador uma vez e salva. |
| Contas de nuvem | Google do trabalho | Conta Google **pessoal** pra Google Cloud (OAuth), Neon, Vercel e AI Studio (Gemini). `ALLOWED_EMAIL` = seu Gmail pessoal | Cada serviço tem login próprio no navegador. Nada criado sob o domínio da empresa. |
| Banco local | Postgres 15 (serviço `postgresql-x64-15`) com o banco do trabalho | Bancos novos `finance` e `finance_test`, com role própria `finance`, no mesmo servidor | Banco separado, dono separado. O banco do trabalho não é tocado. |
| Banco em nuvem | não existe | Neon free tier na conta pessoal | Separado por natureza. |
| Node | Volta: o projeto do trabalho fixa 12; padrão da máquina é 24 | `volta pin node@24` no `package.json` do finance | O Volta troca sozinho ao entrar na pasta. |
| Claude Code | memória, skills e MCP `postgres` apontam pro trabalho | Pasta nova = memória e `CLAUDE.md` próprios; as skills do trabalho não disparam; o MCP `postgres` atual não é usado aqui | Escopo por diretório. O hook que bloqueia `git commit` é global e continua valendo. |
| VS Code | workspace do trabalho | Janela separada só pro finance | Nunca os dois no mesmo workspace; nenhum arquivo copiado de um pro outro. |

Se um dia o GitHub pessoal e o trabalho acabarem no mesmo host, a saída é `includeIf "gitdir:..."` no `~/.gitconfig` mais `credential.useHttpPath = true`, ainda sem deslogar. Hoje não precisa.

Verificado durante o desenho: BrasilAPI responde sem chave e devolve `cnae_fiscal_descricao` (testei com um CNPJ real); a página de preços do Gemini lista um free tier. Não verificado: limite de requisições da BrasilAPI e se o free tier do Gemini pede cartão no cadastro.

## Regras transversais

- **Dinheiro** é `amountCents: number`, com sinal (negativo = saída). `formatBRL`, `parseBrl("1.234,56")`, `parseDecimal("-123.45")` em `src/lib/money.ts`, com teste.
- **Datas** no domínio são strings ISO `YYYY-MM-DD`; só o repositório converte pra `DateTime @db.Date`. "Hoje" e limites do mês calculados em `America/Sao_Paulo`. `src/lib/dates.ts`, com teste.
- **`normalized`** = maiúsculas, sem acento, sem dígitos, espaços colapsados. Regras e recorrentes casam por "contém" nesse campo. A extração de CNPJ roda na descrição **bruta**, antes de normalizar.
- **Hash de importação** = `sha1(accountId|date|amountCents|normalized|ordinal)`, onde `ordinal` é o índice entre linhas idênticas do mesmo arquivo (dois cafés iguais no mesmo dia não viram duplicata falsa). Guarda também o `FITID` do OFX como `externalId`.
- **Camadas:** service nunca importa Prisma nem Next; service orquestrador recebe um objeto `deps`, então o teste unitário injeta fakes. Repositório devolve tipo de domínio. Action: `requireUser()` → zod `safeParse` → service → `revalidatePath` → `ActionResult<T>`.
- **Falha externa nunca derruba um fluxo.** BrasilAPI ou Gemini fora → linha fica sem categoria e a tela mostra um aviso discreto.
- **TDD** em todo módulo puro (lib, services, parsers, mapeadores de adapter): teste primeiro, código depois.

## Modelo de dados (Prisma)

Enums: `AccountType {CHECKING, CREDIT_CARD, CASH}`, `CategoryKind {EXPENSE, INCOME, TRANSFER}`, `TransactionSource {MANUAL, IMPORT, RECEIPT}`, `CategorizedBy {RULE, CNPJ, AI, MANUAL}`.

- `Account(id, name, type)`
- `Category(id, name, kind, budgetCents Int?, color)`
- `Transaction(id, date @db.Date, amountCents Int, description, normalized, source, categorizedBy?, importHash? @unique, externalId?, accountId, categoryId?, importBatchId?, recurringId?)` — índices em `date`, `(accountId, date)`, `categoryId`.
- `Rule(id, pattern, categoryId, hits Int)`
- `CnpjCache(cnpj @id, found Boolean, razaoSocial?, cnaeCode?, cnaeDescription?, fetchedAt)`
- `CnaeMapping(id, cnaePrefix String /* 2 a 4 dígitos, prefixo mais longo vence */, categoryId)`
- `Recurring(id, description, amountCents, dayOfMonth, pattern, categoryId, accountId, active)`
- `Receipt(id, image Bytes, mime, transactionId @unique)`
- `ImportBatch(id, fileName, accountId, rowCount, importedCount, duplicateCount, createdAt)`
- `CsvMapping(headerSignature @id, mapping Json)` — lembra o mapa de colunas de um CSV desconhecido.
- `AiCategorization(normalized @id, categoryId?, model, createdAt)` — cache pra reimportar nunca chamar o Gemini duas vezes.

O tipo `TRANSFER` existe pra pagamento de fatura (`Pagamento de fatura` na conta, `Pagamento recebido` no cartão) não inflar entradas e saídas.

## Estrutura de pastas

```
finance/
  prisma/schema.prisma  prisma/migrations/  prisma/seed.ts   prisma.config.ts
  tests/fixtures/  (nubank-conta.csv, nubank-cartao.csv, sample.ofx, unknown.csv, latin1.csv)
  tests/integration/  (*.int.test.ts, Postgres local)
  docs/superpowers/specs/2026-09-15-finance-design.md   (Contexto + modelo + fluxos deste plano, em inglês)
  src/auth.ts  src/proxy.ts
  src/lib/        db.ts env.ts money.ts dates.ts text.ts hash.ts action-result.ts auth-guard.ts
  src/domain/types.ts
  src/services/   categories/ accounts/ transactions/ month/ import/ categorization/ recurring/ budgets/ receipts/
  src/repositories/  um arquivo por model
  src/adapters/   parsers/{types,detect,csv,nubank-account-csv,nubank-card-csv,ofx,generic-csv}.ts  brasilapi.ts  gemini.ts
  src/actions/    accounts.ts categories.ts transactions.ts import.ts receipts.ts recurring.ts  schemas/
  src/app/        layout.tsx  login/  api/auth/[...nextauth]/route.ts  api/receipts/[id]/route.ts
                  (app)/layout.tsx  (app)/page.tsx (Mês)  (app)/import  (app)/transactions  (app)/categories  (app)/recurring
  src/components/ ui/  charts/{MonthChart,MiniBars,Sparkline,StackedBar,scale}.tsx  month/ import/ transactions/ categories/ recurring/ nav/
```

## Fases

Cada fase termina com: testes unitários verdes (`npm test`), a conferência manual feita no browser, e o handoff pra você commitar.

### M0 — Bootstrap, login, banco, primeiro deploy
0. Isolamento antes de qualquer código: `git init` em `Documents/finance`, `git config --local user.name "<seu nome>"` e `git config --local user.email "<seu e-mail pessoal>"` (você me passa os dois), `git remote add origin https://github.com/<seu-usuario>/finance.git` (repositório privado criado por você na conta pessoal), `volta pin node@24`. Conferir com `git config user.email` dentro da pasta e fora dela. Criar `finance` e `finance_test` no Postgres local com role `finance` (comando `psql` que eu passo e você roda, ou eu rodo com seu OK).
1. `npx create-next-app@latest finance --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm` dentro de `C:\Users\Admin\Documents`. Conferir os nomes das flags no help do `create-next-app@16`.
2. Dependências: `next-auth@beta zod @google/genai papaparse @prisma/client @prisma/adapter-pg pg`; dev: `prisma tsx dotenv @types/pg @types/papaparse vitest vite-tsconfig-paths`.
3. `npx prisma init` → `prisma.config.ts` (`defineConfig`, `datasource.url = env("DIRECT_URL")`, `migrations.seed = "tsx prisma/seed.ts"`), schema com `generator client { provider = "prisma-client", output = "../src/generated/prisma" }`, `src/generated/` no gitignore, `src/lib/db.ts` com adapter `PrismaPg` + singleton global. Scripts: `postinstall: prisma generate`, `test`, `test:int`, `db:migrate`, `db:deploy`, `db:seed`.
4. `src/lib/env.ts` validando com zod: `DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, ALLOWED_EMAIL, AI_ENABLED, GEMINI_API_KEY?, GEMINI_MODEL?`.
5. Login: `src/auth.ts` (provider Google, `session.strategy = "jwt"`, `callbacks.signIn` compara o e-mail com `ALLOWED_EMAIL` ignorando caixa, `callbacks.authorized`), `api/auth/[...nextauth]/route.ts`, `src/proxy.ts` (`export { auth as proxy }` + matcher excluindo `/login`, `/api/auth` e estáticos), `src/lib/auth-guard.ts` `requireUser()` chamado no topo de toda action e no `(app)/layout.tsx`. Página `/login` com "Entrar com Google" e "Acesso negado" em `?error=AccessDenied`.
6. Testes primeiro: `money.test.ts`, `dates.test.ts` (ano bissexto, limites do mês, relógio injetado), `text.test.ts` (`normalize("Pão de Açúcar 123") === "PAO DE ACUCAR"`), `hash.test.ts` (determinístico; ordinal muda o hash).
7. Schema completo numa migration inicial contra o Postgres local. Escrever `docs/superpowers/specs/2026-09-15-finance-design.md` a partir deste plano.
8. Deploy do app vazio mas com login na Vercel já agora, pra tirar o risco das redirect URIs do OAuth cedo.

Conferência manual: `/` redireciona pra `/login`; a conta Google permitida entra em `/`; outra conta vê "Acesso negado"; o mesmo na URL `.vercel.app`.

Configuração que só você pode fazer, tudo na conta Google **pessoal**: repositório privado no GitHub; OAuth client (Web) no Google Cloud com as redirect URIs de localhost e da Vercel, tela de consentimento Externa com o seu e-mail como usuário de teste; projeto no Neon com as URLs pooled e direct; projeto na Vercel ligado ao repositório; banco `finance` no Postgres local.

### M1 — Contas e categorias (CRUD) + seed
- Repos `category.repo.ts`, `account.repo.ts`. Service `categoryService.validateName` (unicidade ignorando caixa e acento); apagar categoria zera `categoryId` nas transações dentro de um `$transaction`.
- Seed idempotente: contas (Nubank · conta, Nubank · cartão, Dinheiro); categorias com cor (Casa, Mercado, Transporte, Alimentação fora, Saúde, Lazer, Assinaturas, Compras, Educação, Viagem, Outros; receita: Salário, Rendimentos, Outras receitas; Transferência); regras iniciais (`IFOOD`, `UBER`, `PAGAMENTO DE FATURA`→Transferência, `RENDIMENTO`); mapas CNAE (56→Alimentação fora, 4711/4712→Mercado, 4731→Transporte, 4771→Saúde, 49→Transporte, 86→Saúde, 85→Educação, 61→Casa, 35/36→Casa, 55→Viagem, 59/90/93→Lazer, 47→Compras, 68→Casa).
- Tela `/categories`: lista + formulário inline (nome, tipo, cor, orçamento em BRL → centavos); contas como segunda aba na mesma página.

Conferência manual: seed duas vezes → sem duplicata; criar/editar/apagar categoria; apagar uma com transações deixa elas sem categoria.

### M2 — Gasto manual + página Mês
- Repo `transaction.repo.ts`: `listByMonth`, `create/update/remove`, `sumByMonthRange` (SQL puro com `date_trunc`), `existingHashes`.
- Services (puros, teste primeiro): `transactionService.buildFromManual`, `monthService.summarize(txs, categories, month) → MonthSummary { incomeCents, expenseCents, balanceCents, days[], byCategory[], topCategories }` (TRANSFER fora), `monthService.history6`, `insightService.build(current, previous) → string` (frases em PT; todo ramo testado: sem mês anterior, sem saídas, subiu, caiu, uma categoria só, 0/1/2/3+ categorias estouradas unidas com `, ` e ` e `), `transactionFilter.apply`.
- Gráficos como componentes client puros que recebem números já calculados: `MonthChart` (barras diárias entrada/saída + linha acumulada, um eixo só, tooltip no hover), `MiniBars` (6 meses, atual em destaque), `Sparkline` (saída acumulada), `StackedBar` (top 4 + Outros, vãos de 2px). `scale.ts` com teste.
- Páginas: `(app)/page.tsx` com `?month=YYYY-MM`; `/transactions` com `<SidePanel>` do formulário manual (`<MoneyInput>` com máscara pt-BR, data padrão hoje em SP, conta, categoria, descrição) → `createTransaction`; editar/apagar por linha.
- Levar pra tela real os acertos que a revisão do protótipo apontou: sobra negativa mostra o sinal de menos; o quinto bloco usa o nome da categoria que sobrou em vez de "Outros"; estado vazio quando o filtro zera a lista; hover por classe, não inline; coluna "Origem" significa origem do lançamento (importado / manual / nota) e usa badge.

Conferência manual: criar gasto e receita; número e gráfico atualizam; mês anterior pelas setas; filtro por categoria; apagar.

### M3 — Importação (parsers → hash → regras → revisão → confirmar / desfazer)
- Esperar seus exports mascarados do Nubank; salvar em `tests/fixtures/`. Se não vierem, escrever pelo layout conhecido (CSV conta `Data,Valor,Identificador,Descrição` dd/mm/aaaa; CSV cartão `date,title,amount` aaaa-mm-dd com positivo = compra, então inverter o sinal) e marcar pra validar.
- Parsers (`src/adapters/parsers/`): `types.ts` (`ParsedRow`, `StatementParser`), `csv.ts` (UTF-8 com fallback windows-1252, papaparse com delimitador automático), `nubank-account-csv.ts`, `nubank-card-csv.ts`, `ofx.ts` (SGML e XML, regex sobre `<STMTTRN>`, `DTPOSTED` 8 primeiros caracteres, `FITID`), `generic-csv.ts` com `ColumnMapping` + `headerSignature`, `detect.ts`.
- Services `src/services/import/`: `prepareRows` (normalized, cnpj, ordinal, hash), `markDuplicates`, `categorization/rules.ts matchRule` (padrão mais longo vence, empate → mais hits), `categorization/cascade.ts categorizeRows(rows, deps)` (RULE → CNPJ → AI, cada estágio só nas linhas ainda sem categoria, falha vira aviso; CNPJ e AI são stubs até M4/M5), `confirm.ts buildConfirmPlan` (pula duplicadas e excluídas; cria `Rule` pra cada linha cuja categoria você escolheu ou trocou; `hits++` nas linhas aceitas por RULE), `import.service.ts` orquestração (`prepareImport`, `confirmImport` num `$transaction` só, `undoImport`).
- Repos: `import-batch.repo.ts`, `rule.repo.ts`, `csv-mapping.repo.ts`; `transaction.repo.ts` ganha `createMany({skipDuplicates})` e `deleteByBatch`.
- Actions `src/actions/import.ts`: `prepareImport(formData)`, `confirmImport(payload)`, `undoImport(batchId)`, `saveCsvMapping`. O estado da revisão fica no cliente entre os passos (bem abaixo do limite de 1 MB do body da action); zod revalida cada linha no confirmar.
- Tela `/import`: passo 1 upload (conta, área de soltar, badge do formato detectado; CSV desconhecido → mapa de colunas com prévia de 5 linhas, "salvar mapeamento"); passo 2 revisão (checkbox incluir, pílula de categoria por linha, badges Regra / CNPJ / IA / Já importada, barra de aviso discreta, Confirmar desabilitado enquanto faltar categoria); passo 3 resultado com contagens, regras aprendidas (só as que você definiu), "Desfazer importação"; lista de importações recentes com desfazer.
- Testes primeiro: cada parser contra seu fixture (quantidade de linhas, primeira e última exatas, sinal, encoding), tabela de casos do `detectFormat`, `prepareRows`, `markDuplicates`, `matchRule`, `categorizeRows` com fakes, `buildConfirmPlan`. Integração (`tests/integration/import.int.test.ts`, Postgres local, migrate + truncate por teste): confirmar cria lote/transações/regras; reimportar → tudo duplicado; desfazer remove só aquele lote e mantém as regras.

Conferência manual: importar o CSV da conta → regras casam; trocar duas categorias; confirmar; Mês reflete; reimportar → 100% duplicado; desfazer; importar um CSV desconhecido → fluxo de mapa, lembrado no segundo upload.

### M4 — Adapter CNPJ + mapa CNAE
- `src/adapters/brasilapi.ts fetchCnpj(cnpj, {signal})` com `AbortSignal.timeout(5000)`, 404 → `null`, o resto → `AdapterError`.
- `services/categorization/cnpj.ts`: `resolveCnpj` (cache incluindo negativo, depois fetch, depois grava), `mapCnae` (prefixo mais longo vence), `runWithConcurrency(tasks, 3)`.
- Testes primeiro: precedência de prefixo; cache hit/miss/negativo; adapter com `vi.stubGlobal("fetch")` pra 200/404/500/timeout.
- Tela: seção "Mapeamento CNAE" em `/categories`; tabela de revisão mostra `razaoSocial` nas linhas casadas por CNPJ.

Conferência manual: importar extrato com CNPJs de Pix; segunda rodada acerta o `CnpjCache`; com a rede desligada a importação termina e mostra o aviso.

### M5 — Adapter Gemini (categorização em lote + leitura da nota), atrás de `AI_ENABLED`
- `src/adapters/gemini.ts` via `@google/genai`: `categorizeDescriptions(items, categories)` numa chamada `generateContent` só, com schema JSON de resposta (dividir acima de ~200 itens); `readReceipt({mime, base64})` → `{ totalCents, date, merchant, cnpj }`. Ambos validados com zod; falha → `AdapterError`. Conferir a API atual do SDK pra saída estruturada antes de codar.
- `services/categorization/ai.ts categorizeWithCache` (consulta `AiCategorization` primeiro, chama só pros que faltam, grava também os nulos, mapeia nome → id ignorando acento). A dep é `undefined` com o flag desligado.
- Notas: `actions/receipts.ts readReceipt(formData)` → preenchimento; `createTransactionWithReceipt` → `receiptService.create` (`$transaction` com Transaction source RECEIPT + Receipt). `GET /api/receipts/[id]` entrega os bytes atrás de `requireUser`. Cliente `ReceiptCapture.tsx`: `<input type="file" accept="image/*" capture="environment">`, `createImageBitmap` + canvas pra 1280px, JPEG 0.7, alvo ≤ 250 KB. `next.config.ts` `serverActions.bodySizeLimit: "2mb"`.
- Testes primeiro: mapeamento do adapter com `generateContent` falso (válido, JSON quebrado, categoria desconhecida, vazio); `categorizeWithCache` chama uma vez só com os que faltam; ordem da cascata RULE → CNPJ → AI; `receiptService` sinal e origem.

Conferência manual: `AI_ENABLED=false` nunca chama o Gemini; `true` → uma chamada por importação (logar a contagem), linhas de cache aparecem; fotografar um cupom pelo celular na URL da Vercel, campos preenchidos, imagem abre pela linha.

### M6 — Recorrentes + orçamento
- Services (puros, teste primeiro): `recurringService.matchTemplate(tx, templates, alreadyLinked)` (ativo, padrão contém, mesmo mês ainda não casado, tolerância de ±10% no valor), `recurringService.expected(templates, month, linkedIds) → PlannedItem[]` (dia limitado ao tamanho do mês), `budgetService.progress(categories, byCategory)` → `ok | warn | over`.
- Ganchos: `transactionService.create` e `confirmImport` preenchem `recurringId`. `MonthSummary` ganha `planned[]` e `projectedBalanceCents`.
- Telas: `/recurring` CRUD; tabela do Mês mostra linhas fantasma "previsto" com atalho "Registrar" que abre o painel preenchido; card de saídas e `/categories` mostram barras de orçamento.

Conferência manual: molde "NETFLIX" 44,90 dia 10 → aparece como previsto; importar CSV do cartão com Netflix casa e o fantasma some; orçamento 800 em Mercado fica vermelho ao estourar.

### M7 — Produção + checklist de deploy
- Vercel: build `prisma generate && next build` (o postinstall já gera); migrations rodam do seu notebook com `npm run db:deploy` contra o `DIRECT_URL` de produção, nunca no build.
- Variáveis na Vercel Production: `DATABASE_URL` (pooled), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOWED_EMAIL`, `AI_ENABLED`, `GEMINI_API_KEY`, `GEMINI_MODEL`. Conferir se `AUTH_TRUST_HOST` é necessário.
- `export const maxDuration = 60` nas páginas `/import` e `/transactions` (BrasilAPI + Gemini em sequência passam dos 10 s padrão).
- Smoke em produção: login permitido/negado, importar, nota pelo celular, desfazer, navegar entre meses.

### M8 — Opcional: barra "Pergunte sobre o seu mês" (mesmo flag)
- Método `answerQuestion(question, monthSummary, topTransactions)` no adapter → resposta curta em PT; action + componente da barra flutuante com as duas sugestões. Rótulo neutro (sem nome de fornecedor na tela). Só se a cota grátis se mostrar confortável na M5.

## Estratégia de testes

- **Unitário** (`npm test`, projeto Vitest `unit`, sem banco): todo `src/lib`, `src/services`, `src/adapters/parsers`, mapeadores de adapter com `fetch`/SDK mockados. Fixtures em `tests/fixtures/`.
- **Integração** (`npm run test:int`, projeto Vitest `integration`): repositórios, `confirmImport/undoImport`, `receiptService.create`, ligação de recorrentes, contra o Postgres local `finance_test` (`TEST_DATABASE_URL`), `globalSetup` roda `prisma migrate deploy`, `beforeEach` trunca.
- **Smoke manual** por fase (listado acima), repetido no preview da Vercel em M3, M5 e M7.
- **Lint**: `npm run lint` nos arquivos alterados antes de todo handoff.

## Riscos / conferir na doc durante a implementação

- Prisma 7: saída do `prisma init`, `postinstall` gerar na Vercel, opções do generator `prisma-client`, `Bytes` → `Uint8Array`, `createMany({skipDuplicates})` no Postgres, `$transaction` interativo com driver adapter.
- Next 16: semântica do `proxy.ts`; Server Functions em rota fora do matcher passam por fora do proxy (daí o `requireUser()` em tudo); `params`/`searchParams` são Promises; páginas com banco precisam ser dinâmicas.
- Auth.js v5 beta: comportamento do redirect no callback `authorized`; `AUTH_TRUST_HOST` na Vercel.
- Gemini free tier: nomes de modelo mudam; manter `GEMINI_MODEL` no env; dados do free tier podem ser usados pelo Google pra melhorar produtos (descrições do banco e cupons). Te aviso antes de ligar o flag.
- Vercel Hobby: body da action 1 MB padrão (subimos pra 2 MB), timeout de função 10 s padrão (`maxDuration`).
- Neon Free: 0,5 GB, cold start de ~1 s ao acordar; uns 2.000 cupons antes de apertar o espaço.
- Parsers: cabeçalho do Nubank muda de vez em quando; a detecção lê o cabeçalho e os testes travam nos fixtures. `normalize()` tirando dígitos junta `99APP` com `APP`; a descrição bruta fica guardada pra exibir e pro CNPJ.

## Acordo de trabalho durante a execução

- Uma fase por vez; ao fim de cada uma, passo pelos arquivos alterados, estagio por nome e te passo a mensagem de commit. Nunca `git add -A`, nunca `git commit`.
- Antes de qualquer script que escreva no Neon de produção ou chame API que pareça paga, aviso e espero o OK.
- Diagrama antes da prosa em qualquer explicação com 3 ou mais ramos.
- Docs e planos deste projeto pessoal em pt-BR; código, comentários e commits continuam em inglês.
- Nada do projeto do trabalho entra aqui e nada daqui entra lá: sem copiar arquivo, sem reaproveitar credencial, sem citar o trabalho em código ou commit. Antes do primeiro commit eu confiro `git config user.email` e `git remote -v` e te mostro a saída.
