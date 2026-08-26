from unittest.mock import MagicMock, patch

import pytest
from rest_framework.exceptions import ValidationError

from accounts.authentication import _session_cache_key, invalidate_session_cache
from accounts.services import AccountLifecycleService


def test_session_cache_key_is_scoped_to_user():
    assert _session_cache_key(42) == "session_key:42"


def test_invalidate_session_cache_deletes_the_users_key():
    with patch("accounts.authentication.cache.delete") as delete:
        invalidate_session_cache(42)

    delete.assert_called_once_with("session_key:42")


def test_request_account_deletion_rejects_a_wrong_password():
    user = MagicMock()
    user.check_password.return_value = False
    with (
        patch("accounts.services.GoogleIdentity.objects.filter") as google,
        patch("accounts.services.FacebookIdentity.objects.filter") as facebook,
        pytest.raises(ValidationError, match="Senha incorreta"),
    ):
        google.return_value.exists.return_value = False
        facebook.return_value.exists.return_value = False
        AccountLifecycleService.request_account_deletion(user, "errada")


def test_reactivate_account_clears_pending_deletion():
    profile = MagicMock(deletion_requested_at=object())
    with patch.object(AccountLifecycleService, "get_or_create_profile", return_value=profile):
        assert AccountLifecycleService.reactivate_account_if_pending(MagicMock()) is True

    assert profile.deletion_requested_at is None
    profile.save.assert_called_once_with(update_fields=["deletion_requested_at"])
