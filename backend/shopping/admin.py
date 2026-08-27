from django.contrib import admin
from config.admin_site import site
from .models import ListInvite, ListItem, ListMembership, ListOwnershipChange, MarketBranch, MarketNetwork, PriceObservation, Product, Promotion, PurchaseEvent, Report, ShareLink, ShoppingList, ShoppingPurchase, ShoppingPurchaseItem, SyncOperation

for model in [ShoppingList, ListItem, ListMembership, ListInvite, ListOwnershipChange, MarketNetwork, MarketBranch, Product, PriceObservation, Promotion, ShoppingPurchase, ShoppingPurchaseItem, PurchaseEvent, SyncOperation, ShareLink, Report]:
    site.register(model)
