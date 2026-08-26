from unittest.mock import MagicMock, patch

from notifications.models import NotificationType
from notifications.service import NotificationService, notify


def test_notify_creates_an_internal_notification():
    user = MagicMock()
    with patch("notifications.service.Notification.objects.create") as create:
        notify(user, NotificationType.LIST_INVITE, "Convite", "Participe")

    assert create.call_args.kwargs["user"] is user
    assert create.call_args.kwargs["type"] == NotificationType.LIST_INVITE


def test_mark_read_returns_false_when_notification_is_missing():
    with patch("notifications.service.Notification.objects.filter") as filter_notifications:
        filter_notifications.return_value.first.return_value = None

        assert NotificationService.mark_read("missing", MagicMock()) is False


def test_mark_all_read_returns_updated_count():
    with patch("notifications.service.Notification.objects.filter") as filter_notifications:
        filter_notifications.return_value.update.return_value = 3

        assert NotificationService.mark_all_read(MagicMock()) == 3
