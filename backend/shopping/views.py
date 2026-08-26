import hashlib
import json
from datetime import timedelta

from django.db.models import Prefetch, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.viewsets import PaginatedResponseMixin, ViewSetBase, WriteViewSetBase

from .filters import PriceObservationFilter, PromotionFilter, ShoppingPurchaseFilter
from .models import (
    AdministrativeAudit,
    FavoriteMarket,
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
    Store,
    StoreItem,
    SyncOperation,
)
from .serializers import (
    FinalizePurchaseSerializer,
    ListInviteCreateSerializer,
    ListInviteSerializer,
    ListItemSerializer,
    ListMemberSerializer,
    MarketBranchSerializer,
    MarketNetworkSerializer,
    PriceObservationSerializer,
    ProductSerializer,
    PromotionSerializer,
    PurchaseChangeSerializer,
    PurchaseSerializer,
    PurchaseVoidSerializer,
    ReportSerializer,
    ShareLinkSerializer,
    ShoppingListSerializer,
    ShoppingPurchaseSerializer,
    StoreItemSerializer,
    StoreSerializer,
    SyncRequestSerializer,
    TransferOwnershipSerializer,
)
from .services import (
    accept_invite,
    apply_sync_operation,
    correct_purchase,
    create_invite,
    ensure_active,
    finalize_purchase,
    membership_for,
    owner_for,
    purchase_snapshot,
    transfer_ownership,
    void_purchase,
)


class ShoppingListViewSet(ViewSetBase):
    queryset = ShoppingList.objects.all()
    serializer_class = ShoppingListSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        return self.queryset.filter(memberships__user=self.request.user).order_by("-updated_at")

    def perform_create(self, serializer):
        shopping_list = serializer.save()
        ListMembership.objects.create(
            shopping_list=shopping_list,
            user=self.request.user,
            role=ListMembership.Role.OWNER,
        )

    def perform_update(self, serializer):
        shopping_list = self.get_object()
        owner_for(shopping_list, self.request.user)
        ensure_active(shopping_list)
        serializer.save()

    def perform_destroy(self, instance):
        owner_for(instance, self.request.user)
        if instance.archived_at is None:
            instance.archived_at = timezone.now()
            instance.save(update_fields=["archived_at", "updated_at"])

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, public_id=None):
        shopping_list = self.get_object()
        membership_for(shopping_list, request.user)
        if request.method == "GET":
            memberships = shopping_list.memberships.select_related("user").order_by("joined_at")
            return self.paginated_response(memberships, ListMemberSerializer)
        serializer = ListInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invite = create_invite(shopping_list, request.user, **serializer.validated_data)
        return Response(ListInviteSerializer(invite).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"members/(?P<member_public_id>[^/.]+)",
    )
    def remove_member(self, request, public_id=None, member_public_id=None):
        shopping_list = self.get_object()
        owner_for(shopping_list, request.user)
        membership = get_object_or_404(
            ListMembership, shopping_list=shopping_list, public_id=member_public_id
        )
        if membership.role == ListMembership.Role.OWNER:
            return Response(
                {"detail": "Transfira a posse antes de remover o dono."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        membership.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="transfer-ownership")
    def transfer_ownership(self, request, public_id=None):
        serializer = TransferOwnershipSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_owner = transfer_ownership(
            request.user,
            self.get_object(),
            serializer.validated_data["member_id"],
        )
        return Response(ListMemberSerializer(new_owner).data)

    @action(detail=True, methods=["post"], url_path="finalize")
    def finalize(self, request, public_id=None):
        shopping_list = self.get_object()
        membership_for(shopping_list, request.user)
        serializer = FinalizePurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        purchase = finalize_purchase(request.user, shopping_list, serializer.validated_data)
        return Response(ShoppingPurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)


class ListItemViewSet(ViewSetBase):
    queryset = ListItem.objects.select_related("shopping_list")
    serializer_class = ListItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        queryset = self.queryset.filter(shopping_list__memberships__user=self.request.user)
        if shopping_list_public_id := self.kwargs.get("shopping_list_public_id"):
            return queryset.filter(shopping_list__public_id=shopping_list_public_id)
        return queryset

    def perform_create(self, serializer):
        shopping_list = get_object_or_404(
            ShoppingList, public_id=self.kwargs["shopping_list_public_id"]
        )
        membership_for(shopping_list, self.request.user)
        ensure_active(shopping_list)
        serializer.save(shopping_list=shopping_list)

    def perform_update(self, serializer):
        item = self.get_object()
        ensure_active(item.shopping_list)
        item = serializer.save()

    def perform_destroy(self, instance):
        ensure_active(instance.shopping_list)
        instance.delete()


class StoreViewSet(ViewSetBase):
    queryset = Store.objects.all()
    serializer_class = StoreSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        return self.queryset.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class StoreItemViewSet(ViewSetBase):
    queryset = StoreItem.objects.select_related("list_item__shopping_list", "store")
    serializer_class = StoreItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        queryset = self.queryset.filter(
            list_item__shopping_list__memberships__user=self.request.user
        )
        if list_item_public_id := self.kwargs.get("list_item_public_id"):
            return queryset.filter(list_item__public_id=list_item_public_id)
        return queryset

    def perform_create(self, serializer):
        list_item = get_object_or_404(
            ListItem.objects.select_related("shopping_list"),
            public_id=self.kwargs["list_item_public_id"],
        )
        membership_for(list_item.shopping_list, self.request.user)
        ensure_active(list_item.shopping_list)
        store_item = serializer.save(list_item=list_item)
        if store_item.current_unit_price is not None:
            store_item.price_updated_at = timezone.now()
            store_item.save(update_fields=["price_updated_at", "updated_at"])

    def perform_update(self, serializer):
        store_item = self.get_object()
        ensure_active(store_item.list_item.shopping_list)
        store_item = serializer.save()
        if "current_unit_price" in serializer.validated_data:
            store_item.price_updated_at = timezone.now()
            store_item.save(update_fields=["price_updated_at", "updated_at"])

    def perform_destroy(self, instance):
        ensure_active(instance.list_item.shopping_list)
        instance.delete()


class PurchaseViewSet(ViewSetBase):
    queryset = Purchase.objects.select_related("store_item__list_item__shopping_list", "purchased_by")
    serializer_class = PurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        queryset = self.queryset.filter(purchased_by=self.request.user)
        if store_item_public_id := self.kwargs.get("store_item_public_id"):
            return queryset.filter(store_item__public_id=store_item_public_id)
        return queryset

    def perform_create(self, serializer):
        store_item = get_object_or_404(
            StoreItem.objects.select_related("list_item__shopping_list"),
            public_id=self.kwargs["store_item_public_id"],
        )
        membership_for(store_item.list_item.shopping_list, self.request.user)
        ensure_active(store_item.list_item.shopping_list)
        purchase = serializer.save(store_item=store_item, purchased_by=self.request.user)
        PurchaseChange.objects.create(
            purchase=purchase,
            changed_by=self.request.user,
            kind=PurchaseChange.Kind.CREATED,
            after=purchase_snapshot(purchase),
        )
        store_item.current_unit_price = purchase.unit_price
        store_item.price_updated_at = timezone.now()
        store_item.save(update_fields=["current_unit_price", "price_updated_at", "updated_at"])

    def perform_update(self, serializer):
        if not serializer.validated_data:
            raise ValidationError("Informe ao menos um campo para corrigir a compra.")
        serializer.instance = correct_purchase(
            self.request.user,
            self.get_object(),
            serializer.validated_data,
        )

    def perform_destroy(self, instance):
        void_purchase(self.request.user, instance)

    def void(self, request, public_id=None):
        serializer = PurchaseVoidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        void_purchase(
            request.user,
            self.get_object(),
            reason=serializer.validated_data.get("reason", ""),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def changes(self, request, public_id=None):
        purchase = get_object_or_404(
            Purchase.objects.select_related("store_item__list_item__shopping_list"),
            public_id=public_id,
        )
        membership_for(purchase.store_item.list_item.shopping_list, request.user)
        changes = purchase.changes.select_related("changed_by")
        return self.paginated_response(changes, PurchaseChangeSerializer)


class MarketNetworkViewSet(ViewSetBase):
    queryset = MarketNetwork.objects.all()
    serializer_class = MarketNetworkSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"


class MarketBranchViewSet(ViewSetBase):
    queryset = MarketBranch.objects.select_related("network")
    serializer_class = MarketBranchSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    @action(detail=True, methods=["post", "delete"], url_path="favorite")
    def favorite(self, request, public_id=None):
        branch = self.get_object()
        if request.method == "POST":
            FavoriteMarket.objects.get_or_create(user=request.user, branch=branch)
            return Response(status=status.HTTP_204_NO_CONTENT)
        FavoriteMarket.objects.filter(user=request.user, branch=branch).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductViewSet(ViewSetBase):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    @action(detail=True, methods=["get"], url_path="price-history")
    def price_history(self, request, public_id=None):
        product = self.get_object()
        prices = PriceObservation.objects.filter(product=product, is_valid=True).select_related("branch")
        return self.paginated_response(prices, PriceObservationSerializer)


class PriceObservationViewSet(PaginatedResponseMixin, viewsets.GenericViewSet):
    queryset = PriceObservation.objects.select_related("product", "branch")
    serializer_class = PriceObservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"
    filterset_class = PriceObservationFilter

    def list(self, request):
        queryset = self.filter_queryset(self.queryset.filter(is_valid=True))
        return self.paginated_response(queryset, self.get_serializer_class())

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ComparisonViewSet(PaginatedResponseMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        product_id = request.query_params.get("product_id")
        if not product_id:
            raise ValidationError({"product_id": "Este parâmetro é obrigatório."})
        cutoff = timezone.localdate() - timedelta(days=1)
        promotions = Promotion.objects.filter(
            is_valid=True, starts_on__lte=timezone.localdate(), ends_on__gte=timezone.localdate()
        ).select_related("network", "branch")
        prices = PriceObservation.objects.filter(
            product__public_id=product_id, is_valid=True, observed_on__lte=cutoff
        ).select_related("product", "branch__network").prefetch_related(
            Prefetch("product__promotions", queryset=promotions)
        ).order_by("branch_id", "-observed_on", "-created_at").distinct("branch_id")
        page = self.paginate_queryset(prices)
        return self.get_paginated_response([
            {
                "market_id": price.branch.public_id, "market": str(price.branch), "amount": str(price.amount),
                "observed_on": price.observed_on, "stale": price.observed_on < cutoff - timedelta(days=7),
                "promotion": any(
                    promotion.branch_id == price.branch_id
                    or (promotion.branch_id is None and promotion.network_id == price.branch.network_id)
                    for promotion in price.product.promotions.all()
                ),
            }
            for price in page
        ])


class PromotionViewSet(PaginatedResponseMixin, viewsets.GenericViewSet):
    queryset = Promotion.objects.select_related("network", "branch", "product")
    serializer_class = PromotionSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"
    filterset_class = PromotionFilter

    def list(self, request):
        queryset = self.filter_queryset(
            self.queryset.filter(is_valid=True, ends_on__gte=timezone.localdate())
        )
        return self.paginated_response(queryset, self.get_serializer_class())

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(created_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FeedViewSet(PaginatedResponseMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        item_names = ListItem.objects.filter(shopping_list__memberships__user=request.user).values("name")
        promotions = Promotion.objects.filter(is_valid=True, ends_on__gte=timezone.localdate(), product__name__in=item_names)
        return self.paginated_response(promotions, PromotionSerializer)


class ShoppingPurchaseViewSet(ViewSetBase):
    queryset = ShoppingPurchase.objects.select_related("branch", "shopping_list").prefetch_related("items__list_item")
    serializer_class = ShoppingPurchaseSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"
    http_method_names = ["get", "patch", "head", "options"]
    filterset_class = ShoppingPurchaseFilter

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        purchase = self.get_object()
        if set(request.data) != {"purchased_on"}:
            raise ValidationError("Somente a data da compra pode ser corrigida.")
        purchase.purchased_on = request.data["purchased_on"]
        purchase.save(update_fields=["purchased_on", "updated_at"])
        return Response(self.get_serializer(purchase).data)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        purchases = self.filter_queryset(self.get_queryset())
        if start := request.query_params.get("from"):
            purchases = purchases.filter(purchased_on__gte=start)
        if end := request.query_params.get("to"):
            purchases = purchases.filter(purchased_on__lte=end)
        totals = purchases.values("branch__public_id", "branch__name").annotate(total=Sum("total_amount")).order_by("branch__name")
        return self.paginated_response(totals)


class SyncViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        if not request.headers.get("Idempotency-Key"):
            raise ValidationError({"Idempotency-Key": "Este cabeçalho é obrigatório."})
        serializer = SyncRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        results = []
        for operation in serializer.validated_data["operations"]:
            payload_hash = hashlib.sha256(json.dumps(operation["payload"], sort_keys=True).encode()).hexdigest()
            record, created = SyncOperation.objects.get_or_create(
                user=request.user, client_operation_id=operation["client_operation_id"],
                defaults={"device_id": serializer.validated_data["device_id"], "entity_type": operation["entity_type"],
                          "operation_type": operation["operation_type"], "payload_hash": payload_hash,
                          "base_version": operation["base_version"]},
            )
            if created:
                record.status = apply_sync_operation(request.user, operation)
                record.save(update_fields=["status", "updated_at"])
            if not created and record.payload_hash != payload_hash:
                record.status = SyncOperation.Status.CONFLICT
                record.save(update_fields=["status", "updated_at"])
            results.append({"client_operation_id": operation["client_operation_id"], "status": record.status})
        return Response({"operations": results})


class ShareLinkViewSet(ViewSetBase):
    queryset = ShareLink.objects.all()
    serializer_class = ShareLinkSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.revoked_at = timezone.now()
        instance.save(update_fields=["revoked_at", "updated_at"])


class ReportViewSet(viewsets.GenericViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(reporter=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdministrationViewSet(PaginatedResponseMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAdminUser]

    @action(detail=False, methods=["get"], url_path="reports")
    def reports(self, request):
        return self.paginated_response(
            Report.objects.select_related("reporter", "resolved_by"), ReportSerializer
        )

    @action(detail=False, methods=["post"], url_path=r"reports/(?P<report_id>[^/.]+)/resolve")
    def resolve_report(self, request, report_id=None):
        report = get_object_or_404(Report, public_id=report_id)
        report.status, report.resolved_by, report.resolved_at = Report.Status.RESOLVED, request.user, timezone.now()
        report.save(update_fields=["status", "resolved_by", "resolved_at", "updated_at"])
        AdministrativeAudit.objects.create(administrator=request.user, action="resolve_report", target_type="report", target_id=report.public_id)
        return Response(ReportSerializer(report).data)

    @action(detail=False, methods=["post"], url_path="markets/merge")
    def merge_markets(self, request):
        source = get_object_or_404(MarketBranch, public_id=request.data.get("source_id"))
        target = get_object_or_404(MarketBranch, public_id=request.data.get("target_id"))
        if source == target:
            raise ValidationError("Os mercados devem ser diferentes.")
        for model in (PriceObservation, Promotion, ShoppingPurchase):
            model.objects.filter(branch=source).update(branch=target)
        FavoriteMarket.objects.filter(branch=source, user__in=FavoriteMarket.objects.filter(branch=target).values("user")).delete()
        FavoriteMarket.objects.filter(branch=source).update(branch=target)
        source.is_active = False
        source.save(update_fields=["is_active", "updated_at"])
        AdministrativeAudit.objects.create(administrator=request.user, action="merge_market", target_type="market", target_id=source.public_id, details={"target_id": str(target.public_id)})
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="products/merge")
    def merge_products(self, request):
        source = get_object_or_404(Product, public_id=request.data.get("source_id"))
        target = get_object_or_404(Product, public_id=request.data.get("target_id"))
        if source == target:
            raise ValidationError("Os produtos devem ser diferentes.")
        for model in (PriceObservation, Promotion):
            model.objects.filter(product=source).update(product=target)
        source.is_active = False
        source.save(update_fields=["is_active", "updated_at"])
        AdministrativeAudit.objects.create(administrator=request.user, action="merge_product", target_type="product", target_id=source.public_id, details={"target_id": str(target.public_id)})
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path=r"contributions/(?P<contribution_id>[^/.]+)/invalidate")
    def invalidate_contribution(self, request, contribution_id=None):
        contribution = PriceObservation.objects.filter(public_id=contribution_id).first() or Promotion.objects.filter(public_id=contribution_id).first()
        if contribution is None:
            raise ValidationError("Contribuição não encontrada.")
        contribution.is_valid = False
        contribution.save(update_fields=["is_valid", "updated_at"])
        AdministrativeAudit.objects.create(administrator=request.user, action="invalidate_contribution", target_type=contribution._meta.model_name, target_id=contribution.public_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ListInviteViewSet(WriteViewSetBase):
    queryset = ListInvite.objects.select_related("shopping_list")
    serializer_class = ListInviteSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "public_id"
    http_method_names = ["delete", "head", "options"]

    def get_queryset(self):
        return self.queryset.filter(
            shopping_list__memberships__user=self.request.user,
            shopping_list__memberships__role=ListMembership.Role.OWNER,
        )

    def perform_destroy(self, instance):
        if instance.accepted_at is not None:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Convites aceitos não podem ser cancelados.")
        instance.delete()


class ListInviteAcceptViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def accept(self, request, token=None):
        invite = get_object_or_404(ListInvite.objects.select_related("shopping_list"), token=token)
        membership = accept_invite(invite, request.user)
        return Response(ListMemberSerializer(membership).data)
