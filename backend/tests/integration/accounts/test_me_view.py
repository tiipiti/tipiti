import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase


@pytest.mark.integration
@override_settings(CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}})
class MeViewIntegrationTests(APITestCase):
    def test_authenticated_user_can_read_own_profile(self):
        user = get_user_model().objects.create_user(
            username="samuel", email="samuel@example.com", password="senha-forte-123"
        )
        self.client.force_authenticate(user)

        response = self.client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "samuel@example.com")
