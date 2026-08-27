from django.contrib import messages
from django.shortcuts import redirect
from django.urls import reverse
from unfold.sites import UnfoldAdminSite


class DisabledAddRedirectMixin:
    def add_view(self, request, form_url="", extra_context=None):
        self.message_user(request, "Este registro é somente para consulta.", messages.INFO)
        return redirect(reverse(f"{self.admin_site.name}:{self.model._meta.app_label}_{self.model._meta.model_name}_changelist"))


class ReadOnlyAdminMixin(DisabledAddRedirectMixin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return request.method in ("GET", "HEAD")

    def has_delete_permission(self, request, obj=None):
        return False


class TipitiAdminSite(UnfoldAdminSite):
    site_header = "Tipiti Admin"
    site_title = "Tipiti"
    index_title = "Administração"


site = TipitiAdminSite(name="tipiti_admin")
