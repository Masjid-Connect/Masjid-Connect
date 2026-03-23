"""Custom middleware for The Salafi Masjid backend."""

import logging
import uuid

logger = logging.getLogger(__name__)


class RequestCorrelationMiddleware:
    """Attach a unique X-Request-ID to every request for tracing.

    If the client (or reverse proxy) sends an X-Request-ID header, it is reused.
    Otherwise a new UUID is generated. The ID is added to the response headers
    and to each log record via a thread-local filter.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        request.request_id = request_id

        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response


class ContentSecurityPolicyMiddleware:
    """Add Content-Security-Policy header to all responses.

    This is a Django REST API backend, so the CSP is restrictive:
    only allow what the Django admin and Swagger UI need.
    """

    CSP_DIRECTIVES = {
        "default-src": "'self'",
        "script-src": "'self' 'unsafe-inline'",  # Swagger UI + Unfold admin
        "style-src": "'self' 'unsafe-inline'",  # Swagger UI + Unfold admin
        "img-src": "'self' data:",
        "font-src": "'self' data:",
        "connect-src": "'self'",
        "object-src": "'none'",
        "frame-ancestors": "'none'",
        "base-uri": "'self'",
        "form-action": "'self'",
        "upgrade-insecure-requests": "",
    }

    def __init__(self, get_response):
        self.get_response = get_response
        parts = []
        for directive, value in self.CSP_DIRECTIVES.items():
            parts.append(f"{directive} {value}".strip())
        self.csp_header = "; ".join(parts)

    def __call__(self, request):
        response = self.get_response(request)
        response["Content-Security-Policy"] = self.csp_header
        response["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


class RequestIDMiddleware:
    """Attach a unique X-Request-ID to every request/response for tracing.

    If the client sends an X-Request-ID header, it is reused; otherwise a
    new UUID4 is generated. The ID is stored on the request object and
    returned in the response header.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        import uuid
        request_id = request.META.get("HTTP_X_REQUEST_ID") or str(uuid.uuid4())
        request.request_id = request_id
        response = self.get_response(request)
        response["X-Request-ID"] = request_id
        return response
