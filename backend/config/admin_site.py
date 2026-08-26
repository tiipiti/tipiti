from datetime import timedelta

from django.db.models import Q, Sum
from django.urls import reverse
from django.utils import timezone
from unfold.sites import UnfoldAdminSite


class TipitiAdminSite(UnfoldAdminSite):
    site_header = "Tipiti Admin"
    site_title = "Tipiti"
    index_title = "Administração"
    index_template = "admin/index.html"

    def index(self, request, extra_context=None):
        from shopping.models import (
            ListInvite,
            PurchaseChange,
            Report,
            ShoppingList,
            ShoppingPurchase,
            StoreItem,
        )

        today = timezone.localdate()
        purchases = ShoppingPurchase.objects.filter(purchased_on=today)
        now = timezone.now()
        attention_items = []
        report_url = reverse(f"{self.name}:shopping_report_changelist")
        for report in Report.objects.filter(status=Report.Status.OPEN).order_by("created_at")[:3]:
            attention_items.append({
                "title": "Denúncia aberta",
                "detail": report.reason,
                "when": report.created_at.strftime("%d/%m às %H:%M"),
                "url": report_url,
            })
        invite_url = reverse(f"{self.name}:shopping_listinvite_changelist")
        for invite in ListInvite.objects.filter(
            accepted_at__isnull=True,
            expires_at__gte=now,
            expires_at__lte=now + timedelta(days=1),
        ).select_related("shopping_list").order_by("expires_at")[:3]:
            attention_items.append({
                "title": "Convite vence em breve",
                "detail": invite.shopping_list.name,
                "when": invite.expires_at.strftime("%d/%m às %H:%M"),
                "url": invite_url,
            })
        store_item_url = reverse(f"{self.name}:shopping_storeitem_changelist")
        for store_item in StoreItem.objects.filter(
            list_item__shopping_list__archived_at__isnull=True,
        ).filter(
            Q(price_updated_at__isnull=True) | Q(price_updated_at__lt=now - timedelta(days=7))
        ).select_related("list_item", "store").order_by("price_updated_at")[:3]:
            attention_items.append({
                "title": "Preço de mercado salvo desatualizado",
                "detail": f"{store_item.list_item} — {store_item.store}",
                "when": "Sem preço" if store_item.price_updated_at is None else store_item.price_updated_at.strftime("%d/%m"),
                "url": store_item_url,
            })
        change_url = reverse(f"{self.name}:shopping_purchasechange_changelist")
        for change in PurchaseChange.objects.filter(
            kind__in=[PurchaseChange.Kind.CORRECTED, PurchaseChange.Kind.VOIDED]
        ).select_related("purchase__store_item__list_item").order_by("-created_at")[:3]:
            attention_items.append({
                "title": "Compra corrigida" if change.kind == PurchaseChange.Kind.CORRECTED else "Compra estornada",
                "detail": change.purchase.store_item.list_item.name,
                "when": change.created_at.strftime("%d/%m às %H:%M"),
                "url": change_url,
            })
        dashboard = {
            "open_lists": ShoppingList.objects.filter(archived_at__isnull=True).count(),
            "today_purchase_count": purchases.count(),
            "today_total": purchases.aggregate(total=Sum("total_amount"))["total"] or 0,
            "open_reports": Report.objects.filter(status=Report.Status.OPEN).count(),
            "recent_purchases": purchases.select_related("user", "branch")[:5],
            "attention_items": attention_items,
            "today_label": today.strftime("%d/%m"),
            "quick_links": (
                (
                    "Listas abertas",
                    "checklist",
                    reverse(f"{self.name}:shopping_shoppinglist_changelist"),
                ),
                (
                    "Compras de hoje",
                    "receipt_long",
                    reverse(f"{self.name}:shopping_shoppingpurchase_changelist"),
                ),
                (
                    "Revisar denúncias",
                    "flag",
                    reverse(f"{self.name}:shopping_report_changelist"),
                ),
            ),
        }
        return super().index(request, {**(extra_context or {}), **dashboard})


site = TipitiAdminSite(name="tipiti_admin")
