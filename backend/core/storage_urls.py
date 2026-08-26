def build_public_media_url(file_field, request=None) -> str:
    name = getattr(file_field, "name", "").lstrip("/")
    if not name:
        return ""
    path = f"/api/media/{name}"
    return request.build_absolute_uri(path) if request else path
