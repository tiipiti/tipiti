# Lista de Compras Simples

## Objetivo

Validar o primeiro uso do Tipiti com uma pessoa que só quer anotar e marcar o
que comprou. A aplicação não deve exigir catálogo, mercado, preço, compra,
sincronização ou compartilhamento para isso.

## Modelo

Existem apenas dois registros de domínio:

- `ShoppingList`: `owner` e `name`.
- `ListItem`: `shopping_list`, `name`, `quantity`, `price` opcional e `completed`.

`ListItem.name` aceita o texto que a pessoa escrever, inclusive detalhes como
"leite integral". `quantity` é inteiro e começa em 1; `price` é o preço unitário
opcional. Não há produto ou categoria no fluxo inicial.

Produto e categoria não existem nesta versão. Se um catálogo vier a ser útil,
`Product.category` será opcional; ele não será pré-requisito nem relação
obrigatória de `ListItem`.

## Comportamento

- Usuário autenticado cria, vê, renomeia e apaga as próprias listas.
- Usuário autenticado cria, edita, marca/desmarca e apaga os itens das próprias
  listas.
- A lista mostra itens não comprados antes dos comprados.
- No admin, a lista é um CRUD direto: nome e itens inline com texto,
  quantidade, preço e caixa de marcação. O administrador escolhe o dono ao
  criar a lista.

## Fora de escopo

Excluir modelos, endpoints, serviços, serializers, telas administrativas e
testes de catálogo, categoria, mercado, preço, promoção, compra, auditoria,
sync, compartilhamento, denúncias, membros, convites e transferência de posse.
Não deixar rotas ou formulários redirecionando para esses recursos removidos.

## Migração

Criar nova migration que remove o schema excedente e converte `completed_at`
em `completed`. Não modificar `0001_initial`. Como esta é uma fundação, o
banco local deve ser recriado antes de aplicar a nova sequência de migrations.

## Critérios de aceite

- O CRUD da API contém somente listas e itens.
- Uma lista e seu item são criados com nome; quantidade começa em 1, preço é
  opcional e o item pode ser marcado como comprado com um booleano.
- Nenhuma dependência de catálogo ou mercado é necessária para usar a lista.
- O admin de listas permite criar, editar e marcar itens sem telas auxiliares.
- `pytest`, `manage.py check`, `makemigrations --check --dry-run`, `compileall`
  e `git diff --check` passam.
