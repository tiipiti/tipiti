from datetime import date
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
    MarketBranch,
    MarketNetwork,
    PriceObservation,
    Product,
    Promotion,
    Purchase,
    PurchaseChange,
    ShoppingList,
    ShoppingPurchase,
    ShoppingPurchaseItem,
    Store,
    StoreItem,
)


@pytest.mark.integration
@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
)
class PurchaseViewSetIntegrationTests(APITestCase):
    def test_admin_registers_a_complete_purchase_with_its_items(self):
        user = User.objects.create_superuser(username="admin", password="password")
        shopping_list = ShoppingList.objects.create(name="Feira")
        list_item = ListItem.objects.create(
            shopping_list=shopping_list, name="Abacate", quantity=2, unit="un"
        )
        network = MarketNetwork.objects.create(name="Rede")
        branch = MarketBranch.objects.create(network=network, name="Centro")
        self.client.force_login(user)

        response = self.client.post(
            "/admin/shopping/shoppingpurchase/add/",
            {
                "user": user.pk,
                "branch": branch.pk,
                "shopping_list": shopping_list.pk,
                "purchased_on": date.today().isoformat(),
                "items-TOTAL_FORMS": "1",
                "items-INITIAL_FORMS": "0",
                "items-MIN_NUM_FORMS": "1",
                "items-MAX_NUM_FORMS": "1000",
                "items-0-list_item": list_item.pk,
                "items-0-product": "",
                "items-0-description": "Abacate",
                "items-0-quantity": "2",
                "items-0-unit_price": "7.50",
            },
        )

        self.assertEqual(response.status_code, 302)
        purchase = ShoppingPurchase.objects.get()
        self.assertIsNotNone(purchase.client_operation_id)
        self.assertEqual(purchase.total_amount, Decimal("15.00"))
        self.assertEqual(
            ShoppingPurchaseItem.objects.get(purchase=purchase).total_price,
            Decimal("15.00"),
        )
        list_item.refresh_from_db()
        self.assertEqual(list_item.purchased_quantity, Decimal("2"))
        self.assertTrue(list_item.is_checked)

    def test_admin_corrects_a_legacy_purchase_through_the_audited_flow(self):
        user = User.objects.create_superuser(username="admin", password="password")
        shopping_list = ShoppingList.objects.create(name="Feira")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=user,
            role=ListMembership.Role.OWNER,
        )
        item = ListItem.objects.create(
            shopping_list=shopping_list, name="Abacate", quantity=2, unit="un"
        )
        store = Store.objects.create(name="Feira", created_by=user)
        store_item = StoreItem.objects.create(list_item=item, store=store)
        purchase = Purchase.objects.create(
            store_item=store_item,
            purchased_by=user,
            quantity=1,
            unit_price=Decimal("10"),
            total_price=0,
        )
        self.client.force_login(user)

        response = self.client.post(
            f"/admin/shopping/purchase/{purchase.pk}/correct/",
            {
                "quantity": "2",
                "unit_price": "12",
                "purchased_at_0": purchase.purchased_at.date().isoformat(),
                "purchased_at_1": purchase.purchased_at.time().strftime("%H:%M:%S"),
            },
        )

        self.assertEqual(response.status_code, 302)
        purchase.refresh_from_db()
        self.assertEqual(purchase.total_price, Decimal("24"))
        self.assertTrue(
            PurchaseChange.objects.filter(
                purchase=purchase, kind=PurchaseChange.Kind.CORRECTED
            ).exists()
        )

    def test_admin_voids_a_legacy_purchase_through_the_audited_flow(self):
        user = User.objects.create_superuser(username="admin", password="password")
        shopping_list = ShoppingList.objects.create(name="Feira")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=user,
            role=ListMembership.Role.OWNER,
        )
        item = ListItem.objects.create(
            shopping_list=shopping_list, name="Abacate", quantity=1, unit="un"
        )
        store = Store.objects.create(name="Feira", created_by=user)
        purchase = Purchase.objects.create(
            store_item=StoreItem.objects.create(list_item=item, store=store),
            purchased_by=user,
            quantity=1,
            unit_price=Decimal("10"),
            total_price=0,
        )
        self.client.force_login(user)

        response = self.client.post(
            f"/admin/shopping/purchase/{purchase.pk}/void/",
            {"reason": "Registrada duas vezes"},
        )

        self.assertEqual(response.status_code, 302)
        purchase.refresh_from_db()
        self.assertIsNotNone(purchase.voided_at)
        self.assertEqual(purchase.void_reason, "Registrada duas vezes")
        self.assertTrue(
            PurchaseChange.objects.filter(
                purchase=purchase, kind=PurchaseChange.Kind.VOIDED
            ).exists()
        )

    def test_admin_sidebar_uses_task_oriented_labels(self):
        user = User.objects.create_superuser(username="admin", password="password")
        self.client.force_login(user)

        response = self.client.get("/admin/")

        self.assertContains(response, "Planejar")
        self.assertContains(response, "Registrar compra")
        self.assertContains(response, "Acompanhar")

    def test_admin_attributes_price_and_promotion_to_the_current_user(self):
        user = User.objects.create_superuser(username="admin", password="password")
        product = Product.objects.create(
            name="Abacate", quantity=1, unit="un", is_active=True
        )
        network = MarketNetwork.objects.create(name="Rede")
        branch = MarketBranch.objects.create(network=network, name="Centro")
        self.client.force_login(user)

        price_response = self.client.post(
            "/admin/shopping/priceobservation/add/",
            {
                "product": product.pk,
                "branch": branch.pk,
                "amount": "7.50",
                "observed_on": date.today().isoformat(),
                "is_valid": "on",
            },
        )
        promotion_response = self.client.post(
            "/admin/shopping/promotion/add/",
            {
                "product": product.pk,
                "network": network.pk,
                "branch": "",
                "regular_price": "10.00",
                "promotional_price": "7.50",
                "starts_on": date.today().isoformat(),
                "ends_on": date.today().isoformat(),
                "is_valid": "on",
            },
        )

        self.assertEqual(price_response.status_code, 302)
        self.assertEqual(promotion_response.status_code, 302)
        self.assertEqual(PriceObservation.objects.get().created_by, user)
        self.assertEqual(Promotion.objects.get().created_by, user)

    def test_admin_transfers_list_ownership_through_the_service(self):
        owner = User.objects.create_superuser(username="owner", password="password")
        member = User.objects.create_user(username="member", password="password")
        shopping_list = ShoppingList.objects.create(name="Feira")
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=owner,
            role=ListMembership.Role.OWNER,
        )
        membership = ListMembership.objects.create(
            shopping_list=shopping_list,
            user=member,
            role=ListMembership.Role.MEMBER,
        )
        self.client.force_login(owner)

        response = self.client.post(
            f"/admin/shopping/shoppinglist/{shopping_list.pk}/transfer-ownership/",
            {"member": membership.pk},
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            ListMembership.objects.get(pk=membership.pk).role,
            ListMembership.Role.OWNER,
        )
        self.assertEqual(
            ListMembership.objects.get(shopping_list=shopping_list, user=owner).role,
            ListMembership.Role.MEMBER,
        )
        self.assertTrue(
            ListOwnershipChange.objects.filter(shopping_list=shopping_list).exists()
        )

    def test_admin_adds_members_without_allowing_another_owner(self):
        admin_user = User.objects.create_superuser(
            username="admin", password="password"
        )
        member = User.objects.create_user(username="member", password="password")
        shopping_list = ShoppingList.objects.create(name="Feira")
        self.client.force_login(admin_user)

        response = self.client.post(
            "/admin/shopping/listmembership/add/",
            {
                "shopping_list": shopping_list.pk,
                "user": member.pk,
                "role": ListMembership.Role.OWNER,
            },
        )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(
            ListMembership.objects.get(shopping_list=shopping_list, user=member).role,
            ListMembership.Role.MEMBER,
        )

    def test_admin_offers_standard_item_units(self):
        user = User.objects.create_superuser(username="admin", password="password")
        self.client.force_login(user)

        response = self.client.get("/admin/shopping/listitem/add/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Quilograma")

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
        ListMembership.objects.create(
            shopping_list=shopping_list, user=owner, role=ListMembership.Role.OWNER
        )
        ListMembership.objects.create(
            shopping_list=shopping_list, user=member, role=ListMembership.Role.MEMBER
        )
        item = ListItem.objects.create(
            shopping_list=shopping_list, name="Abacate", quantity=1, unit="un"
        )
        store = Store.objects.create(name="Feira", created_by=owner)
        store_item = StoreItem.objects.create(list_item=item, store=store)
        own_purchase = Purchase.objects.create(
            store_item=store_item,
            purchased_by=owner,
            quantity=Decimal("1"),
            unit_price=Decimal("10"),
            total_price=Decimal("0"),
        )
        Purchase.objects.create(
            store_item=store_item,
            purchased_by=member,
            quantity=Decimal("1"),
            unit_price=Decimal("12"),
            total_price=Decimal("0"),
        )

        self.client.force_authenticate(owner)
        response = self.client.get(
            f"/api/store-items/{store_item.public_id}/purchases/"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["id"] for item in response.data["results"]],
            [str(own_purchase.public_id)],
        )

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
        self.assertEqual(history.data["results"][0]["kind"], "corrected")
        self.assertEqual(history.data["results"][0]["changed_by"], owner.username)

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
