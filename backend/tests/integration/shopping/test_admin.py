import pytest
from uuid import uuid4
from django.contrib.auth import get_user_model
from django.urls import reverse

from config.admin_site import site
from shopping.models import ListItem, ListMembership, PurchaseEvent, ShoppingList, ShoppingPurchase


@pytest.mark.django_db
def test_admin_creating_a_list_adds_its_owner_as_a_member(client):
    administrator = get_user_model().objects.create_superuser(
        username="admin", password="password"
    )
    owner = get_user_model().objects.create_user(username="owner")
    client.force_login(administrator)

    response = client.post(
        reverse("tipiti_admin:shopping_shoppinglist_add"),
        {
            "owner": owner.pk,
            "name": "Feira",
            "items-TOTAL_FORMS": "0",
            "items-INITIAL_FORMS": "0",
            "items-MIN_NUM_FORMS": "0",
            "items-MAX_NUM_FORMS": "1000",
            "memberships-TOTAL_FORMS": "0",
            "memberships-INITIAL_FORMS": "0",
            "memberships-MIN_NUM_FORMS": "0",
            "memberships-MAX_NUM_FORMS": "1000",
            "_save": "Save",
        },
    )

    assert response.status_code == 302
    shopping_list = ShoppingList.objects.get(name="Feira")
    assert ListMembership.objects.filter(shopping_list=shopping_list, user=owner).exists()


@pytest.mark.django_db
def test_admin_registers_a_purchase_through_the_list_flow(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    owner = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(name="Feira", owner=owner)
    ListMembership.objects.create(shopping_list=shopping_list, user=owner)
    item = ListItem.objects.create(shopping_list=shopping_list, name="Arroz", quantity="1", unit="kg")
    client.force_login(administrator)

    response = client.post(
        reverse("tipiti_admin:shopping_shoppinglist_register_purchase", args=(shopping_list.pk,)),
        {
            "purchased_at": "2026-08-27 10:00:00",
            "branch": "",
            "purchased_by": owner.pk,
            "form-TOTAL_FORMS": "1",
            "form-INITIAL_FORMS": "0",
            "form-MIN_NUM_FORMS": "0",
            "form-MAX_NUM_FORMS": "1000",
            "form-0-list_item": item.pk,
            "form-0-selected": "on",
            "form-0-quantity": "1",
            "form-0-unit_price": "12.50",
        },
    )

    assert response.status_code == 302
    assert PurchaseEvent.objects.filter(kind=PurchaseEvent.Kind.CREATED).count() == 1


@pytest.mark.django_db
def test_admin_purchase_add_redirects_to_the_list_flow(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    client.force_login(administrator)

    response = client.get(reverse("tipiti_admin:shopping_shoppingpurchase_add"))

    assert response.status_code == 302
    assert response.url == reverse("tipiti_admin:shopping_shoppinglist_changelist")


@pytest.mark.django_db
def test_every_registered_admin_changelist_loads(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    client.force_login(administrator)

    for model in site._registry:
        response = client.get(reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_changelist"))
        assert response.status_code == 200, model._meta.label


@pytest.mark.django_db
def test_admin_dashboard_loads(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    client.force_login(administrator)

    assert client.get(reverse("tipiti_admin:index")).status_code == 200


@pytest.mark.django_db
def test_admin_purchase_screen_shows_only_the_current_list_items(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    owner = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(name="Feira", owner=owner)
    ListMembership.objects.create(shopping_list=shopping_list, user=owner)
    ListItem.objects.create(shopping_list=shopping_list, name="Arroz", quantity="1", unit="kg")
    other_list = ShoppingList.objects.create(name="Outra", owner=owner)
    ListItem.objects.create(shopping_list=other_list, name="Não mostrar", quantity="1", unit="kg")
    client.force_login(administrator)

    response = client.get(
        reverse("tipiti_admin:shopping_shoppinglist_register_purchase", args=(shopping_list.pk,))
    )

    assert response.status_code == 200
    assert "Arroz" in response.content.decode()
    assert "Não mostrar" not in response.content.decode()


@pytest.mark.django_db
def test_admin_voids_a_purchase_with_an_audit_event(client):
    administrator = get_user_model().objects.create_superuser(username="admin", password="password")
    owner = get_user_model().objects.create_user(username="owner")
    shopping_list = ShoppingList.objects.create(name="Feira", owner=owner)
    ListMembership.objects.create(shopping_list=shopping_list, user=owner)
    purchase = ShoppingPurchase.objects.create(shopping_list=shopping_list, user=owner, client_operation_id=uuid4())
    client.force_login(administrator)

    response = client.post(
        reverse("tipiti_admin:shopping_shoppingpurchase_void", args=(purchase.pk,)),
        {"reason": "Registro duplicado"},
    )

    assert response.status_code == 302
    purchase.refresh_from_db()
    assert purchase.voided_by == administrator
    assert PurchaseEvent.objects.filter(purchase=purchase, kind=PurchaseEvent.Kind.VOIDED).exists()
