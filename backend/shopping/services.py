from datetime import timedelta
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from notifications.models import NotificationType
from notifications.service import notify
from .models import ListInvite, ListItem, ListMembership, ListOwnershipChange, MarketBranch, Product, PurchaseEvent, ShoppingList, ShoppingPurchase, ShoppingPurchaseItem, SyncOperation

User = get_user_model()

def membership_for(shopping_list, user):
    membership = ListMembership.objects.filter(shopping_list=shopping_list, user=user).first()
    if membership is None: raise PermissionDenied("Você não participa desta lista.")
    return membership

def owner_for(shopping_list, user):
    if shopping_list.owner_id != user.id: raise PermissionDenied("Somente o dono pode alterar esta lista.")

def ensure_active(shopping_list):
    if shopping_list.archived_at: raise ValidationError("Esta lista está arquivada.")

@transaction.atomic
def create_shopping_list(user, *, name):
    shopping_list = ShoppingList.objects.create(owner=user, name=name)
    ListMembership.objects.create(shopping_list=shopping_list, user=user)
    return shopping_list

@transaction.atomic
def transfer_ownership(user, shopping_list, member_public_id):
    shopping_list = ShoppingList.objects.select_for_update().get(pk=shopping_list.pk)
    owner_for(shopping_list, user); ensure_active(shopping_list)
    member = ListMembership.objects.select_for_update().filter(shopping_list=shopping_list, public_id=member_public_id).first()
    if member is None: raise ValidationError({"member_id": "Membro da lista não encontrado."})
    if member.user_id == user.id: raise ValidationError({"member_id": "Escolha outro membro."})
    old_owner = shopping_list.owner
    shopping_list.owner = member.user; shopping_list.save(update_fields=["owner", "updated_at"])
    ListOwnershipChange.objects.create(shopping_list=shopping_list, previous_owner=old_owner, new_owner=member.user)
    return member

@transaction.atomic
def create_invite(shopping_list, owner, *, invited_email, expires_at):
    owner_for(shopping_list, owner)
    invite = ListInvite.objects.create(shopping_list=shopping_list, invited_email=invited_email, created_by=owner, expires_at=expires_at or timezone.now() + timedelta(days=7))
    recipient = User.objects.filter(email__iexact=invited_email).first() if invited_email else None
    if recipient: notify(user=recipient, notification_type=NotificationType.LIST_INVITE, title="Convite para lista", body=f"Você foi convidado para a lista {shopping_list.name}.")
    return invite

@transaction.atomic
def accept_invite(invite, user):
    invite = ListInvite.objects.select_for_update().get(pk=invite.pk)
    if not invite.accepts_email(user.email): raise PermissionDenied("Este convite é destinado a outro e-mail.")
    if invite.accepted_at: return ListMembership.objects.get(shopping_list=invite.shopping_list, user=user)
    if invite.expires_at <= timezone.now(): raise ValidationError("Este convite expirou.")
    membership, _ = ListMembership.objects.get_or_create(shopping_list=invite.shopping_list, user=user)
    invite.accepted_at = timezone.now(); invite.save(update_fields=["accepted_at"])
    return membership

def purchase_snapshot(purchase):
    return {"purchased_at": purchase.purchased_at.isoformat(), "voided_at": purchase.voided_at.isoformat() if purchase.voided_at else None}

@transaction.atomic
def finalize_purchase(user, shopping_list, data):
    existing = ShoppingPurchase.objects.filter(user=user, client_operation_id=data["client_operation_id"]).first()
    if existing: return existing
    membership_for(shopping_list, user); ensure_active(shopping_list)
    branch = None
    if data.get("market_id"):
        branch = MarketBranch.objects.filter(public_id=data["market_id"], is_active=True).first()
        if not branch: raise ValidationError({"market_id": "Mercado não encontrado."})
    item_ids = [item["list_item_id"] for item in data["items"]]
    items = {item.public_id: item for item in ListItem.objects.select_for_update().filter(shopping_list=shopping_list, public_id__in=item_ids)}
    if len(items) != len(set(item_ids)): raise ValidationError({"items": "Item da lista não encontrado."})
    purchase = ShoppingPurchase.objects.create(user=user, branch=branch, shopping_list=shopping_list, purchased_at=data.get("purchased_at", timezone.now()), client_operation_id=data["client_operation_id"])
    for payload in data["items"]:
        item = items[payload["list_item_id"]]
        product = Product.objects.filter(public_id=payload["product_id"]).first() if payload.get("product_id") else item.product
        ShoppingPurchaseItem.objects.create(purchase=purchase, list_item=item, product=product, description=item.name, quantity=payload["quantity"], unit=item.unit, unit_price=payload["unit_price"])
    PurchaseEvent.objects.create(purchase=purchase, changed_by=user, kind=PurchaseEvent.Kind.CREATED, after=purchase_snapshot(purchase))
    return purchase

@transaction.atomic
def void_purchase(user, purchase, *, reason=""):
    purchase = ShoppingPurchase.objects.select_for_update().select_related("shopping_list").get(pk=purchase.pk)
    membership_for(purchase.shopping_list, user); ensure_active(purchase.shopping_list)
    if purchase.voided_at: raise ValidationError("Esta compra já foi estornada.")
    before = purchase_snapshot(purchase); purchase.voided_at = timezone.now(); purchase.voided_by = user; purchase.void_reason = reason
    purchase.save(update_fields=["voided_at", "voided_by", "void_reason", "updated_at"])
    PurchaseEvent.objects.create(purchase=purchase, changed_by=user, kind=PurchaseEvent.Kind.VOIDED, before=before, after=purchase_snapshot(purchase), reason=reason)
    return purchase

@transaction.atomic
def apply_sync_operation(user, operation):
    model = {SyncOperation.Entity.SHOPPING_LIST: ShoppingList, SyncOperation.Entity.LIST_ITEM: ListItem}.get(operation["entity_type"])
    if model is None or operation["operation_type"] != "update": return SyncOperation.Status.CONFLICT
    instance = (model.objects.select_for_update().filter(public_id=operation.get("entity_id"), owner=user).first() if model is ShoppingList else model.objects.select_for_update().filter(public_id=operation.get("entity_id"), shopping_list__memberships__user=user).first())
    fields = {"name"} if model is ShoppingList else {"name", "quantity", "unit", "completed_at"}
    if not instance or instance.version != operation["base_version"]: return SyncOperation.Status.CONFLICT
    changed = set(operation["payload"]).intersection(fields)
    for field in changed: setattr(instance, field, operation["payload"][field])
    instance.version += 1; instance.save(update_fields=[*changed, "version", "updated_at"])
    return SyncOperation.Status.CONFIRMED
