import logging
import posixpath

from django.core.files.storage import default_storage
from django.http import Http404, HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated

from accounts.authentication import SingleSessionJWTAuthentication
from core.image_service import ImageService

logger = logging.getLogger(__name__)


@api_view(["GET"])
@authentication_classes([SingleSessionJWTAuthentication])
@permission_classes([IsAuthenticated])
def serve_user_media(request, path):
    path = posixpath.normpath("/" + path).lstrip("/")

    # — Validação de estrutura do path —
    parts = path.split("/")
    if len(parts) < 3 or parts[0] != "users":
        raise Http404

    try:
        int(parts[1])  # user_id deve ser inteiro
    except (IndexError, ValueError):
        raise Http404

    if int(parts[1]) != request.user.id:
        raise Http404

    try:
        with default_storage.open(path, "rb") as media_file:
            data = ImageService.decrypt(media_file.read(), request.user.id)
    except Exception:
        logger.warning("Failed to read media for %s", path, exc_info=True)
        raise Http404
    return HttpResponse(data, content_type=ImageService.detect_content_type(data))
