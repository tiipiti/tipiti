# Tipiti Foundation Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement private shopping-list ownership, membership and invitations.

**Architecture:** A single `shopping` Django app owns the shopping-list domain. Its viewsets filter every object through `ListMembership`, while a small service accepts invitations atomically and emits the existing internal notification type.

**Tech Stack:** Django, Django REST Framework, PostgreSQL, Simple JWT.

**Spec:** `docs/superpowers/specs/backend/2026-08-24-tipiti-foundation-access.md`

## Global Constraints

- Reuse the existing `User`, `BaseModel` and internal notifications service.
- Lists are private; no discovery endpoint exists.
- Do not create migrations: the user explicitly requested a clean migration rebuild after the remodel.
- Do not restore the removed test suite; validate with Django checks once dependencies are available and with compilation now.

---

### Task 1: Create the private-list data model

**Files:**
- Create: `backend/shopping/__init__.py`
- Create: `backend/shopping/apps.py`
- Create: `backend/shopping/models.py`
- Modify: `backend/config/settings.py`

**Produces:** `ShoppingList`, `ListMembership`, and `ListInvite` with UUID public IDs, one owner per list, unique memberships and unique invite tokens.

- [x] Add the app to `INSTALLED_APPS`.
- [x] Define the three models with database constraints for membership uniqueness and owner uniqueness.
- [x] Add model-level helpers to decide whether an invite is pending and whether it targets a user email.
- [x] Run `python3 -m compileall -q backend`.

### Task 2: Expose membership and invitation operations

**Files:**
- Create: `backend/shopping/serializers.py`
- Create: `backend/shopping/services.py`
- Create: `backend/shopping/views.py`
- Create: `backend/shopping/urls.py`
- Modify: `backend/config/urls.py`

**Consumes:** Task 1 models and `notifications.service.notify`.

**Produces:** authenticated API endpoints for listing members, creating/accepting/cancelling invitations, and removing a member.

- [x] Serialize only explicit public fields; never expose internal primary keys or invite tokens in member responses.
- [x] Accept invitations in `transaction.atomic()`, enforce expiration and e-mail targeting, and create `ListMembership(role="member")` idempotently.
- [x] Restrict all list operations to members and owner-only mutation operations to the owner.
- [x] Run `python3 -m compileall -q backend`.

### Task 3: Remove remaining legacy references and verify the baseline

**Files:**
- Modify: `backend/accounts/services.py`
- Modify: `backend/config/settings.py`

- [x] Remove dead `places` export code and obsolete administrative navigation.
- [x] Confirm `rg -n '\\bplaces\\b|boraali|Boora|Bora Ali' backend --glob '!uv.lock'` has no output.
- [x] Run `python3 -m compileall -q backend`.
