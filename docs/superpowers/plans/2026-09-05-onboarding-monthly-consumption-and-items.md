# Onboarding, consumo mensal e itens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o Tipiti fácil de entrar e usar, com consumo mensal real, listas nomeadas, itens rápidos e o design pixel neo-brutalista completo.

**Architecture:** O Supabase continua como única fonte de dados e o RLS mantém os dados privados. Um helper puro calcula totais por mês a partir de listas arquivadas e seus itens comprados. As páginas React consomem hooks TanStack Query existentes, React Hook Form e Zod; CSS global e SVGs próprios aplicam o sistema visual sem bibliotecas novas.

**Tech Stack:** React 19, TypeScript, React Router, Supabase JS, TanStack Query, React Hook Form, Zod, Vitest, Tailwind 4.

**Spec:** [onboarding, consumo mensal e itens](../specs/2026-09-05-onboarding-monthly-consumption-and-items-design.md), [sistema visual](../../../DESIGN.md)

## Global Constraints

- Usar somente a chave publicável do Supabase no browser, nunca service role.
- Listas e itens continuam isolados pelo RLS do usuário autenticado.
- O consumo é a soma de itens comprados em listas com `archived_at` no mês de referência.
- Não implementar limite, orçamento, gráfico, meta, compartilhamento ou nova tabela.
- Formulários usam React Hook Form, Zod e `zodResolver`.
- Aplicar papel, tinta preta, bordas de 4px, sombras rígidas, raio zero, SVGs pixelados próprios e `prefers-reduced-motion` definidos em `DESIGN.md`.
- Não usar Lucide, emoji, gradientes, bordas arredondadas ou sombras difusas.

---

### Task 1: Cálculo de consumo mensal e consulta de histórico com itens

**Files:**
- Create: `src/features/shopping/monthly.ts`
- Create: `src/features/shopping/monthly.test.ts`
- Modify: `src/features/shopping/types.ts`
- Modify: `src/features/shopping/api.ts`
- Modify: `src/features/shopping/queries.ts`

**Interfaces:**
- Produces `ArchivedListWithItems`, `monthlyConsumption(lists, month): { total: number; purchases: number }` e `monthDifference(current, previous): number`.
- Produces `getArchivedListsWithItems()` e `useMonthlyConsumption(now?: Date)`, cuja `data` é `{ current, previous }`.
- Consumes `List`, `Item`, `purchasedTotal()` e `archived_at`.

- [ ] **Step 1: Write the failing monthly calculation test.**

  ```ts
  import { monthlyConsumption, monthDifference } from './monthly'

  it('counts bought items only from finalized lists in the selected month', () => {
    const result = monthlyConsumption([
      { archived_at: '2026-09-02T12:00:00.000Z', items: [{ quantity: 2, price: 10, is_purchased: true }, { quantity: 1, price: 9, is_purchased: false }] },
      { archived_at: '2026-08-30T12:00:00.000Z', items: [{ quantity: 1, price: 7, is_purchased: true }] },
    ], new Date('2026-09-15T12:00:00.000Z'))

    expect(result).toEqual({ total: 20, purchases: 1 })
    expect(monthDifference(20, 7)).toBe(13)
  })
  ```

- [ ] **Step 2: Run the focused test and confirm red.**

  Run: `npm test -- src/features/shopping/monthly.test.ts`

  Expected: FAIL because `./monthly` does not exist.

- [ ] **Step 3: Implement the minimal pure helpers.**

  ```ts
  export const monthlyConsumption = (lists: ArchivedListWithItems[], month: Date) => {
    const year = month.getFullYear()
    const index = month.getMonth()
    const included = lists.filter(({ archived_at }) => {
      if (!archived_at) return false
      const date = new Date(archived_at)
      return date.getFullYear() === year && date.getMonth() === index
    })
    return { total: included.reduce((sum, list) => sum + purchasedTotal(list.items), 0), purchases: included.length }
  }

  export const monthDifference = (current: number, previous: number) => current - previous
  ```

  Define `ArchivedListWithItems = List & { items: Item[] }`. Add a dedicated Supabase read selecting `listColumns` and nested `items(itemColumns)`, sorted by `archived_at` descending. Keep `getArchivedLists()` unchanged for history. Expose one query hook with a distinct `['lists', 'archived-with-items']` key.

- [ ] **Step 4: Run focused and full tests.**

  Run: `npm test -- src/features/shopping/monthly.test.ts && npm test`

  Expected: PASS.

- [ ] **Step 5: Commit the self-contained data change.**

  ```bash
  git add src/features/shopping/monthly.ts src/features/shopping/monthly.test.ts src/features/shopping/types.ts src/features/shopping/api.ts src/features/shopping/queries.ts
  git commit -m "feat: add monthly shopping consumption"
  ```

### Task 2: Cadastro por e-mail claro e privado

**Files:**
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/features/auth/LoginPage.test.tsx`
- Modify: `src/features/auth/CallbackPage.tsx`
- Modify: `src/features/auth/gate.tsx`

**Interfaces:**
- Consumes `emailSchema`, `supabase.auth.signInWithOtp`, `useSession`.
- Produces a public e-mail-only sign-in/create-account flow and branded callback/loading states.

- [ ] **Step 1: Replace the anonymous-session test with failing e-mail-flow and rate-limit tests.**

  ```tsx
  it('sends a sign-in link and confirms the submitted email', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: null })
    render(<LoginPage />, { wrapper: MemoryRouter })
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    await waitFor(() => expect(auth.signInWithOtp).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@example.com' })))
    expect(screen.getByText('Confira ana@example.com')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Entrar para teste' })).not.toBeInTheDocument()
  })

  it('explains the email rate limit without exposing Supabase text', async () => {
    auth.signInWithOtp.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } })
    render(<LoginPage />, { wrapper: MemoryRouter })
    fireEvent.change(screen.getByLabelText('Seu e-mail'), { target: { value: 'ana@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Começar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Aguarde alguns minutos antes de pedir outro link.')
  })
  ```

- [ ] **Step 2: Run the focused test and confirm red.**

  Run: `npm test -- src/features/auth/LoginPage.test.tsx`

  Expected: FAIL because the current UI still exposes `Entrar para teste` and has different copy.

- [ ] **Step 3: Implement the smallest accessible flow.**

  Keep `useForm` and its Zod resolver. Send `shouldCreateUser: true` and the existing callback URL. Replace raw Supabase errors with `Não foi possível enviar o link. Tente novamente.` and, when the message contains `rate limit`, `Aguarde alguns minutos antes de pedir outro link.`. On success, render the submitted address, a `Corrigir e-mail` button that returns to the input, and `Reenviar link` that repeats the last valid submission. Remove `signInAnonymously`, its state and imports. Use the same loading structure in callback and gate.

- [ ] **Step 4: Run the auth suite.**

  Run: `npm test -- src/features/auth/LoginPage.test.tsx src/features/auth/session.test.tsx`

  Expected: PASS.

- [ ] **Step 5: Commit the onboarding change.**

  ```bash
  git add src/features/auth/LoginPage.tsx src/features/auth/LoginPage.test.tsx src/features/auth/CallbackPage.tsx src/features/auth/gate.tsx
  git commit -m "feat: simplify email onboarding"
  ```

### Task 3: Lista nomeada e cadastro rápido de itens

**Files:**
- Modify: `src/features/shopping/HomePage.tsx`
- Modify: `src/features/shopping/ListPage.tsx`
- Modify: `src/features/shopping/ItemRow.tsx`
- Modify: `src/features/shopping/api.ts`
- Modify: `src/features/shopping/queries.ts`
- Modify: `src/features/shopping/pages.test.tsx`
- Modify: `src/features/shopping/list-page.test.tsx`

**Interfaces:**
- Changes `createList(name: string)` and `useCreateList()` to require a name.
- Keeps `createItem(listId, name)` and exposes the item input through `new-item`.
- Consumes `nameSchema`, `itemSchema`, and all existing mutation hooks.

- [ ] **Step 1: Write failing creation and focus tests.**

  ```tsx
  it('requires a list name before creating it', async () => {
    render(<HomePage />, { wrapper })
    fireEvent.click(await screen.findByRole('button', { name: 'Nova lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Criar lista' }))
    expect(await screen.findByText('Informe um nome')).toBeInTheDocument()
  })

  it('clears and refocuses the product field after adding an item', async () => {
    render(<ListPage />, { wrapper })
    const input = await screen.findByLabelText('Adicionar item')
    fireEvent.change(input, { target: { value: 'Arroz' } })
    fireEvent.submit(input.closest('form')!)
    await waitFor(() => expect(input).toHaveValue(''))
    expect(input).toHaveFocus()
  })
  ```

- [ ] **Step 2: Run focused tests and confirm red.**

  Run: `npm test -- src/features/shopping/pages.test.tsx src/features/shopping/list-page.test.tsx`

  Expected: FAIL because list creation has no required name and the item form does not restore focus.

- [ ] **Step 3: Implement creation and input focus.**

  Replace one-click default creation with an inline form in Home. Use `nameSchema`, label `Nome da lista`, and only navigate after `mutateAsync({ name })` succeeds. Change API and mutation signatures to require the supplied name, retaining `cloneLatestArchivedList(latest.name)`. In `ListPage`, hold an `inputRef`, call `reset()` and `inputRef.current?.focus()` only after `createItem.mutateAsync` succeeds.

- [ ] **Step 4: Make item status explicit and direct.**

  Keep the inline RHF/Zod quantity and price editor. Replace the name-wide toggle with a dedicated button using `aria-pressed`, accessible label `Marcar {name} como comprado` or `Marcar {name} como pendente`, visible text `COMPRADO` or `PENDENTE`, and retry behavior already used by the row. The list page supplies table headers `ITEM`, `QTD`, `PREÇO`, `STATUS`; purchased rows remain sorted last.

- [ ] **Step 5: Run focused and full tests.**

  Run: `npm test -- src/features/shopping/pages.test.tsx src/features/shopping/list-page.test.tsx && npm test`

  Expected: PASS.

- [ ] **Step 6: Commit the shopping interaction change.**

  ```bash
  git add src/features/shopping/HomePage.tsx src/features/shopping/ListPage.tsx src/features/shopping/ItemRow.tsx src/features/shopping/api.ts src/features/shopping/queries.ts src/features/shopping/pages.test.tsx src/features/shopping/list-page.test.tsx
  git commit -m "feat: streamline named shopping lists"
  ```

### Task 4: Aplicar o sistema visual e o painel mensal

**Files:**
- Create: `src/features/shopping/PixelIcons.tsx`
- Modify: `src/index.css`
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/features/auth/CallbackPage.tsx`
- Modify: `src/features/auth/gate.tsx`
- Modify: `src/features/shopping/HomePage.tsx`
- Modify: `src/features/shopping/HistoryPage.tsx`
- Modify: `src/features/shopping/ListSummary.tsx`
- Modify: `src/features/shopping/ListPage.tsx`
- Modify: `src/features/shopping/ItemRow.tsx`
- Modify: `src/features/shopping/pages.test.tsx`

**Interfaces:**
- Produces `PixelCart`, `PixelCoin`, and `PixelCheck` SVG components with `shapeRendering="crispEdges"`.
- Consumes `useMonthlyConsumption()`, `monthlyConsumption()`, `monthDifference()`, `formatCurrency()` and existing page queries.

- [ ] **Step 1: Write the failing dashboard rendering test.**

  ```tsx
  it('shows this month, completed purchases and the difference from last month', async () => {
    monthlyQuery.mockReturnValue({ data: { current: { total: 120, purchases: 2 }, previous: { total: 80, purchases: 1 } }, isLoading: false })
    render(<HomePage />, { wrapper })
    expect(await screen.findByRole('heading', { name: 'Consumo do mês' })).toBeInTheDocument()
    expect(screen.getByText('R$ 120,00')).toBeInTheDocument()
    expect(screen.getByText('R$ 40,00 a mais que agosto')).toBeInTheDocument()
  })
  ```

- [ ] **Step 2: Run the focused test and confirm red.**

  Run: `npm test -- src/features/shopping/pages.test.tsx`

  Expected: FAIL because Home has no monthly summary.

- [ ] **Step 3: Implement the monthly dashboard without a chart.**

  In `HomePage`, compute current month and `new Date(year, month - 1, 1)` from one archived-items query. Render the yellow `CONSUMO DO MÊS` panel before active lists: currency total, `N COMPRA(S) FINALIZADA(S)`, and a textual difference against the localized previous month. Render `IGUAL AO MÊS PASSADO` for zero. Use a skeleton while the monthly query is loading and the normal error/retry control if it fails.

- [ ] **Step 4: Replace the global visual layer and page class names.**

  Replace the unused shadcn token layer in `src/index.css` with the exact Tipiti tokens: `#F4F0EB`, `#000000`, `#39FF14`, `#FFFF00`, `#FF5F1F`, and `#D6D0C8`; `Impact, Arial Black, sans-serif` for display; `Courier New, monospace` for controls and data. Define only reusable visual primitives: `.tipiti-page`, `.tipiti-panel`, `.tipiti-button`, `.tipiti-input`, `.tipiti-table`, `.tipiti-status`, `.tipiti-skeleton`. All use 4px solid ink border, 0 radius, focus-visible outline, at least 44px controls, rigid `6px 6px 0 #000000` elevation for actionable panels/buttons, and active `translate(6px, 6px)` with zero shadow. Add a reduced-motion media query that disables transitions.

- [ ] **Step 5: Apply the primitives consistently.**

  Rework login, callback, gate, Home, History, summaries, List and ItemRow into mobile-first one-column layouts. Use the display face only for headings and money. Use black 3px row dividers and the table columns on wide screens; on narrow screens keep the same labels with CSS grid, never hide status. Add `PixelCart` to empty/list actions, `PixelCoin` to the monthly total and `PixelCheck` to the purchase control. Each SVG uses only `rect` elements, no more than three palette colors, and `shapeRendering="crispEdges"`. Do not import an icon library.

- [ ] **Step 6: Run rendering, accessibility-adjacent and production checks.**

  Run: `npm test -- src/features/shopping/pages.test.tsx src/features/shopping/list-page.test.tsx src/features/auth/LoginPage.test.tsx && npm test && npm run lint && npm run build && git diff --check`

  Expected: all commands exit 0. The existing Fast Refresh lint warning may remain only if it was present before this task; do not add new warnings.

- [ ] **Step 7: Commit the completed interface.**

  ```bash
  git add src/index.css src/features/auth/LoginPage.tsx src/features/auth/CallbackPage.tsx src/features/auth/gate.tsx src/features/shopping/PixelIcons.tsx src/features/shopping/HomePage.tsx src/features/shopping/HistoryPage.tsx src/features/shopping/ListSummary.tsx src/features/shopping/ListPage.tsx src/features/shopping/ItemRow.tsx src/features/shopping/pages.test.tsx
  git commit -m "feat: apply Tipiti pixel shopping design"
  ```

### Task 5: Atualizar rastreio e verificar localmente

**Files:**
- Modify: `TODO.md`

**Interfaces:**
- Consumes the completed user-facing implementation.
- Produces an accurate implementation checklist.

- [ ] **Step 1: Mark only completed implementation items.**

  Mark auth, monthly consumption, named lists, item flow and visual design complete. Leave device and Vercel checks unchecked until run against a real browser/deployment.

- [ ] **Step 2: Run the final verification set.**

  Run: `npm test && npm run lint && npm run build && git diff --check && git status --short`

  Expected: tests, lint, build and diff check pass; status only shows intentional `TODO.md` before commit.

- [ ] **Step 3: Commit checklist truthfully.**

  ```bash
  git add TODO.md
  git commit -m "docs: update Tipiti implementation checklist"
  ```

## Coverage review

- E-mail-only entry, account creation, clear recovery and rate-limit language: Task 2.
- Own private data under existing RLS: global constraints and no policy changes.
- Current month, previous month, count and zero-month behavior: Task 1 and Task 4.
- No limit, budget, graph, meta or new table: global constraints and Task 1.
- Named lists, rapid item addition, direct quantity/price and explicit bought state: Task 3.
- Pixel neo-brutalist system, all pages, mobile layout, focus and reduced motion: Task 4.
