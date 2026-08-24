# Tipiti — Mercados e preços

## Objetivo

Representar alternativas de mercado para cada item de uma lista, sem criar um
catálogo global de produtos.

## Dependências

- `2026-08-24-tipiti-shopping-lists.md`

## Modelo de dados

### `Store`

| Campo | Regra |
| --- | --- |
| `name` | obrigatório, até 160 caracteres |
| `address` | opcional, até 300 caracteres |
| `created_by` | FK para `User` |

`Store` é um mercado salvo pelo usuário. A primeira versão não tenta deduzir
que mercados escritos de maneira diferente são o mesmo estabelecimento.

### `StoreItem`

| Campo | Regra |
| --- | --- |
| `list_item` | FK para `ListItem` |
| `store` | FK para `Store` |
| `current_unit_price` | decimal não negativo; opcional |
| `price_updated_at` | data da última atualização de preço |

- Cada par (`list_item`, `store`) é único.
- O preço corrente é uma referência editável; ele não substitui o preço de
  uma compra já concluída.
- Somente membros da lista do item podem criar ou editar suas opções de
  mercado.

## Fora de escopo

- Código de barras, marcas, integração com preços externos e comparação entre
  listas de usuários diferentes.
