# PWA Shopping MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a PWA Tipiti funcional: Magic Link, listas, compra, histórico e instalação web.

**Architecture:** React Router separa as cinco rotas e um gate de sessão protege as privadas. TanStack Query lê o Supabase; cada mutação só invalida as consultas após sucesso, preservando a tela em falhas. Formulários locais usam React Hook Form, Zod e `zodResolver`.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind 4, React Router, Supabase JS, TanStack Query, React Hook Form, Zod, vite-plugin-pwa, Vitest.

**Spec:** [PWA shopping MVP design](../specs/2026-09-05-pwa-shopping-mvp-design.md)

## Global Constraints

- Cliente PWA mobile-first com Geist, base Zinc e um único destaque Emerald.
- Usar somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; nunca service role.
- Formularios usam `zodResolver`, labels acima do input e mensagem de erro abaixo.
- Escritas exigem conexão; falhas não fazem atualização otimista.
- Não adicionar biblioteca de ícones ou animação; usar texto e transições CSS curtas.
- Preservar RLS da migration existente; aplicar e configurar URLs no dashboard é ação manual posterior.

---

### Task 1: Modelo de domínio e validação de formulários

**Files:**
- Create: `src/features/shopping/types.ts`
- Create: `src/features/shopping/forms.ts`
- Create: `src/features/shopping/forms.test.ts`
- Modify: `src/features/shopping/total.ts`
- Modify: `src/features/shopping/total.test.ts`

**Interfaces:**
- Produces: `List`, `Item`, `itemSchema`, `nameSchema`, `emailSchema`, `parseBrazilianPrice(value): number`, `formatCurrency(value): string`, `formatDate(value): string` and `purchasedTotal(items): number`.

- [ ] **Step 1: Write failing validation tests.**

  ```ts
  expect(() => itemSchema.parse({ quantity: '0', price: '12,50' })).not.toThrow()
  expect(() => itemSchema.parse({ quantity: '-1', price: '0' })).toThrow()
  expect(parseBrazilianPrice('12,50')).toBe(12.5)
  ```

- [ ] **Step 2: Run `npm test -- src/features/shopping/forms.test.ts`; confirm it fails because the module does not exist.**

- [ ] **Step 3: Implement the smallest schemas and format helpers.** `nameSchema` trims and requires one character; `emailSchema` validates an e-mail; `itemSchema` preprocesses a decimal quantity and a comma-or-dot price to nonnegative numbers.

- [ ] **Step 4: Run `npm test -- src/features/shopping/forms.test.ts src/features/shopping/total.test.ts`; confirm pass.**

- [ ] **Step 5: Commit `feat: add shopping form validation`.**

### Task 2: Sessão, Magic Link e rotas protegidas

**Files:**
- Create: `src/features/auth/session.tsx`
- Create: `src/features/auth/LoginPage.tsx`
- Create: `src/features/auth/CallbackPage.tsx`
- Create: `src/features/auth/session.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `supabase.auth.getSession`, `onAuthStateChange` and `signInWithOtp`.
- Produces: `SessionProvider`, `RequireSession`, `useSession` and route components for `/login` and `/auth/callback`.

- [ ] **Step 1: Write a failing test that verifies `RequireSession` navigates a missing session to `/login` and leaves content visible for an authenticated session.**

  ```tsx
  render(<RequireSession session={{ user: { id: 'user-1' } } as Session}><p>Privado</p></RequireSession>)
  expect(screen.getByText('Privado')).toBeInTheDocument()
  ```

- [ ] **Step 2: Run `npm test -- src/features/auth/session.test.tsx`; confirm it fails because the gate does not exist.**

- [ ] **Step 3: Implement a minimal context that restores the Supabase browser session once and subscribes to future auth changes.** Keep loading as a skeleton, redirect unauthenticated private routes, and make the callback navigate to `/home` after session restoration.

- [ ] **Step 4: Implement `LoginPage` with `useForm({ resolver: zodResolver(emailSchema) })`, `signInWithOtp`, redirect `${window.location.origin}/auth/callback`, inline error, and `Confira seu e-mail` success state.**

- [ ] **Step 5: Add the React Router tree in `App.tsx`: `/login`, `/auth/callback`, `/home`, `/history`, `/list/:id`, plus a catch-all redirect. Wrap it in `QueryClientProvider` and `SessionProvider` in `main.tsx`.**

- [ ] **Step 6: Run `npm test -- src/features/auth/session.test.tsx` and `npm run build`; confirm pass.**

- [ ] **Step 7: Commit `feat: add Magic Link session routes`.**

### Task 3: Supabase list and item operations

**Files:**
- Create: `src/features/shopping/api.ts`
- Create: `src/features/shopping/api.test.ts`
- Create: `src/features/shopping/queries.ts`

**Interfaces:**
- Consumes: `List`, `Item`, and `supabase`.
- Produces: `getActiveLists`, `getArchivedLists`, `getList`, `getItems`, `createList`, `renameList`, `createItem`, `updateItem`, `deleteItem`, `toggleItem`, `archiveList`, `reopenList`, `cloneLatestArchivedList`, and associated TanStack Query hooks.

- [ ] **Step 1: Write a failing unit test for `cloneItemPayloads` that copies name, quantity and price while forcing `is_purchased: false`.**

  ```ts
  expect(cloneItemPayloads('new-list', [{ name: 'Arroz', quantity: 2, price: 8, is_purchased: true }]))
    .toEqual([{ list_id: 'new-list', name: 'Arroz', quantity: 2, price: 8, is_purchased: false }])
  ```

- [ ] **Step 2: Run `npm test -- src/features/shopping/api.test.ts`; confirm it fails because the helper does not exist.**

- [ ] **Step 3: Implement direct Supabase operations with explicit `throw error` handling.** Queries select only the columns in `List`/`Item`, active and history lists have their required sort order, and mutations invalidate `['lists']` and `['list', id]` only after success.

- [ ] **Step 4: Implement cloning as: fetch the latest archived list and its items, insert one active list, insert copied items when present. On item insertion failure, delete the newly-created list before rethrowing.** This avoids leaving a partial cloned list without requiring a new database RPC.

- [ ] **Step 5: Run `npm test -- src/features/shopping/api.test.ts`; confirm pass.**

- [ ] **Step 6: Commit `feat: add Supabase shopping operations`.**

### Task 4: Home and Histórico

**Files:**
- Create: `src/features/shopping/HomePage.tsx`
- Create: `src/features/shopping/HistoryPage.tsx`
- Create: `src/features/shopping/ListSummary.tsx`
- Create: `src/features/shopping/pages.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: query hooks and `formatCurrency`, `formatDate`, `purchasedTotal`.
- Produces: active-list and archived-list route pages.

- [ ] **Step 1: Write a failing rendering test for the active empty state.**

  ```tsx
  render(<HomePage />)
  expect(await screen.findByRole('button', { name: 'Criar lista' })).toBeInTheDocument()
  ```

- [ ] **Step 2: Run `npm test -- src/features/shopping/pages.test.tsx`; confirm it fails because `HomePage` does not exist.**

- [ ] **Step 3: Implement Home: skeleton while loading, empty state with `Criar lista`, newest active lists first, `Nova lista` creation, inline rename form, and clone-last button only when an archived list exists.** Route a list card to `/list/:id`.

- [ ] **Step 4: Implement Histórico: skeleton, `Nenhuma compra finalizada`, history ordered by `archived_at`, and each list summary with name, purchased total and finalization date.**

- [ ] **Step 5: For every write failure, keep the existing query data untouched and render `Tentar novamente` to repeat the exact mutation.**

- [ ] **Step 6: Run `npm test -- src/features/shopping/pages.test.tsx`; confirm pass.**

- [ ] **Step 7: Commit `feat: add active and archived list pages`.**

### Task 5: Lista de compra e finalização

**Files:**
- Create: `src/features/shopping/ListPage.tsx`
- Create: `src/features/shopping/ItemRow.tsx`
- Create: `src/features/shopping/list-page.test.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: item/list query and mutation hooks, `itemSchema`, `nameSchema`, `purchasedTotal`.
- Produces: `/list/:id` active editing and archived read-only behavior.

- [ ] **Step 1: Write a failing test that verifies pending items render before purchased items and `R$ 25,00` only includes purchased quantity times price.**

  ```tsx
  expect(screen.getAllByTestId('item-row').map((node) => node.textContent)).toEqual(['Feijão', 'Arroz'])
  expect(screen.getByText('R$ 25,00')).toBeInTheDocument()
  ```

- [ ] **Step 2: Run `npm test -- src/features/shopping/list-page.test.tsx`; confirm it fails because the page does not exist.**

- [ ] **Step 3: Implement item creation at the top with `nameSchema`; default new items to quantity `1`, price `0`, and unpurchased.**

- [ ] **Step 4: Implement active item rows: tapping the item toggles purchased state; tapping its edit control expands an RHF/Zod inline form for quantity and price with Salvar/Cancelar; name is display-only; delete removes the item.**

- [ ] **Step 5: Implement archived rows as read-only and expose only `Reabrir lista`. For an active list, add `Finalizar compra` with a native `window.confirm`, archive with `is_archived: true, archived_at: new Date().toISOString()`, then navigate home.**

- [ ] **Step 6: Show `Lista não encontrada` for a missing/no-access list, skeleton on reads, and an always-visible footer total for purchased items.**

- [ ] **Step 7: Run `npm test -- src/features/shopping/list-page.test.tsx` and `npm test`; confirm pass.**

- [ ] **Step 8: Commit `feat: add shopping list workflow`.**

### Task 6: PWA assets, polish and release checks

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`
- Modify: `vite.config.ts`
- Modify: `src/index.css`
- Modify: `README.md`
- Modify: `TODO.md`

**Interfaces:**
- Consumes: VitePWA manifest and all route pages.
- Produces: installable manifest with required raster icons and setup instructions.

- [ ] **Step 1: Create a simple Zinc and Emerald letter `T` source, rasterize it to 192px and 512px PNG, and reference both exact sizes in the manifest.**

- [ ] **Step 2: Remove the Vite demo CSS and assets from the rendered application. Add global focus-visible, active transform, neutral/emerald tokens and `min-h-[100dvh]` layout support.**

- [ ] **Step 3: Document the manual Supabase migration and Redirect URLs (`http://localhost:5173/auth/callback` and the deployed Vercel URL ending `/auth/callback`) in `README.md`.**

- [ ] **Step 4: Check completed local tasks in `TODO.md`; leave dashboard/deploy/device checks unchecked until actually performed.**

- [ ] **Step 5: Run `npm run lint`, `npm test`, `npm run build`, and `git diff --check`; confirm all pass.**

- [ ] **Step 6: Commit `feat: finish Tipiti PWA MVP`.**

## Coverage review

- Authentication, private routes and direct callback URLs: Task 2.
- RLS-compatible reads/writes, active/history ordering, clone/reopen semantics: Task 3.
- All states for Home and Histórico: Task 4.
- Item create, edit, purchase, delete, total, finish and read-only archived list: Task 5.
- Manifest icons, shell caching, Vercel-compatible SPA build and manual deployment requirements: Task 6.
