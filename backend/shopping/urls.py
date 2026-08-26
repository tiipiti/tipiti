from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import (
    ListInviteAcceptViewSet,
    ListInviteViewSet,
    ListItemViewSet,
    PurchaseViewSet,
    ShoppingListViewSet,
    StoreItemViewSet,
    StoreViewSet,
)

router = SimpleRouter()
router.register("lists", ShoppingListViewSet, basename="shopping-list")
router.register("list-invites", ListInviteViewSet, basename="list-invite")
router.register("stores", StoreViewSet, basename="store")

list_item_collection = ListItemViewSet.as_view({"get": "list", "post": "create"})
list_item_detail = ListItemViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)
store_item_collection = StoreItemViewSet.as_view({"get": "list", "post": "create"})
store_item_detail = StoreItemViewSet.as_view(
    {"patch": "partial_update", "delete": "destroy"}
)
purchase_collection = PurchaseViewSet.as_view({"get": "list", "post": "create"})
purchase_detail = PurchaseViewSet.as_view(
    {"patch": "partial_update", "delete": "destroy"}
)
invite_accept = ListInviteAcceptViewSet.as_view({"post": "accept"})

urlpatterns = [
    path("lists/<uuid:shopping_list_public_id>/items/", list_item_collection),
    path("list-items/<uuid:public_id>/", list_item_detail),
    path("list-items/<uuid:list_item_public_id>/store-items/", store_item_collection),
    path("store-items/<uuid:public_id>/", store_item_detail),
    path("store-items/<uuid:store_item_public_id>/purchases/", purchase_collection),
    path("purchases/<uuid:public_id>/", purchase_detail),
    path("list-invites/<str:token>/accept/", invite_accept),
    path("", include(router.urls)),
]
