from decimal import Decimal

import pytest

from django.contrib.auth.models import User
from django.test import override_settings
from django.test.client import RequestFactory
from rest_framework.test import APITestCase

from accounts.models import ConsentHistory
from config.admin_site import site as admin_site
from shopping.models import (
    FavoriteMarket,
    ListItem,
    ListMembership,
    ListOwnershipChange,
    Purchase,
    PurchaseChange,
    ShoppingList,
    Store,
    StoreItem,
)


@pytest.mark.integration
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class PurchaseViewSetIntegrationTests(APITestCase):
    def test_domain_models_are_registered_in_the_admin(self):
        self.assertTrue(admin_site.is_registered(FavoriteMarket))
        self.assertTrue(admin_site.is_registered(ConsentHistory))
        self.assertTrue(admin_site.is_registered(PurchaseChange))
        self.assertTrue(admin_site.is_registered(ListOwnershipChange))

    def test_admin_dashboard_exposes_an_attention_queue(self):
        user = User.objects.create_superuser(username="admin", password="password")
        self.client.force_login(user)

        response = self.client.get("/admin/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Requer atenção")
        self.assertContains(response, "Hoje,")

    def test_admin_can_create_a_list_and_becomes_its_owner(self):
        user = User.objects.create_superuser(username="admin", password="password")
        request = RequestFactory().post("/admin/shopping/shoppinglist/add/")
        request.user = user
        model_admin = admin_site._registry[ShoppingList]
        shopping_list = ShoppingList(name="Mercado")

        self.assertTrue(model_admin.has_add_permission(request))
        model_admin.save_model(request, shopping_list, form=None, change=False)

        self.assertTrue(
            ListMembership.objects.filter(
                shopping_list=shopping_list,
                user=user,
                role=ListMembership.Role.OWNER,
            ).exists()
        )

    def test_list_returns_only_the_authenticated_users_purchases(self):
        owner = User.objects.create_user(username="owner", password="password")
        member = User.objects.create_user(username="member", password="password")
        shopping_list = ShoppingList.objects.create(name="Mercado")
        ListMembership.objects.create(shopping_list=shopping_list, user=owner, role=ListMembership.Role.OWNER)
        ListMembership.objects.create(shopping_list=shopping_list, user=member, role=ListMembership.Role.MEMBER)
        item = ListItem.objects.create(shopping_list=shopping_list, name="Abacate", quantity=1, unit="un")
        store = Store.objects.create(name="Feira", created_by=owner)
        store_item = StoreItem.objects.create(list_item=item, store=store)
        own_purchase = Purchase.objects.create(store_item=store_item, purchased_by=owner, quantity=Decimal("1"), unit_price=Decimal("10"), total_price=Decimal("0"))
        Purchase.objects.create(store_item=store_item, purchased_by=member, quantity=Decimal("1"), unit_price=Decimal("12"), total_price=Decimal("0"))

        self.client.force_authenticate(owner)
        response = self.client.get(f"/api/store-items/{store_item.public_id}/purchases/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data["results"]], [str(own_purchase.public_id)])

    def test_author_correction_records_the_previous_purchase_values(self):
        owner = User.objects.create_user(username="owner", password="password")
        shopping_list = ShoppingList.objects.create(name="Mercado")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=owner,
            role=ListMembership.Role.OWNER,
        )
        item = ListItem.objects.create(
            shopping_list=shopping_list,
            name="Abacate",
            quantity=2,
            unit="un",
        )
        store = Store.objects.create(name="Feira", created_by=owner)
        store_item = StoreItem.objects.create(list_item=item, store=store)
        purchase = Purchase.objects.create(
            store_item=store_item,
            purchased_by=owner,
            quantity=1,
            unit_price=Decimal("10"),
            total_price=Decimal("0"),
        )

        self.client.force_authenticate(owner)
        response = self.client.patch(
            f"/api/purchases/{purchase.public_id}/",
            {"quantity": "2", "unit_price": "12"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_price"], "24.00000")
        purchase.refresh_from_db()
        self.assertEqual(purchase.total_price, Decimal("24"))
        change = PurchaseChange.objects.get(purchase=purchase)
        self.assertEqual(change.kind, PurchaseChange.Kind.CORRECTED)
        self.assertEqual(change.before["quantity"], "1.000")
        self.assertEqual(change.after["total_price"], "24.00000")

        history = self.client.get(f"/api/purchases/{purchase.public_id}/changes/")

        self.assertEqual(history.status_code, 200)
        self.assertEqual(history.data[0]["kind"], "corrected")
        self.assertEqual(history.data[0]["changed_by"], owner.username)

    def test_api_purchase_creation_starts_an_audit_history(self):
        owner = User.objects.create_user(username="owner", password="password")
        shopping_list = ShoppingList.objects.create(name="Mercado")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=owner,
            role=ListMembership.Role.OWNER,
        )
        item = ListItem.objects.create(
            shopping_list=shopping_list,
            name="Abacate",
            quantity=1,
            unit="un",
        )
        store = Store.objects.create(name="Feira", created_by=owner)
        store_item = StoreItem.objects.create(list_item=item, store=store)

        self.client.force_authenticate(owner)
        response = self.client.post(
            f"/api/store-items/{store_item.public_id}/purchases/",
            {"quantity": "1", "unit_price": "10"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            PurchaseChange.objects.get().kind,
            PurchaseChange.Kind.CREATED,
        )

    def test_author_can_void_a_purchase_without_deleting_its_history(self):
        owner = User.objects.create_user(username="owner", password="password")
        shopping_list = ShoppingList.objects.create(name="Mercado")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=owner,
            role=ListMembership.Role.OWNER,
        )
        item = ListItem.objects.create(
            shopping_list=shopping_list,
            name="Abacate",
            quantity=1,
            unit="un",
        )
        store = Store.objects.create(name="Feira", created_by=owner)
        purchase = Purchase.objects.create(
            store_item=StoreItem.objects.create(list_item=item, store=store),
            purchased_by=owner,
            quantity=1,
            unit_price=Decimal("10"),
            total_price=Decimal("0"),
        )

        self.client.force_authenticate(owner)
        response = self.client.post(
            f"/api/purchases/{purchase.public_id}/void/",
            {"reason": "Preço digitado incorretamente"},
            format="json",
        )

        self.assertEqual(response.status_code, 204)
        purchase.refresh_from_db()
        self.assertIsNotNone(purchase.voided_at)
        self.assertEqual(purchase.voided_by, owner)
        self.assertEqual(
            PurchaseChange.objects.get(purchase=purchase).kind,
            PurchaseChange.Kind.VOIDED,
        )

    def test_delete_purchase_voids_it_instead_of_removing_audited_data(self):
        owner = User.objects.create_user(username="owner", password="password")
        shopping_list = ShoppingList.objects.create(name="Mercado")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=owner,
            role=ListMembership.Role.OWNER,
        )
        item = ListItem.objects.create(
            shopping_list=shopping_list,
            name="Abacate",
            quantity=1,
            unit="un",
        )
        store = Store.objects.create(name="Feira", created_by=owner)
        purchase = Purchase.objects.create(
            store_item=StoreItem.objects.create(list_item=item, store=store),
            purchased_by=owner,
            quantity=1,
            unit_price=Decimal("10"),
            total_price=Decimal("0"),
        )

        self.client.force_authenticate(owner)
        response = self.client.delete(f"/api/purchases/{purchase.public_id}/")

        self.assertEqual(response.status_code, 204)
        purchase.refresh_from_db()
        self.assertIsNotNone(purchase.voided_at)

    def test_owner_can_transfer_list_ownership_to_a_member(self):
        owner = User.objects.create_user(username="owner", password="password")
        member = User.objects.create_user(username="member", password="password")
        shopping_list = ShoppingList.objects.create(name="Mercado")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=owner,
            role=ListMembership.Role.OWNER,
        )
        new_owner = ListMembership.objects.create(
            shopping_list=shopping_list,
            user=member,
            role=ListMembership.Role.MEMBER,
        )

        self.client.force_authenticate(owner)
        response = self.client.post(
            f"/api/lists/{shopping_list.public_id}/transfer-ownership/",
            {"member_id": str(new_owner.public_id)},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            ListMembership.objects.get(pk=new_owner.pk).role,
            ListMembership.Role.OWNER,
        )
        self.assertEqual(
            ListMembership.objects.get(shopping_list=shopping_list, user=owner).role,
            ListMembership.Role.MEMBER,
        )
        self.assertEqual(
            ListOwnershipChange.objects.get(shopping_list=shopping_list).new_owner,
            member,
        )
