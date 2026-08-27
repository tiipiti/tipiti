# Admin CRUD Operations UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar os CRUDes operacionais do Admin focados na tarefa, sem
duplicação de decisões nem metadados técnicos na tela de trabalho.

**Architecture:** Reutilizar as abas e inlines nativos do Unfold, mantendo a
lógica no `shopping/admin.py`. Um `ModelForm` pequeno preenche a descrição do
item de compra a partir do item de lista, preservando o modelo e a API.

**Tech Stack:** Django Admin, Unfold, pytest-django.

**Spec:** `docs/superpowers/specs/backend/2026-08-26-admin-crud-operations-ux.md`

## Global Constraints

- Sem dependências novas, migrations ou mudanças de API.
- Usar abas nativas do Unfold e choices existentes de unidade.
- Manter correção, estorno, posse e auditoria nos serviços existentes.

---

### Task 1: Simplificar a compra

**Files:**
- Modify: `backend/tests/integration/shopping/test_purchase_views.py`
- Modify: `backend/shopping/admin.py`

- [x] Escrever um teste de GET que exige `Item da lista` e rejeita `Product` e
  `Description` no cadastro de compra; fazer POST e confirmar a descrição
  persistida.
- [x] Rodar o teste e confirmar falha.
- [x] Adicionar o `ModelForm` inline que persiste `description=list_item.name`
  e reduzir as colunas do inline a item, quantidade, preço e total.
- [x] Rodar o teste e confirmar sucesso.

### Task 2: Reorganizar a lista em abas nativas

**Files:**
- Modify: `backend/tests/integration/shopping/test_purchase_views.py`
- Modify: `backend/shopping/admin.py`

- [x] Escrever um teste de GET que exige Geral, Itens e Membros e rejeita
  `Archived at` e `Public id` no formulário da lista.
- [x] Rodar o teste e confirmar falha.
- [x] Marcar os inlines de itens e membros como abas, aplicar títulos e colunas
  operacionais em português, e esconder campos técnicos e `archived_at`.
- [x] Rodar o teste e confirmar sucesso.

### Task 3: Aplicar o mesmo limite aos cadastros auxiliares

**Files:**
- Modify: `backend/shopping/admin.py`
- Modify: `backend/accounts/admin.py`
- Modify: `backend/notifications/admin.py`

- [x] Remover metadados de sistema dos formulários operacionais e manter os
  registros somente leitura protegidos.
- [x] Preservar filtros, busca, ações auditáveis e permissões atuais.
- [x] Executar a suíte completa e as verificações Django.
