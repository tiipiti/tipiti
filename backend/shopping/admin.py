from django.contrib import admin
from config.admin_site import site
from .models import AdministrativeAudit, FavoriteMarket, ListInvite, ListItem, ListMembership, ListOwnershipChange, MarketBranch, MarketNetwork, PriceObservation, Product, ProductAlias, Promotion, PurchaseEvent, Report, ShareLink, ShoppingList, ShoppingPurchase, ShoppingPurchaseItem, SyncOperation

for model in [ShoppingList, ListItem, ListMembership, ListInvite, ListOwnershipChange, MarketNetwork, MarketBranch, FavoriteMarket, Product, ProductAlias, PriceObservation, Promotion, ShoppingPurchase, ShoppingPurchaseItem, PurchaseEvent, SyncOperation, ShareLink, Report, AdministrativeAudit]:
    site.register(model)
