"""Custom middleware for The Salafi Masjid backend."""


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
