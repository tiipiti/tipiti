create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check (
    (is_archived and archived_at is not null)
    or (not is_archived and archived_at is null)
  )
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  quantity numeric not null default 1 check (quantity >= 0),
  price numeric not null default 0 check (price >= 0),
  is_purchased boolean not null default false
);

create index lists_active_by_owner on public.lists (user_id, is_archived, created_at desc);
create index lists_history_by_owner on public.lists (user_id, archived_at desc)
  where is_archived;
create index items_by_list on public.items (list_id);

alter table public.lists enable row level security;
alter table public.items enable row level security;

create policy "owners manage their lists"
  on public.lists
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "owners manage their list items"
  on public.items
  for all
  using (
    exists (
      select 1 from public.lists
      where lists.id = items.list_id and lists.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lists
      where lists.id = items.list_id and lists.user_id = auth.uid()
    )
  );
