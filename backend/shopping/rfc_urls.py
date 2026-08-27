from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import ListItemViewSet, ShoppingListViewSet

router = SimpleRouter()
router.register("lists", ShoppingListViewSet, basename="shopping-list")

list_items = ListItemViewSet.as_view({"get": "list", "post": "create"})
list_item = ListItemViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"})

urlpatterns = router.urls + [
    path("lists/<uuid:shopping_list_public_id>/items/", list_items),
    path("lists/<uuid:shopping_list_public_id>/items/<uuid:public_id>/", list_item),
]
