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
| M2 · gasto manual + página Mês | ✔ commitada (`01c7e5d`) e pushada | conferida pelo dono |
| M3 · importação | ✔ código pronto, em stage | parsers validados só contra **fixtures sintéticas**; falta conferência no browser e os exports reais |
| M4 · CNPJ + mapa CNAE | ✔ código pronto, em stage | falta conferência no browser |
| M5 · Gemini (flag `AI_ENABLED`) | ○ | **próxima**; avisar antes de ligar o flag |
| M6 · recorrentes + orçamento | ○ | |
| M7 · produção (Neon + Vercel) | ○ | |
| M8 · barra "Pergunte sobre o seu mês" | ○ opcional | |

Detalhe de cada fase: `docs/superpowers/plans/2026-09-15-finance-plan.md`.

## Bloqueios e pendências do dono

- ~~OAuth Google~~ feito em 2026-09-15: client Web criado na conta pessoal, redirect
  `http://localhost:3100/api/auth/callback/google`, credenciais no `.env`, login conferido.
- Neon e Vercel só na M7.
- **Export do Nubank conta.** O layout do **cartão** foi confirmado num export real em 2026-09-16:
  cabeçalho `date,title,amount`, compra positiva, pagamento da fatura negativo e escrito
  `"- 410,68"` (com espaço depois do sinal). O da **conta** ainda segue o layout de memória
  (`Data,Valor,Identificador,Descrição`) e pode estar errado: quando o dono exportar um de verdade,
  testar em `/import` e ajustar `nubank-account-csv.ts` como foi feito com o cartão. É o extrato da
  conta que exercita o estágio CNPJ (Pix e boleto trazem CNPJ; a fatura do cartão não traz).

## Conferência manual pendente

M1 conferida em 2026-09-15: login, criar/editar/apagar categoria, nome duplicado no campo,
aba Contas. Não testado: login com outra conta Google (precisa de uma segunda conta à mão).

M1.6 conferida em 2026-09-15 ("funcionou" do dono após a grade e o painel).

M4 pendente: importar um extrato de conta com Pix (o CSV do cartão não traz CNPJ) e ver a razão
social na revisão; segunda importação não consulta a rede de novo (cache); com a rede desligada a
importação termina e mostra o aviso; aba CNAE de `/categories`: criar, editar e apagar prefixo.

M3 pendente: em `/import`, subir `tests/fixtures/nubank-conta.csv` na conta Nubank → regras casam
(UBER, PAGAMENTO DE FATURA), Padaria e Pix sem categoria; escolher categoria pra elas; Confirmar
libera só quando nada incluído fica sem categoria; resultado lista regras aprendidas; Mês reflete;
subir de novo → todas "Já importada"; Desfazer na lista de recentes; subir `unknown.csv` → mapa de
colunas, "lembrar", subir de novo → vai direto pra revisão.

M2 conferida pelo dono em 2026-09-16 (mantido aqui só o que ainda não foi testado): (máscara de valor, data padrão hoje,
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
- **Regra aprendida é curta e opcional por linha.** Ao escolher categoria na revisão, o padrão
  sugerido é o trecho antes do `*` (`IFD`, `ZIG`, `TOKIO MARINE`), editável; sem `*`, o texto
  inteiro. "Criar regra" vem **marcado** por padrão (dono, 2026-09-16: na maioria faz sentido) e o
  dono desmarca as poucas em que não tem certeza, na linha ou na caixa de resumo antes do
  Confirmar (contador "N regras novas ▸", fechado por padrão). A escolha se propaga na hora pra toda
  linha incluída e sem categoria que contenha o padrão (`applyChoice`), sem gerar segunda regra; só
  a primeira linha de cada padrão mostra o checkbox. `suggestPattern` tira ruído (`PARCELA`, letras
  soltas). Conta pré-selecionada segue o formato (`suggestAccount`): cartão → conta de cartão.
- **Revisão lê por categoria, em R$.** Barra empilhada "O que entra" com valor por categoria
  (`groupForReview`), "Sem categoria" em laranja como fatia própria, clique filtra; lista agrupada
  por categoria com subtotal, sem categoria primeiro, "Fora da importação" por último.
- **`<StackedBar>` é o gráfico de composição do app** (Mês e revisão de importação; orçamento e
  recorrentes depois). Segmentos com respiro e largura mínima, legenda em grade de colunas
  alinhadas (nome, valor, %), e hover acoplado: passar na barra ou na legenda acende os dois e
  escreve a linha de detalhe embaixo da barra, com altura fixa pra não empurrar o layout. Escolhido
  em 2026-09-16 contra um mosaico proporcional: cabe no card de 1/3 do Mês, não muda de forma com o
  número de categorias e permite comparar dois meses lado a lado.
- **CNPJ é o segundo estágio da cascata.** `extractCnpj` lê a descrição bruta; `resolveCnpjs`
  consulta o cache (inclusive negativo) antes da BrasilAPI, no máximo 3 em paralelo, e grava o que
  aprendeu; `mapCnae` escolhe pelo prefixo mais longo. A BrasilAPI responde **400** pra CNPJ
  inválido e 404 pra inexistente: os dois viram `null`, não falha (conferido na API real em
  2026-09-16). Qualquer outra falha vira um aviso e a linha segue sem categoria. A revisão mostra a
  razão social embaixo da descrição; o mapa de prefixos é editável na aba CNAE de `/categories`.
- **Importação nunca grava antes do Confirmar.** `prepareImport` devolve as linhas pra revisão e o
  estado vive no cliente; `confirmImport` revalida tudo com zod e grava lote + lançamentos +
  regras + hits numa transação só (`importRepo.commit`). Regra só nasce de categoria que o dono
  escolheu ou trocou. Desfazer apaga o lote e os lançamentos dele; regras ficam.
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
- **2026-09-16 (manhã)** · M3 codada: parsers (Nubank conta/cartão, OFX SGML e XML, CSV genérico
  com mapa de colunas, fallback windows-1252), `prepareRows` (normalized, CNPJ, ordinal, hash),
  `matchRule`, cascata RULE → CNPJ → AI com fakes, `buildConfirmPlan`, `import.service`
  orquestrador puro, `import.repo.commit` numa `$transaction`, `undo`, `/import` em três passos +
  recentes com desfazer. Body da action em 2 MB. 174 unitários + 14 integração, typecheck, lint e
  `next build` verdes. Fixtures são sintéticas até o dono passar exports reais.
- **2026-09-16 (manhã, cont.)** · primeiro export real do cartão deu zero linhas: valor com
  vírgula entre aspas, parser só aceitava ponto. `parseStatementAmount` passou a aceitar os dois
  em todo parser; a tela agora avisa `[PARSE_EMPTY]` quando reconhece o formato e não lê nada.
- **2026-09-16 (manhã, cont. 2)** · categorização no cartão: padrão curto antes do `*`, propagação
  pra família na mesma revisão, campo "regra" editável por linha, conta sugerida pelo formato, seed
  com vocabulário do cartão (IFD, COMBUSTIVE, POSTO, AMAZON, NETFLIX, SPOTIFY, DROGARIA, FARMACIA,
  SUPERMERCADO, MERCADO). 188 unitários + 14 integração verdes; seed reaplicado no banco de dev.
- **2026-09-16 (tarde)** · M4: adapter BrasilAPI (timeout de 5 s, user-agent próprio, 400/404 →
  `null`), `resolveCnpjs` com cache e concorrência 3, `mapCnae` por prefixo mais longo,
  `cnpj.repo` (cache + mapa), aba CNAE em `/categories`, razão social na revisão. O estágio CNPJ
  ficou ligado na action de importação. 216 unitários + 18 integração, typecheck, lint e build
  verdes; uma chamada real à BrasilAPI confirmou o caminho completo.
