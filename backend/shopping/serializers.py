from rest_framework import serializers
from .models import ListInvite, ListItem, ListMembership, MarketBranch, MarketNetwork, PriceObservation, Product, Promotion, Report, ShareLink, ShoppingList, ShoppingPurchase, ShoppingPurchaseItem

class PublicIdSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)

class ShoppingListSerializer(PublicIdSerializer):
    class Meta:
        model = ShoppingList
        fields = ["id", "name", "archived_at", "version", "created_at", "updated_at"]
        read_only_fields = ["id", "archived_at", "version", "created_at", "updated_at"]

class ListItemSerializer(PublicIdSerializer):
    product_id = serializers.UUIDField(source="product.public_id", read_only=True)
    class Meta:
        model = ListItem
        fields = ["id", "product_id", "name", "quantity", "unit", "completed_at", "version", "created_at", "updated_at"]
        read_only_fields = ["id", "product_id", "version", "created_at", "updated_at"]

class MarketNetworkSerializer(PublicIdSerializer):
    class Meta: model = MarketNetwork; fields = ["id", "name", "tax_id", "is_active", "created_at", "updated_at"]; read_only_fields = ["id", "created_at", "updated_at"]

class MarketBranchSerializer(PublicIdSerializer):
    network_id = serializers.UUIDField(write_only=True)
    class Meta: model = MarketBranch; fields = ["id", "network_id", "name", "address", "external_place_id", "is_active", "created_at", "updated_at"]; read_only_fields = ["id", "created_at", "updated_at"]
    def validate_network_id(self, value):
        network = MarketNetwork.objects.filter(public_id=value).first()
        if not network: raise serializers.ValidationError("Rede não encontrada.")
        return network
    def create(self, validated_data): return super().create({**validated_data, "network": validated_data.pop("network_id")})

class ProductSerializer(PublicIdSerializer):
    class Meta: model = Product; fields = ["id", "gtin", "name", "brand", "variant", "quantity", "unit", "is_active", "created_at", "updated_at"]; read_only_fields = ["id", "created_at", "updated_at"]

class PriceObservationSerializer(PublicIdSerializer):
    product_id = serializers.UUIDField(write_only=True); market_id = serializers.UUIDField(write_only=True)
    class Meta: model = PriceObservation; fields = ["id", "product_id", "market_id", "amount", "observed_on", "is_valid", "created_at"]; read_only_fields = ["id", "created_at", "is_valid"]
    def validate(self, attrs):
        product = Product.objects.filter(public_id=attrs.pop("product_id")).first(); branch = MarketBranch.objects.filter(public_id=attrs.pop("market_id")).first()
        if not product or not branch: raise serializers.ValidationError("Produto ou mercado não encontrado.")
        attrs["product"], attrs["branch"] = product, branch
        return attrs

class PromotionSerializer(PublicIdSerializer):
    class Meta: model = Promotion; fields = ["id", "network", "branch", "product", "regular_price", "promotional_price", "starts_on", "ends_on", "is_valid", "created_at"]; read_only_fields = ["id", "created_at", "is_valid"]

class PurchaseItemInputSerializer(serializers.Serializer):
    list_item_id = serializers.UUIDField(); product_id = serializers.UUIDField(required=False); quantity = serializers.DecimalField(max_digits=10, decimal_places=3); unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)

class FinalizePurchaseSerializer(serializers.Serializer):
    client_operation_id = serializers.UUIDField(); market_id = serializers.UUIDField(required=False); purchased_at = serializers.DateTimeField(required=False); items = PurchaseItemInputSerializer(many=True, allow_empty=False)

class ShoppingPurchaseItemSerializer(PublicIdSerializer):
    class Meta: model = ShoppingPurchaseItem; fields = ["id", "description", "quantity", "unit", "unit_price"]

class ShoppingPurchaseSerializer(PublicIdSerializer):
    items = ShoppingPurchaseItemSerializer(many=True, read_only=True)
    total_amount = serializers.SerializerMethodField()
    def get_total_amount(self, value): return sum(item.quantity * item.unit_price for item in value.items.all())
    class Meta: model = ShoppingPurchase; fields = ["id", "shopping_list", "branch", "purchased_at", "voided_at", "void_reason", "items", "total_amount", "created_at"]; read_only_fields = fields

class SyncOperationInputSerializer(serializers.Serializer):
    client_operation_id = serializers.UUIDField(); entity_type = serializers.ChoiceField(choices=["shopping_list", "shopping_list_item"]); entity_id = serializers.UUIDField(); operation_type = serializers.ChoiceField(choices=["update"]); payload = serializers.DictField(); base_version = serializers.IntegerField(min_value=1)
class SyncRequestSerializer(serializers.Serializer): device_id = serializers.UUIDField(); operations = SyncOperationInputSerializer(many=True, allow_empty=False)

class ShareLinkSerializer(PublicIdSerializer):
    class Meta: model = ShareLink; fields = ["id", "product", "price", "promotion", "market", "location", "token", "expires_at", "revoked_at"]; read_only_fields = ["id", "token", "revoked_at"]
    def validate(self, attrs):
        if sum(value is not None for key, value in attrs.items() if key in {"product", "price", "promotion", "market", "location"}) != 1: raise serializers.ValidationError("Informe exatamente um recurso.")
        return attrs

class ReportSerializer(PublicIdSerializer):
    class Meta: model = Report; fields = ["id", "price", "promotion", "reason", "status", "created_at"]; read_only_fields = ["id", "status", "created_at"]
    def validate(self, attrs):
        if (attrs.get("price") is None) == (attrs.get("promotion") is None): raise serializers.ValidationError("Informe exatamente um alvo.")
        return attrs

class ListMemberSerializer(PublicIdSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    class Meta: model = ListMembership; fields = ["id", "username", "joined_at"]
class ListInviteCreateSerializer(serializers.Serializer): invited_email = serializers.EmailField(required=False, allow_null=True); expires_at = serializers.DateTimeField(required=False)
class ListInviteSerializer(PublicIdSerializer):
    class Meta: model = ListInvite; fields = ["id", "token", "invited_email", "expires_at", "accepted_at"]; read_only_fields = ["id", "token", "accepted_at"]
class TransferOwnershipSerializer(serializers.Serializer): member_id = serializers.UUIDField()
