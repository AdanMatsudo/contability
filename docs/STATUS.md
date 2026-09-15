# Status do projeto

Nota viva. Quem abre uma sessão nova lê este arquivo primeiro e retoma daqui. Atualizar a
cada handoff (fim de fase ou fim de sessão), antes de passar a mensagem de commit.

## Onde estamos

| Fase | Estado | Observação |
|---|---|---|
| M0 · bootstrap, login, banco | ✔ commitada e pushada | `c28c8fd` na `main` |
| M1 · contas e categorias + seed | ✔ código pronto, em stage | falta commit do dono e conferência no browser |
| M2 · gasto manual + página Mês | ○ não começou | próxima |
| M3 · importação | ○ | depende dos exports mascarados do Nubank (dono passa quando chegar lá) |
| M4 · CNPJ + mapa CNAE | ○ | |
| M5 · Gemini (flag `AI_ENABLED`) | ○ | avisar antes de ligar o flag |
| M6 · recorrentes + orçamento | ○ | |
| M7 · produção (Neon + Vercel) | ○ | |
| M8 · barra "Pergunte sobre o seu mês" | ○ opcional | |

Detalhe de cada fase: `docs/superpowers/plans/2026-09-15-finance-plan.md`.

## Bloqueios e pendências do dono

- **OAuth Google (bloqueia o teste de login local).** Criar no Google Cloud, na conta pessoal,
  um OAuth client tipo Web com redirect `http://localhost:3000/api/auth/callback/google`; tela
  de consentimento Externa com o e-mail de `ALLOWED_EMAIL` como usuário de teste. Colocar
  `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` no `.env`.
- **Commit da M1.** Mensagem sugerida:
  `feat: categories and accounts CRUD with idempotent seed and floating nav`
- Neon e Vercel só na M7.
- Exports mascarados do Nubank (conta e cartão) só na M3; vão em `tests/fixtures/`.

## Conferência manual pendente

M1: login permitido entra; outra conta Google vê "Acesso negado"; criar, editar e apagar
categoria em `/categories`; apagar categoria com lançamentos deixa eles sem categoria; aba
Contas; seed rodado duas vezes não duplica (já coberto por teste de integração).

## Ambiente local

- Postgres 15 local, bancos `finance` e `finance_test`, role `finance` (senha só no `.env`).
- `.env` a partir de `.env.example`. Nunca commitar.
- Identidade git local pessoal e remoto pessoal no GitHub. Conferir com `git config user.email`
  e `git remote -v` antes de qualquer ação de git.
- Commit e push pelo assistente só com autorização explícita do dono na mesma mensagem
  (regra em `CLAUDE.md`). O hook de git do projeto do trabalho não carrega nesta pasta; ele
  só barra quando o chat nasce com o cwd lá. Abrir o finance sempre na própria pasta.
- `.serena/` é pasta local de ferramenta, ignorada no `.gitignore`.

## Log de sessões

- **2026-09-14 → 15** · brainstorm, modelo de dados, fluxo de importação, protótipo em três
  versões (aprovada a v3: navegação flutuante, número gigante da sobra, gráfico barras + linha),
  plano em 9 fases, M0 completa e pushada, M1 codada e estagiada. Handoff pedindo o OAuth client.
- **2026-09-15 (noite)** · chat anterior perdido e recuperado do transcript; plano copiado pro
  repo, esta nota criada, `CLAUDE.md` ganhou a seção de retomada.
