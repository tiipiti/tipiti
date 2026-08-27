from datetime import timedelta
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.urls import reverse
from django.utils import timezone

from config.admin_site import site
from shopping.models import (
    ListInvite,
    ListItem,
    ListMembership,
    MarketBranch,
    MarketNetwork,
    PriceObservation,
    Product,
    PurchaseEvent,
    Report,
    ShoppingList,
    ShoppingPurchase,
    ShoppingPurchaseItem,
)


def make_superuser():
    return get_user_model().objects.create_superuser(username="admin", password="password")


@pytest.mark.django_db
def test_admin_dashboard_loads_with_an_empty_database(client):
    client.force_login(make_superuser())

    assert client.get(reverse("admin-index")).status_code == 200
    assert client.get(reverse("tipiti_admin:index")).status_code == 200


@pytest.mark.django_db
def test_admin_dashboard_loads_with_operational_data(client):
    administrator = make_superuser()
    owner = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(name="Feira", owner=owner)
    ListMembership.objects.create(shopping_list=shopping_list, user=owner)
    item = ListItem.objects.create(shopping_list=shopping_list, name="Arroz", quantity="1", unit="kg")
    purchase = ShoppingPurchase.objects.create(
        shopping_list=shopping_list,
        user=owner,
        client_operation_id=uuid4(),
    )
    ShoppingPurchaseItem.objects.create(
        purchase=purchase,
        list_item=item,
        description="Arroz",
        quantity="1",
        unit="kg",
        unit_price="12.50",
    )
    product = Product.objects.create(name="Arroz")
    network = MarketNetwork.objects.create(name="Mercado")
    branch = MarketBranch.objects.create(network=network, name="Centro", address="Rua A")
    price = PriceObservation.objects.create(
        product=product,
        branch=branch,
        created_by=administrator,
        amount="12.50",
        observed_on=timezone.localdate(),
    )
    Report.objects.create(reporter=owner, price=price, reason="Preço errado")
    ListInvite.objects.create(
        shopping_list=shopping_list,
        created_by=owner,
        expires_at=timezone.now() + timedelta(hours=1),
    )
    PurchaseEvent.objects.create(
        purchase=purchase,
        changed_by=administrator,
        kind=PurchaseEvent.Kind.VOIDED,
    )
    client.force_login(administrator)

    assert client.get(reverse("admin-index")).status_code == 200
    assert client.get(reverse("tipiti_admin:index")).status_code == 200
    for model in site._registry:
        response = client.get(
            reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_changelist")
        )
        assert response.status_code == 200, model._meta.label


@pytest.mark.django_db
def test_every_registered_admin_changelist_loads(client):
    client.force_login(make_superuser())

    for model in site._registry:
        response = client.get(
            reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_changelist")
        )
        assert response.status_code == 200, model._meta.label


@pytest.mark.django_db
def test_every_registered_admin_add_route_is_navigable(client):
    administrator = make_superuser()
    client.force_login(administrator)

    for model in site._registry:
        response = client.get(
            reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_add")
        )
        assert response.status_code in (200, 302), model._meta.label


@pytest.mark.django_db
def test_disabled_admin_add_routes_redirect_to_their_changelists(client):
    administrator = make_superuser()
    request = RequestFactory().get("/")
    request.user = administrator
    client.force_login(administrator)

    for model, model_admin in site._registry.items():
        if not model_admin.has_add_permission(request):
            response = client.get(
                reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_add")
            )
            assert response.status_code == 302, model._meta.label
