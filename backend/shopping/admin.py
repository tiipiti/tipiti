from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline

from config.admin_site import site

from .models import ListItem, ShoppingList


class ListItemInline(TabularInline):
    model = ListItem
    fields = ("name", "quantity", "price", "completed")
    extra = 1


@admin.register(ShoppingList, site=site)
class ShoppingListAdmin(ModelAdmin):
    list_display = ("name", "owner", "updated_at")
    search_fields = ("name", "owner__username", "owner__email")
    inlines = (ListItemInline,)
