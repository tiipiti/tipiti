from django.contrib import admin
from django.utils import timezone

from config.admin_site import site as admin_site
from unfold.admin import ModelAdmin, TabularInline

from .models import (
    AdministrativeAudit, FavoriteMarket, ListInvite, ListItem, ListMembership, MarketBranch, MarketNetwork,
    PriceObservation, Product, ProductAlias, Promotion, Purchase, Report, ShareLink,
    ShoppingList, ShoppingPurchase, ShoppingPurchaseItem, Store, StoreItem, SyncOperation,
)


class ListMembershipInline(TabularInline):
    model = ListMembership
    extra = 0
    autocomplete_fields = ("user",)
    readonly_fields = ("public_id", "joined_at", "created_at", "updated_at")


class ListItemInline(TabularInline):
    model = ListItem
    extra = 0
    readonly_fields = ("public_id", "checked_at", "created_at", "updated_at")


@admin.register(ShoppingList, site=admin_site)
class ShoppingListAdmin(ModelAdmin):
    list_display = ("name", "archived_at", "created_at", "updated_at")
    search_fields = ("name",)
    list_filter = ("archived_at",)
    readonly_fields = ("public_id", "created_at", "updated_at")
    inlines = (ListMembershipInline, ListItemInline)
    actions = ("archive", "restore")

    def has_add_permission(self, request):
        return False

    @admin.action(description="Arquivar listas selecionadas")
    def archive(self, request, queryset):
        queryset.update(archived_at=timezone.now())

    @admin.action(description="Restaurar listas selecionadas")
    def restore(self, request, queryset):
        queryset.update(archived_at=None)


@admin.register(ListMembership, site=admin_site)
class ListMembershipAdmin(ModelAdmin):
    list_display = ("shopping_list", "user", "role", "joined_at")
    list_filter = ("role",)
    search_fields = ("shopping_list__name", "user__username", "user__email")
    autocomplete_fields = ("shopping_list", "user")
    readonly_fields = ("public_id", "joined_at", "created_at", "updated_at")

    def has_delete_permission(self, request, obj=None):
        return obj is None or obj.role != ListMembership.Role.OWNER


@admin.register(ListInvite, site=admin_site)
class ListInviteAdmin(ModelAdmin):
    list_display = ("shopping_list", "invited_email", "expires_at", "accepted_at", "created_by")
    list_filter = ("accepted_at", "expires_at")
    search_fields = ("shopping_list__name", "invited_email", "token")
    autocomplete_fields = ("shopping_list", "created_by")
    readonly_fields = ("public_id", "token", "created_at", "updated_at")

    def has_delete_permission(self, request, obj=None):
        return obj is None or obj.accepted_at is None


@admin.register(ListItem, site=admin_site)
class ListItemAdmin(ModelAdmin):
    list_display = ("name", "shopping_list", "quantity", "unit", "is_checked", "checked_at")
    list_filter = ("is_checked", "unit")
    search_fields = ("name", "shopping_list__name")
    autocomplete_fields = ("shopping_list",)
    readonly_fields = ("public_id", "checked_at", "created_at", "updated_at")


@admin.register(Store, site=admin_site)
class StoreAdmin(ModelAdmin):
    list_display = ("name", "address", "created_by", "created_at")
    search_fields = ("name", "address", "created_by__username", "created_by__email")
    autocomplete_fields = ("created_by",)
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(MarketNetwork, site=admin_site)
class MarketNetworkAdmin(ModelAdmin):
    list_display = ("name", "tax_id", "is_active")
    search_fields = ("name", "tax_id")
    list_filter = ("is_active",)
    readonly_fields = ("public_id", "normalized_name", "created_at", "updated_at")
    actions = ("activate", "deactivate")

    @admin.action(description="Ativar redes selecionadas")
    def activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Desativar redes selecionadas")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)


@admin.register(MarketBranch, site=admin_site)
class MarketBranchAdmin(ModelAdmin):
    list_display = ("name", "network", "address", "is_active")
    search_fields = ("name", "address", "external_place_id", "network__name")
    list_filter = ("is_active", "network")
    autocomplete_fields = ("network",)
    readonly_fields = ("public_id", "normalized_address", "created_at", "updated_at")
    actions = ("activate", "deactivate")

    @admin.action(description="Ativar unidades selecionadas")
    def activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Desativar unidades selecionadas")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)


@admin.register(FavoriteMarket, site=admin_site)
class FavoriteMarketAdmin(ModelAdmin):
    list_display = ("user", "branch", "created_at")
    list_filter = ("branch__network", "created_at")
    search_fields = ("user__username", "user__email", "branch__name", "branch__network__name")
    autocomplete_fields = ("user", "branch")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(Product, site=admin_site)
class ProductAdmin(ModelAdmin):
    list_display = ("name", "brand", "variant", "quantity", "unit", "is_active")
    search_fields = ("name", "brand", "gtin")
    list_filter = ("is_active", "unit")
    readonly_fields = ("public_id", "normalized_name", "created_at", "updated_at")
    actions = ("activate", "deactivate")

    @admin.action(description="Ativar produtos selecionados")
    def activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Desativar produtos selecionados")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)


@admin.register(ProductAlias, site=admin_site)
class ProductAliasAdmin(ModelAdmin):
    list_display = ("alias", "product")
    search_fields = ("alias", "product__name")
    autocomplete_fields = ("product",)
    readonly_fields = ("public_id", "normalized_alias", "created_at", "updated_at")


@admin.register(PriceObservation, site=admin_site)
class PriceObservationAdmin(ModelAdmin):
    list_display = ("product", "branch", "amount", "observed_on", "is_valid")
    list_filter = ("is_valid", "observed_on")
    search_fields = ("product__name", "branch__name")
    autocomplete_fields = ("product", "branch", "created_by")
    readonly_fields = ("public_id", "created_at", "updated_at")
    actions = ("validate_prices", "invalidate_prices")

    @admin.action(description="Validar preços selecionados")
    def validate_prices(self, request, queryset):
        queryset.update(is_valid=True)

    @admin.action(description="Invalidar preços selecionados")
    def invalidate_prices(self, request, queryset):
        queryset.update(is_valid=False)


@admin.register(Promotion, site=admin_site)
class PromotionAdmin(ModelAdmin):
    list_display = ("product", "network", "branch", "promotional_price", "ends_on", "is_valid")
    list_filter = ("is_valid", "starts_on", "ends_on", "network")
    search_fields = ("product__name", "network__name", "branch__name")
    autocomplete_fields = ("product", "network", "branch", "created_by")
    readonly_fields = ("public_id", "created_at", "updated_at")
    actions = ("validate_promotions", "invalidate_promotions")

    @admin.action(description="Validar promoções selecionadas")
    def validate_promotions(self, request, queryset):
        queryset.update(is_valid=True)

    @admin.action(description="Invalidar promoções selecionadas")
    def invalidate_promotions(self, request, queryset):
        queryset.update(is_valid=False)


@admin.register(ShoppingPurchase, site=admin_site)
class ShoppingPurchaseAdmin(ModelAdmin):
    list_display = ("user", "branch", "purchased_on", "total_amount")
    list_filter = ("purchased_on", "branch", "shopping_list")
    search_fields = ("user__username", "user__email", "branch__name", "shopping_list__name")
    autocomplete_fields = ("user", "branch", "shopping_list")
    readonly_fields = ("public_id", "total_amount", "client_operation_id", "created_at", "updated_at")


@admin.register(ShoppingPurchaseItem, site=admin_site)
class ShoppingPurchaseItemAdmin(ModelAdmin):
    list_display = ("purchase", "description", "quantity", "unit_price", "total_price")
    search_fields = ("description", "purchase__user__username", "purchase__user__email", "product__name")
    list_filter = ("product",)
    autocomplete_fields = ("purchase", "list_item", "product")
    readonly_fields = ("public_id", "total_price", "created_at", "updated_at")


@admin.register(SyncOperation, site=admin_site)
class SyncOperationAdmin(ModelAdmin):
    list_display = ("user", "entity_type", "operation_type", "status", "received_at")
    list_filter = ("status", "entity_type", "operation_type")
    search_fields = ("user__username", "user__email", "device_id", "client_operation_id", "payload_hash")
    readonly_fields = ("public_id", "user", "device_id", "client_operation_id", "payload_hash", "received_at", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False


@admin.register(ShareLink, site=admin_site)
class ShareLinkAdmin(ModelAdmin):
    list_display = ("user", "resource_type", "expires_at", "revoked_at")
    list_filter = ("resource_type", "revoked_at", "expires_at")
    search_fields = ("user__username", "user__email", "token", "resource_id")
    autocomplete_fields = ("user",)
    readonly_fields = ("public_id", "token", "created_at", "updated_at")
    actions = ("revoke_links",)

    @admin.action(description="Revogar links selecionados")
    def revoke_links(self, request, queryset):
        queryset.filter(revoked_at__isnull=True).update(revoked_at=timezone.now())


@admin.register(Report, site=admin_site)
class ReportAdmin(ModelAdmin):
    list_display = ("target_type", "status", "reporter", "resolved_by", "created_at")
    list_filter = ("status", "target_type")
    search_fields = ("reporter__username", "reporter__email", "reason", "target_id")
    autocomplete_fields = ("reporter", "resolved_by")
    readonly_fields = ("public_id", "created_at", "updated_at")
    actions = ("resolve_reports",)

    @admin.action(description="Resolver denúncias selecionadas")
    def resolve_reports(self, request, queryset):
        queryset.filter(status=Report.Status.OPEN).update(
            status=Report.Status.RESOLVED,
            resolved_by=request.user,
            resolved_at=timezone.now(),
        )


@admin.register(AdministrativeAudit, site=admin_site)
class AdministrativeAuditAdmin(ModelAdmin):
    list_display = ("administrator", "action", "target_type", "created_at")
    list_filter = ("action", "target_type")
    search_fields = ("administrator__username", "administrator__email", "target_id")
    readonly_fields = ("public_id", "administrator", "action", "target_type", "target_id", "details", "created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(StoreItem, site=admin_site)
class StoreItemAdmin(ModelAdmin):
    list_display = ("list_item", "store", "current_unit_price", "price_updated_at")
    search_fields = ("list_item__name", "store__name")
    list_filter = ("store",)
    autocomplete_fields = ("list_item", "store")
    readonly_fields = ("public_id", "price_updated_at", "created_at", "updated_at")


@admin.register(Purchase, site=admin_site)
class PurchaseAdmin(ModelAdmin):
    list_display = ("store_item", "purchased_by", "quantity", "unit_price", "total_price", "purchased_at")
    list_filter = ("purchased_at", "purchased_by")
    search_fields = ("store_item__list_item__name", "purchased_by__username", "purchased_by__email")
    autocomplete_fields = ("store_item", "purchased_by")
    readonly_fields = ("public_id", "total_price", "created_at", "updated_at")
