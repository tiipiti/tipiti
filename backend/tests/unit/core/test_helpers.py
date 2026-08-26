import pytest
from rest_framework.exceptions import ValidationError

from core.exception_handler import semantic_exception_handler
from core.storage_urls import build_public_media_url
from core.validators import validate_google_maps_url, validate_safe_url


def test_safe_url_rejects_javascript_scheme():
    with pytest.raises(ValidationError, match="Apenas http e https"):
        validate_safe_url("javascript:alert(1)")


def test_google_maps_url_accepts_google_maps_link():
    assert validate_google_maps_url("https://maps.google.com/?q=Manaus") == "https://maps.google.com/?q=Manaus"


def test_public_media_url_uses_relative_path_without_request():
    assert build_public_media_url(type("File", (), {"name": "/users/1/photos/a.jpg"})()) == "/api/media/users/1/photos/a.jpg"


def test_semantic_handler_normalizes_validation_error():
    response = semantic_exception_handler(ValidationError({"name": ["Obrigatório."]}), {})

    assert response.status_code == 400
    assert response.data["code"] == "validation_error"
    assert response.data["field_errors"] == {"name": ["Obrigatório."]}
