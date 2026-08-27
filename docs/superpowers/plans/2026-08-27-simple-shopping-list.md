# Simple Shopping List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shopping domain with a user-owned list containing only named, completable items.

**Architecture:** Keep two public `BaseModel` records: `ShoppingList(owner, name)` and `ListItem(shopping_list, name, completed)`. Use standard DRF CRUD scoped by the authenticated owner and Django admin's native inline form; no shopping service layer or custom operational pages remain.

**Tech Stack:** Django 6, Django REST Framework, django-unfold, pytest-django.

**Spec:** `docs/superpowers/specs/2026-08-27-simple-shopping-list-design.md`

## Global Constraints

- Do not modify `shopping/migrations/0001_initial.py`; create a new migration.
- A list item is free text and requires only `name`; it has no product, category, quantity, unit, market or price.
- Do not add dependencies, abstractions, redirect shells, catalogs, sharing, purchases, synchronization or audit flows.
- The existing local database must be recreated before applying this migration because the removed schema is intentionally destructive.

---

### Task 1: Replace the domain and HTTP contract

**Files:**
- Modify: `shopping/models.py`, `shopping/serializers.py`, `shopping/views.py`, `shopping/rfc_urls.py`
- Delete: `shopping/services.py`
- Test: `tests/integration/shopping/test_models.py`

**Interfaces:**
- Produces `ShoppingList(owner, name)` and `ListItem(shopping_list, name, completed=False)`.
- Produces list CRUD and nested item CRUD under `/api/v1/lists/<list_id>/items/`.

- [ ] **Step 1: Write the failing model and API contract tests**

```python
def test_item_requires_only_free_text_and_incomplete_items_come_first(django_user_model):
    owner = django_user_model.objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(owner=owner, name="Feira")
    ListItem.objects.create(shopping_list=shopping_list, name="Já comprei", completed=True)
    pending = ListItem.objects.create(shopping_list=shopping_list, name="2 caixas de leite")
    assert [item.name for item in shopping_list.items.all()] == ["2 caixas de leite", "Já comprei"]
    assert pending.completed is False

def test_owner_can_create_and_complete_an_item_without_catalog(api_client, django_user_model):
    owner = django_user_model.objects.create_user(username="owner")
    api_client.force_authenticate(owner)
    created_list = api_client.post("/api/v1/lists/", {"name": "Feira"}, format="json")
    created_item = api_client.post(f"/api/v1/lists/{created_list.data['id']}/items/", {"name": "2 caixas de leite"}, format="json")
    completed = api_client.patch(f"/api/v1/lists/{created_list.data['id']}/items/{created_item.data['id']}/", {"completed": True}, format="json")
    assert completed.status_code == 200
    assert completed.data["completed"] is True
```

- [ ] **Step 2: Run the focused tests to observe the expected failure**

Run: `uv run pytest tests/integration/shopping/test_models.py -q`

Expected: FAIL because `completed` is absent and item creation still requires `quantity` and `unit`.

- [ ] **Step 3: Implement the smallest domain and API**

```python
class ShoppingList(BaseModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shopping_lists")
    name = models.CharField(max_length=120)

class ListItem(BaseModel):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["completed", "created_at"]
```

```python
class ShoppingListViewSet(ViewSetBase):
    serializer_class = ShoppingListSerializer
    def get_queryset(self):
        return ShoppingList.objects.filter(owner=self.request.user)
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
```

The nested item viewset looks up `ShoppingList.objects.filter(owner=request.user)` then saves the serializer with that list. Serializers expose only `id`, `name`, `completed`, and timestamps. Register no router resources besides `lists` and no URLs besides nested item paths.

- [ ] **Step 4: Run focused tests**

Run: `uv run pytest tests/integration/shopping/test_models.py -q`

Expected: PASS; a different authenticated user receives 404 for another user's list or item.

### Task 2: Make the admin the same simple task

**Files:**
- Modify: `shopping/admin.py`, `config/admin_site.py`
- Test: `tests/integration/shopping/test_admin.py`, `tests/integration/admin/test_site.py`

**Interfaces:**
- Consumes Task 1's `ShoppingList` and `ListItem`.
- Produces the normal list add/change pages with owner and one item inline containing `name` and `completed`.

- [ ] **Step 1: Write the failing admin test**

```python
def test_admin_creates_a_list_with_a_named_item_and_checkbox(client):
    admin = get_user_model().objects.create_superuser(username="admin", password="password")
    owner = get_user_model().objects.create_user(username="owner")
    client.force_login(admin)
    response = client.post(reverse("tipiti_admin:shopping_shoppinglist_add"), {
        "owner": owner.pk, "name": "Feira", "items-TOTAL_FORMS": "1",
        "items-INITIAL_FORMS": "0", "items-MIN_NUM_FORMS": "0", "items-MAX_NUM_FORMS": "1000",
        "items-0-name": "2 caixas de leite", "items-0-completed": "on", "_save": "Save",
    })
    assert response.status_code == 302
    assert ListItem.objects.get(name="2 caixas de leite").completed is True
```

- [ ] **Step 2: Run it to observe the expected failure**

Run: `uv run pytest tests/integration/shopping/test_admin.py -q`

Expected: FAIL because the old inline still expects product, quantity and unit.

- [ ] **Step 3: Replace the admin implementation with native CRUD**

```python
class ListItemInline(TabularInline):
    model = ListItem
    fields = ("name", "completed")
    extra = 1

@admin.register(ShoppingList, site=site)
class ShoppingListAdmin(ModelAdmin):
    list_display = ("name", "owner", "updated_at")
    search_fields = ("name", "owner__username", "owner__email")
    inlines = (ListItemInline,)
```

Remove the dashboard override, purchase forms, custom admin routes and every registration for deleted shopping models. Keep the custom `site` object so `/` and `/admin/` render the standard Unfold index.

- [ ] **Step 4: Run admin tests**

Run: `uv run pytest tests/integration/shopping/test_admin.py tests/integration/admin/test_site.py -q`

Expected: PASS; admin index and registered add/change URLs load without 403 or 500.

### Task 3: Remove old schema and prove the foundation

**Files:**
- Create: `shopping/migrations/0002_simplify_shopping_list.py`
- Delete: `shopping/services.py`, `tests/unit/shopping/test_services.py`
- Modify: `AGENTS.md`

**Interfaces:**
- Produces a migration removing every non-list/non-item table and obsolete fields without editing `0001_initial.py`.

- [ ] **Step 1: Generate and inspect the migration plan**

Run: `uv run python manage.py makemigrations shopping --dry-run --verbosity 3`

Expected: a migration deleting catalog, market, price, promotion, purchase, invitation, membership, sharing, reporting and sync models; removing `archived_at`, `version`, product, quantity, unit and `completed_at`; and adding `completed`.

- [ ] **Step 2: Create the generated migration and remove dead code**

```python
operations = [
    migrations.AddField(model_name="listitem", name="completed", field=models.BooleanField(default=False)),
    migrations.RemoveField(model_name="listitem", name="product"),
    migrations.RemoveField(model_name="listitem", name="quantity"),
    migrations.RemoveField(model_name="listitem", name="unit"),
    migrations.RemoveField(model_name="listitem", name="completed_at"),
    migrations.DeleteModel(name="Product"),
]
```

Use Django's generated operation order for every deletion. Update `AGENTS.md` to describe only lists/items, native inline admin CRUD, and the new migration sequence.

- [ ] **Step 3: Run the full validation set**

Run: `uv run pytest -q && uv run python manage.py check && uv run python manage.py makemigrations --check --dry-run && python3 -m compileall -q . && git diff --check`

Expected: all tests pass, Django reports no check errors, no model changes are pending, compilation exits 0, and the diff has no whitespace errors.

- [ ] **Step 4: Commit the atomic simplification**

```bash
git add -A backend AGENTS.md docs/superpowers/plans/2026-08-27-simple-shopping-list.md
git commit -m "refactor: reduce shopping to lists and items"
```

## Self-Review

- Spec coverage: Tasks 1–3 implement the two records, free-text completion, owner scope, direct admin use, total deletion of out-of-scope flow and immutable initial migration.
- Placeholder scan: no TODO/TBD markers remain.
- Type consistency: every task uses `ShoppingList`, `ListItem`, `name`, and `completed`.
