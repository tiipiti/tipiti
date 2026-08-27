---
target: CRUDes do admin
total_score: 15
p0_count: 2
p1_count: 2
timestamp: 2026-08-26T21-15-31Z
slug: backend-templates-admin
---
Method: dual-agent (A: /root/crud_design_review · B: /root/crud_detector)

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | Cadastro não mostra impacto, cálculo ou próximo passo. |
| 2 | Match system / real world | 2 | Ainda há duas famílias de compra e termos técnicos concorrentes. |
| 3 | User control and freedom | 1 | Edição genérica pode contornar os fluxos auditáveis. |
| 4 | Consistency and standards | 2 | A base é consistente, mas “Compra” é ambígua. |
| 5 | Error prevention | 1 | Promoção, preço e unidade deixam erros para validação tardia. |
| 6 | Recognition rather than recall | 1 | Usuário precisa memorizar relações entre lista, item, mercado, unidade e produto. |
| 7 | Flexibility and efficiency | 2 | Busca e autocomplete ajudam; compra exige navegação entre entidades. |
| 8 | Aesthetic and minimalist design | 3 | Interface limpa, porém os formulários são densos e sem agrupamento. |
| 9 | Error recovery | 1 | Sem orientação contextual para correção, invalidação ou estorno. |
| 10 | Help and documentation | 0 | Não há ajuda de tarefa, exemplos ou definição de estados. |
| **Total** | | **15/40** | **Fluxos operacionais frágeis** |

## Anti-Patterns Verdict

O dashboard e login não parecem gerados por IA: paleta, foco visível e ilustrações decorativas são discretos e coerentes. O problema é de produto: os CRUDes herdados do Unfold exibem entidades de banco, não um percurso de trabalho.

O detector não encontrou regras infringidas em `backend/templates/admin` nem em `backend/core/static/core/admin.css` (0 achados). Isso não valida os formulários: os templates escaneados são somente dashboard e login; changelists e changeforms CRUD são herdados do Django Unfold. Não houve browser disponível para autenticar, injetar overlay ou obter screenshots.

## Overall Impression

O início do admin transmite organização, mas cadastrar algo complexo transforma uma tarefa diária em modelagem manual de dados. A maior oportunidade é converter “compras” em fluxo, não em coleção de tabelas relacionadas.

## What's Working

- `autocomplete_fields`, busca e filtros reduzem atrito em catálogos grandes.
- Criar uma lista atribui a posse automaticamente e reduz uma decisão desnecessária.
- Histórico de mudanças e a fila de atenção reconhecem rastreabilidade e priorização operacional.

## Priority Issues

### [P0] Registrar uma compra não é um fluxo completo

`ShoppingPurchase` e `ShoppingPurchaseItem` são cadastrados separadamente; o total é readonly e a operação manual não tem resumo nem finalização segura.

**Fix:** uma tela “Registrar compra” com cabeçalho (lista, unidade, data), itens inline, operação gerada no servidor e total calculado antes de confirmar. Diferenciar visivelmente “Compra de item” de “Compra da lista”.

### [P0] O admin contorna a auditoria financeira

`PurchaseChange` é append-only, mas `PurchaseAdmin` ainda permite edição direta de valores; isto pode ignorar `correct_purchase()` e `void_purchase()`.

**Fix:** deixar valores financeiros readonly; expor ações próprias de corrigir e estornar, com motivo obrigatório, comparação antes/depois e confirmação. Ambas devem usar os serviços existentes.

### [P1] Preço e promoção apresentam decisões demais sem contexto

Preço expõe produto, unidade, autor, valor, data e validade; promoção mostra rede e unidade sem sequência ou orientação.

**Fix:** fieldsets “O que”, “Onde”, “Quando” e “Revisão”; preencher autor/data, escolher rede antes da unidade e tratar validade como revisão posterior.

### [P1] A navegação é uma árvore de entidades, não de tarefas

Lista, item, mercado salvo, unidade, preço observado e compra ficam espalhados; o usuário não sabe a ordem das operações.

**Fix:** organizar atalhos por “Preparar lista”, “Registrar compra”, “Cadastrar preço” e “Revisar dados”, oferecendo próximo passo dentro de cada tela.

### [P2] Formulários permitem variações e responsabilidades desnecessárias

`unit` é texto livre, `created_by` pode ser escolhido e a posse pode ser alterada sem fluxo dedicado.

**Fix:** escolhas de unidade; atribuir autor pela request; tornar transferência de posse uma ação explícita e segura.

## Persona Red Flags

**Alex, usuário experiente:** não consegue finalizar uma compra completa sem alternar entre compra e itens; ações em lote não mostram escopo ou resultado.

**Jordan, primeira utilização:** não entende a diferença entre mercado salvo, unidade, preço, promoção e os dois tipos de compra; após criar lista não há próximo passo evidente.

**Equipe de operações:** a fila leva à lista de registros, não ao item exato; corrigir compra exige saber que a edição genérica é perigosa.

## Minor Observations

- Eventos de auditoria aparecem em inglês.
- UUID, token e normalizações devem ficar numa seção recolhida de dados técnicos.
- Quatro métricas no dashboard competem com a fila de atenção.
- `is_valid` não deveria ser um checkbox sem explicação operacional.

## Questions to Consider

- A tarefa real é cadastrar entidades ou concluir uma compra de hoje?
- Por que alguém escolhe manualmente o responsável pela ação que está fazendo?
- Edição direta de compra ainda deveria existir se ela rompe a confiança no histórico?
