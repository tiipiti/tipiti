from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth.models import User
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from shopping.models import (
    ListItem,
    ListMembership,
    MarketBranch,
    MarketNetwork,
    PriceObservation,
    Product,
    Promotion,
    ShoppingList,
    ShoppingPurchase,
    ShoppingPurchaseItem,
)


@pytest.mark.integration
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class QueryCountIntegrationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="owner", password="password")
        self.client.force_authenticate(self.user)
        self.network = MarketNetwork.objects.create(name="Rede")
        self.product = Product.objects.create(name="Arroz")
        self.shopping_list = ShoppingList.objects.create(name="Mercado")
        ListMembership.objects.create(
            shopping_list=self.shopping_list,
            user=self.user,
            role=ListMembership.Role.OWNER,
        )
        self.branches = [
            MarketBranch.objects.create(
                network=self.network, name=f"Mercado {index}", address=f"Rua {index}"
            )
            for index in range(2)
        ]
        self.items = [
            ListItem.objects.create(
                shopping_list=self.shopping_list,
                name=f"Item {index}",
                quantity=1,
                unit="un",
            )
            for index in range(4)
        ]
        purchase = ShoppingPurchase.objects.create(
            user=self.user,
            branch=self.branches[0],
            shopping_list=self.shopping_list,
            client_operation_id=uuid4(),
        )
        for item in self.items:
            ShoppingPurchaseItem.objects.create(
                purchase=purchase,
                list_item=item,
                product=self.product,
                description=item.name,
                quantity=1,
                unit_price=Decimal("1.00"),
                total_price=Decimal("1.00"),
            )
        today = timezone.localdate()
        for branch in self.branches:
            PriceObservation.objects.create(
                product=self.product,
                branch=branch,
                created_by=self.user,
                amount=Decimal("10.00"),
                observed_on=today - timedelta(days=1),
            )
        Promotion.objects.create(
            product=self.product,
            branch=self.branches[0],
            regular_price=Decimal("12.00"),
            promotional_price=Decimal("10.00"),
            starts_on=today - timedelta(days=1),
            ends_on=today + timedelta(days=1),
        )

    def test_purchase_list_uses_prefetched_item_lists(self):
        with self.assertNumQueries(4):
            response = self.client.get("/api/v1/purchases/")

        self.assertEqual(response.status_code, 200)

    def test_comparison_prefetches_applicable_promotions(self):
        with self.assertNumQueries(3):
            response = self.client.get(f"/api/v1/comparisons/?product_id={self.product.public_id}")

        self.assertEqual(response.status_code, 200)

    def test_price_list_filters_and_uses_the_configured_paginator(self):
        today = timezone.localdate()
        for amount in range(3):
            PriceObservation.objects.create(
                product=self.product,
                branch=self.branches[0],
                created_by=self.user,
                amount=Decimal(amount + 20),
                observed_on=today - timedelta(days=amount),
            )
        other_product = Product.objects.create(name="Feijão")
        PriceObservation.objects.create(
            product=other_product,
            branch=self.branches[0],
            created_by=self.user,
            amount=Decimal("8.00"),
            observed_on=today,
        )

        response = self.client.get(
            f"/api/v1/prices/?product_id={self.product.public_id}"
            f"&observed_on_after={today - timedelta(days=2)}&page_size=1"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 5)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertTrue(response.data["next"])
