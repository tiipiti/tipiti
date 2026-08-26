# Testes por app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organizar e ampliar testes unitários e de integração por app, sem testar migrations ou models diretamente.

**Architecture:** Unitários isolam ORM, cache, rede e storage com `MagicMock`. Integrações usam o banco temporário do Django para verificar endpoints e autorização. A matriz em `backend/TESTING_TODO.md` mantém a cobertura futura visível por função/serviço.

**Tech Stack:** pytest, pytest-django, Django REST Framework, unittest.mock.

**Spec:** `docs/superpowers/specs/2026-08-26-test-coverage-design.md`

## Global Constraints

- Testes unitários não acessam banco, rede, storage nem cache real.
- Testes de integração usam somente o banco isolado do Django e a marca `integration`.
- `models.py` e `migrations/` não entram no escopo de teste direto.

---

### Task 1: Descoberta e matriz de cobertura

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/TESTING_TODO.md`
- Modify: `AGENTS.md`

- [ ] Restringir a descoberta a `backend/tests`.
- [ ] Registrar por app os serviços/funções a cobrir e as exclusões explícitas.

### Task 2: Unitários sem banco

**Files:**
- Create: `backend/tests/unit/accounts/test_services.py`
- Create: `backend/tests/unit/core/test_helpers.py`
- Create: `backend/tests/unit/notifications/test_service.py`
- Modify: `backend/tests/unit/test_services.py`

- [ ] Cobrir decisões e efeitos dos serviços com `MagicMock`.
- [ ] Executar `uv run pytest tests/unit -q`.

### Task 3: Integrações por app

**Files:**
- Create: `backend/tests/integration/accounts/test_me_view.py`
- Create: `backend/tests/integration/notifications/test_notification_views.py`
- Move: `backend/shopping/tests/integration/test_purchase_views.py` to `backend/tests/integration/shopping/test_purchase_views.py`

- [ ] Cobrir um fluxo HTTP autenticado de cada app com APIClient/Django test database.
- [ ] Executar `uv run pytest -m integration -q`.

### Task 4: Verificação

- [ ] Executar `uv run pytest -q`.
- [ ] Executar `python3 -m compileall -q backend`.
- [ ] Executar `git diff --check`.
