from datetime import timedelta

from django.db.models import DecimalField, F, Sum
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
            PurchaseEvent,
            Report,
            ShoppingList,
            ShoppingPurchase,
            ShoppingPurchaseItem,
        )

        today = timezone.localdate()
        purchases = ShoppingPurchase.objects.filter(purchased_at__date=today)
        total_expression = Sum(
            F("items__quantity") * F("items__unit_price"),
            output_field=DecimalField(max_digits=13, decimal_places=2),
        )
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
        change_url = reverse(f"{self.name}:shopping_purchaseevent_changelist")
        for change in PurchaseEvent.objects.filter(
            kind__in=[PurchaseEvent.Kind.CORRECTED, PurchaseEvent.Kind.VOIDED]
        ).select_related("purchase").order_by("-created_at")[:3]:
            attention_items.append({
                "title": "Compra corrigida" if change.kind == PurchaseEvent.Kind.CORRECTED else "Compra estornada",
                "detail": str(change.purchase.public_id),
                "when": change.created_at.strftime("%d/%m às %H:%M"),
                "url": change_url,
            })
        dashboard = {
            "open_lists": ShoppingList.objects.filter(archived_at__isnull=True).count(),
            "today_purchase_count": purchases.count(),
            "today_total": ShoppingPurchaseItem.objects.filter(
                purchase__in=purchases,
                purchase__voided_at__isnull=True,
            ).aggregate(total=Sum(F("quantity") * F("unit_price"), output_field=DecimalField(max_digits=13, decimal_places=2)))["total"] or 0,
            "open_reports": Report.objects.filter(status=Report.Status.OPEN).count(),
            "recent_purchases": purchases.select_related("user", "branch").annotate(total_amount=total_expression)[:5],
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
