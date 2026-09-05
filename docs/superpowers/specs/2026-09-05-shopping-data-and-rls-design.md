# Dados e isolamento do MVP de compras

## Modelo

`lists`:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `name text not null`
- `is_archived boolean not null default false`
- `created_at timestamptz not null default now()`

`items`:

- `id uuid primary key default gen_random_uuid()`
- `list_id uuid not null references lists(id) on delete cascade`
- `name text not null`
- `quantity numeric not null default 1`
- `price numeric not null default 0`
- `is_purchased boolean not null default false`

Os valores monetários permanecem numéricos no banco; a apresentação usa o
locale brasileiro (`R$`). O preço é unitário e quantidade ou preço não podem
ser negativos.

## RLS

RLS fica ativada nas duas tabelas. Em `lists`, toda operação só é permitida
quando `user_id = auth.uid()`; inserções exigem que o novo `user_id` seja o
usuário autenticado.

`items` não repete `user_id`. As políticas de selecionar, inserir, atualizar e
apagar verificam que a lista referenciada pertence a `auth.uid()`. Em insert e
update, a verificação deve cobrir também o novo `list_id` (`WITH CHECK`).

O cliente não recebe chave de serviço e não pode contornar essas políticas.

## Acesso do aplicativo

TanStack Query é a única camada de leitura/cache remoto. As mutações de listas
e itens invalidam as queries da lista e do histórico afetados. Não haverá
cálculo, aggregate ou endpoint de total no banco durante o MVP: o aplicativo
calcula `price * quantity` dos itens comprados carregados para a lista.

## Critérios de aceite

- Um usuário não lê nem altera listas ou itens de outro usuário.
- Excluir uma lista remove os itens por cascata.
- Um item não pode ser criado ou movido para uma lista de outro usuário.
- O total mostrado usa somente itens com `is_purchased = true`.
