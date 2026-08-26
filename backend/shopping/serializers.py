from django.utils import timezone
from rest_framework import serializers

from .models import (
    ListInvite,
    ListItem,
    ListMembership,
    MarketBranch,
    MarketNetwork,
    PriceObservation,
    Product,
    Promotion,
    Purchase,
    PurchaseChange,
    Report,
    ShareLink,
    ShoppingList,
    ShoppingPurchase,
    ShoppingPurchaseItem,
    Store,
    StoreItem,
)


class ShoppingListSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = ShoppingList
        fields = ["id", "name", "archived_at", "version", "created_at", "updated_at"]
        read_only_fields = ["id", "archived_at", "version", "created_at", "updated_at"]


class ListItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = ListItem
        fields = [
            "id",
            "name",
            "quantity",
            "unit",
            "is_checked",
            "checked_at",
            "purchased_quantity",
            "version",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "checked_at", "purchased_quantity", "version", "created_at", "updated_at"]


class StoreSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = Store
        fields = ["id", "name", "address", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class StoreItemSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    store_id = serializers.UUIDField(source="store.public_id", read_only=True)
    store_name = serializers.CharField(source="store.name", read_only=True)
    store_public_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = StoreItem
        fields = [
            "id",
            "store_id",
            "store_name",
            "store_public_id",
            "current_unit_price",
            "price_updated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "store_id", "store_name", "price_updated_at", "created_at", "updated_at"]

    def validate(self, attrs):
        store_public_id = attrs.pop("store_public_id", None)
        if self.instance is None:
            if store_public_id is None:
                raise serializers.ValidationError({"store_public_id": "Este campo é obrigatório."})
            store = Store.objects.filter(
                public_id=store_public_id, created_by=self.context["request"].user
            ).first()
            if store is None:
                raise serializers.ValidationError({"store_public_id": "Mercado não encontrado."})
            attrs["store"] = store
        elif store_public_id is not None:
            raise serializers.ValidationError({"store_public_id": "O mercado não pode ser alterado."})
        return attrs


class PurchaseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    purchased_by = serializers.CharField(source="purchased_by.username", read_only=True)

    class Meta:
        model = Purchase
        fields = [
            "id",
            "quantity",
            "unit_price",
            "total_price",
            "purchased_by",
            "purchased_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "total_price", "purchased_by", "created_at", "updated_at"]

    def validate(self, attrs):
        quantity = attrs.get("quantity", self.instance.quantity if self.instance else None)
        unit_price = attrs.get("unit_price", self.instance.unit_price if self.instance else None)
        if quantity is not None and unit_price is not None:
            attrs["total_price"] = quantity * unit_price
        return attrs


class MarketNetworkSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = MarketNetwork
        fields = ["id", "name", "tax_id", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class MarketBranchSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    network_id = serializers.UUIDField(write_only=True)
    network_name = serializers.CharField(source="network.name", read_only=True)

    class Meta:
        model = MarketBranch
        fields = ["id", "network_id", "network_name", "name", "address", "external_place_id", "is_active"]

    def validate_network_id(self, value):
        network = MarketNetwork.objects.filter(public_id=value, is_active=True).first()
        if network is None:
            raise serializers.ValidationError("Rede não encontrada.")
        return network

    def create(self, validated_data):
        validated_data["network"] = validated_data.pop("network_id")
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "network_id" in validated_data:
            validated_data["network"] = validated_data.pop("network_id")
        return super().update(instance, validated_data)


class ProductSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = Product
        fields = ["id", "gtin", "name", "brand", "variant", "quantity", "unit", "is_active"]


class PriceObservationSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    product_id = serializers.UUIDField(write_only=True)
    branch_id = serializers.UUIDField(write_only=True)
    market = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = PriceObservation
        fields = ["id", "product_id", "branch_id", "market", "amount", "observed_on", "is_valid", "created_at"]
        read_only_fields = ["id", "is_valid", "created_at"]

    def validate(self, attrs):
        if attrs["observed_on"] > timezone.localdate():
            raise serializers.ValidationError({"observed_on": "A data não pode estar no futuro."})
        product = Product.objects.filter(public_id=attrs.pop("product_id"), is_active=True).first()
        branch = MarketBranch.objects.filter(public_id=attrs.pop("branch_id"), is_active=True).first()
        if not product or not branch:
            raise serializers.ValidationError("Produto ou mercado não encontrado.")
        attrs["product"], attrs["branch"] = product, branch
        return attrs


class PromotionSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    network_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    branch_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    product_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    network_name = serializers.CharField(source="network.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Promotion
        fields = ["id", "network_id", "branch_id", "product_id", "network_name", "branch_name", "product_name", "regular_price", "promotional_price", "starts_on", "ends_on", "is_valid", "created_at"]
        read_only_fields = ["id", "is_valid", "created_at"]

    def validate(self, attrs):
        for field, model in (("network_id", MarketNetwork), ("branch_id", MarketBranch), ("product_id", Product)):
            public_id = attrs.pop(field, None)
            if public_id:
                value = model.objects.filter(public_id=public_id, is_active=True).first()
                if not value:
                    raise serializers.ValidationError({field: "Cadastro não encontrado."})
                attrs[field[:-3]] = value
        network = attrs.get("network", getattr(self.instance, "network", None))
        branch = attrs.get("branch", getattr(self.instance, "branch", None))
        starts = attrs.get("starts_on", getattr(self.instance, "starts_on", None))
        ends = attrs.get("ends_on", getattr(self.instance, "ends_on", None))
        regular = attrs.get("regular_price", getattr(self.instance, "regular_price", None))
        promotional = attrs.get("promotional_price", getattr(self.instance, "promotional_price", None))
        if not network and not branch:
            raise serializers.ValidationError("Informe uma rede ou unidade.")
        if branch and network and branch.network_id != network.id:
            raise serializers.ValidationError("A unidade não pertence à rede.")
        if ends < starts or promotional >= regular:
            raise serializers.ValidationError("Datas ou preços promocionais inválidos.")
        return attrs


class PurchaseItemInputSerializer(serializers.Serializer):
    list_item_id = serializers.UUIDField()
    quantity = serializers.DecimalField(max_digits=10, decimal_places=3, min_value=0.001)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    product_id = serializers.UUIDField(required=False)


class FinalizePurchaseSerializer(serializers.Serializer):
    market_id = serializers.UUIDField()
    purchased_on = serializers.DateField(default=timezone.localdate)
    client_operation_id = serializers.UUIDField()
    items = PurchaseItemInputSerializer(many=True, min_length=1)


class PurchaseVoidSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)


class TransferOwnershipSerializer(serializers.Serializer):
    member_id = serializers.UUIDField()


class PurchaseChangeSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    changed_by = serializers.CharField(source="changed_by.username", read_only=True)

    class Meta:
        model = PurchaseChange
        fields = ["id", "kind", "before", "after", "reason", "changed_by", "created_at"]


class ShoppingPurchaseItemSerializer(serializers.ModelSerializer):
    list_item_id = serializers.UUIDField(source="list_item.public_id", read_only=True)

    class Meta:
        model = ShoppingPurchaseItem
        fields = ["list_item_id", "description", "quantity", "unit_price", "total_price"]


class ShoppingPurchaseSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    market = serializers.CharField(source="branch.name", read_only=True)
    items = ShoppingPurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = ShoppingPurchase
        fields = ["id", "market", "purchased_on", "total_amount", "items", "created_at"]
        read_only_fields = fields


class SyncOperationInputSerializer(serializers.Serializer):
    client_operation_id = serializers.UUIDField()
    entity_type = serializers.CharField(max_length=64)
    operation_type = serializers.CharField(max_length=16)
    entity_id = serializers.UUIDField(required=False)
    base_version = serializers.IntegerField(min_value=0, default=0)
    payload = serializers.JSONField()


class SyncRequestSerializer(serializers.Serializer):
    device_id = serializers.UUIDField()
    last_sync_cursor = serializers.CharField(required=False, allow_blank=True)
    operations = SyncOperationInputSerializer(many=True, max_length=100)


class ShareLinkSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = ShareLink
        fields = ["id", "resource_type", "resource_id", "location", "token", "expires_at", "revoked_at"]
        read_only_fields = ["id", "token", "revoked_at"]

    def validate(self, attrs):
        if attrs["expires_at"] <= timezone.now():
            raise serializers.ValidationError({"expires_at": "A expiração deve estar no futuro."})
        if attrs["resource_type"] == ShareLink.ResourceType.LOCATION:
            if not attrs.get("location"):
                raise serializers.ValidationError({"location": "Informe a localização explicitamente."})
        elif not attrs.get("resource_id"):
            raise serializers.ValidationError({"resource_id": "Informe o recurso a compartilhar."})
        return attrs


class ReportSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = Report
        fields = ["id", "target_type", "target_id", "reason", "status", "created_at"]
        read_only_fields = ["id", "status", "created_at"]


class ListMemberSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ListMembership
        fields = ["id", "username", "role", "joined_at"]


class ListInviteCreateSerializer(serializers.Serializer):
    invited_email = serializers.EmailField(required=False, allow_blank=True)
    expires_at = serializers.DateTimeField(required=False)

    def validate_invited_email(self, value: str) -> str | None:
        return value.strip().casefold() or None

    def validate_expires_at(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError("A expiração deve estar no futuro.")
        return value


class ListInviteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

    class Meta:
        model = ListInvite
        fields = ["id", "invited_email", "token", "expires_at", "accepted_at", "created_at"]
        read_only_fields = fields
