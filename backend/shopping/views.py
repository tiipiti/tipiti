from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from core.viewsets import ViewSetBase
from .models import ListInvite, ListItem, ListMembership, MarketBranch, MarketNetwork, PriceObservation, Product, Promotion, Report, ShareLink, ShoppingList, ShoppingPurchase, SyncOperation
from .serializers import FinalizePurchaseSerializer, ListInviteCreateSerializer, ListInviteSerializer, ListItemSerializer, ListMemberSerializer, MarketBranchSerializer, MarketNetworkSerializer, PriceObservationSerializer, ProductSerializer, PromotionSerializer, ReportSerializer, ShareLinkSerializer, ShoppingListSerializer, ShoppingPurchaseSerializer, SyncRequestSerializer, TransferOwnershipSerializer
from .services import accept_invite, apply_sync_operation, create_invite, create_shopping_list, ensure_active, finalize_purchase, membership_for, owner_for, transfer_ownership, void_purchase

class ShoppingListViewSet(ViewSetBase):
    queryset = ShoppingList.objects.all(); serializer_class = ShoppingListSerializer; permission_classes = [permissions.IsAuthenticated]; lookup_field = "public_id"
    def get_queryset(self): return self.queryset.filter(memberships__user=self.request.user)
    def perform_create(self, serializer): serializer.instance = create_shopping_list(self.request.user, name=serializer.validated_data["name"])
    def perform_update(self, serializer): owner_for(self.get_object(), self.request.user); ensure_active(self.get_object()); serializer.save()
    def perform_destroy(self, instance): owner_for(instance, self.request.user); instance.archived_at = timezone.now(); instance.save(update_fields=["archived_at", "updated_at"])
    @action(detail=True, methods=["get", "post"])
    def members(self, request, public_id=None):
        shopping_list = self.get_object(); membership_for(shopping_list, request.user)
        if request.method == "GET": return self.paginated_response(shopping_list.memberships.select_related("user"), ListMemberSerializer)
        serializer = ListInviteCreateSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        return Response(ListInviteSerializer(create_invite(shopping_list, request.user, **serializer.validated_data)).data, status=status.HTTP_201_CREATED)
    @action(detail=True, methods=["delete"], url_path=r"members/(?P<member_public_id>[^/.]+)")
    def remove_member(self, request, public_id=None, member_public_id=None):
        shopping_list = self.get_object(); owner_for(shopping_list, request.user)
        member = get_object_or_404(ListMembership, shopping_list=shopping_list, public_id=member_public_id)
        if member.user_id == shopping_list.owner_id: return Response({"detail": "Transfira a posse antes de remover o dono."}, status=400)
        member.delete(); return Response(status=204)
    @action(detail=True, methods=["post"], url_path="transfer-ownership")
    def transfer_ownership(self, request, public_id=None):
        serializer = TransferOwnershipSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        return Response(ListMemberSerializer(transfer_ownership(request.user, self.get_object(), serializer.validated_data["member_id"])).data)
    @action(detail=True, methods=["post"])
    def finalize(self, request, public_id=None):
        serializer = FinalizePurchaseSerializer(data=request.data); serializer.is_valid(raise_exception=True)
        return Response(ShoppingPurchaseSerializer(finalize_purchase(request.user, self.get_object(), serializer.validated_data)).data, status=201)

class ListItemViewSet(ViewSetBase):
    queryset = ListItem.objects.select_related("shopping_list"); serializer_class = ListItemSerializer; permission_classes = [permissions.IsAuthenticated]; lookup_field = "public_id"
    def get_queryset(self): return self.queryset.filter(shopping_list__memberships__user=self.request.user)
    def perform_create(self, serializer):
        shopping_list = get_object_or_404(ShoppingList, public_id=self.kwargs["shopping_list_public_id"]); membership_for(shopping_list, self.request.user); ensure_active(shopping_list); serializer.save(shopping_list=shopping_list)
    def perform_update(self, serializer): ensure_active(self.get_object().shopping_list); serializer.save()

class OwnedModelViewSet(ViewSetBase):
    permission_classes = [permissions.IsAuthenticated]; lookup_field = "public_id"
class MarketNetworkViewSet(OwnedModelViewSet): queryset = MarketNetwork.objects.all(); serializer_class = MarketNetworkSerializer
class MarketBranchViewSet(OwnedModelViewSet): queryset = MarketBranch.objects.select_related("network"); serializer_class = MarketBranchSerializer
class ProductViewSet(OwnedModelViewSet): queryset = Product.objects.all(); serializer_class = ProductSerializer
class PriceObservationViewSet(OwnedModelViewSet):
    queryset = PriceObservation.objects.select_related("product", "branch"); serializer_class = PriceObservationSerializer
    def perform_create(self, serializer): serializer.save(created_by=self.request.user)
class PromotionViewSet(OwnedModelViewSet):
    queryset = Promotion.objects.all(); serializer_class = PromotionSerializer
    def perform_create(self, serializer): serializer.save(created_by=self.request.user)
class ShoppingPurchaseViewSet(OwnedModelViewSet):
    queryset = ShoppingPurchase.objects.select_related("shopping_list", "branch").prefetch_related("items"); serializer_class = ShoppingPurchaseSerializer
    def get_queryset(self): return self.queryset.filter(user=self.request.user)
    @action(detail=True, methods=["post"])
    def void(self, request, public_id=None): return Response(ShoppingPurchaseSerializer(void_purchase(request.user, self.get_object(), reason=request.data.get("reason", ""))).data)

class SyncViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    def create(self, request):
        serializer = SyncRequestSerializer(data=request.data); serializer.is_valid(raise_exception=True); statuses = []
        for operation in serializer.validated_data["operations"]:
            record, created = SyncOperation.objects.get_or_create(user=request.user, client_operation_id=operation["client_operation_id"], defaults={**operation, "device_id": serializer.validated_data["device_id"]})
            statuses.append({"client_operation_id": str(record.client_operation_id), "status": apply_sync_operation(request.user, operation) if created else record.status})
        return Response({"operations": statuses})

class ShareLinkViewSet(OwnedModelViewSet):
    queryset = ShareLink.objects.all(); serializer_class = ShareLinkSerializer
    def get_queryset(self): return self.queryset.filter(user=self.request.user)
    def perform_create(self, serializer): serializer.save(user=self.request.user)
class ReportViewSet(OwnedModelViewSet):
    queryset = Report.objects.all(); serializer_class = ReportSerializer
    def perform_create(self, serializer): serializer.save(reporter=self.request.user)
class ListInviteAcceptViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    def create(self, request, token=None): return Response(ListMemberSerializer(accept_invite(get_object_or_404(ListInvite, token=token), request.user)).data)
