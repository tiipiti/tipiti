import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APIClient

from shopping.models import ListItem, ShoppingList


@pytest.mark.django_db
def test_item_requires_only_free_text_and_incomplete_items_come_first():
    owner = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(owner=owner, name="Feira")
    ListItem.objects.create(shopping_list=shopping_list, name="Já comprei", completed=True)
    pending = ListItem.objects.create(
        shopping_list=shopping_list, name="2 caixas de leite", quantity=2, price="5.50"
    )

    assert [item.name for item in shopping_list.items.all()] == ["2 caixas de leite", "Já comprei"]
    assert pending.completed is False
    assert pending.quantity == 2
    assert str(pending.price) == "5.50"


@pytest.mark.django_db
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
def test_owner_can_create_and_complete_an_item_without_catalog():
    owner = get_user_model().objects.create_user(username="owner")
    client = APIClient()
    client.force_authenticate(owner)
    created_list = client.post("/api/v1/lists/", {"name": "Feira"}, format="json")
    created_item = client.post(
        f"/api/v1/lists/{created_list.data['id']}/items/",
        {"name": "Leite", "quantity": 2, "price": "5.50"},
        format="json",
    )
    completed = client.patch(f"/api/v1/lists/{created_list.data['id']}/items/{created_item.data['id']}/", {"completed": True}, format="json")

    assert created_list.status_code == 201
    assert created_item.status_code == 201
    assert created_item.data["quantity"] == 2
    assert created_item.data["price"] == "5.50"
    assert completed.status_code == 200
    assert completed.data["completed"] is True


@pytest.mark.django_db
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
def test_other_user_cannot_add_items_to_a_list():
    owner = get_user_model().objects.create_user(username="owner")
    other = get_user_model().objects.create_user(username="other")
    shopping_list = ShoppingList.objects.create(owner=owner, name="Feira")
    client = APIClient()
    client.force_authenticate(other)

    response = client.post(f"/api/v1/lists/{shopping_list.public_id}/items/", {"name": "Não entra"}, format="json")

    assert response.status_code == 404
