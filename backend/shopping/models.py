import secrets

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from core.models import BaseModel


class ShoppingList(BaseModel):
    name = models.CharField(max_length=120)
    archived_at = models.DateTimeField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return self.name


class ListItem(BaseModel):
    shopping_list = models.ForeignKey(
        ShoppingList, on_delete=models.CASCADE, related_name="items"
    )
    name = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(max_length=16)
    is_checked = models.BooleanField(default=False)
    checked_at = models.DateTimeField(null=True, blank=True)
    purchased_quantity = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0), name="shopping_item_quantity_positive"
            )
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs):
        if self.is_checked and self.checked_at is None:
            self.checked_at = timezone.now()
        elif not self.is_checked:
            self.checked_at = None
        super().save(*args, **kwargs)


class Store(BaseModel):
    name = models.CharField(max_length=160)
    address = models.CharField(max_length=300, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stores"
    )

    class Meta:
        ordering = ["name"]
        verbose_name = "Mercado salvo"
        verbose_name_plural = "Mercados salvos"

    def __str__(self) -> str:
        return self.name


class StoreItem(BaseModel):
    list_item = models.ForeignKey(
        ListItem, on_delete=models.CASCADE, related_name="store_items"
    )
    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="store_items")
    current_unit_price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    price_updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["list_item", "store"], name="shopping_list_item_store_unique"
            ),
            models.CheckConstraint(
                condition=Q(current_unit_price__gte=0) | Q(current_unit_price__isnull=True),
                name="shopping_store_item_price_nonnegative",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.list_item} — {self.store}"


class Purchase(BaseModel):
    store_item = models.ForeignKey(
        StoreItem, on_delete=models.CASCADE, related_name="purchases"
    )
    purchased_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="purchases"
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=13, decimal_places=5)
    purchased_at = models.DateTimeField(default=timezone.now)
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="voided_purchases",
    )
    void_reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-purchased_at"]
        verbose_name = "Compra de item"
        verbose_name_plural = "Compras de itens"
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__gt=0), name="shopping_purchase_quantity_positive"
            ),
            models.CheckConstraint(
                condition=Q(unit_price__gte=0), name="shopping_purchase_unit_price_nonnegative"
            ),
            models.CheckConstraint(
                condition=Q(total_price__gte=0), name="shopping_purchase_total_price_nonnegative"
            ),
        ]

    def __str__(self) -> str:
        return f"{self.store_item} — {self.total_price}"

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class PurchaseChange(BaseModel):
    class Kind(models.TextChoices):
        CREATED = "created", "Created"
        CORRECTED = "corrected", "Corrected"
        VOIDED = "voided", "Voided"

    purchase = models.ForeignKey(Purchase, on_delete=models.PROTECT, related_name="changes")
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="purchase_changes",
    )
    kind = models.CharField(max_length=12, choices=Kind.choices)
    before = models.JSONField(default=dict, blank=True)
    after = models.JSONField(default=dict, blank=True)
    reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-created_at"]


class MarketNetwork(BaseModel):
    name = models.CharField(max_length=160)
    normalized_name = models.CharField(max_length=160, unique=True, editable=False)
    tax_id = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.normalized_name = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class MarketBranch(BaseModel):
    network = models.ForeignKey(MarketNetwork, on_delete=models.PROTECT, related_name="branches")
    name = models.CharField(max_length=160)
    address = models.CharField(max_length=300)
    normalized_address = models.CharField(max_length=300, editable=False)
    external_place_id = models.CharField(max_length=255, blank=True, unique=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Unidade cadastrada"
        verbose_name_plural = "Unidades cadastradas"
        constraints = [
            models.UniqueConstraint(
                fields=["network", "normalized_address"], name="market_branch_address_unique"
            )
        ]

    def save(self, *args, **kwargs):
        self.normalized_address = slugify(self.address)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.network} — {self.name}"


class FavoriteMarket(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorite_markets")
    branch = models.ForeignKey(MarketBranch, on_delete=models.CASCADE, related_name="favorited_by")

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "branch"], name="favorite_market_unique")]


class Product(BaseModel):
    gtin = models.CharField(max_length=32, blank=True, unique=True, null=True)
    name = models.CharField(max_length=200)
    normalized_name = models.CharField(max_length=200, editable=False)
    brand = models.CharField(max_length=120, blank=True)
    variant = models.CharField(max_length=120, blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=16, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["normalized_name", "brand", "variant", "quantity", "unit"],
                name="product_fingerprint_unique",
            )
        ]

    def save(self, *args, **kwargs):
        self.normalized_name = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductAlias(BaseModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="aliases")
    alias = models.CharField(max_length=200)
    normalized_alias = models.CharField(max_length=200, editable=False)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["product", "normalized_alias"], name="product_alias_unique")]

    def save(self, *args, **kwargs):
        self.normalized_alias = slugify(self.alias)
        super().save(*args, **kwargs)


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

    def __str__(self):
        return f"{self.product} — {self.amount}"


class Promotion(BaseModel):
    network = models.ForeignKey(MarketNetwork, on_delete=models.PROTECT, null=True, blank=True, related_name="promotions")
    branch = models.ForeignKey(MarketBranch, on_delete=models.PROTECT, null=True, blank=True, related_name="promotions")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True, related_name="promotions")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="promotions")
    regular_price = models.DecimalField(max_digits=10, decimal_places=2)
    promotional_price = models.DecimalField(max_digits=10, decimal_places=2)
    starts_on = models.DateField()
    ends_on = models.DateField()
    is_valid = models.BooleanField(default=True)

    class Meta:
        ordering = ["ends_on", "-created_at"]
        constraints = [
            models.CheckConstraint(condition=Q(ends_on__gte=models.F("starts_on")), name="promotion_dates_valid"),
            models.CheckConstraint(condition=Q(promotional_price__lt=models.F("regular_price")), name="promotion_price_lower"),
            models.CheckConstraint(condition=Q(network__isnull=False) | Q(branch__isnull=False), name="promotion_scope_required"),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.branch_id and self.network_id and self.branch.network_id != self.network_id:
            raise ValidationError("A unidade não pertence à rede informada.")


class ShoppingPurchase(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shopping_purchases")
    branch = models.ForeignKey(MarketBranch, on_delete=models.PROTECT, related_name="shopping_purchases")
    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.PROTECT, related_name="shopping_purchases")
    purchased_on = models.DateField(default=timezone.localdate)
    total_amount = models.DecimalField(max_digits=13, decimal_places=2, default=0)
    client_operation_id = models.UUIDField()

    class Meta:
        ordering = ["-purchased_on", "-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "client_operation_id"], name="shopping_purchase_operation_unique")]
        indexes = [models.Index(fields=["user", "branch", "purchased_on"])]


class ShoppingPurchaseItem(BaseModel):
    purchase = models.ForeignKey(ShoppingPurchase, on_delete=models.CASCADE, related_name="items")
    list_item = models.ForeignKey(ListItem, on_delete=models.PROTECT, related_name="purchase_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    description = models.CharField(max_length=200)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=13, decimal_places=2)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="purchase_item_quantity_positive"),
            models.CheckConstraint(condition=Q(unit_price__gte=0), name="purchase_item_unit_price_nonnegative"),
        ]

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)


class SyncOperation(BaseModel):
    class Status(models.TextChoices):
        CONFIRMED = "confirmed", "Confirmed"
        CONFLICT = "conflict", "Conflict"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sync_operations")
    device_id = models.UUIDField()
    client_operation_id = models.UUIDField()
    entity_type = models.CharField(max_length=64)
    operation_type = models.CharField(max_length=16)
    payload_hash = models.CharField(max_length=64)
    base_version = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.CONFIRMED)
    received_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "client_operation_id"], name="sync_operation_user_unique")]
        indexes = [models.Index(fields=["user", "device_id", "received_at"])]


class ShareLink(BaseModel):
    class ResourceType(models.TextChoices):
        PRODUCT = "product", "Product"
        PRICE = "price", "Price"
        PROMOTION = "promotion", "Promotion"
        MARKET = "market", "Market"
        LOCATION = "location", "Location"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="share_links")
    resource_type = models.CharField(max_length=16, choices=ResourceType.choices)
    resource_id = models.UUIDField(null=True, blank=True)
    location = models.JSONField(default=dict, blank=True)
    token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_at > timezone.now()


class Report(BaseModel):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    target_type = models.CharField(max_length=32)
    target_id = models.UUIDField()
    reason = models.TextField(max_length=1000)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="resolved_reports")
    resolved_at = models.DateTimeField(null=True, blank=True)


class AdministrativeAudit(BaseModel):
    administrator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="administrative_audits")
    action = models.CharField(max_length=64)
    target_type = models.CharField(max_length=32)
    target_id = models.UUIDField()
    details = models.JSONField(default=dict, blank=True)


class ListMembership(BaseModel):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MEMBER = "member", "Member"

    shopping_list = models.ForeignKey(
        ShoppingList, on_delete=models.CASCADE, related_name="memberships"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="list_memberships"
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["shopping_list", "user"], name="shopping_list_user_unique"
            ),
            models.UniqueConstraint(
                fields=["shopping_list"],
                condition=Q(role="owner"),
                name="shopping_list_one_owner",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.shopping_list} — {self.user}"


class ListOwnershipChange(BaseModel):
    shopping_list = models.ForeignKey(
        ShoppingList,
        on_delete=models.CASCADE,
        related_name="ownership_changes",
    )
    previous_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="transferred_list_ownerships",
    )
    new_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="received_list_ownerships",
    )

    class Meta:
        ordering = ["-created_at"]


class ListInvite(BaseModel):
    shopping_list = models.ForeignKey(
        ShoppingList, on_delete=models.CASCADE, related_name="invites"
    )
    invited_email = models.EmailField(blank=True, null=True)
    token = models.CharField(max_length=64, unique=True, default=secrets.token_urlsafe)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_list_invites"
    )
    expires_at = models.DateTimeField()
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=["token"])]

    @property
    def is_pending(self) -> bool:
        return self.accepted_at is None and self.expires_at > timezone.now()

    def accepts_email(self, email: str) -> bool:
        return not self.invited_email or self.invited_email.casefold() == email.casefold()
