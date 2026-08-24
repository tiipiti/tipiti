# Tipiti — Fundação e acesso

## Objetivo

Definir a identidade e o acesso privado às listas compartilhadas do Tipiti.

## Escopo

- Reutilizar o usuário autenticado do projeto como `User`.
- Substituir a terminologia de lugares do backend trazido do Boora Ali por
  terminologia de compras.
- Criar `ListMembership` para relacionar `User` e `ShoppingList`.
- Criar `ListInvite` para permitir que o dono convide alguém para uma lista.

## Modelo de dados

### `ListMembership`

| Campo | Regra |
| --- | --- |
| `shopping_list` | FK para `ShoppingList` |
| `user` | FK para `User` |
| `role` | `owner` ou `member` |
| `joined_at` | data de entrada |

- Cada par (`shopping_list`, `user`) é único.
- Cada lista possui exatamente um membro com papel `owner`.

### `ListInvite`

| Campo | Regra |
| --- | --- |
| `shopping_list` | FK para `ShoppingList` |
| `invited_email` | e-mail normalizado do destinatário; nulo para convite por link |
| `token` | valor aleatório, único e não sequencial |
| `created_by` | FK para o membro dono que criou o convite |
| `expires_at` | data de expiração |
| `accepted_at` | data de aceite; nulo enquanto pendente |

- O convite concede acesso apenas à lista indicada.
- Aceitar um convite cria um `ListMembership(role="member")` idempotente.
- Não há listas públicas nem descoberta de listas.

## Autorização

- Somente membros podem ler a lista e seus dados.
- Somente o dono pode criar, cancelar ou reenviar convites.
- Um colaborador pode sair da lista; o dono não pode sair sem transferir a posse.

## Fora de escopo

- Recuperação de conta, equipes, permissões por item e auditoria de alterações.
