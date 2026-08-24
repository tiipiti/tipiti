# Tipiti — Compras e histórico de preços

## Objetivo

Registrar compras concluídas como a fonte imutável do histórico de preços.

## Dependências

- `2026-08-24-tipiti-stores-prices.md`

## Modelo de dados

### `Purchase`

| Campo | Regra |
| --- | --- |
| `store_item` | FK para `StoreItem` |
| `purchased_by` | FK para `User` |
| `quantity` | decimal positivo |
| `unit_price` | decimal não negativo, congelado no momento da compra |
| `total_price` | decimal não negativo, igual a `quantity × unit_price` |
| `purchased_at` | data/hora da compra |

- Uma `Purchase` preserva o preço realmente pago, mesmo se
  `StoreItem.current_unit_price` mudar depois.
- Somente membros da lista podem registrar compras para seus itens.
- O histórico de um item é a lista de `Purchase` associada às suas opções de
  mercado, ordenada da mais recente para a mais antiga.

## Operações

- Registrar uma compra atualiza `StoreItem.current_unit_price` e
  `price_updated_at` com o preço informado.
- A primeira entrega permite correção e remoção de compra apenas ao autor;
  mudanças deixam de ser permitidas quando a lista está arquivada.

## Fora de escopo

- Auditoria de edições, recibos, divisão de gastos e orçamento mensal.
