# Tipiti — Listas e itens

## Objetivo

Permitir que membros mantenham listas privadas de compras e seus itens.

## Dependências

- `2026-08-24-tipiti-foundation-access.md`

## Modelo de dados

### `ShoppingList`

| Campo | Regra |
| --- | --- |
| `name` | obrigatório, até 120 caracteres |
| `created_at` | data de criação |
| `updated_at` | data da última alteração |
| `archived_at` | nulo para lista ativa |

Uma lista só é visível por meio de `ListMembership`; ela não possui campo de
visibilidade pública.

### `ListItem`

| Campo | Regra |
| --- | --- |
| `shopping_list` | FK para `ShoppingList` |
| `name` | obrigatório, até 200 caracteres |
| `quantity` | decimal positivo |
| `unit` | texto curto, por exemplo `un`, `kg` ou `L` |
| `is_checked` | marca se o item já foi obtido |
| `checked_at` | preenchido ao marcar; nulo caso contrário |

- O mesmo nome pode aparecer em linhas distintas: cada linha representa uma
  intenção de compra, não um catálogo global.
- `ListItem` não armazena mercado nem preço: essas informações pertencem a
  `StoreItem`.

## Operações

- Um membro cria, edita, marca e remove itens da lista da qual participa.
- O dono cria e arquiva listas.
- Arquivar uma lista preserva itens, opções de mercado e compras, mas impede
  novas alterações.

## Fora de escopo

- Categorias, ordenação manual, receitas, recorrência e catálogo de produtos.
