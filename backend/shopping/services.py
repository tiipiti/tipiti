from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from notifications.models import NotificationType
from notifications.service import notify

from .models import (
    ListInvite,
    ListItem,
    ListMembership,
    ListOwnershipChange,
    MarketBranch,
    Product,
    Purchase,
    PurchaseChange,
    ShoppingList,
    ShoppingPurchase,
    ShoppingPurchaseItem,
    SyncOperation,
)

User = get_user_model()


def membership_for(shopping_list: ShoppingList, user) -> ListMembership:
    membership = ListMembership.objects.filter(
        shopping_list=shopping_list, user=user
    ).first()
    if membership is None:
        raise PermissionDenied("Você não participa desta lista.")
    return membership


def owner_for(shopping_list: ShoppingList, user) -> ListMembership:
    membership = membership_for(shopping_list, user)
    if membership.role != ListMembership.Role.OWNER:
        raise PermissionDenied("Somente o dono pode alterar convites e membros.")
    return membership


def ensure_active(shopping_list: ShoppingList) -> None:
    if shopping_list.archived_at is not None:
        raise ValidationError("Esta lista está arquivada.")


def purchase_snapshot(purchase: Purchase) -> dict[str, str | None]:
    return {
        "quantity": str(purchase.quantity),
        "unit_price": str(purchase.unit_price),
        "total_price": str(purchase.total_price),
        "purchased_at": purchase.purchased_at.isoformat(),
        "voided_at": purchase.voided_at.isoformat() if purchase.voided_at else None,
    }


@transaction.atomic
def correct_purchase(user, purchase: Purchase, changes: dict) -> Purchase:
    purchase = (
        Purchase.objects.select_for_update()
        .select_related("store_item__list_item__shopping_list")
        .get(pk=purchase.pk)
    )
    if purchase.purchased_by_id != user.id:
        raise PermissionDenied("Somente quem registrou a compra pode corrigi-la.")
    membership_for(purchase.store_item.list_item.shopping_list, user)
    ensure_active(purchase.store_item.list_item.shopping_list)

    before = purchase_snapshot(purchase)
    for field in ("quantity", "unit_price", "purchased_at"):
        if field in changes:
            setattr(purchase, field, changes[field])
    purchase.save()
    PurchaseChange.objects.create(
        purchase=purchase,
        changed_by=user,
        kind=PurchaseChange.Kind.CORRECTED,
        before=before,
        after=purchase_snapshot(purchase),
    )
    purchase.store_item.current_unit_price = purchase.unit_price
    purchase.store_item.price_updated_at = timezone.now()
    purchase.store_item.save(
        update_fields=["current_unit_price", "price_updated_at", "updated_at"]
    )
    return purchase


@transaction.atomic
def void_purchase(user, purchase: Purchase, *, reason: str = "") -> Purchase:
    purchase = (
        Purchase.objects.select_for_update()
        .select_related("store_item__list_item__shopping_list")
        .get(pk=purchase.pk)
    )
    if purchase.purchased_by_id != user.id:
        raise PermissionDenied("Somente quem registrou a compra pode estorná-la.")
    membership_for(purchase.store_item.list_item.shopping_list, user)
    ensure_active(purchase.store_item.list_item.shopping_list)
    if purchase.voided_at is not None:
        raise ValidationError("Esta compra já foi estornada.")

    before = purchase_snapshot(purchase)
    purchase.voided_at = timezone.now()
    purchase.voided_by = user
    purchase.void_reason = reason
    purchase.save(update_fields=["voided_at", "voided_by", "void_reason", "updated_at"])
    PurchaseChange.objects.create(
        purchase=purchase,
        changed_by=user,
        kind=PurchaseChange.Kind.VOIDED,
        before=before,
        after=purchase_snapshot(purchase),
        reason=reason,
    )
    replacement = (
        Purchase.objects.filter(
            store_item=purchase.store_item,
            voided_at__isnull=True,
        )
        .exclude(pk=purchase.pk)
        .order_by("-purchased_at", "-created_at")
        .first()
    )
    purchase.store_item.current_unit_price = (
        replacement.unit_price if replacement else None
    )
    purchase.store_item.price_updated_at = timezone.now() if replacement else None
    purchase.store_item.save(
        update_fields=["current_unit_price", "price_updated_at", "updated_at"]
    )
    return purchase


@transaction.atomic
def transfer_ownership(
    user, shopping_list: ShoppingList, member_public_id
) -> ListMembership:
    shopping_list = ShoppingList.objects.select_for_update().get(pk=shopping_list.pk)
    memberships = ListMembership.objects.select_for_update().filter(
        shopping_list=shopping_list
    )
    current_owner = memberships.get(role=ListMembership.Role.OWNER)
    if current_owner.user_id != user.id:
        raise PermissionDenied("Somente o dono pode transferir a propriedade.")
    new_owner = memberships.filter(public_id=member_public_id).first()
    if new_owner is None:
        raise ValidationError({"member_id": "Membro da lista não encontrado."})
    if new_owner.pk == current_owner.pk:
        raise ValidationError({"member_id": "Escolha outro membro da lista."})
    ensure_active(shopping_list)

    current_owner.role = ListMembership.Role.MEMBER
    current_owner.save(update_fields=["role", "updated_at"])
    new_owner.role = ListMembership.Role.OWNER
    new_owner.save(update_fields=["role", "updated_at"])
    ListOwnershipChange.objects.create(
        shopping_list=shopping_list,
        previous_owner=current_owner.user,
        new_owner=new_owner.user,
    )
    return new_owner


@transaction.atomic
def create_shopping_list(user, *, name: str) -> ShoppingList:
    shopping_list = ShoppingList.objects.create(name=name)
    ListMembership.objects.create(
        shopping_list=shopping_list, user=user, role=ListMembership.Role.OWNER
    )
    return shopping_list


@transaction.atomic
def create_invite(
    shopping_list: ShoppingList, owner, *, invited_email, expires_at
) -> ListInvite:
    owner_for(shopping_list, owner)
    invite = ListInvite.objects.create(
        shopping_list=shopping_list,
        invited_email=invited_email,
        created_by=owner,
        expires_at=expires_at or timezone.now() + timedelta(days=7),
    )
    if invited_email and (
        recipient := User.objects.filter(email__iexact=invited_email).first()
    ):
        notify(
            user=recipient,
            notification_type=NotificationType.LIST_INVITE,
            title="Convite para lista",
            body=f"Você foi convidado para a lista {shopping_list.name}.",
        )
    return invite


@transaction.atomic
def accept_invite(invite: ListInvite, user) -> ListMembership:
    invite = (
        ListInvite.objects.select_for_update()
        .select_related("shopping_list")
        .get(pk=invite.pk)
    )
    if not invite.accepts_email(user.email):
        raise PermissionDenied("Este convite é destinado a outro e-mail.")
    existing = ListMembership.objects.filter(
        shopping_list=invite.shopping_list, user=user
    ).first()
    if invite.accepted_at is not None:
        if existing:
            return existing
        raise ValidationError("Este convite já foi utilizado.")
    if invite.expires_at <= timezone.now():
        raise ValidationError("Este convite expirou.")
    membership, _ = ListMembership.objects.get_or_create(
        shopping_list=invite.shopping_list,
        user=user,
        defaults={"role": ListMembership.Role.MEMBER},
    )
    invite.accepted_at = timezone.now()
    invite.save(update_fields=["accepted_at"])
    return membership


@transaction.atomic
def finalize_purchase(user, shopping_list, data):
    existing = ShoppingPurchase.objects.filter(
        user=user, client_operation_id=data["client_operation_id"]
    ).first()
    if existing:
        return existing
    branch = None
    if market_id := data.get("market_id"):
        branch = MarketBranch.objects.filter(
            public_id=market_id, is_active=True
        ).first()
        if not branch:
            raise ValidationError({"market_id": "Mercado não encontrado."})
    item_ids = [item["list_item_id"] for item in data["items"]]
    list_items = {
        item.public_id: item
        for item in ListItem.objects.select_for_update().filter(
            shopping_list=shopping_list, public_id__in=item_ids
        )
    }
    if len(list_items) != len(set(item_ids)):
        raise ValidationError({"items": "Item da lista não encontrado."})
    purchase = ShoppingPurchase.objects.create(
        user=user,
        branch=branch,
        shopping_list=shopping_list,
        purchased_on=data["purchased_on"],
        client_operation_id=data["client_operation_id"],
    )
    total = 0
    for payload in data["items"]:
        item = list_items[payload["list_item_id"]]
        if item.purchased_quantity + payload["quantity"] > item.quantity:
            raise ValidationError(
                {"items": f"Quantidade maior que a pendente para {item.name}."}
            )
        product = (
            Product.objects.filter(public_id=payload.get("product_id")).first()
            if payload.get("product_id")
            else None
        )
        purchase_item = ShoppingPurchaseItem.objects.create(
            purchase=purchase,
            list_item=item,
            product=product,
            description=item.name,
            quantity=payload["quantity"],
            unit_price=payload["unit_price"],
            total_price=0,
        )
        total += purchase_item.total_price
        item.purchased_quantity += payload["quantity"]
        item.is_checked = item.purchased_quantity >= item.quantity
        item.save(
            update_fields=[
                "purchased_quantity",
                "is_checked",
                "checked_at",
                "updated_at",
            ]
        )
    purchase.total_amount = total
    purchase.save(update_fields=["total_amount", "updated_at"])
    return purchase


@transaction.atomic
def apply_sync_operation(user, operation):
    model = {"shopping_list": ShoppingList, "shopping_list_item": ListItem}.get(
        operation["entity_type"]
    )
    if model is None or operation["operation_type"] != "update":
        return SyncOperation.Status.CONFLICT
    queryset = model.objects.select_for_update()
    if model is ShoppingList:
        instance = queryset.filter(
            public_id=operation.get("entity_id"), memberships__user=user
        ).first()
        fields = {"name"}
    else:
        instance = queryset.filter(
            public_id=operation.get("entity_id"), shopping_list__memberships__user=user
        ).first()
        fields = {"name", "quantity", "unit", "is_checked"}
    if not instance:
        return SyncOperation.Status.CONFLICT
    for field, value in operation["payload"].items():
        if field in fields:
            setattr(instance, field, value)
    instance.version += 1
    update_fields = [
        *set(operation["payload"]).intersection(fields),
        "version",
        "updated_at",
    ]
    if "is_checked" in update_fields:
        update_fields.append("checked_at")
    instance.save(update_fields=update_fields)
    return SyncOperation.Status.CONFIRMED
