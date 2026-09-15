@AGENTS.md

# finance

App pessoal de finanças (BRL, um usuário, custo zero). Next.js 16 App Router + TypeScript, React 19, Prisma 7 com `@prisma/adapter-pg`, Auth.js v5 (Google, um e-mail permitido), Tailwind v4, Vitest, Node 24 (Volta).

Desenho aprovado: `docs/superpowers/specs/2026-09-15-finance-design.md`. Leia antes de mexer em fluxo ou modelo.

## Comandos

```bash
npm run dev          # http://localhost:3000
npm test             # unitários (src/**/*.test.ts), sem banco
npm run test:int     # integração contra finance_test (TEST_DATABASE_URL)
npm run typecheck    # tsc --noEmit (rode `npx next typegen` se faltar LayoutProps/PageProps)
npm run lint
npm run db:migrate   # prisma migrate dev
npm run db:seed
```

## Regras deste projeto

- **Isolamento total** de qualquer outro projeto da máquina: identidade git local (`git config --local`), remoto pessoal, contas pessoais, bancos `finance` / `finance_test`. Nunca copiar arquivo, credencial ou referência de outro repositório.
- Nunca rodar `git commit` ou `git push`; o dono commita. Estagiar por nome, nunca `git add -A`.
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
- `prisma/schema.prisma`: modelo completo (ver spec para o porquê de cada tabela).
- `src/app/(app)/`: telas autenticadas; `src/app/login/`: entrada.
