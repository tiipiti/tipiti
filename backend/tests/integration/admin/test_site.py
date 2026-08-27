import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.urls import reverse

from config.admin_site import site
from shopping.models import ListItem, ShoppingList


def make_superuser():
    return get_user_model().objects.create_superuser(username="admin", password="password")


@pytest.mark.django_db
def test_admin_index_loads_with_a_list_and_items(client):
    administrator = make_superuser()
    owner = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(name="Feira", owner=owner)
    ListItem.objects.create(shopping_list=shopping_list, name="Arroz")
    client.force_login(administrator)

    assert client.get(reverse("admin-index")).status_code == 200
    assert client.get(reverse("tipiti_admin:index")).status_code == 200


@pytest.mark.django_db
def test_every_registered_admin_crud_route_loads(client):
    client.force_login(make_superuser())

    for model in site._registry:
        changelist = client.get(reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_changelist"))
        add = client.get(reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_add"))
        assert changelist.status_code == 200, model._meta.label
        assert add.status_code in (200, 302), model._meta.label


@pytest.mark.django_db
def test_disabled_admin_add_routes_redirect_to_changelist(client):
    administrator = make_superuser()
    request = RequestFactory().get("/")
    request.user = administrator
    client.force_login(administrator)

    for model, model_admin in site._registry.items():
        if not model_admin.has_add_permission(request):
            response = client.get(reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_add"))
            assert response.status_code == 302, model._meta.label
