import uuid
from decimal import Decimal

from django import forms
from django.contrib import admin, messages
from django.contrib.auth import get_user_model
from django.db import transaction
from django.forms import formset_factory
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import path, reverse
from django.utils import timezone
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from config.admin_site import site
from .models import ListInvite, ListItem, ListMembership, ListOwnershipChange, MarketBranch, MarketNetwork, PriceObservation, Product, Promotion, PurchaseEvent, Report, ShareLink, ShoppingList, ShoppingPurchase, ShoppingPurchaseItem, SyncOperation
from .services import finalize_purchase, void_purchase


class ListItemInline(TabularInline):
    model = ListItem
    extra = 0
    fields = ("name", "product", "quantity", "unit", "completed_at")
    autocomplete_fields = ("product",)


class ListMembershipInline(TabularInline):
    model = ListMembership
    extra = 0
    fields = ("user", "joined_at")
    readonly_fields = ("user", "joined_at")
    can_delete = False
    verbose_name = "Participante"
    verbose_name_plural = "Participantes"


class PurchaseLineForm(forms.Form):
    selected = forms.BooleanField(required=False, label="Registrar")
    list_item = forms.ModelChoiceField(queryset=ListItem.objects.none(), widget=forms.HiddenInput)
    quantity = forms.DecimalField(max_digits=10, decimal_places=3, min_value=Decimal("0.001"), required=False, label="Quantidade")
    unit_price = forms.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0"), required=False, label="Preço unitário")

    def __init__(self, *args, shopping_list, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["list_item"].queryset = shopping_list.items.all()
        self.item = self.fields["list_item"].queryset.filter(pk=self.initial.get("list_item")).first()

    def clean(self):
        data = super().clean()
        if data.get("selected") and (data.get("quantity") is None or data.get("unit_price") is None):
            raise forms.ValidationError("Informe quantidade e preço para cada item selecionado.")
        return data


class PurchaseRegistrationForm(forms.Form):
    purchased_at = forms.DateTimeField(initial=timezone.now, label="Data e hora")
    branch = forms.ModelChoiceField(queryset=MarketBranch.objects.filter(is_active=True), required=False, label="Mercado")
    purchased_by = forms.ModelChoiceField(queryset=None, label="Comprador")

    def __init__(self, *args, shopping_list, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["purchased_by"].queryset = get_user_model().objects.filter(list_memberships__shopping_list=shopping_list)
        self.fields["purchased_by"].initial = shopping_list.owner_id


PurchaseLineFormSet = formset_factory(PurchaseLineForm, extra=0)


class VoidPurchaseForm(forms.Form):
    reason = forms.CharField(max_length=500, widget=forms.Textarea(attrs={"rows": 3}), label="Motivo do estorno")


@admin.register(ShoppingList, site=site)
class ShoppingListAdmin(ModelAdmin):
    list_display = ("name", "owner", "archived_at", "updated_at")
    list_filter = ("archived_at",)
    search_fields = ("name", "owner__username", "owner__email")
    autocomplete_fields = ("owner",)
    readonly_fields = ("archived_at", "version", "created_at", "updated_at")
    inlines = (ListItemInline, ListMembershipInline)
    change_form_template = "admin/shopping/shoppinglist/change_form.html"
    fieldsets = ((None, {"fields": ("name", "owner")}), ("Estado", {"classes": ("tab",), "fields": ("archived_at", "version", "created_at", "updated_at")}))

    def get_urls(self):
        return [
            path("<path:object_id>/register-purchase/", self.admin_site.admin_view(self.register_purchase), name="shopping_shoppinglist_register_purchase"),
            *super().get_urls(),
        ]

    @transaction.atomic
    def save_model(self, request, obj, form, change):
        previous_owner_id = ShoppingList.objects.filter(pk=obj.pk).values_list("owner_id", flat=True).first() if change else None
        super().save_model(request, obj, form, change)
        ListMembership.objects.get_or_create(shopping_list=obj, user=obj.owner)
        if previous_owner_id and previous_owner_id != obj.owner_id:
            ListOwnershipChange.objects.create(shopping_list=obj, previous_owner_id=previous_owner_id, new_owner=obj.owner)

    def response_change(self, request, obj):
        if "_register_purchase" in request.POST:
            return redirect(reverse("tipiti_admin:shopping_shoppinglist_register_purchase", args=(obj.pk,)))
        return super().response_change(request, obj)

    def register_purchase(self, request, object_id):
        shopping_list = get_object_or_404(self.get_queryset(request), pk=object_id, archived_at__isnull=True)
        initial = [{"list_item": item.pk} for item in shopping_list.items.all()]
        form = PurchaseRegistrationForm(request.POST or None, shopping_list=shopping_list)
        formset = PurchaseLineFormSet(request.POST or None, initial=initial, form_kwargs={"shopping_list": shopping_list})
        if request.method == "POST" and form.is_valid() and formset.is_valid():
            lines = [
                {"list_item_id": line.cleaned_data["list_item"].public_id, "quantity": line.cleaned_data["quantity"], "unit_price": line.cleaned_data["unit_price"]}
                for line in formset if line.cleaned_data.get("selected")
            ]
            if not lines:
                form.add_error(None, "Selecione ao menos um item.")
            else:
                purchase = finalize_purchase(
                    form.cleaned_data["purchased_by"], shopping_list,
                    {"client_operation_id": uuid.uuid4(), "market_id": form.cleaned_data["branch"].public_id if form.cleaned_data["branch"] else None, "purchased_at": form.cleaned_data["purchased_at"], "items": lines},
                )
                self.message_user(request, f"Compra {purchase.public_id} registrada.", messages.SUCCESS)
                return redirect(reverse("tipiti_admin:shopping_shoppingpurchase_change", args=(purchase.pk,)))
        return render(request, "admin/shopping/register_purchase.html", {"title": f"Registrar compra — {shopping_list.name}", "shopping_list": shopping_list, "form": form, "formset": formset, "opts": self.model._meta})


@admin.register(ShoppingPurchase, site=site)
class ShoppingPurchaseAdmin(ModelAdmin):
    list_display = ("shopping_list", "user", "branch", "purchased_at", "voided_at")
    list_filter = ("voided_at", "branch")
    search_fields = ("shopping_list__name", "user__username")
    list_select_related = ("shopping_list", "user", "branch")
    readonly_fields = ("user", "shopping_list", "branch", "purchased_at", "client_operation_id", "voided_at", "voided_by", "void_reason", "created_at", "updated_at")
    change_form_template = "admin/shopping/shoppingpurchase/change_form.html"
    def get_urls(self):
        return [path("<path:object_id>/void/", self.admin_site.admin_view(self.void), name="shopping_shoppingpurchase_void"), *super().get_urls()]
    def void(self, request, object_id):
        purchase = get_object_or_404(self.get_queryset(request), pk=object_id)
        form = VoidPurchaseForm(request.POST or None)
        if request.method == "POST" and form.is_valid():
            void_purchase(request.user, purchase, reason=form.cleaned_data["reason"])
            self.message_user(request, "Compra estornada.", messages.SUCCESS)
            return redirect(reverse("tipiti_admin:shopping_shoppingpurchase_change", args=(purchase.pk,)))
        return render(request, "admin/shopping/void_purchase.html", {"title": "Estornar compra", "purchase": purchase, "form": form, "opts": self.model._meta})
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return request.method in ("GET", "HEAD")
    def has_delete_permission(self, request, obj=None): return False


class ReadOnlyAdmin(ModelAdmin):
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return request.method in ("GET", "HEAD")
    def has_delete_permission(self, request, obj=None): return False


site.register(ShoppingPurchaseItem, ReadOnlyAdmin)
site.register(PurchaseEvent, ReadOnlyAdmin)
site.register(ListOwnershipChange, ReadOnlyAdmin)
site.register(SyncOperation, ReadOnlyAdmin)
site.register(ListMembership, ReadOnlyAdmin)
site.register(ListInvite, ReadOnlyAdmin)
site.register(ShareLink, ReadOnlyAdmin)


@admin.register(Product, site=site)
class ProductAdmin(ModelAdmin):
    list_display = ("name", "brand", "variant", "gtin", "is_active")
    list_filter = ("is_active", "brand")
    search_fields = ("name", "brand", "variant", "gtin")


@admin.register(Report, site=site)
class ReportAdmin(ModelAdmin):
    list_display = ("reason", "status", "reporter", "created_at")
    list_filter = ("status",)
    readonly_fields = ("reporter", "price", "promotion", "reason", "created_at", "updated_at")
    fields = ("reporter", "price", "promotion", "reason", "status", "resolved_by", "resolved_at", "created_at", "updated_at")
    def save_model(self, request, obj, form, change):
        if obj.status == Report.Status.RESOLVED and obj.resolved_at is None:
            obj.resolved_by = request.user
            obj.resolved_at = timezone.now()
        super().save_model(request, obj, form, change)


for model in (MarketNetwork, MarketBranch, PriceObservation, Promotion):
    site.register(model)
