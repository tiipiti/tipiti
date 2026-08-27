# Fluxo simples de lista e compra no Django Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir criar uma lista, completar seus itens e registrar uma compra vinculada sem expor o catálogo ou relações administrativas.

**Architecture:** Uma view administrativa própria, pendurada na lista, mostra os itens pendentes como um formulário simples. Ela reutiliza `finalize_purchase` para travamento, validação de quantidades, totalização e atualização dos itens. O modelo passa a aceitar filial nula para que o campo “Onde comprou?” seja realmente opcional.

**Tech Stack:** Django Admin, Unfold, Django Forms/FormSets, PostgreSQL/SQLite migrations, pytest.

**Spec:** `docs/superpowers/specs/backend/2026-08-26-child-simple-admin-shopping-flow.md`

## Global Constraints

- Reutilizar Django Admin e Unfold; não adicionar dependência de frontend.
- Manter as regras transacionais existentes para quantidades, total e histórico.
- Validar no servidor que cada item da compra pertence à lista selecionada.
- Impedir visualmente a seleção inválida, filtrando os itens disponíveis pela lista de origem.
- Preservar acessibilidade nativa dos campos, foco, rótulos e mensagens de erro do Django.
- Não alterar APIs móveis de forma incompatível.

---

### Task 1: Tornar mercado opcional sem duplicar a finalização

**Files:**
- Modify: `backend/shopping/models.py:290-303`
- Create: `backend/shopping/migrations/0006_shoppingpurchase_branch_optional.py`
- Modify: `backend/shopping/services.py:198-237`
- Modify: `backend/shopping/serializers.py:245-270`
- Test: `backend/tests/integration/shopping/test_purchase_views.py`

**Interfaces:**
- Consumes: `finalize_purchase(user, shopping_list, data)` e `FinalizePurchaseSerializer`.
- Produces: `finalize_purchase` aceita `data["market_id"]` ausente ou nulo e cria `ShoppingPurchase(branch=None)`; chamadas existentes com mercado permanecem idênticas.

- [x] **Step 1: Write the failing tests**

```python
def test_admin_can_finalize_a_purchase_without_a_market(self):
    # A list item is selected in the list-specific purchase form.
    response = self.client.post(register_url, payload_without_branch)
    self.assertEqual(response.status_code, 302)
    self.assertIsNone(ShoppingPurchase.objects.get().branch)

def test_purchase_api_keeps_requiring_a_market(self):
    response = self.client.post(api_url, payload_without_market_id, format="json")
    self.assertEqual(response.status_code, 400)
```

- [x] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/pytest tests/integration/shopping/test_purchase_views.py -q`

Expected: the Admin route does not exist and/or `branch` cannot be null.

- [x] **Step 3: Make the model and service support the optional Admin value**

```python
branch = models.ForeignKey(
    MarketBranch, null=True, blank=True, on_delete=models.PROTECT,
    related_name="shopping_purchases",
)

branch = None
if market_id := data.get("market_id"):
    branch = MarketBranch.objects.filter(public_id=market_id, is_active=True).first()
    if not branch:
        raise ValidationError({"market_id": "Mercado não encontrado."})
```

Keep `FinalizePurchaseSerializer.market_id` required so mobile API input does not change. Generate the migration with Django; do not edit an existing migration.

- [x] **Step 4: Run the focused tests and migration check**

Run: `.venv/bin/pytest tests/integration/shopping/test_purchase_views.py -q && .venv/bin/python manage.py makemigrations --check --dry-run`

Expected: tests pass and no pending migrations remain.

### Task 2: Criar o registro guiado a partir da lista

**Files:**
- Modify: `backend/shopping/admin.py:1-260,587-652`
- Modify: `backend/templates/admin/shopping/shoppinglist/change_form.html`
- Create: `backend/templates/admin/shopping/shoppingpurchase/register_from_list.html`
- Modify: `backend/core/static/core/admin.css`
- Test: `backend/tests/integration/shopping/test_purchase_views.py`

**Interfaces:**
- Consumes: `finalize_purchase`, `ShoppingList`, pendências `ListItem`, `TipitiAdminSite`.
- Produces: `ShoppingListAdmin.register_purchase_view(request, object_id)` at `shopping/<list-id>/register-purchase/`; it only accepts that list’s uncompleted items and redirects to the list with a success message.

- [x] **Step 1: Write the failing tests**

```python
def test_list_change_has_a_register_purchase_action(self):
    response = self.client.get(list_change_url)
    self.assertContains(response, "Registrar compra")
    self.assertContains(response, register_url)

def test_register_purchase_shows_only_pending_items_from_the_list(self):
    response = self.client.get(register_url)
    self.assertContains(response, "Arroz")
    self.assertNotContains(response, "Item de outra lista")
    self.assertNotContains(response, "Produto")

def test_register_purchase_rejects_item_not_belonging_to_the_list(self):
    response = self.client.post(register_url, payload_with_foreign_item)
    self.assertEqual(response.status_code, 200)
    self.assertContains(response, "Item da lista não encontrado")
```

- [x] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/pytest tests/integration/shopping/test_purchase_views.py -q`

Expected: missing route/action and failing assertions.

- [x] **Step 3: Implement a native Django form and custom Admin view**

Create a small non-model header form (`purchased_on`, optional active `branch`) and a formset with one row per pending `ListItem`. Each row has a hidden list-item public ID, a `Comprei` checkbox, a quantity prefilled to the remaining quantity and a price field. In formset `clean`, require one checked row and require a positive quantity and a non-negative price only for checked rows.

The view resolves the `ShoppingList`, loads its pending items once, validates the header and formset, and calls:

```python
finalize_purchase(
    request.user,
    shopping_list,
    {
        "client_operation_id": uuid.uuid4(),
        "purchased_on": header_form.cleaned_data["purchased_on"],
        "market_id": branch.public_id if branch else None,
        "items": selected_items,
    },
)
```

Use `admin_site.admin_view`, `TemplateResponse`, messages and an atomic service call. Add a “Registrar compra” object-tool link only for non-archived lists with at least one pending item.

- [x] **Step 4: Implement the task-first template and native live total**

Render an accessible table/list whose visible labels are `Comprei`, `Item`, `Quantidade` and `Preço pago`. Keep `Onde comprou?` explicitly optional. Add a tiny, dependency-free script that recalculates the visible `Total da compra` from checked rows on `input`/`change`; server calculation remains authoritative.

Use the existing Tipiti color and focus vocabulary in `admin.css`; do not create a new design system or custom widget library.

- [x] **Step 5: Run the focused Admin tests**

Run: `.venv/bin/pytest tests/integration/shopping/test_purchase_views.py -q`

Expected: all focused tests pass.

### Task 3: Confirm the completion path and regression safety

**Files:**
- Modify: `backend/tests/integration/shopping/test_purchase_views.py`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: the list-specific purchase route and transaction service.
- Produces: integration coverage for confirmation/redirect, total, completed item state and field isolation; repository documentation records the new Admin workflow.

- [x] **Step 1: Write the failing confirmation test**

```python
def test_register_purchase_returns_to_the_list_with_confirmation(self):
    response = self.client.post(register_url, valid_payload)
    self.assertRedirects(response, list_change_url)
    follow = self.client.get(list_change_url)
    self.assertContains(follow, "Compra registrada")
    self.assertContains(follow, "R$ 32,90")
```

- [x] **Step 2: Run the test to verify the confirmation is missing**

Run: `.venv/bin/pytest tests/integration/shopping/test_purchase_views.py -q`

Expected: failure until the view adds the success message and redirect.

- [x] **Step 3: Add the smallest confirmation and documentation change**

Use `messages.success(request, "Compra registrada: ...")`, redirect to the source list, and record the list-driven purchase route in `AGENTS.md`.

- [x] **Step 4: Run all verification**

Run: `.venv/bin/ruff format shopping/admin.py shopping/models.py shopping/services.py shopping/serializers.py tests/integration/shopping/test_purchase_views.py && .venv/bin/ruff check shopping/admin.py shopping/models.py shopping/services.py shopping/serializers.py tests/integration/shopping/test_purchase_views.py && .venv/bin/python -m compileall -q config core shopping accounts notifications tests && .venv/bin/python manage.py check && .venv/bin/python manage.py makemigrations --check --dry-run && .venv/bin/pytest tests -q && git diff --check`

Expected: format/check pass, Django reports no issues or pending migration, full test suite passes and diff check is clean.
