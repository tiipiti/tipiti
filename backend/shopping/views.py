from django.shortcuts import get_object_or_404
from rest_framework import permissions

from core.viewsets import ViewSetBase

from .models import ListItem, ShoppingList
from .serializers import ListItemSerializer, ShoppingListSerializer


class ShoppingListViewSet(ViewSetBase):
    queryset = ShoppingList.objects.all()
    serializer_class = ShoppingListSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        return self.queryset.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ListItemViewSet(ViewSetBase):
    queryset = ListItem.objects.all()
    serializer_class = ListItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        return self.queryset.filter(shopping_list__owner=self.request.user)

    def perform_create(self, serializer):
        shopping_list = get_object_or_404(
            ShoppingList.objects.filter(owner=self.request.user),
            public_id=self.kwargs["shopping_list_public_id"],
        )
        serializer.save(shopping_list=shopping_list)
