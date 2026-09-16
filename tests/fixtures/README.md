# Fixtures de extrato

**Sintéticas, escritas pelo layout conhecido em 2026-09-16.** Nenhum valor é real. Quando o
dono passar exports mascarados do Nubank (conta e cartão), substituir `nubank-conta.csv` e
`nubank-cartao.csv` por eles e rodar `npm test`: os testes travam quantidade de linhas, primeira
e última linha, sinal e encoding.

| Arquivo | Formato | O que exercita |
|---|---|---|
| `nubank-conta.csv` | Nubank conta, `Data,Valor,Identificador,Descrição`, dd/mm/aaaa | Pix com CNPJ na descrição, pagamento de fatura, duas linhas idênticas no mesmo dia |
| `nubank-cartao.csv` | Nubank cartão, `date,title,amount`, aaaa-mm-dd, valor `"54,90"` (vírgula, entre aspas; negativo vem como `"- 410,68"`, com espaço), positivo = compra | inversão de sinal, pagamento da fatura como entrada. **Layout confirmado num export real em 2026-09-16** (valores sintéticos) |
| `sample.ofx` | OFX SGML (sem tags de fechamento) | `DTPOSTED` com fuso, `FITID`, `MEMO` |
| `sample-xml.ofx` | OFX XML | mesmo conteúdo com tags fechadas |
| `unknown.csv` | CSV genérico com `;` e vírgula decimal | mapa de colunas |
| `latin1.csv` | Nubank conta gravado em windows-1252 | fallback de encoding |
