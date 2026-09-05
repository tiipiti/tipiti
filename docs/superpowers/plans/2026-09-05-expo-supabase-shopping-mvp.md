# Expo Supabase Shopping MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o MVP nativo Android/iOS de listas de compras autenticadas por Magic Link.

**Architecture:** Um projeto Expo Router é o único cliente e fala diretamente
com o Supabase via chave anon pública. O Supabase aplica propriedade por RLS;
TanStack Query mantém dados remotos por tela e o cliente calcula o total da
lista carregada.

**Tech Stack:** React Native, Expo, Expo Router, TypeScript, Supabase JS,
AsyncStorage e TanStack Query.

**Spec:**
[foundation and auth](../specs/2026-09-05-mobile-foundation-and-auth-design.md),
[data and RLS](../specs/2026-09-05-shopping-data-and-rls-design.md), and
[shopping flows](../specs/2026-09-05-shopping-flows-design.md)

## Global Constraints

- O primeiro release suporta Android e iOS; não usar Vite nem React DOM.
- O app usa Expo Router e deep link `tipiti://auth/callback`.
- Usar somente a chave publishable pública (ou a anon legada) em
  `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; nunca
  incluir chave de serviço.
- RLS deve estar ativa em `lists` e `items`.
- `items` herda a propriedade de `lists`; não criar `user_id` duplicado.
- Escopo exclui offline, senha, OAuth, catálogo, compartilhamento e backend próprio.

---

### Task 1: Criar o aplicativo Expo e a fundação de navegação

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/login.tsx`
- Create: `app/auth/callback.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/home.tsx`
- Create: `app/(tabs)/history.tsx`
- Create: `app/list/[id].tsx`
- Create: `lib/supabase.ts`
- Create: `.env.example`
- Modify: `app.json`, `package.json`
- Test: `__tests__/session-gate.test.tsx`

**Interfaces:**
- Consumes: Expo environment variables and Supabase Auth.
- Produces: `supabase`, an authenticated route gate, and all MVP route files.

- [ ] **Step 1: Criar o projeto Expo TypeScript com Expo Router e instalar `@supabase/supabase-js`, `@react-native-async-storage/async-storage` e `@tanstack/react-query`.**

  Run: `npx create-expo-app@latest . --template default@sdk-55`

  Expected: projeto Expo TypeScript com scripts `start`, `android` e `ios`.

- [ ] **Step 2: Configurar `app.json` para links nativos.**

  ```json
  {
    "expo": { "scheme": "tipiti" }
  }
  ```

- [ ] **Step 3: Criar o cliente Supabase persistente.**

  ```ts
  export const supabase = createClient(url, anonKey, {
    auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true },
  });
  ```

- [ ] **Step 4: Escrever o teste do gate de sessão.**

  ```tsx
  it('renders children only after a session is restored', async () => {
    render(<SessionGate session={null} loading={false} />);
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
  ```

- [ ] **Step 5: Implementar o layout raiz com `QueryClientProvider`, recuperação de `getSession()` e redirecionamento para login ou tabs.**

- [ ] **Step 6: Executar o teste.**

  Run: `npm test -- --runInBand __tests__/session-gate.test.tsx`

  Expected: PASS.

- [ ] **Step 7: Commit.**

  ```bash
  git add app lib .env.example app.json package.json __tests__/session-gate.test.tsx
  git commit -m "feat: bootstrap Expo app and session gate"
  ```

### Task 2: Provisionar Supabase, schema e RLS

**Files:**
- Create: `supabase/migrations/20260905000000_shopping_mvp.sql`
- Create: `supabase/README.md`
- Test: `supabase/tests/shopping_mvp.sql`

**Interfaces:**
- Consumes: `auth.uid()` do Supabase.
- Produces: tabelas `public.lists` e `public.items` protegidas para o cliente anon.

- [ ] **Step 1: Escrever um teste SQL que confirma que itens de outra lista não são legíveis.**

  ```sql
  set local role authenticated;
  set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
  select is_empty(
    'select * from public.items where list_id = ''00000000-0000-0000-0000-000000000002''',
    'RLS hides another user items'
  );
  ```

- [ ] **Step 2: Criar as tabelas e constraints.**

  ```sql
  create table public.lists (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    name text not null check (btrim(name) <> ''),
    is_archived boolean not null default false,
    created_at timestamptz not null default now()
  );
  create table public.items (
    id uuid primary key default gen_random_uuid(),
    list_id uuid not null references public.lists(id) on delete cascade,
    name text not null check (btrim(name) <> ''),
    quantity numeric not null default 1 check (quantity >= 0),
    price numeric not null default 0 check (price >= 0),
    is_purchased boolean not null default false
  );
  ```

- [ ] **Step 3: Habilitar RLS e criar políticas de `lists` por `user_id = auth.uid()` e de `items` com `exists (select 1 from public.lists ...)`.**

- [ ] **Step 4: Documentar no `supabase/README.md` como aplicar a migration e configurar `tipiti://auth/callback` nas Redirect URLs do Supabase Auth.**

- [ ] **Step 5: Aplicar e testar localmente.**

  Run: `npx supabase db reset && npx supabase test db`

  Expected: migration aplicada e teste RLS PASS.

- [ ] **Step 6: Commit.**

  ```bash
  git add supabase
  git commit -m "feat: add Supabase shopping schema and RLS"
  ```

### Task 3: Implementar login e callback Magic Link

**Files:**
- Modify: `app/login.tsx`
- Modify: `app/auth/callback.tsx`
- Create: `features/auth/use-magic-link.ts`
- Test: `__tests__/use-magic-link.test.tsx`

**Interfaces:**
- Consumes: `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`.
- Produces: `useMagicLink(email): { send(): Promise<void>; isPending: boolean; error: Error | null }`.

- [ ] **Step 1: Escrever o teste de envio com URL nativa.**

  ```ts
  await result.current.send();
  expect(signInWithOtp).toHaveBeenCalledWith({
    email: 'ana@example.com',
    options: { emailRedirectTo: 'tipiti://auth/callback' },
  });
  ```

- [ ] **Step 2: Implementar o hook usando `useMutation` e propagando erro do Supabase.**

- [ ] **Step 3: Implementar `/login` com input de e-mail, botão desabilitado durante envio e feedback de e-mail enviado ou erro.**

- [ ] **Step 4: Implementar `/auth/callback` aguardando a mudança de autenticação e redirecionando para `/(tabs)/home`.**

- [ ] **Step 5: Executar o teste.**

  Run: `npm test -- --runInBand __tests__/use-magic-link.test.tsx`

  Expected: PASS.

- [ ] **Step 6: Commit.**

  ```bash
  git add app features/auth __tests__/use-magic-link.test.tsx
  git commit -m "feat: add Magic Link authentication"
  ```

### Task 4: Criar acesso a listas, itens e clonagem

**Files:**
- Create: `features/shopping/api.ts`
- Create: `features/shopping/types.ts`
- Create: `features/shopping/queries.ts`
- Test: `__tests__/shopping-api.test.ts`

**Interfaces:**
- Consumes: `supabase`, `List`, `Item`.
- Produces: `createList(name)`, `createItem(listId, name)`, `updateItem(id, patch)`, `archiveList(id)` e `cloneLatestArchivedList()`.

- [ ] **Step 1: Escrever o teste de clonagem.**

  ```ts
  expect(insertedItems).toEqual([
    { list_id: newListId, name: 'Arroz', quantity: 2, price: 10, is_purchased: false },
  ]);
  ```

- [ ] **Step 2: Implementar tipos que correspondem exatamente às tabelas.**

  ```ts
  export type Item = { id: string; list_id: string; name: string; quantity: number; price: number; is_purchased: boolean };
  ```

- [ ] **Step 3: Implementar queries TanStack para home, histórico e lista por id, invalidando as chaves afetadas após cada mutação.**

- [ ] **Step 4: Implementar clonagem buscando uma lista arquivada por `created_at desc`, criando a nova lista e inserindo itens não comprados.**

- [ ] **Step 5: Executar o teste.**

  Run: `npm test -- --runInBand __tests__/shopping-api.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit.**

  ```bash
  git add features/shopping __tests__/shopping-api.test.ts
  git commit -m "feat: add shopping data operations"
  ```

### Task 5: Construir home, histórico e compra

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `app/(tabs)/history.tsx`
- Modify: `app/list/[id].tsx`
- Create: `features/shopping/total.ts`
- Test: `__tests__/total.test.ts`

**Interfaces:**
- Consumes: hooks de Task 4 e `purchasedTotal(items: Item[]): number`.
- Produces: telas completas de listas ativas, histórico e compra.

- [ ] **Step 1: Escrever o teste do total.**

  ```ts
  expect(purchasedTotal([
    { price: 12.5, quantity: 2, is_purchased: true },
    { price: 9, quantity: 1, is_purchased: false },
  ] as Item[])).toBe(25);
  ```

- [ ] **Step 2: Implementar o cálculo local.**

  ```ts
  export const purchasedTotal = (items: Item[]) =>
    items.filter((item) => item.is_purchased).reduce((total, item) => total + item.price * item.quantity, 0);
  ```

- [ ] **Step 3: Implementar home com listas ativas, criar lista e copiar última compra, incluindo estados carregando, vazio e erro.**

- [ ] **Step 4: Implementar histórico com listas arquivadas em ordem decrescente e total por card.**

- [ ] **Step 5: Implementar compra com adição rápida, seções pendente/carrinho, edição inline de quantidade/preço, total fixo e finalização. Renderizar a lista arquivada sem controles de escrita.**

- [ ] **Step 6: Executar o teste.**

  Run: `npm test -- --runInBand __tests__/total.test.ts`

  Expected: PASS.

- [ ] **Step 7: Validar em dispositivos.**

  Run: `npx expo start`

  Expected: Expo Go abre a mesma experiência no Android e no iOS; Android Emulator e iOS Simulator são alternativas locais.

- [ ] **Step 8: Commit.**

  ```bash
  git add app features/shopping __tests__/total.test.ts
  git commit -m "feat: add shopping list screens"
  ```
