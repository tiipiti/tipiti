from django.db.models import Sum
from django.urls import reverse
from django.utils import timezone
from unfold.sites import UnfoldAdminSite


class TipitiAdminSite(UnfoldAdminSite):
    site_header = "Tipiti Admin"
    site_title = "Tipiti"
    index_title = "Administração"
    index_template = "admin/index.html"

    def index(self, request, extra_context=None):
        from shopping.models import Report, ShoppingList, ShoppingPurchase

        today = timezone.localdate()
        purchases = ShoppingPurchase.objects.filter(purchased_on=today)
        dashboard = {
            "open_lists": ShoppingList.objects.filter(archived_at__isnull=True).count(),
            "today_purchase_count": purchases.count(),
            "today_total": purchases.aggregate(total=Sum("total_amount"))["total"] or 0,
            "open_reports": Report.objects.filter(status=Report.Status.OPEN).count(),
            "recent_purchases": purchases.select_related("user", "branch")[:5],
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
