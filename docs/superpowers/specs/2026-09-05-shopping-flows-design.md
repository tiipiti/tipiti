# Fluxos de listas e compras

## Home

A aba inicial mostra apenas listas próprias não arquivadas. Permite criar uma
lista vazia e abrir uma lista existente em `/list/[id]`. O botão **Copiar
Última Compra** fica indisponível se não houver uma lista arquivada.

Ao copiar, o app encontra a lista arquivada mais recente, cria uma nova lista
ativa e insere cópias de seus itens com `name`, `quantity` e `price`; todos
recebem `is_purchased = false`. Em seguida abre a nova lista. Uma falha não
deve deixar o usuário numa tela de compra sem lista criada; o app informa o
erro e atualiza a home.

## Tela de compra

`/list/[id]` carrega somente uma lista do dono autenticado. Listas ativas
permitem adicionar itens por input no topo e alternar cada item entre pendente
e no carrinho. Tocar no item abre a edição inline de quantidade e preço
unitário; novos itens começam com quantidade 1 e preço 0. Itens pendentes
aparecem antes dos comprados. O rodapé fixo mostra a soma local de
`price * quantity` dos comprados.

**Finalizar Compra** arquiva a lista e redireciona para a home. Uma lista
arquivada é aberta somente para leitura: não permite adicionar, editar,
marcar/desmarcar itens nem finalizar novamente.

## Histórico

A segunda aba mostra listas próprias arquivadas em ordem de criação
decrescente. Cada card traz o nome, a data e o total local dos itens comprados.
Ao abrir, usa a mesma tela de lista em modo leitura.

## Estados necessários

As telas devem ter estados explícitos de carregamento, vazio e erro. Nenhuma
ação de escrita pode parecer concluída antes da confirmação do Supabase; o
botão acionado fica indisponível enquanto a mutação correspondente está em
andamento.

## Não escopo

Edição de itens fora da alternância de compra, exclusão ou renomeio de listas,
compartilhamento, catálogo, categorias, mercados, comparação de preços,
histórico de preços, notificações e relatórios.

## Critérios de aceite

- Criar lista vazia a torna visível na home.
- Itens pendentes e comprados ficam em seções distintas; editar quantidade ou
  preço e mudar o estado atualiza o total.
- Finalizar remove a lista da home e a mostra no histórico em modo leitura.
- Copiar a última compra preserva nome, quantidade e preço, mas não itens marcados.
