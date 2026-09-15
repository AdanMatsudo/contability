# finance

App pessoal de finanças em BRL: lançamentos, categorias com orçamento, importação de extrato (Nubank conta e cartão, OFX), recorrentes e foto da nota. Um usuário, login com Google, custo recorrente zero (Vercel Hobby + Neon free tier).

Desenho e decisões: `docs/superpowers/specs/2026-09-15-finance-design.md`.

## Rodar local

```bash
cp .env.example .env     # preencher DATABASE_URL, AUTH_* e ALLOWED_EMAIL
npm install              # também gera o Prisma Client
npm run db:migrate
npm run dev              # http://localhost:3000
```

Precisa de um Postgres local com os bancos `finance` e `finance_test` (role `finance` com `CREATEDB`, usado pelo banco-sombra do `prisma migrate dev`).

## Testes

```bash
npm test          # unitários, sem banco
npm run test:int  # integração contra finance_test
```
