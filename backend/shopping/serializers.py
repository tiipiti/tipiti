from rest_framework import serializers

from .models import ListItem, ShoppingList


class PublicIdSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)


class ShoppingListSerializer(PublicIdSerializer):
    class Meta:
        model = ShoppingList
        fields = ["id", "name", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class ListItemSerializer(PublicIdSerializer):
    class Meta:
        model = ListItem
        fields = ["id", "name", "quantity", "price", "completed", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
