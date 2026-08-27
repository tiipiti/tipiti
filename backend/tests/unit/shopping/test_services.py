from unittest.mock import MagicMock, patch

import pytest
from rest_framework.exceptions import PermissionDenied, ValidationError

from shopping.models import SyncOperation
from shopping.services import (
    apply_sync_operation,
    create_shopping_list,
    ensure_active,
    membership_for,
    owner_for,
)


def test_membership_for_returns_the_existing_membership():
    membership = MagicMock()
    shopping_list = MagicMock()
    user = MagicMock()
    with patch("shopping.services.ListMembership.objects.filter") as filter_memberships:
        filter_memberships.return_value.first.return_value = membership

        result = membership_for(shopping_list, user)

    filter_memberships.assert_called_once_with(shopping_list=shopping_list, user=user)
    assert result is membership


def test_membership_for_denies_a_user_without_membership():
    with patch("shopping.services.ListMembership.objects.filter") as filter_memberships:
        filter_memberships.return_value.first.return_value = None

        with pytest.raises(PermissionDenied, match="não participa"):
            membership_for(MagicMock(), MagicMock())


def test_owner_for_denies_a_non_owner():
    shopping_list = MagicMock(owner_id=1)
    user = MagicMock(id=2)
    with pytest.raises(PermissionDenied, match="Somente o dono"):
        owner_for(shopping_list, user)


def test_ensure_active_rejects_an_archived_list():
    with pytest.raises(ValidationError, match="arquivada"):
        ensure_active(MagicMock(archived_at=object()))


def test_create_shopping_list_creates_the_owner_membership():
    user = MagicMock()
    shopping_list = MagicMock()
    with (
        patch("shopping.services.ShoppingList.objects.create", return_value=shopping_list) as create_list,
        patch("shopping.services.ListMembership.objects.create") as create_membership,
    ):
        assert create_shopping_list.__wrapped__(user, name="Feira") is shopping_list

    create_list.assert_called_once_with(owner=user, name="Feira")
    create_membership.assert_called_once_with(shopping_list=shopping_list, user=user)


def test_apply_sync_operation_rejects_unknown_entity_without_database():
    result = apply_sync_operation.__wrapped__(
        MagicMock(), {"entity_type": "unknown", "operation_type": "update"}
    )

    assert result == SyncOperation.Status.CONFLICT
