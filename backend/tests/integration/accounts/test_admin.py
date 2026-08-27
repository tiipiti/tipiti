import pytest
from django.contrib.auth.models import Group, User
from django.contrib.sessions.models import Session
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from accounts.models import ConsentHistory, FacebookIdentity, GoogleIdentity, UserProfile, UserSession


@pytest.mark.django_db
def test_admin_creates_a_group(client):
    administrator = User.objects.create_superuser(username="admin", password="password")
    client.force_login(administrator)

    response = client.post(
        reverse("tipiti_admin:auth_group_add"), {"name": "Operação", "_save": "Save"}
    )

    assert response.status_code == 302, response.context["adminform"].form.errors
    assert Group.objects.filter(name="Operação").exists()


@pytest.mark.django_db
def test_admin_creates_a_user_and_loads_its_change_screen(client):
    administrator = User.objects.create_superuser(username="admin", password="password")
    client.force_login(administrator)

    response = client.post(
        reverse("tipiti_admin:auth_user_add"),
        {
            "username": "maria",
            "password1": "S3nh@Segura123",
            "password2": "S3nh@Segura123",
            "profile-TOTAL_FORMS": "0",
            "profile-INITIAL_FORMS": "0",
            "profile-MIN_NUM_FORMS": "0",
            "profile-MAX_NUM_FORMS": "1000",
            "active_session-TOTAL_FORMS": "0",
            "active_session-INITIAL_FORMS": "0",
            "active_session-MIN_NUM_FORMS": "0",
            "active_session-MAX_NUM_FORMS": "1000",
            "_save": "Save",
        },
    )

    assert response.status_code == 302
    user = User.objects.get(username="maria")
    assert client.get(reverse("tipiti_admin:auth_user_change", args=(user.pk,))).status_code == 200


@pytest.mark.django_db
def test_admin_loads_account_inspection_screens_with_real_records(client):
    administrator = User.objects.create_superuser(username="admin", password="password")
    user = User.objects.create_user(username="maria")
    GoogleIdentity.objects.create(user=user, google_sub="google-maria", email="maria@example.com")
    FacebookIdentity.objects.create(user=administrator, facebook_id="facebook-admin")
    UserProfile.objects.create(user=user, nickname="Maria")
    UserSession.objects.create(user=user)
    ConsentHistory.objects.create(user=user, terms_version="1")
    Session.objects.create(
        session_key="a" * 32,
        session_data="",
        expire_date=timezone.now(),
    )
    token = OutstandingToken.objects.create(
        user=user,
        jti="00000000-0000-0000-0000-000000000001",
        token="token",
        expires_at=timezone.now(),
    )
    BlacklistedToken.objects.create(token=token)
    client.force_login(administrator)

    for model in (
        GoogleIdentity,
        FacebookIdentity,
        UserProfile,
        UserSession,
        ConsentHistory,
        Session,
        OutstandingToken,
        BlacklistedToken,
    ):
        record = model.objects.first()
        response = client.get(
            reverse(f"tipiti_admin:{model._meta.app_label}_{model._meta.model_name}_change", args=(record.pk,))
        )
        assert response.status_code == 200, model._meta.label
