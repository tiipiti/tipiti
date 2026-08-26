---
target: admin e fluxos de compras
total_score: 21
p0_count: 1
p1_count: 2
timestamp: 2026-08-26T20-07-41Z
slug: backend-templates-admin
---
Method: dual-agent (A: /root/ux_review · B: /root/objective_scan)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 3 | Falta escopo, atualização e itens de preço desatualizados. |
| 2 | Match system / real world | 3 | `Store` e `MarketBranch` ambos aparecem como mercado. |
| 3 | User control and freedom | 1 | Compra finalizada não pode ser estornada/corrigida; posse não pode ser transferida. |
| 4 | Consistency and standards | 2 | Interface é coesa, mas há dois conceitos de compra e mercado; login mistura PT-BR e inglês. |
| 5 | Error prevention | 3 | Boas constraints e transação; merges não mostram impacto nem reversão. |
| 6 | Recognition rather than recall | 2 | O operador precisa descobrir o caminho entre lista, item, produto, preço e unidade. |
| 7 | Flexibility and efficiency | 2 | Atalhos e autocomplete ajudam, mas não há fila priorizada. |
| 8 | Aesthetic and minimalist design | 3 | Calmo e legível, porém métricas têm o mesmo peso visual. |
| 9 | Error recovery | 2 | Erros são claros, mas há poucas saídas depois de uma ação de alto impacto. |
| 10 | Help and documentation | 0 | Não há orientação sobre papéis, preços, promoções ou correções. |
| **Total** |  | **21/40** | **Fundação visual boa; fluxo operacional frágil.** |

## Anti-Patterns Verdict

O UI não parece uma composição genérica de IA: a paleta, a hierarquia e o estado vazio formam uma identidade reconhecível. A limitação é que essa tranquilidade não é acompanhada por mecanismos de recuperação nos fluxos de dados.

O detector determinístico encontrou 0 ocorrências em `backend/templates/admin/index.html` e `backend/templates/admin/login.html`. Não há falsos positivos. A inspeção visual renderizada não ocorreu porque o browser não está disponível; logo não foram confirmados foco herdado, contraste computado, reflow e tamanho de alvo de toque.

## Overall Impression

O dashboard faz uma boa primeira impressão e deixa a operação diária legível. O maior risco é o usuário descobrir tarde demais que compra, ownership, merge ou invalidação não têm recuperação evidente.

## What's Working

- Dashboard reúne estado, ação e atividade recente sem virar um mural de números.
- Estado vazio e ilustrações decorativas têm semântica adequada; há redução de movimento.
- Constraints, idempotência e transações evitam erros de quantidade e preço na finalização.

## Priority Issues

### [P0] Compra finalizada não tem correção operacional

**Why it matters:** um erro de item, quantidade ou preço no caixa afeta total e histórico compartilhados, e o usuário só pode corrigir a data.

**Fix:** definir compra como recibo imutável com estorno/correção versionada, permissões explícitas e trilha de auditoria. Mostrar a correção no histórico em vez de editar silenciosamente o total.

**Suggested command:** `$impeccable harden`

### [P1] Dois modelos mentais para mercado e compra

**Why it matters:** `Store`/`MarketBranch` e `Purchase`/`ShoppingPurchase` confundem a origem do preço e do histórico.

**Fix:** consolidar se forem duplicação; caso representem domínios distintos, renomear por propósito e explicar no fluxo qual registro alimenta comparação, recibo e preço atual.

**Suggested command:** `$impeccable clarify`

### [P1] Transferência de posse é exigida, mas não existe

**Why it matters:** a mensagem ao remover um dono manda transferir a posse, sem dar o caminho. Isso prende listas a uma pessoa e bloqueia colaboração.

**Fix:** ação explícita “Transferir propriedade”, com confirmação, novo dono visível e restrição de que uma lista deve manter um owner.

**Suggested command:** `$impeccable harden`

### [P2] Dashboard mede, mas não prioriza trabalho

**Why it matters:** denúncias, preços sem atualização e convites próximos do vencimento requerem decisões diferentes, porém hoje viram contagens de peso semelhante.

**Fix:** trocar parte dos cards por uma fila ordenada de exceções, com idade, escopo e ação direta; manter as métricas como contexto secundário.

**Suggested command:** `$impeccable distill`

### [P3] Vocabulário e ajuda não sustentam o fluxo

**Why it matters:** “Log in” quebra a localização; não há explicação curta para preço observado versus promoção, papéis, expiração ou arquivamento.

**Fix:** localizar toda a superfície e inserir ajuda no ponto da decisão, não uma página de documentação.

**Suggested command:** `$impeccable clarify`

## Persona Red Flags

**Comprador colaborador:** uma compra parcial ou errada no caixa não tem rota de correção clara; ele pode abandonar o registro ou perder confiança no total compartilhado.

**Dono da lista:** não consegue transferir ownership, apesar de o produto exigir isso para remoção; mudança de responsável fica bloqueada.

**Moderador/admin:** merge, invalidação e arquivamento têm impacto material sem preview, reversão ou fila de risco; a ação correta depende de memória e cautela externas ao produto.

## Minor Observations

- Os links rápidos têm estado local de hover, mas não de `:focus-visible`; pode vir do Unfold, mas não é assegurado neste CSS.
- A linha de atividade em três colunas não foi validada em zoom e mobile.
- O dashboard deveria explicitar a data e o escopo dos totais.

## Questions to Consider

- Compra finalizada é um recibo imutável ou um rascunho operacional?
- Por que mercado pessoal e unidade de rede coexistem? O usuário entende a diferença?
- Denúncias abertas devem disputar atenção com métricas informativas ou liderar uma fila de trabalho?
