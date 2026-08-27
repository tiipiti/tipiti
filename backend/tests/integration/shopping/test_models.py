from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from shopping.models import ListMembership, ListItem, PurchaseEvent, ShareLink, ShoppingList


@pytest.mark.django_db
def test_list_has_an_explicit_owner_and_unique_membership():
    user = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(name="Feira", owner=user)
    ListMembership.objects.create(shopping_list=shopping_list, user=user)

    with pytest.raises(IntegrityError):
        ListMembership.objects.create(shopping_list=shopping_list, user=user)


@pytest.mark.django_db
def test_list_item_keeps_manual_completion_separate_from_purchase_balance():
    user = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(name="Feira", owner=user)

    item = ListItem.objects.create(
        shopping_list=shopping_list,
        name="Arroz",
        quantity=Decimal("1"),
        unit="kg",
    )

    assert item.completed_at is None
    assert not hasattr(item, "purchased_quantity")


@pytest.mark.django_db
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
def test_purchase_flow_creates_an_append_only_event():
    user = get_user_model().objects.create_user(username="owner")
    client = APIClient()
    client.force_authenticate(user)

    create_list = client.post("/api/v1/lists/", {"name": "Feira"}, format="json")
    assert create_list.status_code == 201
    list_id = create_list.data["id"]
    create_item = client.post(
        f"/api/v1/lists/{list_id}/items/",
        {"name": "Arroz", "quantity": "1", "unit": "kg"},
        format="json",
    )
    assert create_item.status_code == 201
    result = client.post(
        f"/api/v1/lists/{list_id}/finalize/",
        {
            "client_operation_id": "eb0df3fc-324d-43b3-8610-b5a4eb3c1228",
            "items": [{"list_item_id": create_item.data["id"], "quantity": "1", "unit_price": "12.50"}],
        },
        format="json",
    )

    assert result.status_code == 201
    assert str(result.data["total_amount"]) == "12.50000"
    assert PurchaseEvent.objects.filter(kind=PurchaseEvent.Kind.CREATED).count() == 1


@pytest.mark.django_db
def test_share_link_requires_exactly_one_target():
    user = get_user_model().objects.create_user(username="owner")

    with pytest.raises(IntegrityError):
        ShareLink.objects.create(user=user, expires_at=timezone.now())
