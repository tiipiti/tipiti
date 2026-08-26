from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from notifications.models import Notification, NotificationType


@pytest.mark.integration
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class NotificationViewSetIntegrationTests(APITestCase):
    def test_user_lists_and_marks_only_their_unread_notification(self):
        user = get_user_model().objects.create_user(username="samuel")
        other_user = get_user_model().objects.create_user(username="outro")
        expires_at = timezone.now() + timedelta(days=1)
        own = Notification.objects.create(
            user=user, type=NotificationType.LIST_INVITE, title="Convite", body="Lista", expires_at=expires_at
        )
        Notification.objects.create(
            user=other_user, type=NotificationType.LIST_INVITE, title="Outro", body="Lista", expires_at=expires_at
        )
        self.client.force_authenticate(user)

        response = self.client.get("/api/notifications/")
        mark_read = self.client.post(f"/api/notifications/{own.public_id}/read/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data], [str(own.public_id)])
        self.assertEqual(mark_read.status_code, 200)
        own.refresh_from_db()
        self.assertIsNotNone(own.read_at)
