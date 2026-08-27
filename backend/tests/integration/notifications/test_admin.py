from datetime import timedelta

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from notifications.models import Notification, NotificationType


@pytest.mark.django_db
def test_admin_creates_and_edits_a_notification(client):
    administrator = User.objects.create_superuser(username="admin", password="password")
    recipient = User.objects.create_user(username="maria")
    client.force_login(administrator)

    response = client.post(
        reverse("tipiti_admin:notifications_notification_add"),
        {
            "user": recipient.pk,
            "type": NotificationType.LIST_INVITE,
            "title": "Convite",
            "body": "Participe da lista.",
            "expires_at_0": (timezone.now() + timedelta(days=1)).strftime("%d/%m/%Y"),
            "expires_at_1": (timezone.now() + timedelta(days=1)).strftime("%H:%M:%S"),
            "_save": "Save",
        },
    )

    assert response.status_code == 302, response.context["adminform"].form.errors
    notification = Notification.objects.get(title="Convite")
    response = client.post(
        reverse("tipiti_admin:notifications_notification_change", args=(notification.pk,)),
        {
            "user": recipient.pk,
            "type": NotificationType.LIST_INVITE,
            "title": "Convite atualizado",
            "body": "Participe da lista.",
            "expires_at_0": notification.expires_at.strftime("%d/%m/%Y"),
            "expires_at_1": notification.expires_at.strftime("%H:%M:%S"),
            "_save": "Save",
        },
    )

    assert response.status_code == 302
    notification.refresh_from_db()
    assert notification.title == "Convite atualizado"
    assert client.get(reverse("tipiti_admin:notifications_notification_changelist")).status_code == 200
