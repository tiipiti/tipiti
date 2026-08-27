# Remodelagem da Fundação do Domínio de Compras

## Objetivo

Substituir os dois modelos concorrentes de compra por um único domínio
consistente para listas compartilhadas, compras, catálogo, mercados, links e
moderação. O projeto está em fundação: dados e contratos HTTP legados podem
ser removidos.

## Decisões de escopo

- A API legada `/api/` de `shopping` será removida. A API pública de compras
  será somente `/api/v1/`.
- `Store`, `StoreItem`, `Purchase` e `PurchaseChange` serão removidos; não
  haverá adaptação ou migração de seus dados.
- As migrations existentes de `shopping` serão substituídas por uma única
  `0001_initial.py`. Isso exige banco de desenvolvimento descartável.
- Não serão adicionadas dependências, tabelas de cache ou campos totais
  desnormalizados.

## Modelo canônico

### Listas e participantes

`ShoppingList` possui `owner` obrigatório para o usuário e `name`,
`archived_at` e `version`. O `owner` usa `PROTECT`: uma conta não pode ser
removida silenciosamente enquanto possuir uma lista; a posse deve ser
transferida primeiro.

`ListMembership` representa apenas participação. Sua chave única é
`(shopping_list, user)` e não possui `role`. A lista garante que seu dono
também seja participante no serviço de criação e na transferência de posse.
`ListOwnershipChange` continua append-only e registra dono anterior, novo
dono e lista.

`ListItem` pertence a uma lista e tem `name`, `product` opcional, `quantity`,
`unit`, `completed_at` e `version`. A conclusão manual não é derivada de uma
compra. `purchased_quantity`, `is_checked` e `checked_at` deixam de existir:
o saldo é a soma das linhas de compra ativas para o item e só é calculado na
consulta/serialização que precisar dele.

`ListInvite` permanece vinculado à lista e ao criador, com token, e-mail
opcional, expiração e aceitação. A criação e o aceite continuam transacionais.

### Compras

`ShoppingPurchase` é o único agregado de compra: lista, autor, filial de
mercado opcional, `purchased_at`, `client_operation_id`, `voided_at`,
`voided_by` e `void_reason`. A unicidade de idempotência é
`(user, client_operation_id)`. Uma compra estornada não contribui para saldo
ou totais.

`ShoppingPurchaseItem` é uma linha imutável com compra, item da lista,
produto opcional, descrição e unidade capturadas no momento da compra,
quantidade e preço unitário. Não armazena preço total: a linha é
`quantity * unit_price` e o total da compra é a soma dessas linhas. Quantidade
é positiva e preço é não negativo por constraints de banco. O serviço e o
formulário administrativo validam que todo `list_item` pertence à mesma lista
da compra; esse predicado entre tabelas não pode ser um `CheckConstraint` do
Django.

`PurchaseEvent` substitui o histórico legado. Ele referencia a compra por
`PROTECT`, registra autor, tipo (`created`, `corrected`, `voided`), snapshots
antes/depois e razão. Toda criação, correção ou estorno passa por um serviço
atômico que bloqueia a compra e cria exatamente um evento. Linhas não são
alteradas após a criação; correções de itens são feitas por estorno e uma nova
compra.

### Catálogo e mercados

`MarketNetwork`, `MarketBranch`, `FavoriteMarket`, `Product`, `ProductAlias`,
`PriceObservation` e `Promotion` permanecem, com suas FKs explícitas e
constraints de preço/data. `Product` terá fingerprint única com
`nulls_distinct=False`, permitindo que embalagem ausente participe da
unicidade. Produto, filial e rede inativos não são aceitos em novas
contribuições ou compras, mas podem continuar referenciados por histórico.

`Promotion` exige uma rede ou filial. Quando ambas forem informadas, a
validação de modelo, serializer e admin exige que a filial pertença à rede.

### Links compartilhados e moderação

`ShareLink` deixa de usar `resource_type` e `resource_id`. Terá FKs opcionais
para `Product`, `PriceObservation`, `Promotion` e `MarketBranch`, mais
`location` para compartilhamento de localização. Uma constraint garante
exatamente um alvo: uma FK, ou `location` não vazio. O token e a expiração
permanecem.

`Report` deixa de aceitar `target_type` e `target_id` arbitrários. Terá uma
FK opcional para `PriceObservation` ou `Promotion`, e uma constraint garante
exatamente um alvo. Estado, moderador e data de resolução permanecem.

### Sync e notificações

`SyncOperation` é um log de idempotência, não uma referência polimórfica.
`entity_type` e `operation_type` viram `TextChoices` limitadas aos updates de
lista e item. O serviço só confirma quando `base_version` é a versão atual;
caso contrário registra conflito e não muda o agregado. O payload contém só
campos permitidos para cada tipo.

`Notification` e os modelos de `accounts` não mudam de estrutura nesta fase.
Eles não participam da duplicação de compra nem guardam referências genéricas
do domínio de mercado.

## Regras operacionais

- Apenas o dono altera membros, convites, metadados da lista ou transfere a
  posse; qualquer participante pode editar itens e registrar compras enquanto
  a lista estiver ativa.
- A finalização bloqueia os itens da lista, valida pertencimento, saldo e
  idempotência, cria compra/linhas/evento e não atualiza contadores no item.
- Um estorno só pode ser feito por quem registrou a compra (ou fluxo
  administrativo explícito) e preserva o evento correspondente.
- O admin registra e corrige compras pelo mesmo serviço; campos técnicos e
  eventos são somente leitura.

## Arquivos e contratos removidos

- Remover `shopping/urls.py` e os viewsets/serializers/admins exclusivos de
  `Store`, `StoreItem`, `Purchase` e `PurchaseChange`.
- Remover os endpoints `/api/stores/`, `/api/store-items/` e
  `/api/purchases/`; `config.urls` deixa de incluir `shopping.urls`.
- Substituir `ShoppingPurchaseItem.total_price` e
  `ShoppingPurchase.total_amount` por propriedades/serialização calculadas.
- Atualizar painel administrativo, filtros, testes e `AGENTS.md` para o
  modelo único e `/api/v1/`.

## Critérios de aceite

- Não há modelos, rotas, serializers, admin ou testes que importem o legado.
- Toda lista tem exatamente um dono via FK e uma participação única por
  usuário.
- Uma compra não aceita item de outra lista, saldo excedido, data em lista
  arquivada, repetição idempotente com payload divergente ou versão de sync
  desatualizada.
- Totais e saldo são corretos após criação, correção e estorno sem campos
  totais ou quantidades compradas persistidos.
- Links e denúncias não podem apontar para tipo/id inexistente ou para mais de
  um alvo.
- `makemigrations --check`, testes relevantes, `compileall` e `git diff
  --check` passam.
