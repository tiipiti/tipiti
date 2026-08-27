from django.conf import settings
from django.db import models

from core.models import BaseModel


class ShoppingList(BaseModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shopping_lists")
    name = models.CharField(max_length=120)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class ListItem(BaseModel):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["completed", "created_at"]

    def __str__(self):
        return self.name
