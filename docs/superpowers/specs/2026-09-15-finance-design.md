# Finance — desenho aprovado (2026-09-15)

App pessoal de finanças em BRL, um usuário, custo recorrente zero. Este documento fixa o que foi decidido antes do código. O plano de execução por fases está em `docs/superpowers/plans/2026-09-15-finance-plan.md` e o andamento em `docs/STATUS.md`; o protótipo aprovado está em https://claude.ai/artifact/WHACscpBcobvqDx6kNdYKG (versão 3).

## Decisões

| Tema | Decisão |
|---|---|
| Usuários / hospedagem | Só o dono, na nuvem. Vercel Hobby + Neon Postgres free tier. |
| Login | Auth.js v5 com Google, um e-mail permitido (`ALLOWED_EMAIL`). Sessão JWT, sem tabela de auth. |
| Stack | Next.js 16 App Router + TypeScript, React 19, Prisma 7 (`@prisma/adapter-pg`), Tailwind v4, Vitest, Node 24. |
| Arquitetura | `services/` (regra pura) → `repositories/` (só Prisma) → `adapters/` (BrasilAPI, Gemini, parsers). Server Actions finas: `requireUser()` → zod → service → `revalidatePath` → `ActionResult`. |
| Categorias | Lista plana gerenciada pelo usuário, com padrão no seed. Orçamento = centavos por mês na categoria. |
| Entradas de dados | Importar CSV/OFX (Nubank conta e cartão primeiro), digitação manual, foto da nota. |
| Categorização | Regra aprendida → CNPJ na descrição → BrasilAPI (CNAE) → mapa CNAE → Gemini free tier (flag `AI_ENABLED`) → sem categoria. |
| Nota fiscal | Gemini vision preenche o formulário; imagem redimensionada no navegador (~250 KB) e guardada como bytes no Postgres. |
| Recorrentes | Molde por padrão de texto; o mês mostra "previsto" até um lançamento casar. |
| Isolamento | Nada compartilhado com outros projetos da máquina: repositório, identidade git, remoto, contas de nuvem e bancos próprios. |

## Regras transversais

- Dinheiro em centavos inteiros com sinal (negativo = saída).
- Datas de domínio como strings ISO `YYYY-MM-DD`; "hoje" e limites do mês em `America/Sao_Paulo`.
- `normalized` = maiúsculas, sem acento, sem dígitos, só letras e espaços simples. Regras e recorrentes casam por "contém".
- Hash de importação = `sha1(accountId|date|amountCents|normalized|ordinal)`; `ordinal` separa linhas idênticas do mesmo arquivo.
- Falha externa nunca derruba um fluxo: a linha fica sem categoria e a tela avisa.
- Nada é gravado numa importação antes do usuário confirmar a revisão.

## Modelo de dados

Enums: `AccountType {CHECKING, CREDIT_CARD, CASH}`, `CategoryKind {EXPENSE, INCOME, TRANSFER}`, `TransactionSource {MANUAL, IMPORT, RECEIPT}`, `CategorizedBy {RULE, CNPJ, AI, MANUAL}`.

Tabelas: `Account`, `Category(budgetCents?)`, `Transaction(date, amountCents, description, normalized, source, categorizedBy?, importHash? unique, externalId?, accountId, categoryId?, importBatchId?, recurringId?)`, `Rule(pattern unique, hits)`, `CnpjCache(cnpj, found, razaoSocial?, cnaeCode?, cnaeDescription?)`, `CnaeMapping(cnaePrefix 2–4 dígitos)`, `Recurring(description, amountCents, dayOfMonth, pattern, active)`, `Receipt(image bytes, mime, transactionId unique)`, `ImportBatch(fileName, rowCount, importedCount, duplicateCount)`, `CsvMapping(headerSignature, mapping)`, `AiCategorization(normalized, categoryId?, model)`.

`TRANSFER` existe pra pagamento de fatura não contar como entrada nem saída.

## Fluxos

**Importar.** Arquivo → detectar formato (Nubank conta, Nubank cartão, OFX; CSV desconhecido abre o mapa de colunas e salva em `CsvMapping`) → linhas → hash → marcar duplicadas → cascata de categorização → tela de revisão → confirmar grava `ImportBatch` + `Transaction` + `Rule` novas pra cada categoria escolhida pelo usuário → desfazer apaga só as transações do lote.

**Nota fiscal.** Foto → redimensionar no navegador → Gemini devolve valor, data e estabelecimento → formulário preenchido → confirmar grava `Transaction(source RECEIPT)` + `Receipt`. Com o flag desligado, o formulário abre vazio e a foto vai só de anexo.

**Mês.** Sobra do mês como número principal; gráfico de barras diárias (entradas e saídas) com linha de saldo acumulado num eixo só; cards de entradas (6 meses), saídas (top categorias + curva acumulada) e "onde o dinheiro foi" (barra empilhada + frase gerada); tabela de lançamentos filtrável; recorrentes não casados como "previsto".

## Telas

Navegação flutuante no centro com cinco ícones (Mês, Lançamentos, Importar, Categorias, Recorrentes). Fundo `#f3f3f1`, cards brancos de canto 20px, texto `#111110`, botão primário preto. Entradas em verde `#1baf7a`, saídas em laranja `#eb6834`; categorias na barra empilhada com paleta validada para daltonismo (`#2a78d6`, `#4a3aa7`, `#eda100`, `#e87ba4`, restante em `#c9c8c2`). Fonte Geist. Textos em português.
