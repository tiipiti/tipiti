import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

from shopping.models import ListItem, ShoppingList


@pytest.mark.django_db
def test_admin_creates_a_list_with_a_named_item_and_checkbox(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    owner = get_user_model().objects.create_user(username="owner")
    client.force_login(administrator)

    response = client.post(reverse("tipiti_admin:shopping_shoppinglist_add"), {
        "owner": owner.pk, "name": "Feira", "items-TOTAL_FORMS": "1", "items-INITIAL_FORMS": "0",
        "items-MIN_NUM_FORMS": "0", "items-MAX_NUM_FORMS": "1000", "items-0-name": "2 caixas de leite",
        "items-0-completed": "on", "_save": "Save",
    })

    assert response.status_code == 302
    shopping_list = ShoppingList.objects.get(name="Feira")
    assert shopping_list.owner == owner
    assert ListItem.objects.get(shopping_list=shopping_list, name="2 caixas de leite").completed


@pytest.mark.django_db
def test_admin_change_page_shows_only_name_and_completed_for_items(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    owner = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(owner=owner, name="Feira")
    ListItem.objects.create(shopping_list=shopping_list, name="Arroz")
    client.force_login(administrator)

    response = client.get(reverse("tipiti_admin:shopping_shoppinglist_change", args=(shopping_list.pk,)))

    assert response.status_code == 200
    assert "Arroz" in response.content.decode()
    assert "Quantidade" not in response.content.decode()
