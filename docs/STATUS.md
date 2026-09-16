# Status do projeto

Nota viva. Quem abre uma sessão nova lê este arquivo primeiro e retoma daqui. Atualizar a
cada handoff (fim de fase ou fim de sessão), antes de passar a mensagem de commit.

## Onde estamos

| Fase | Estado | Observação |
|---|---|---|
| M0 · bootstrap, login, banco | ✔ commitada e pushada | `c28c8fd` na `main` |
| M1 · contas e categorias + seed | ✔ commitada (`de6be9a`) e conferida no browser | não pushada |
| M1.5 · estrutura de erros | ✔ código pronto, em stage | `AppError` + `runAction` + `ErrorNotice`; erro do Auth.js cai em `/login` |
| M1.6 · categorias: busca, filtro, ordem, grade, painel lateral | ✔ commitada (`9b402bc`) e pushada | |
| M2 · gasto manual + página Mês | ✔ código pronto, em stage | falta conferência no browser |
| M3 · importação | ○ | **próxima**; depende dos exports mascarados do Nubank (dono passa quando chegar lá) |
| M4 · CNPJ + mapa CNAE | ○ | |
| M5 · Gemini (flag `AI_ENABLED`) | ○ | avisar antes de ligar o flag |
| M6 · recorrentes + orçamento | ○ | |
| M7 · produção (Neon + Vercel) | ○ | |
| M8 · barra "Pergunte sobre o seu mês" | ○ opcional | |

Detalhe de cada fase: `docs/superpowers/plans/2026-09-15-finance-plan.md`.

## Bloqueios e pendências do dono

- ~~OAuth Google~~ feito em 2026-09-15: client Web criado na conta pessoal, redirect
  `http://localhost:3100/api/auth/callback/google`, credenciais no `.env`, login conferido.
- Neon e Vercel só na M7.
- Exports mascarados do Nubank (conta e cartão) só na M3; vão em `tests/fixtures/`.

## Conferência manual pendente

M1 conferida em 2026-09-15: login, criar/editar/apagar categoria, nome duplicado no campo,
aba Contas. Não testado: login com outra conta Google (precisa de uma segunda conta à mão).

M1.6 conferida em 2026-09-15 ("funcionou" do dono após a grade e o painel).

M2 pendente: criar gasto e receita em `/transactions` (máscara de valor, data padrão hoje,
categoria filtrada pelo tipo); número gigante e gráfico atualizam em `/`; setas de mês; clicar
uma categoria no card Saídas ou na barra empilhada filtra a tabela; frase do card "Onde o
dinheiro foi"; editar e apagar pelo painel; filtros de `/transactions` na URL.

## Convenções que nasceram depois do plano

- **Erros** (`src/lib/errors.ts`): toda falha intencional é uma subclasse de `AppError` com
  `code` (`VALIDATION`, `CONFLICT`, `NOT_FOUND`, `UNAUTHORIZED`, `EXTERNAL_UNAVAILABLE`,
  `DB_UNAVAILABLE`, `UNEXPECTED`), mensagem em pt-BR pra tela e `cause` técnica só pro log.
  Service lança; a action embrulha tudo em `runAction()` (único try/catch); a tela mostra
  mensagem + código via `<ErrorNotice>`. Erros do Prisma são reconhecidos por forma, sem
  importar Prisma em `lib/`. Erro do Auth.js vai pra `/login?error=` e passa por
  `authErrorMessage()`.
- **Porta 3100** no dev, pra não colidir com outro projeto da máquina.
- **Entrada nunca cai em cartão de crédito** (`accountsForFlow`, decidido em 2026-09-16). O
  formulário esconde cartões quando o tipo é Entrada e o servidor recusa. Estorno de compra no
  cartão é saída negativa, não entrada: na M3, valor positivo num CSV de cartão vira estorno.
- **Editar e criar acontecem no `<SidePanel>`** (direita), em toda tela. O cartão selecionado
  ganha borda na própria cor e os demais caem pra 60% de opacidade. "Apagar" mora no rodapé do
  painel, nunca no cartão. Filtros de lista vivem na URL (`?q=&kind=&sort=`) e o filtro em si é
  função pura (`services/categories/category-filter.ts`). Atalhos: `/` foca a busca, `Esc`
  limpa ou fecha, `Enter` com um resultado abre a edição. Busca sem resultado oferece "Criar".

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
  repo, esta nota criada, `CLAUDE.md` ganhou a seção de retomada. Regra de git mudou:
  commit pelo assistente com "pode fazer"; testado, o harness permitiu. Commits `de6be9a`
  (M1) e `e218fe4` (docs) feitos pelo assistente com autorização.
- **2026-09-15 (madrugada)** · OAuth client criado, login funcionando na porta 3100. Um
  callback aberto na mão expôs a página 500 crua do Auth.js; nasceu a estrutura de erros
  (`AppError`, `runAction`, `ErrorNotice`, `authErrorMessage`), 71 unitários + 3 integração
  verdes, typecheck e lint limpos.
- **2026-09-15 (madrugada, cont.)** · tela de categorias refeita: barra fixa com busca, segmento
  por tipo e ordem (nome, orçamento, mais usadas em 90 dias via `categoryRepo.usageCounts`),
  grade de cartões, painel lateral pra criar/editar com cartão-fantasma, estado vazio que cria.
  83 unitários + 4 integração, typecheck, lint e `next build` verdes.
- **2026-09-16 (madrugada)** · M2 codada: `transaction.service`, `month.service` (resumo do mês,
  histórico de 6 meses), `insight.service` (frase em pt-BR, todo ramo testado),
  `transaction-filter`, `scale` e quatro gráficos SVG sem biblioteca; `transaction.repo` com
  `sumByMonthRange` em SQL; páginas `/` (Mês) e `/transactions` com painel lateral e máscara
  de dinheiro. 118 unitários + 8 integração, typecheck, lint e `next build` verdes.
