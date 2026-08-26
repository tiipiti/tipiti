from __future__ import annotations

import logging
import secrets
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from rest_framework.exceptions import ValidationError
import requests

try:
    import resend
except ModuleNotFoundError:  # pragma: no cover - optional integration
    resend = None

from .exceptions import (
    GoogleIdentityEmailConflictException,
    GoogleIdentityEmailNotVerifiedException,
    GoogleIdentityTokenInvalidException,
    GoogleOAuthClientIdNotConfiguredException,
)
from .models import FacebookIdentity, GoogleIdentity, UserProfile

User = get_user_model()

if resend is not None:
    resend.api_key = settings.RESEND_API_KEY

_email_log = logging.getLogger("accounts.email")
logger = logging.getLogger(__name__)


class AccountLifecycleService:
    @staticmethod
    def get_or_create_profile(user) -> UserProfile:
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    @staticmethod
    def _issue_verification_token(profile: UserProfile) -> str:
        token = secrets.token_urlsafe(32)
        profile.email_verification_token = token
        profile.email_verification_sent_at = timezone.now()
        profile.save(
            update_fields=["email_verification_token", "email_verification_sent_at"]
        )
        return token

    @staticmethod
    def send_verification_email(user, profile: UserProfile | None = None) -> str:
        profile = profile or AccountLifecycleService.get_or_create_profile(user)
        token = AccountLifecycleService._issue_verification_token(profile)

        verification_url = f"{settings.PUBLIC_BASE_URL}/verify-email?token={token}"
        if resend is None:
            _email_log.warning(
                "resend package not available; skipping verification email for %s",
                user.email,
            )
            return token
        try:
            resend.Emails.send(
                {
                    "from": settings.EMAIL_FROM,
                    "to": [user.email],
                    "subject": "Confirme seu email — Tipiti",
                    "html": (
                        "<p>Olá! Acesse o link abaixo para verificar seu email:</p>"
                        f"<p><a href='{verification_url}'>{verification_url}</a></p>"
                        f"<p>O link expira em {settings.EMAIL_VERIFICATION_TIMEOUT_HOURS} horas.</p>"
                    ),
                }
            )
        except Exception:
            _email_log.exception(
                "Falha ao enviar email de verificação para %s", user.email
            )
        return token

    @staticmethod
    def verify_email_token(token: str) -> UserProfile:
        profile = UserProfile.objects.filter(
            email_verification_token=token,
            email_verification_sent_at__isnull=False,
        ).first()
        if not profile:
            raise ValidationError({"token": "Token inválido ou expirado."})

        timeout = timedelta(hours=settings.EMAIL_VERIFICATION_TIMEOUT_HOURS)
        if timezone.now() - profile.email_verification_sent_at > timeout:
            raise ValidationError({"token": "Token expirado. Solicite um novo."})

        profile.email_verified = True
        profile.email_verification_token = ""
        profile.save(update_fields=["email_verified", "email_verification_token"])
        return profile

    @staticmethod
    def resend_verification_email(user) -> str:
        profile = AccountLifecycleService.get_or_create_profile(user)
        if profile.email_verified:
            return "verified"

        cooldown = timedelta(minutes=1)
        if profile.email_verification_sent_at:
            elapsed = timezone.now() - profile.email_verification_sent_at
            if elapsed < cooldown:
                wait = int((cooldown - elapsed).total_seconds())
                return f"cooldown:{wait}"

        AccountLifecycleService.send_verification_email(user, profile)
        return "resent"

    @staticmethod
    def request_account_deletion(user, password: str = "") -> UserProfile:
        if not (
            GoogleIdentity.objects.filter(user=user).exists()
            or FacebookIdentity.objects.filter(user=user).exists()
        ):
            if not password or not user.check_password(password):
                raise ValidationError({"password": "Senha incorreta."})

        return AccountLifecycleService.schedule_account_deletion(user)

    @staticmethod
    def schedule_account_deletion(user) -> UserProfile:
        profile = AccountLifecycleService.get_or_create_profile(user)
        if profile.deletion_requested_at:
            raise ValidationError({"detail": "Exclusão já solicitada."})

        profile.deletion_requested_at = timezone.now()
        profile.save(update_fields=["deletion_requested_at"])

        from notifications.models import NotificationType
        from notifications.service import notify

        notify(
            user=user,
            notification_type=NotificationType.ACCOUNT_DELETION,
            title="Conta agendada para exclusão",
            body="Sua conta será excluída permanentemente em 7 dias. "
            "Faça login antes disso para cancelar.",
        )

        return profile

    @staticmethod
    def reactivate_account_if_pending(user) -> bool:
        profile = AccountLifecycleService.get_or_create_profile(user)
        if profile.deletion_requested_at is None:
            return False

        profile.deletion_requested_at = None
        profile.save(update_fields=["deletion_requested_at"])
        return True

    @staticmethod
    def accept_terms(user, terms_version: str) -> UserProfile:
        profile = AccountLifecycleService.get_or_create_profile(user)
        profile.terms_accepted_at = timezone.now()
        profile.terms_version = terms_version
        profile.save(update_fields=["terms_accepted_at", "terms_version"])
        return profile


def build_export_payload(user) -> dict[str, Any]:
    """Exporta somente os dados que ainda pertencem ao Tipiti."""
    from notifications.models import Notification

    profile = getattr(user, "profile", None)
    google_identity = getattr(user, "google_identity", None)
    return {
        "exported_at": timezone.now().isoformat(),
        "profile": {
            "username": user.username,
            "email": user.email,
            "nickname": profile.nickname if profile else "",
            "profile_photo": str(profile.profile_photo) if profile else "",
            "email_verified": profile.email_verified if profile else False,
            "terms_accepted_at": (
                profile.terms_accepted_at.isoformat()
                if profile and profile.terms_accepted_at
                else None
            ),
        },
        "google_identity": (
            {
                "email": google_identity.email,
                "email_verified": google_identity.email_verified,
                "google_sub": google_identity.google_sub,
            }
            if google_identity
            else None
        ),
        "notifications": [
            {
                "type": notification.type,
                "title": notification.title,
                "body": notification.body,
                "read_at": notification.read_at.isoformat() if notification.read_at else None,
                "expires_at": notification.expires_at.isoformat(),
                "created_at": notification.created_at.isoformat(),
            }
            for notification in Notification.objects.filter(user=user).order_by("-created_at")
        ],
        "consent_history": [
            {
                "terms_version": consent.terms_version,
                "accepted_at": consent.accepted_at.isoformat(),
                "ip_address": consent.ip_address,
                "user_agent": consent.user_agent,
                "method": consent.method,
            }
            for consent in user.consent_history.all()
        ],
    }

class GoogleAuthService:
    @staticmethod
    def verify_id_token(id_token: str) -> dict[str, Any]:
        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        if not client_id:
            logger.error("Google OAuth client id not configured")
            raise GoogleOAuthClientIdNotConfiguredException
        try:
            from google.auth import exceptions as google_auth_exceptions
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token as google_id_token
        except ImportError as error:
            logger.exception("google-auth dependency is not available")
            raise GoogleIdentityTokenInvalidException from error
        try:
            claims = google_id_token.verify_oauth2_token(
                id_token, google_requests.Request(), client_id
            )
            logger.info(
                "Google token verified for sub=%s email=%s verified=%s",
                claims.get("sub"),
                claims.get("email"),
                claims.get("email_verified"),
            )
            return claims
        except (ValueError, google_auth_exceptions.GoogleAuthError) as error:
            logger.warning(
                "Google token verification failed: %s", error.__class__.__name__
            )
            raise GoogleIdentityTokenInvalidException from error

    @staticmethod
    def resolve_user(claims: dict[str, Any]) -> tuple[User, bool]:
        google_sub = str(claims.get("sub", "")).strip()
        email = str(claims.get("email", "")).strip()
        email_verified = bool(claims.get("email_verified"))
        if not google_sub or not email:
            logger.warning("Google claims missing sub/email")
            raise GoogleIdentityTokenInvalidException
        with transaction.atomic():
            identity = (
                GoogleIdentity.objects.select_related("user")
                .filter(google_sub=google_sub)
                .first()
            )
            if identity:
                logger.info(
                    "Google identity matched existing link for user_id=%s",
                    identity.user_id,
                )
                identity.email = email
                identity.email_verified = email_verified
                identity.save(update_fields=["email", "email_verified", "updated_at"])
                UserProfile.objects.update_or_create(
                    user=identity.user, defaults={"email_verified": True}
                )
                return identity.user, False
            if not email_verified:
                logger.warning(
                    "Google email is not verified for sub=%s email=%s",
                    google_sub,
                    email,
                )
                raise GoogleIdentityEmailNotVerifiedException
            matched_users = list(
                User.objects.filter(email__iexact=email).order_by("id")[:2]
            )
            if len(matched_users) > 1:
                logger.warning(
                    "Google email conflict for email=%s matched_users=%s",
                    email,
                    len(matched_users),
                )
                raise GoogleIdentityEmailConflictException
            if matched_users:
                user = matched_users[0]
                logger.info(
                    "Google login linked verified email=%s to existing user_id=%s",
                    email,
                    user.id,
                )
                identity, identity_created = GoogleIdentity.objects.get_or_create(
                    user=user,
                    defaults={
                        "google_sub": google_sub,
                        "email": email,
                        "email_verified": email_verified,
                    },
                )
                if identity.google_sub != google_sub:
                    identity.google_sub = google_sub
                    identity.email = email
                    identity.email_verified = email_verified
                    identity.save(
                        update_fields=[
                            "google_sub",
                            "email",
                            "email_verified",
                            "updated_at",
                        ]
                    )
                UserProfile.objects.update_or_create(
                    user=user, defaults={"email_verified": True}
                )
                return user, identity_created
            username = GoogleAuthService._build_unique_username(
                email=email, sub=google_sub, claims=claims
            )
            logger.info(
                "Google login creating new local user for email=%s username=%s",
                email,
                username,
            )
            user = User.objects.create_user(
                username=username, email=email, password=None
            )
            user.set_unusable_password()
            user.save(update_fields=["password"])
            UserProfile.objects.update_or_create(
                user=user, defaults={"email_verified": True}
            )
            GoogleIdentity.objects.create(
                user=user,
                google_sub=google_sub,
                email=email,
                email_verified=email_verified,
            )
            return user, True

    @staticmethod
    def _build_unique_username(*, email: str, sub: str, claims: dict[str, Any]) -> str:
        candidates = [
            claims.get("name"),
            claims.get("given_name"),
            email.split("@")[0],
            "google-user",
        ]
        base = ""
        for candidate in candidates:
            if candidate:
                base = slugify(str(candidate))
                if base:
                    break
        if not base:
            base = "google-user"
        base = base[:142]
        username = base
        suffix = sub.replace("-", "")[:8] or "google"
        if not User.objects.filter(username=username).exists():
            return username
        username = f"{base}-{suffix}"[:150]
        if not User.objects.filter(username=username).exists():
            return username
        index = 2
        while True:
            username = f"{base}-{suffix}-{index}"[:150]
            if not User.objects.filter(username=username).exists():
                return username
            index += 1


class FacebookAuthService:
    @staticmethod
    def verify_access_token(access_token: str) -> dict[str, Any]:
        if not settings.FACEBOOK_APP_ID or not settings.FACEBOOK_APP_SECRET:
            raise ValidationError({"access_token": "Facebook OAuth não está configurado."})
        app_token = f"{settings.FACEBOOK_APP_ID}|{settings.FACEBOOK_APP_SECRET}"
        try:
            response = requests.get(
                "https://graph.facebook.com/debug_token",
                params={"input_token": access_token, "access_token": app_token}, timeout=5,
            )
            response.raise_for_status()
            data = response.json().get("data", {})
        except (requests.RequestException, ValueError) as error:
            raise ValidationError({"access_token": "Não foi possível validar o token Facebook."}) from error
        if not data.get("is_valid") or str(data.get("app_id")) != settings.FACEBOOK_APP_ID:
            raise ValidationError({"access_token": "Token Facebook inválido."})
        try:
            profile = requests.get(
                "https://graph.facebook.com/me",
                params={"fields": "id,name,email", "access_token": access_token}, timeout=5,
            )
            profile.raise_for_status()
            claims = profile.json()
        except (requests.RequestException, ValueError) as error:
            raise ValidationError({"access_token": "Não foi possível consultar o perfil Facebook."}) from error
        if not claims.get("id"):
            raise ValidationError({"access_token": "Perfil Facebook inválido."})
        return claims

    @staticmethod
    @transaction.atomic
    def resolve_user(claims: dict[str, Any]) -> tuple[User, bool]:
        facebook_id = str(claims["id"])
        email = str(claims.get("email", "")).strip().casefold()
        identity = FacebookIdentity.objects.select_related("user").filter(facebook_id=facebook_id).first()
        if identity:
            identity.email = email
            identity.email_verified = bool(email)
            identity.save(update_fields=["email", "email_verified", "updated_at"])
            return identity.user, False
        user = User.objects.filter(email__iexact=email).first() if email else None
        created = user is None
        if user is None:
            username = GoogleAuthService._build_unique_username(
                email=email or f"facebook-{facebook_id}@invalid.local",
                sub=facebook_id,
                claims=claims,
            )
            user = User.objects.create_user(username=username, email=email, password=None)
            user.set_unusable_password()
            user.save(update_fields=["password"])
        FacebookIdentity.objects.create(
            user=user,
            facebook_id=facebook_id,
            email=email,
            email_verified=bool(email),
        )
        UserProfile.objects.update_or_create(user=user, defaults={"email_verified": bool(email)})
        return user, created
