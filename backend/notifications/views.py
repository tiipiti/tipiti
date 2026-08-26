from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer
from .service import NotificationService


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    lookup_field = "public_id"

    def get_queryset(self):
        return self.queryset.filter(
            user=self.request.user,
            read_at__isnull=True,
            expires_at__gt=timezone.now(),
        )

    @action(detail=True, methods=["post"], url_path="read")
    def mark_read(self, request, public_id=None):
        notification = self.get_object()
        NotificationService.mark_read(notification.public_id, request.user)
        return Response({"detail": "Marcada como lida."})

    @action(detail=False, methods=["post"], url_path="read-all")
    def mark_all_read(self, request):
        NotificationService.mark_all_read(request.user)
        return Response({"detail": "Todas marcadas como lidas."}, status=status.HTTP_200_OK)
