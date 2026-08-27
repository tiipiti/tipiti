import secrets
from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from core.models import BaseModel

class ShoppingList(BaseModel):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="owned_shopping_lists")
    name = models.CharField(max_length=120)
    archived_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    class Meta: ordering = ["-updated_at"]
    def __str__(self): return self.name

class ListItem(BaseModel):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey("Product", null=True, blank=True, on_delete=models.PROTECT, related_name="list_items")
    name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=16)
    completed_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)
    class Meta:
        ordering = ["created_at"]
        constraints = [models.CheckConstraint(condition=Q(quantity__gt=0), name="shopping_item_quantity_positive")]
    def __str__(self): return self.name

class MarketNetwork(BaseModel):
    name = models.CharField(max_length=160)
    normalized_name = models.CharField(max_length=160, unique=True, editable=False)
    tax_id = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    def save(self, *args, **kwargs):
        self.normalized_name = slugify(self.name)
        super().save(*args, **kwargs)
    def __str__(self): return self.name

class MarketBranch(BaseModel):
    network = models.ForeignKey(MarketNetwork, on_delete=models.PROTECT, related_name="branches")
    name = models.CharField(max_length=160)
    address = models.CharField(max_length=300)
    normalized_address = models.CharField(max_length=300, editable=False)
    external_place_id = models.CharField(max_length=255, blank=True, unique=True, null=True)
    is_active = models.BooleanField(default=True)
    class Meta: constraints = [models.UniqueConstraint(fields=["network", "normalized_address"], name="market_branch_address_unique")]
    def save(self, *args, **kwargs):
        self.normalized_address = slugify(self.address)
        super().save(*args, **kwargs)
    def __str__(self): return f"{self.network} — {self.name}"

class Product(BaseModel):
    gtin = models.CharField(max_length=32, blank=True, unique=True, null=True)
    name = models.CharField(max_length=200)
    normalized_name = models.CharField(max_length=200, editable=False)
    brand = models.CharField(max_length=120, blank=True)
    variant = models.CharField(max_length=120, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=16, blank=True)
    is_active = models.BooleanField(default=True)
    class Meta: constraints = [models.UniqueConstraint(fields=["normalized_name", "brand", "variant", "quantity", "unit"], name="product_fingerprint_unique", nulls_distinct=False)]
    def save(self, *args, **kwargs):
        self.normalized_name = slugify(self.name)
        super().save(*args, **kwargs)
    def __str__(self): return self.name

class PriceObservation(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="price_observations")
    branch = models.ForeignKey(MarketBranch, on_delete=models.PROTECT, related_name="price_observations")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="price_observations")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    observed_on = models.DateField()
    is_valid = models.BooleanField(default=True)
    class Meta:
        ordering = ["-observed_on", "-created_at"]
        indexes = [models.Index(fields=["product", "branch", "observed_on"])]
        constraints = [models.CheckConstraint(condition=Q(amount__gt=0), name="price_observation_amount_positive")]

class Promotion(BaseModel):
    network = models.ForeignKey(MarketNetwork, null=True, blank=True, on_delete=models.PROTECT, related_name="promotions")
    branch = models.ForeignKey(MarketBranch, null=True, blank=True, on_delete=models.PROTECT, related_name="promotions")
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.PROTECT, related_name="promotions")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="promotions")
    regular_price = models.DecimalField(max_digits=10, decimal_places=2)
    promotional_price = models.DecimalField(max_digits=10, decimal_places=2)
    starts_on = models.DateField(); ends_on = models.DateField(); is_valid = models.BooleanField(default=True)
    class Meta:
        ordering = ["ends_on", "-created_at"]
        constraints = [models.CheckConstraint(condition=Q(ends_on__gte=models.F("starts_on")), name="promotion_dates_valid"), models.CheckConstraint(condition=Q(promotional_price__lt=models.F("regular_price")), name="promotion_price_lower"), models.CheckConstraint(condition=Q(network__isnull=False) | Q(branch__isnull=False), name="promotion_scope_required")]

class ShoppingPurchase(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shopping_purchases")
    branch = models.ForeignKey(MarketBranch, null=True, blank=True, on_delete=models.PROTECT, related_name="shopping_purchases")
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.PROTECT, related_name="shopping_purchases")
    purchased_at = models.DateTimeField(default=timezone.now)
    client_operation_id = models.UUIDField()
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.PROTECT, related_name="voided_shopping_purchases")
    void_reason = models.CharField(max_length=500, blank=True)
    class Meta:
        ordering = ["-purchased_at", "-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "client_operation_id"], name="shopping_purchase_operation_unique")]
        indexes = [models.Index(fields=["user", "branch", "purchased_at"])]

class ShoppingPurchaseItem(BaseModel):
    purchase = models.ForeignKey(ShoppingPurchase, on_delete=models.CASCADE, related_name="items")
    list_item = models.ForeignKey(ListItem, on_delete=models.PROTECT, related_name="purchase_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    description = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=16)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta: constraints = [models.CheckConstraint(condition=Q(quantity__gt=0), name="purchase_item_quantity_positive"), models.CheckConstraint(condition=Q(unit_price__gte=0), name="purchase_item_unit_price_nonnegative")]

class PurchaseEvent(BaseModel):
    class Kind(models.TextChoices):
        CREATED = "created", "Created"
        CORRECTED = "corrected", "Corrected"
        VOIDED = "voided", "Voided"
    purchase = models.ForeignKey(ShoppingPurchase, on_delete=models.PROTECT, related_name="events")
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="purchase_events")
    kind = models.CharField(max_length=12, choices=Kind.choices)
    before = models.JSONField(default=dict, blank=True); after = models.JSONField(default=dict, blank=True); reason = models.CharField(max_length=500, blank=True)
    class Meta: ordering = ["-created_at"]

class SyncOperation(BaseModel):
    class Status(models.TextChoices): CONFIRMED = "confirmed", "Confirmed"; CONFLICT = "conflict", "Conflict"
    class Entity(models.TextChoices): SHOPPING_LIST = "shopping_list", "Shopping list"; LIST_ITEM = "shopping_list_item", "Shopping list item"
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sync_operations")
    device_id = models.UUIDField(); client_operation_id = models.UUIDField()
    entity_type = models.CharField(max_length=64, choices=Entity.choices); operation_type = models.CharField(max_length=16)
    base_version = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.CONFIRMED); received_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "client_operation_id"], name="sync_operation_user_unique")]
        indexes = [models.Index(fields=["user", "device_id", "received_at"])]

class ShareLink(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="share_links")
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.CASCADE)
    price = models.ForeignKey(PriceObservation, null=True, blank=True, on_delete=models.CASCADE)
    promotion = models.ForeignKey(Promotion, null=True, blank=True, on_delete=models.CASCADE)
    market = models.ForeignKey(MarketBranch, null=True, blank=True, on_delete=models.CASCADE)
    location = models.JSONField(null=True, blank=True)
    token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    expires_at = models.DateTimeField(); revoked_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(product__isnull=False, price__isnull=True, promotion__isnull=True, market__isnull=True, location__isnull=True)
                    | Q(product__isnull=True, price__isnull=False, promotion__isnull=True, market__isnull=True, location__isnull=True)
                    | Q(product__isnull=True, price__isnull=True, promotion__isnull=False, market__isnull=True, location__isnull=True)
                    | Q(product__isnull=True, price__isnull=True, promotion__isnull=True, market__isnull=False, location__isnull=True)
                    | Q(product__isnull=True, price__isnull=True, promotion__isnull=True, market__isnull=True, location__isnull=False)
                ),
                name="share_link_one_target",
            )
        ]

class Report(BaseModel):
    class Status(models.TextChoices): OPEN = "open", "Open"; RESOLVED = "resolved", "Resolved"
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    price = models.ForeignKey(PriceObservation, null=True, blank=True, on_delete=models.CASCADE)
    promotion = models.ForeignKey(Promotion, null=True, blank=True, on_delete=models.CASCADE)
    reason = models.TextField(max_length=1000); status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_reports")
    resolved_at = models.DateTimeField(null=True, blank=True)
    class Meta:
        constraints = [models.CheckConstraint(condition=Q(price__isnull=False, promotion__isnull=True) | Q(price__isnull=True, promotion__isnull=False), name="report_one_target")]

class ListMembership(BaseModel):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="list_memberships")
    joined_at = models.DateTimeField(auto_now_add=True)
    class Meta: constraints = [models.UniqueConstraint(fields=["shopping_list", "user"], name="shopping_list_user_unique")]
    def __str__(self): return f"{self.shopping_list} — {self.user}"

class ListOwnershipChange(BaseModel):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name="ownership_changes")
    previous_owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="transferred_list_ownerships")
    new_owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="received_list_ownerships")
    class Meta: ordering = ["-created_at"]

class ListInvite(BaseModel):
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name="invites")
    invited_email = models.EmailField(blank=True, null=True); token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_list_invites")
    expires_at = models.DateTimeField(); accepted_at = models.DateTimeField(null=True, blank=True)
    class Meta: indexes = [models.Index(fields=["token"])]
    def accepts_email(self, email): return not self.invited_email or self.invited_email.casefold() == email.casefold()
