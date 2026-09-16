@AGENTS.md

# finance

App pessoal de finanças (BRL, um usuário, custo zero). Next.js 16 App Router + TypeScript, React 19, Prisma 7 com `@prisma/adapter-pg`, Auth.js v5 (Google, um e-mail permitido), Tailwind v4, Vitest, Node 24 (Volta).

## Começando uma sessão (leia nesta ordem)

1. `docs/STATUS.md`: onde o projeto está, o que bloqueia, o que o dono ainda precisa fazer. Retome daqui, sem refazer brainstorm nem desenho.
2. `docs/superpowers/specs/2026-09-15-finance-design.md`: decisões fechadas, modelo e fluxos. Não reabrir.
3. `docs/superpowers/plans/2026-09-15-finance-plan.md`: as fases M0–M8 com o detalhe de cada uma.

Protótipo aprovado (v3): https://claude.ai/artifact/WHACscpBcobvqDx6kNdYKG

## Acordo de trabalho

- Uma fase por vez. Cada fase termina com `npm test` verde, conferência manual no browser e handoff: passar pelos arquivos alterados, estagiar por nome, entregar a mensagem de commit.
- **Todo handoff atualiza `docs/STATUS.md`** (tabela de fases, bloqueios, log de sessões). É o que salva o contexto se o chat se perder.
- Antes de qualquer script que escreva no Neon de produção ou chame API que pareça paga, avisar e esperar o OK. `AI_ENABLED` só liga com OK explícito.
- Diagrama antes da prosa em qualquer explicação com 3 ou mais ramos.
- Antes de qualquer ação de git, mostrar `git config user.email` e `git remote -v`.

## Comandos

```bash
npm run dev          # http://localhost:3100
npm test             # unitários (src/**/*.test.ts), sem banco
npm run test:int     # integração contra finance_test (TEST_DATABASE_URL)
npm run typecheck    # tsc --noEmit (rode `npx next typegen` se faltar LayoutProps/PageProps)
npm run lint
npm run db:migrate   # prisma migrate dev
npm run db:seed
```

## Regras deste projeto

- **Isolamento total** de qualquer outro projeto da máquina: identidade git local (`git config --local`), remoto pessoal, contas pessoais, bancos `finance` / `finance_test`. Nunca copiar arquivo, credencial ou referência de outro repositório. Nunca citar o trabalho em código, commit ou doc.
- **Git, regra deste projeto (substitui a seção Git do `CLAUDE.md` global aqui):**
  - Commit só com autorização do dono **na mesma mensagem** ("pode fazer", "pode commitar", "commita"). Push só se a mensagem disser push ("sobe", "pode dar push"). Um "ok" pra outra coisa não conta. Sem pedido, handoff normal: arquivos estagiados por nome e mensagem de commit sugerida.
  - Antes de qualquer `git commit` ou `git push`: rodar `git config user.email` e `git remote -v`, mostrar a saída e só seguir se o e-mail for o pessoal e o remoto for `github.com/AdanMatsudo/contability.git`. Qualquer outra coisa: parar e avisar.
  - Estagiar por nome, nunca `git add -A`, `.` ou `-u`. Nunca `commit -a`, `--amend`, `push --force`. Mensagem em inglês, uma linha no título, sem nome de pessoa.
- Idioma: textos de tela, docs e planos em **português**; código, comentários, commits e nomes de identificador em **inglês**.
- Dinheiro em centavos inteiros com sinal. Datas de domínio como string ISO `YYYY-MM-DD`; "hoje" em `America/Sao_Paulo` (`src/lib/dates.ts`).
- Camadas: `services/` (regra pura, sem Prisma nem Next, deps injetadas) → `repositories/` (só Prisma) → `adapters/` (BrasilAPI, Gemini, parsers). Server Action = `requireUser()` → zod → service → `revalidatePath` → `ActionResult`.
- TDD nos módulos puros: teste primeiro em `*.test.ts` ao lado do arquivo.
- Falha de serviço externo nunca derruba um fluxo; vira aviso na tela.
- Sem comentário com cara de IA. Comentário curto, só quando o porquê não está no diff.
- `src/generated/` é gerado pelo Prisma e ignorado pelo git; `AGENTS.md` é reescrito pelo `next dev`, commitar junto.

## Onde está cada coisa

- `src/auth.ts`, `src/proxy.ts`, `src/lib/auth-guard.ts`: login e proteção de rota.
- `src/lib/`: `money`, `dates`, `text` (normalize), `hash` (importHash), `env`, `db`, `action-result`.
- `prisma/schema.prisma`: modelo completo (ver spec para o porquê de cada tabela). `prisma/seed.ts` + `seed-data.ts`: seed idempotente.
- `src/domain/types.ts`: tipos de domínio devolvidos pelos repositórios.
- `src/services/`, `src/repositories/`, `src/actions/` (+ `actions/schemas/` com os zod).
- `src/components/nav/` (pílula flutuante, barra do topo), `components/ui/`, `components/categories/`.
- `src/app/(app)/`: telas autenticadas (`/` Mês, `/categories`); `src/app/login/`: entrada.
- `tests/integration/`: `db.ts` (truncate), `global-setup.ts` (`migrate deploy` no `finance_test`), `*.int.test.ts`.
