import uuid
from decimal import Decimal

from django import forms
from django.contrib import admin, messages
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.forms.models import BaseInlineFormSet
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone
from rest_framework.exceptions import APIException
from unfold.admin import ModelAdmin, TabularInline

from config.admin_site import site as admin_site

from .models import (
    AdministrativeAudit,
    FavoriteMarket,
    ListInvite,
    ListItem,
    ListMembership,
    ListOwnershipChange,
    MarketBranch,
    MarketNetwork,
    PriceObservation,
    Product,
    ProductAlias,
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
    SyncOperation,
)
from .services import correct_purchase, transfer_ownership, void_purchase

UNIT_CHOICES = (
    ("un", "Unidade"),
    ("kg", "Quilograma"),
    ("g", "Grama"),
    ("L", "Litro"),
    ("ml", "Mililitro"),
)


class UnitChoicesAdminMixin:
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if db_field.name == "unit":
            return forms.ChoiceField(
                choices=UNIT_CHOICES,
                required=not db_field.blank,
                label=db_field.verbose_name.capitalize(),
            )
        return super().formfield_for_dbfield(db_field, request, **kwargs)


class OwnershipTransferForm(forms.Form):
    member = forms.ModelChoiceField(
        queryset=ListMembership.objects.none(), label="Novo dono"
    )

    def __init__(self, *args, shopping_list, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["member"].queryset = shopping_list.memberships.select_related(
            "user"
        ).exclude(role=ListMembership.Role.OWNER)


class ListMembershipInlineFormSet(BaseInlineFormSet):
    def save_new(self, form, commit=True):
        membership = super().save_new(form, commit=False)
        membership.role = ListMembership.Role.MEMBER
        if commit:
            membership.save()
            form.save_m2m()
        return membership


class ShoppingPurchaseItemInlineFormSet(BaseInlineFormSet):
    def clean(self):
        super().clean()
        quantities = {}
        for form in self.forms:
            if not form.cleaned_data or form.cleaned_data.get("DELETE"):
                continue
            list_item = form.cleaned_data.get("list_item")
            quantity = form.cleaned_data.get("quantity")
            if list_item is None or quantity is None:
                continue
            if list_item.shopping_list_id != self.instance.shopping_list_id:
                raise DjangoValidationError(
                    "Cada item precisa pertencer à lista selecionada."
                )
            quantities[list_item.pk] = (
                quantities.get(list_item.pk, Decimal("0")) + quantity
            )
            if (
                quantities[list_item.pk] + list_item.purchased_quantity
                > list_item.quantity
            ):
                raise DjangoValidationError(
                    f"A quantidade de {list_item.name} é maior que a pendente na lista."
                )


class ShoppingPurchaseItemInline(TabularInline):
    model = ShoppingPurchaseItem
    formset = ShoppingPurchaseItemInlineFormSet
    extra = 1
    min_num = 1
    validate_min = True
    autocomplete_fields = ("list_item", "product")
    fields = (
        "list_item",
        "product",
        "description",
        "quantity",
        "unit_price",
        "total_price",
    )
    readonly_fields = ("total_price",)

    def get_extra(self, request, obj=None, **kwargs):
        return 0 if obj else 1

    def get_readonly_fields(self, request, obj=None):
        return self.fields if obj else self.readonly_fields

    def has_add_permission(self, request, obj=None):
        return obj is None

    def has_delete_permission(self, request, obj=None):
        return obj is None


class PurchaseChangeInline(TabularInline):
    model = PurchaseChange
    extra = 0
    can_delete = False
    fields = ("kind", "changed_by", "before", "after", "reason", "created_at")
    readonly_fields = fields
    ordering = ("-created_at",)

    def has_add_permission(self, request, obj=None):
        return False


class PurchaseCorrectionForm(forms.Form):
    quantity = forms.DecimalField(
        min_value=Decimal("0.001"), decimal_places=3, max_digits=10
    )
    unit_price = forms.DecimalField(
        min_value=Decimal("0"), decimal_places=2, max_digits=10
    )
    purchased_at = forms.SplitDateTimeField(required=False)


class PurchaseVoidForm(forms.Form):
    reason = forms.CharField(
        max_length=500, required=False, widget=forms.Textarea(attrs={"rows": 3})
    )


class ListMembershipInline(TabularInline):
    model = ListMembership
    formset = ListMembershipInlineFormSet
    extra = 0
    autocomplete_fields = ("user",)
    readonly_fields = ("public_id", "role", "joined_at", "created_at", "updated_at")


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
    change_form_template = "admin/shopping/shoppinglist/change_form.html"
    fieldsets = (
        ("Lista", {"fields": ("name",)}),
        ("Estado", {"fields": ("archived_at",)}),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": ("public_id", "created_at", "updated_at"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if not change:
            ListMembership.objects.create(
                shopping_list=obj,
                user=request.user,
                role=ListMembership.Role.OWNER,
            )

    @admin.action(description="Arquivar listas selecionadas")
    def archive(self, request, queryset):
        queryset.update(archived_at=timezone.now())

    @admin.action(description="Restaurar listas selecionadas")
    def restore(self, request, queryset):
        queryset.update(archived_at=None)

    def get_urls(self):
        opts = self.model._meta
        return [
            path(
                "<path:object_id>/transfer-ownership/",
                self.admin_site.admin_view(self.transfer_ownership_view),
                name=f"{opts.app_label}_{opts.model_name}_transfer_ownership",
            ),
        ] + super().get_urls()

    def change_view(self, request, object_id, form_url="", extra_context=None):
        shopping_list = self.get_object(request, object_id)
        if shopping_list is not None:
            extra_context = {
                **(extra_context or {}),
                "transfer_ownership_url": reverse(
                    f"{self.admin_site.name}:shopping_shoppinglist_transfer_ownership",
                    args=(shopping_list.pk,),
                ),
            }
        return super().change_view(request, object_id, form_url, extra_context)

    def transfer_ownership_view(self, request, object_id):
        shopping_list = get_object_or_404(self.get_queryset(request), pk=object_id)
        if request.method == "POST":
            form = OwnershipTransferForm(request.POST, shopping_list=shopping_list)
            if form.is_valid():
                try:
                    transfer_ownership(
                        request.user,
                        shopping_list,
                        form.cleaned_data["member"].public_id,
                    )
                except APIException as error:
                    form.add_error(None, error.detail)
                else:
                    messages.success(
                        request, "Posse transferida e registrada no histórico."
                    )
                    return redirect(self._change_url(shopping_list))
        else:
            form = OwnershipTransferForm(shopping_list=shopping_list)
        return TemplateResponse(
            request,
            "admin/shopping/shoppinglist/transfer_ownership.html",
            {
                **self.admin_site.each_context(request),
                "opts": self.model._meta,
                "original": shopping_list,
                "form": form,
                "title": "Transferir posse da lista",
            },
        )

    def _change_url(self, shopping_list):
        return reverse(
            f"{self.admin_site.name}:shopping_shoppinglist_change",
            args=(shopping_list.pk,),
        )


@admin.register(ListMembership, site=admin_site)
class ListMembershipAdmin(ModelAdmin):
    list_display = ("shopping_list", "user", "role", "joined_at")
    list_filter = ("role",)
    search_fields = ("shopping_list__name", "user__username", "user__email")
    autocomplete_fields = ("shopping_list", "user")
    readonly_fields = ("public_id", "role", "joined_at", "created_at", "updated_at")
    list_select_related = ("shopping_list", "user")

    def has_delete_permission(self, request, obj=None):
        return obj is None or obj.role != ListMembership.Role.OWNER

    def save_model(self, request, obj, form, change):
        if not change:
            obj.role = ListMembership.Role.MEMBER
        super().save_model(request, obj, form, change)


@admin.register(ListInvite, site=admin_site)
class ListInviteAdmin(ModelAdmin):
    list_display = (
        "shopping_list",
        "invited_email",
        "expires_at",
        "accepted_at",
        "created_by",
    )
    list_filter = ("accepted_at", "expires_at")
    search_fields = ("shopping_list__name", "invited_email", "token")
    autocomplete_fields = ("shopping_list", "created_by")
    readonly_fields = ("public_id", "token", "created_at", "updated_at")
    list_select_related = ("shopping_list", "created_by")

    def has_delete_permission(self, request, obj=None):
        return obj is None or obj.accepted_at is None


@admin.register(ListItem, site=admin_site)
class ListItemAdmin(UnitChoicesAdminMixin, ModelAdmin):
    list_display = (
        "name",
        "shopping_list",
        "quantity",
        "unit",
        "is_checked",
        "checked_at",
    )
    list_filter = ("is_checked", "unit")
    search_fields = ("name", "shopping_list__name")
    autocomplete_fields = ("shopping_list",)
    readonly_fields = (
        "public_id",
        "checked_at",
        "purchased_quantity",
        "created_at",
        "updated_at",
    )
    list_select_related = ("shopping_list",)


@admin.register(Store, site=admin_site)
class StoreAdmin(ModelAdmin):
    list_display = ("name", "address", "created_by", "created_at")
    search_fields = ("name", "address", "created_by__username", "created_by__email")
    readonly_fields = ("public_id", "created_by", "created_at", "updated_at")
    list_select_related = ("created_by",)
    fieldsets = (
        (
            "Mercado salvo",
            {
                "description": "Opção pessoal usada no histórico de compras por item.",
                "fields": ("name", "address"),
            },
        ),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": ("created_by", "public_id", "created_at", "updated_at"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


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
    list_select_related = ("network",)
    fieldsets = (
        (
            "Unidade cadastrada",
            {
                "description": "Unidade canônica usada em preços, promoções e compras finalizadas.",
                "fields": (
                    "network",
                    "name",
                    "address",
                    "external_place_id",
                    "is_active",
                ),
            },
        ),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": (
                    "public_id",
                    "normalized_address",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

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
    search_fields = (
        "user__username",
        "user__email",
        "branch__name",
        "branch__network__name",
    )
    autocomplete_fields = ("user", "branch")
    readonly_fields = ("public_id", "created_at", "updated_at")
    list_select_related = ("user", "branch__network")


@admin.register(Product, site=admin_site)
class ProductAdmin(UnitChoicesAdminMixin, ModelAdmin):
    list_display = ("name", "brand", "variant", "quantity", "unit", "is_active")
    search_fields = ("name", "brand", "gtin")
    list_filter = ("is_active", "unit")
    readonly_fields = ("public_id", "normalized_name", "created_at", "updated_at")
    actions = ("activate", "deactivate")
    fieldsets = (
        ("Produto", {"fields": ("name", "brand", "variant", "gtin")}),
        ("Embalagem", {"fields": ("quantity", "unit")}),
        ("Disponibilidade", {"fields": ("is_active",)}),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": ("public_id", "normalized_name", "created_at", "updated_at"),
            },
        ),
    )

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
    list_select_related = ("product",)


@admin.register(PriceObservation, site=admin_site)
class PriceObservationAdmin(ModelAdmin):
    list_display = ("product", "branch", "amount", "observed_on", "is_valid")
    list_filter = ("is_valid", "observed_on")
    search_fields = ("product__name", "branch__name")
    autocomplete_fields = ("product", "branch")
    readonly_fields = ("created_by", "public_id", "created_at", "updated_at")
    actions = ("validate_prices", "invalidate_prices")
    list_select_related = ("product", "branch")
    fieldsets = (
        ("Preço observado", {"fields": ("product", "branch", "amount", "observed_on")}),
        ("Validação", {"fields": ("is_valid",)}),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": ("created_by", "public_id", "created_at", "updated_at"),
            },
        ),
    )

    @admin.action(description="Validar preços selecionados")
    def validate_prices(self, request, queryset):
        queryset.update(is_valid=True)

    @admin.action(description="Invalidar preços selecionados")
    def invalidate_prices(self, request, queryset):
        queryset.update(is_valid=False)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(Promotion, site=admin_site)
class PromotionAdmin(ModelAdmin):
    list_display = (
        "product",
        "network",
        "branch",
        "promotional_price",
        "ends_on",
        "is_valid",
    )
    list_filter = ("is_valid", "starts_on", "ends_on", "network")
    search_fields = ("product__name", "network__name", "branch__name")
    autocomplete_fields = ("product", "network", "branch")
    readonly_fields = ("created_by", "public_id", "created_at", "updated_at")
    actions = ("validate_promotions", "invalidate_promotions")
    list_select_related = ("product", "network", "branch")
    fieldsets = (
        (
            "Promoção",
            {
                "description": "Informe uma rede ou uma unidade. Se informar as duas, a unidade deve pertencer à rede.",
                "fields": (
                    "product",
                    "network",
                    "branch",
                    "regular_price",
                    "promotional_price",
                ),
            },
        ),
        ("Vigência e validação", {"fields": ("starts_on", "ends_on", "is_valid")}),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": ("created_by", "public_id", "created_at", "updated_at"),
            },
        ),
    )

    @admin.action(description="Validar promoções selecionadas")
    def validate_promotions(self, request, queryset):
        queryset.update(is_valid=True)

    @admin.action(description="Invalidar promoções selecionadas")
    def invalidate_promotions(self, request, queryset):
        queryset.update(is_valid=False)

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(ShoppingPurchase, site=admin_site)
class ShoppingPurchaseAdmin(ModelAdmin):
    list_display = ("user", "branch", "purchased_on", "total_amount")
    list_filter = ("purchased_on", "branch", "shopping_list")
    search_fields = (
        "user__username",
        "user__email",
        "branch__name",
        "shopping_list__name",
    )
    autocomplete_fields = ("branch", "shopping_list")
    exclude = ("user", "client_operation_id")
    readonly_fields = ("public_id", "total_amount", "created_at", "updated_at")
    list_select_related = ("user", "branch", "shopping_list")
    inlines = (ShoppingPurchaseItemInline,)
    fieldsets = (
        (
            "Registrar compra",
            {
                "description": "Inclua ao menos um item. O total é calculado ao salvar.",
                "fields": ("shopping_list", "branch", "purchased_on"),
            },
        ),
        ("Resumo", {"fields": ("total_amount",)}),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": ("public_id", "created_at", "updated_at"),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.user = request.user
            obj.client_operation_id = uuid.uuid4()
        super().save_model(request, obj, form, change)

    @transaction.atomic
    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        if change:
            return
        purchase = form.instance
        total = Decimal("0")
        for item in purchase.items.select_related("list_item"):
            total += item.total_price
            list_item = item.list_item
            list_item.purchased_quantity += item.quantity
            list_item.is_checked = list_item.purchased_quantity >= list_item.quantity
            list_item.save(
                update_fields=(
                    "purchased_quantity",
                    "is_checked",
                    "checked_at",
                    "updated_at",
                )
            )
        purchase.total_amount = total
        purchase.save(update_fields=("total_amount", "updated_at"))

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ShoppingPurchaseItem, site=admin_site)
class ShoppingPurchaseItemAdmin(ModelAdmin):
    list_display = ("purchase", "description", "quantity", "unit_price", "total_price")
    search_fields = (
        "description",
        "purchase__user__username",
        "purchase__user__email",
        "product__name",
    )
    list_filter = ("product",)
    autocomplete_fields = ("purchase", "list_item", "product")
    readonly_fields = ("public_id", "total_price", "created_at", "updated_at")
    list_select_related = ("purchase",)


@admin.register(SyncOperation, site=admin_site)
class SyncOperationAdmin(ModelAdmin):
    list_display = ("user", "entity_type", "operation_type", "status", "received_at")
    list_filter = ("status", "entity_type", "operation_type")
    search_fields = (
        "user__username",
        "user__email",
        "device_id",
        "client_operation_id",
        "payload_hash",
    )
    readonly_fields = (
        "public_id",
        "user",
        "device_id",
        "client_operation_id",
        "payload_hash",
        "received_at",
        "created_at",
        "updated_at",
    )
    list_select_related = ("user",)

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
    list_select_related = ("user",)

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
    list_select_related = ("reporter", "resolved_by")

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
    readonly_fields = (
        "public_id",
        "administrator",
        "action",
        "target_type",
        "target_id",
        "details",
        "created_at",
        "updated_at",
    )
    list_select_related = ("administrator",)

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
    list_select_related = ("list_item", "store")


@admin.register(Purchase, site=admin_site)
class PurchaseAdmin(ModelAdmin):
    list_display = (
        "store_item",
        "purchased_by",
        "quantity",
        "unit_price",
        "total_price",
        "purchased_at",
    )
    list_filter = ("purchased_at", "purchased_by")
    search_fields = (
        "store_item__list_item__name",
        "purchased_by__username",
        "purchased_by__email",
    )
    autocomplete_fields = ("store_item",)
    readonly_fields = (
        "public_id",
        "purchased_by",
        "total_price",
        "voided_at",
        "voided_by",
        "void_reason",
        "created_at",
        "updated_at",
    )
    list_select_related = (
        "store_item__list_item",
        "store_item__store",
        "purchased_by",
        "voided_by",
    )
    inlines = (PurchaseChangeInline,)
    change_form_template = "admin/shopping/purchase/change_form.html"
    fieldsets = (
        (
            "Compra de item",
            {
                "fields": (
                    "store_item",
                    "quantity",
                    "unit_price",
                    "purchased_at",
                    "total_price",
                )
            },
        ),
        ("Estorno", {"fields": ("voided_at", "voided_by", "void_reason")}),
        (
            "Sistema",
            {
                "classes": ("collapse",),
                "fields": ("purchased_by", "public_id", "created_at", "updated_at"),
            },
        ),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + (
                "store_item",
                "quantity",
                "unit_price",
                "purchased_at",
            )
        return self.readonly_fields

    def save_model(self, request, obj, form, change):
        if not change:
            obj.purchased_by = request.user
        super().save_model(request, obj, form, change)

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        if not change:
            PurchaseChange.objects.create(
                purchase=form.instance,
                changed_by=request.user,
                kind=PurchaseChange.Kind.CREATED,
                after={
                    "quantity": str(form.instance.quantity),
                    "unit_price": str(form.instance.unit_price),
                    "total_price": str(form.instance.total_price),
                    "purchased_at": form.instance.purchased_at.isoformat(),
                    "voided_at": None,
                },
            )

    def has_delete_permission(self, request, obj=None):
        return False

    def get_urls(self):
        opts = self.model._meta
        return [
            path(
                "<path:object_id>/correct/",
                self.admin_site.admin_view(self.correct_view),
                name=f"{opts.app_label}_{opts.model_name}_correct",
            ),
            path(
                "<path:object_id>/void/",
                self.admin_site.admin_view(self.void_view),
                name=f"{opts.app_label}_{opts.model_name}_void",
            ),
        ] + super().get_urls()

    def change_view(self, request, object_id, form_url="", extra_context=None):
        purchase = self.get_object(request, object_id)
        if purchase is not None:
            extra_context = {
                **(extra_context or {}),
                "purchase_correct_url": reverse(
                    f"{self.admin_site.name}:shopping_purchase_correct",
                    args=(purchase.pk,),
                ),
                "purchase_void_url": reverse(
                    f"{self.admin_site.name}:shopping_purchase_void",
                    args=(purchase.pk,),
                ),
            }
        return super().change_view(request, object_id, form_url, extra_context)

    def correct_view(self, request, object_id):
        purchase = get_object_or_404(self.get_queryset(request), pk=object_id)
        if request.method == "POST":
            form = PurchaseCorrectionForm(request.POST)
            if form.is_valid():
                changes = {
                    field: value
                    for field, value in form.cleaned_data.items()
                    if value is not None
                }
                try:
                    correct_purchase(request.user, purchase, changes)
                except APIException as error:
                    form.add_error(None, error.detail)
                else:
                    messages.success(
                        request, "Compra corrigida e registrada no histórico."
                    )
                    return redirect(self._change_url(purchase))
        else:
            form = PurchaseCorrectionForm(
                initial={
                    "quantity": purchase.quantity,
                    "unit_price": purchase.unit_price,
                    "purchased_at": purchase.purchased_at,
                }
            )
        return TemplateResponse(
            request,
            "admin/shopping/purchase/correct.html",
            {
                **self.admin_site.each_context(request),
                "opts": self.model._meta,
                "original": purchase,
                "form": form,
                "title": "Corrigir compra",
            },
        )

    def void_view(self, request, object_id):
        purchase = get_object_or_404(self.get_queryset(request), pk=object_id)
        if request.method == "POST":
            form = PurchaseVoidForm(request.POST)
            if form.is_valid():
                try:
                    void_purchase(
                        request.user, purchase, reason=form.cleaned_data["reason"]
                    )
                except APIException as error:
                    form.add_error(None, error.detail)
                else:
                    messages.success(
                        request, "Compra estornada e preservada no histórico."
                    )
                    return redirect(self._change_url(purchase))
        else:
            form = PurchaseVoidForm()
        return TemplateResponse(
            request,
            "admin/shopping/purchase/void.html",
            {
                **self.admin_site.each_context(request),
                "opts": self.model._meta,
                "original": purchase,
                "form": form,
                "title": "Estornar compra",
            },
        )

    def _change_url(self, purchase):
        return reverse(
            f"{self.admin_site.name}:shopping_purchase_change", args=(purchase.pk,)
        )


@admin.register(PurchaseChange, site=admin_site)
class PurchaseChangeAdmin(ModelAdmin):
    list_display = ("purchase", "kind", "changed_by", "created_at")
    list_filter = ("kind", "created_at")
    search_fields = ("purchase__store_item__list_item__name", "changed_by__username")
    readonly_fields = (
        "public_id",
        "purchase",
        "changed_by",
        "kind",
        "before",
        "after",
        "reason",
        "created_at",
        "updated_at",
    )
    list_select_related = ("purchase__store_item__list_item", "changed_by")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(ListOwnershipChange, site=admin_site)
class ListOwnershipChangeAdmin(ModelAdmin):
    list_display = ("shopping_list", "previous_owner", "new_owner", "created_at")
    search_fields = (
        "shopping_list__name",
        "previous_owner__username",
        "new_owner__username",
    )
    readonly_fields = (
        "public_id",
        "shopping_list",
        "previous_owner",
        "new_owner",
        "created_at",
        "updated_at",
    )
    list_select_related = ("shopping_list", "previous_owner", "new_owner")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
