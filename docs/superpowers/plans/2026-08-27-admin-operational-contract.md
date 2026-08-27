# Contrato Operacional do Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Garantir que o `tipiti_admin` ofereça somente rotas navegáveis e formulários operacionais para validar o produto antes do Android.

**Architecture:** Um teste global percorre o registro real de `config.admin_site.site`, cobrindo dashboard, changelists e a entrada `add/` de cada modelo. Um mixin curto centraliza o redirecionamento das telas declaradas sem criação; cada app mantém apenas seus fluxos de domínio e os respectivos testes de efeito persistido.

**Tech Stack:** Django Admin, Unfold, pytest-django.

**Spec:** `docs/superpowers/specs/2026-08-27-admin-operational-contract-design.md`

## Global Constraints

- Não adicionar dependências nem editar migrations aplicadas.
- GET administrativo exposto retorna 200 ou redireciona ao fluxo correto; nunca 403/500 para superusuário.
- Estado imutável só é consultado; escrita operacional usa o fluxo/regra já existente.
- Testar comportamento HTTP e persistência, sem snapshots de HTML ou testes do Unfold/Django.

---

### Task 1: Cobertura do contrato global

**Files:**
- Create: `backend/tests/integration/admin/test_site.py`
- Modify: `backend/tests/integration/shopping/test_admin.py`

**Interfaces:**
- Consumes: `config.admin_site.site._registry` e o namespace `tipiti_admin`.
- Produces: regressão para dashboard, changelists e URLs `add/` de todos os modelos registrados.

- [x] **Step 1: Escrever o teste de rotas reais**

```python
@pytest.mark.django_db
def test_every_registered_admin_add_route_is_navigable(client):
    client.force_login(make_superuser())
    for model in site._registry:
        response = client.get(reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_add"))
        assert response.status_code in (200, 302), model._meta.label
```

Também criar testes separados para `/`, `/admin/`, e cada changelist com banco vazio; criar uma amostra com lista, compra, item de compra, denúncia, convite e evento de estorno e afirmar que ambos os índices respondem 200.

- [x] **Step 2: Rodar o teste para confirmar falha**

Run: `uv run pytest tests/integration/admin/test_site.py -q`

Expected: FAIL nos modelos cujo `has_add_permission()` já é falso e cuja `add_view()` padrão devolve 403.

- [x] **Step 3: Mover a travessia genérica existente**

Transferir a travessia de changelists de `tests/integration/shopping/test_admin.py` para o novo arquivo global, sem manter uma cópia.

- [x] **Step 4: Rodar os testes globais**

Run: `uv run pytest tests/integration/admin/test_site.py -q`

Expected: ainda falha apenas enquanto os redirecionamentos não existirem.

### Task 2: Tornar telas sem criação navegáveis

**Files:**
- Modify: `backend/config/admin_site.py`
- Modify: `backend/accounts/admin.py`
- Modify: `backend/shopping/admin.py`
- Test: `backend/tests/integration/admin/test_site.py`

**Interfaces:**
- Produces: `DisabledAddRedirectMixin.add_view(request, form_url="", extra_context=None)`, que envia ao changelist de `self.model` no namespace de `self.admin_site` e usa `message_user`.
- Consumes: `django.shortcuts.redirect` e `django.urls.reverse`.

- [x] **Step 1: Implementar somente o mixin compartilhado**

```python
class DisabledAddRedirectMixin:
    def add_view(self, request, form_url="", extra_context=None):
        self.message_user(request, "Este registro é somente para consulta.", messages.INFO)
        return redirect(reverse(
            f"{self.admin_site.name}:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist"
        ))
```

- [x] **Step 2: Aplicar o mixin aos admins sem criação**

Usar o mixin em `ReadOnlyAdmin` de `shopping` e nos registros de infraestrutura de `accounts` que já negam adição (`ContentType`, `Session`, `ConsentHistory`, `PeriodicTasks` e tokens que a biblioteca exponha sem criação). Manter `ShoppingPurchaseAdmin.add_view()` próprio porque o destino canônico é a lista, não o changelist da compra.

- [x] **Step 3: Declarar os registros derivados como inspeção**

Google/Facebook identity e `UserSession` são derivados da autenticação, não criados manualmente. Bloquear criação, alteração e exclusão, mantendo consulta. `UserProfile` continua editável pela tela do usuário, porém sua criação direta redireciona, porque o perfil pertence ao ciclo do usuário.

- [x] **Step 4: Rodar o contrato global**

Run: `uv run pytest tests/integration/admin/test_site.py -q`

Expected: PASS.

### Task 3: Fluxos operacionais de accounts e notifications

**Files:**
- Create: `backend/tests/integration/accounts/test_admin.py`
- Create: `backend/tests/integration/notifications/test_admin.py`
- Modify: `backend/accounts/admin.py`
- Modify: `backend/notifications/admin.py` somente se os testes mostrarem formulário inviável.

**Interfaces:**
- Consumes: URLs `tipiti_admin:auth_user_add`, `tipiti_admin:auth_group_add` e `tipiti_admin:notifications_notification_{add,change}`.
- Produces: criação de usuário/grupo e criação/edição de notificação comprovadas por dados persistidos.

- [x] **Step 1: Escrever testes de contas antes da alteração**

```python
response = client.post(reverse("tipiti_admin:auth_group_add"), {"name": "Operação", "_save": "Save"})
assert response.status_code == 302
assert Group.objects.filter(name="Operação").exists()
```

Adicionar POST de usuário com `username`, `password1`, `password2`, `is_active` e inlines vazios; afirmar que o usuário existe e que o GET de alteração responde 200.

- [x] **Step 2: Escrever e rodar testes de notificação**

Criar uma notificação com usuário, choice `LIST_INVITE`, título, corpo e `expires_at`; editar o título por sua URL `change`; afirmar 302 e valores persistidos. Usar uma notificação com `read_at=None` e outra com `expires_at=None` apenas se o modelo permitir nulo.

Run: `uv run pytest tests/integration/accounts/test_admin.py tests/integration/notifications/test_admin.py -q`

Expected: PASS ou falha concreta de formulário, corrigida pelo menor ajuste no admin.

### Task 4: Fechar os fluxos específicos de shopping

**Files:**
- Modify: `backend/shopping/admin.py`
- Modify: `backend/tests/integration/shopping/test_admin.py`

**Interfaces:**
- Consumes: `finalize_purchase`, `void_purchase` e `PurchaseEvent`.
- Produces: compra iniciada pela lista, inspeção de registros imutáveis, e resolução auditável de denúncia.

- [x] **Step 1: Escrever teste de resolução de denúncia**

```python
response = client.post(report_change_url, {"status": "resolved", "_save": "Save"})
assert response.status_code == 302
report.refresh_from_db()
assert report.resolved_by == administrator
assert report.resolved_at is not None
```

Criar o relatório com uma `PriceObservation` válida e um repórter; não testar o HTML do Unfold.

- [x] **Step 2: Tornar denúncia uma decisão única**

Bloquear `add/` com o mixin, tornar `resolved_by` e `resolved_at` somente leitura e manter somente `status` como decisão editável. O `save_model()` existente preenche o ator e o momento.

- [x] **Step 3: Escrever e rodar testes de CRUD exposto do catálogo**

Criar `Product`, `MarketNetwork`, `MarketBranch`, `PriceObservation` e `Promotion` por suas URLs administrativas com dados válidos; para preço/promoção, afirmar que `created_by` é o administrador se o admin o determina. Manter os testes já existentes de lista, compra e estorno.

Run: `uv run pytest tests/integration/shopping/test_admin.py -q`

Expected: PASS.

### Task 5: Verificação e documentação

**Files:**
- Modify: `AGENTS.md` se a política de registros administrativos mudar.
- Modify: `docs/superpowers/plans/2026-08-27-admin-operational-contract.md` marcando passos concluídos.

- [x] **Step 1: Rodar a suíte e verificações Django**

Run: `uv run pytest -q`

Run: `uv run python manage.py check`

Run: `uv run python manage.py makemigrations --check --dry-run`

Run: `python3 -m compileall -q .`

Run: `git diff --check`

Expected: todos passam; migrations não detecta alterações.

- [x] **Step 2: Atualizar a descrição estrutural**

Se a criação direta das identidades, sessões, tokens ou denúncias for removida, registrar no `AGENTS.md` que esses registros são inspeção e que as operações do admin têm rota canônica navegável.

- [x] **Step 3: Commit**

```bash
git add backend/config/admin_site.py backend/accounts/admin.py backend/shopping/admin.py backend/tests/integration docs/superpowers/plans/2026-08-27-admin-operational-contract.md AGENTS.md
git commit -m "feat: validate admin operational contract"
```
