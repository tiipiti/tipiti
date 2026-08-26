from django.db import migrations


def backfill_purchase_changes(apps, schema_editor):
    Purchase = apps.get_model("shopping", "Purchase")
    PurchaseChange = apps.get_model("shopping", "PurchaseChange")
    existing_purchase_ids = PurchaseChange.objects.values("purchase_id")
    changes = []
    for purchase in Purchase.objects.exclude(id__in=existing_purchase_ids).iterator():
        changes.append(
            PurchaseChange(
                purchase_id=purchase.id,
                changed_by_id=purchase.purchased_by_id,
                kind="created",
                after={
                    "quantity": str(purchase.quantity),
                    "unit_price": str(purchase.unit_price),
                    "total_price": str(purchase.total_price),
                    "purchased_at": purchase.purchased_at.isoformat(),
                    "voided_at": purchase.voided_at.isoformat() if purchase.voided_at else None,
                },
                reason="Registro criado antes do histórico de alterações.",
            )
        )
    PurchaseChange.objects.bulk_create(changes)


def remove_backfilled_purchase_changes(apps, schema_editor):
    PurchaseChange = apps.get_model("shopping", "PurchaseChange")
    PurchaseChange.objects.filter(
        kind="created",
        reason="Registro criado antes do histórico de alterações.",
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("shopping", "0004_alter_marketbranch_options_alter_purchase_options_and_more")]

    operations = [migrations.RunPython(backfill_purchase_changes, remove_backfilled_purchase_changes)]
