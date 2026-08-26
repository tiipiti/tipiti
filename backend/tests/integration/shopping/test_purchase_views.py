from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.test import override_settings
from rest_framework.test import APITestCase

from accounts.models import ConsentHistory
from config.admin_site import site as admin_site
from shopping.models import FavoriteMarket, ListItem, ListMembership, Purchase, ShoppingList, Store, StoreItem


@pytest.mark.integration
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class PurchaseViewSetIntegrationTests(APITestCase):
    def test_domain_models_are_registered_in_the_admin(self):
        self.assertTrue(admin_site.is_registered(FavoriteMarket))
        self.assertTrue(admin_site.is_registered(ConsentHistory))

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
