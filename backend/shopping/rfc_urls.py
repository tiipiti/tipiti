from rest_framework.routers import SimpleRouter
from django.urls import path

from .views import (
    ComparisonViewSet, FeedViewSet, MarketBranchViewSet, MarketNetworkViewSet,
    PriceObservationViewSet, ProductViewSet, PromotionViewSet, ReportViewSet,
    ShareLinkViewSet, ShoppingPurchaseViewSet, SyncViewSet, AdministrationViewSet,
)

router = SimpleRouter()
router.register("market-networks", MarketNetworkViewSet, basename="market-network")
router.register("markets", MarketBranchViewSet, basename="market-branch")
router.register("products", ProductViewSet, basename="product")
router.register("prices", PriceObservationViewSet, basename="price")
router.register("comparisons", ComparisonViewSet, basename="comparison")
router.register("promotions", PromotionViewSet, basename="promotion")
router.register("feed", FeedViewSet, basename="feed")
router.register("purchases", ShoppingPurchaseViewSet, basename="shopping-purchase")
router.register("sync", SyncViewSet, basename="sync")
router.register("shares", ShareLinkViewSet, basename="share")
router.register("reports", ReportViewSet, basename="report")

urlpatterns = router.urls
admin_reports = AdministrationViewSet.as_view({"get": "reports"})
admin_resolve_report = AdministrationViewSet.as_view({"post": "resolve_report"})
admin_merge_markets = AdministrationViewSet.as_view({"post": "merge_markets"})
admin_merge_products = AdministrationViewSet.as_view({"post": "merge_products"})
admin_invalidate_contribution = AdministrationViewSet.as_view({"post": "invalidate_contribution"})

urlpatterns += [
    path("admin/reports/", admin_reports),
    path("admin/reports/<uuid:report_id>/resolve/", admin_resolve_report),
    path("admin/markets/merge/", admin_merge_markets),
    path("admin/products/merge/", admin_merge_products),
    path("admin/contributions/<uuid:contribution_id>/invalidate/", admin_invalidate_contribution),
]
