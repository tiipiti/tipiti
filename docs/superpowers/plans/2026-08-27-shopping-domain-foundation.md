# Shopping Domain Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the duplicated shopping domain with one canonical, auditable purchase aggregate and explicit relational targets.

**Architecture:** `ShoppingList.owner` is the single ownership source; membership is participation only. A purchase contains immutable lines and append-only events, while totals and list balances are derived from active lines. Explicit foreign keys replace loose type/id pairs in sharing and reporting.

**Tech Stack:** Python 3.13, Django 6, Django REST Framework, PostgreSQL constraints, pytest.

**Spec:** `docs/superpowers/specs/2026-08-27-shopping-domain-foundation-design.md`

## Global Constraints

- The existing `shopping` database and legacy `/api/` shopping contract are intentionally discarded.
- Keep `/api/v1/` as the sole public shopping API.
- Do not add dependencies or persisted calculated totals/counters.
- Keep public domain models on `core.models.BaseModel`.
- Use model/service validation for cross-table predicates Django cannot express as a database check.

---

### Task 1: Establish the canonical schema

**Files:**
- Modify: `backend/shopping/models.py`
- Delete: `backend/shopping/migrations/0001_initial.py` through `0006_shoppingpurchase_branch_optional.py`
- Create: `backend/shopping/migrations/0001_initial.py`
- Test: `backend/tests/integration/shopping/test_models.py`

**Interfaces:**
- Produces `ShoppingList.owner`, role-free `ListMembership`, `PurchaseEvent`, canonical `ShoppingPurchase` and `ShoppingPurchaseItem`.
- Produces explicit targets on `ShareLink` and `Report`.

- [ ] **Step 1: Write failing schema/invariant tests**

```python
def test_list_has_one_owner_and_unique_membership(db, user):
    shopping_list = ShoppingList.objects.create(name="Feira", owner=user)
    ListMembership.objects.create(shopping_list=shopping_list, user=user)
    with pytest.raises(IntegrityError):
        ListMembership.objects.create(shopping_list=shopping_list, user=user)
```

- [ ] **Step 2: Run the model test to verify it fails**

Run: `uv run pytest tests/integration/shopping/test_models.py -v`
Expected: FAIL because the owner FK and role-free membership do not yet exist.

- [ ] **Step 3: Replace the duplicate and generic schema**

```python
class ShoppingList(BaseModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)

class ShoppingPurchaseItem(BaseModel):
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
```

Remove `Store`, `StoreItem`, `Purchase`, `PurchaseChange`, purchase/item total
fields, item purchase counters and role fields. Recreate the initial migration
from the final models; do not retain migration history.

- [ ] **Step 4: Run schema tests and migration checks**

Run: `uv run pytest tests/integration/shopping/test_models.py -v && uv run python manage.py makemigrations --check`
Expected: PASS and `No changes detected`.

- [ ] **Step 5: Commit**

```bash
git add backend/shopping/models.py backend/shopping/migrations backend/tests/integration/shopping/test_models.py
git commit -m "feat: rebuild shopping domain schema"
```

### Task 2: Rebuild transactional list and purchase services

**Files:**
- Modify: `backend/shopping/services.py`
- Test: `backend/tests/unit/shopping/test_services.py`
- Test: `backend/tests/integration/shopping/test_purchase_views.py`

**Interfaces:**
- Consumes `ShoppingList.owner`, `ShoppingPurchase`, `ShoppingPurchaseItem`, `PurchaseEvent`.
- Produces `create_shopping_list(user, *, name)`, `transfer_ownership(user, shopping_list, member_public_id)`, `finalize_purchase(user, shopping_list, data)`, `void_purchase(user, purchase, *, reason="")`.

- [ ] **Step 1: Write failing service tests**

```python
def test_finalize_purchase_rejects_item_from_another_list(client, user, list_a, list_b, item_b):
    client.force_authenticate(user)
    response = client.post(f"/api/v1/lists/{list_a.public_id}/finalize/", {
        "client_operation_id": str(uuid4()), "items": [{"list_item_id": str(item_b.public_id), "quantity": "1", "unit_price": "2.50"}],
    }, format="json")
    assert response.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/unit/shopping/test_services.py tests/integration/shopping/test_purchase_views.py -v`
Expected: FAIL because purchase finalization still uses persisted counters/totals and the old audit model.

- [ ] **Step 3: Implement the minimum aggregate operations**

```python
with transaction.atomic():
    items = ListItem.objects.select_for_update().filter(shopping_list=shopping_list, public_id__in=item_ids)
    purchase = ShoppingPurchase.objects.create(...)
    ShoppingPurchaseItem.objects.bulk_create(lines)
    PurchaseEvent.objects.create(purchase=purchase, kind=PurchaseEvent.Kind.CREATED, changed_by=user, after=snapshot)
```

Validate ownership/membership, active list, exact item set, idempotency payload,
line balance from non-voided lines and cross-list item membership. Use an event
and void marker for correction/estorno; never mutate line quantities.

- [ ] **Step 4: Run service and purchase tests**

Run: `uv run pytest tests/unit/shopping/test_services.py tests/integration/shopping/test_purchase_views.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/shopping/services.py backend/tests/unit/shopping/test_services.py backend/tests/integration/shopping/test_purchase_views.py
git commit -m "feat: enforce canonical purchase invariants"
```

### Task 3: Make sync, links and reports explicit

**Files:**
- Modify: `backend/shopping/services.py`
- Modify: `backend/shopping/serializers.py`
- Modify: `backend/shopping/views.py`
- Test: `backend/tests/integration/shopping/test_rfc_views.py`

**Interfaces:**
- Consumes explicit `ShareLink` target FKs, `Report` target FKs, and constrained `SyncOperation` choices.
- Produces conflict-only stale sync behavior and serializers that accept exactly one target.

- [ ] **Step 1: Write failing contract tests**

```python
def test_sync_rejects_a_stale_list_version(api_client, shopping_list):
    response = api_client.post("/api/v1/sync/", {"device_id": str(uuid4()), "operations": [{"client_operation_id": str(uuid4()), "entity_type": "shopping_list", "operation_type": "update", "entity_id": str(shopping_list.public_id), "base_version": shopping_list.version - 1, "payload": {"name": "Novo"}}]}, format="json")
    assert response.data["operations"][0]["status"] == "conflict"
```

- [ ] **Step 2: Run contract tests to verify they fail**

Run: `uv run pytest tests/integration/shopping/test_rfc_views.py -v`
Expected: FAIL because the current sync ignores `base_version` and generic targets are accepted.

- [ ] **Step 3: Restrict the contracts**

```python
if operation["base_version"] != instance.version:
    return SyncOperation.Status.CONFLICT
```

Use `TextChoices` for permitted sync entities/operations. Validate one and only
one share/report target in serializers and preserve database XOR constraints.

- [ ] **Step 4: Run RFC tests**

Run: `uv run pytest tests/integration/shopping/test_rfc_views.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/shopping/services.py backend/shopping/serializers.py backend/shopping/views.py backend/tests/integration/shopping/test_rfc_views.py
git commit -m "feat: constrain sync sharing and moderation"
```

### Task 4: Remove the legacy HTTP and admin surface

**Files:**
- Delete: `backend/shopping/urls.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/shopping/views.py`
- Modify: `backend/shopping/serializers.py`
- Modify: `backend/shopping/admin.py`
- Modify: `backend/config/admin_site.py`
- Test: `backend/tests/integration/shopping/test_purchase_views.py`

**Interfaces:**
- Consumes canonical shopping models and services from Tasks 1–3.
- Produces only `/api/v1/` shopping routes and an admin that uses the canonical purchase services.

- [ ] **Step 1: Write failing route/admin tests**

```python
def test_legacy_purchase_route_is_not_registered(client):
    assert client.get("/api/purchases/").status_code == 404
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/integration/shopping/test_purchase_views.py -v`
Expected: FAIL because the legacy router and legacy admin registrations still exist.

- [ ] **Step 3: Delete the legacy surface**

```python
# config/urls.py
# Remove: path("api/", include("shopping.urls"))
path("api/v1/", include("shopping.rfc_urls")),
```

Remove old imports, viewsets, serializers, admin registrations and dashboard
queries. The admin must calculate totals from lines and use the service for
create/correct/void operations.

- [ ] **Step 4: Run route and admin tests**

Run: `uv run pytest tests/integration/shopping/test_purchase_views.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/config/urls.py backend/shopping backend/config/admin_site.py backend/tests/integration/shopping/test_purchase_views.py
git commit -m "refactor: remove legacy shopping API"
```

### Task 5: Reconcile docs and verify the foundation

**Files:**
- Modify: `AGENTS.md`
- Modify: `TESTING_TODO.md`
- Test: `backend/tests/integration/shopping/test_query_counts.py`

**Interfaces:**
- Consumes the final canonical `/api/v1/` API and model names.
- Produces accurate repository guidance and regression coverage.

- [ ] **Step 1: Update or add failing query/regression checks**

```python
def test_purchase_list_uses_prefetched_lines(django_assert_num_queries, api_client):
    with django_assert_num_queries(3):
        api_client.get("/api/v1/purchases/")
```

- [ ] **Step 2: Run checks to establish their current result**

Run: `uv run pytest tests/integration/shopping/test_query_counts.py -v`
Expected: PASS after updating the expected canonical query shape.

- [ ] **Step 3: Document the actual architecture**

Update `AGENTS.md` to remove legacy `/api/`, role ownership and the old
purchase models; state that canonical purchases use lines/events and derived
totals. Mark replaced test debt complete in `TESTING_TODO.md`.

- [ ] **Step 4: Run full verification**

Run: `uv run pytest && uv run python manage.py makemigrations --check && python3 -m compileall -q backend && git diff --check`
Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md backend/TESTING_TODO.md backend/tests/integration/shopping/test_query_counts.py
git commit -m "docs: record canonical shopping architecture"
```
