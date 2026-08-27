from django.urls import path
from rest_framework.routers import SimpleRouter
from .views import ListInviteAcceptViewSet, ListItemViewSet, MarketBranchViewSet, MarketNetworkViewSet, PriceObservationViewSet, ProductViewSet, PromotionViewSet, ReportViewSet, ShareLinkViewSet, ShoppingListViewSet, ShoppingPurchaseViewSet, SyncViewSet

router = SimpleRouter()
router.register("lists", ShoppingListViewSet, basename="shopping-list")
router.register("market-networks", MarketNetworkViewSet, basename="market-network")
router.register("markets", MarketBranchViewSet, basename="market-branch")
router.register("products", ProductViewSet, basename="product")
router.register("prices", PriceObservationViewSet, basename="price")
router.register("promotions", PromotionViewSet, basename="promotion")
router.register("purchases", ShoppingPurchaseViewSet, basename="shopping-purchase")
router.register("sync", SyncViewSet, basename="sync")
router.register("shares", ShareLinkViewSet, basename="share")
router.register("reports", ReportViewSet, basename="report")
list_items = ListItemViewSet.as_view({"get": "list", "post": "create"})
list_item = ListItemViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})
invite_accept = ListInviteAcceptViewSet.as_view({"post": "create"})
urlpatterns = router.urls + [
    path("lists/<uuid:shopping_list_public_id>/items/", list_items),
    path("lists/<uuid:shopping_list_public_id>/items/<uuid:public_id>/", list_item),
    path("invites/<str:token>/accept/", invite_accept),
]
