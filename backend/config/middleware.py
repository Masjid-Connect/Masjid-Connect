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
        "frame-ancestors": "'none'",
        "base-uri": "'self'",
        "form-action": "'self'",
    }

    def __init__(self, get_response):
        self.get_response = get_response
        self.csp_header = "; ".join(
            f"{directive} {value}" for directive, value in self.CSP_DIRECTIVES.items()
        )

    def __call__(self, request):
        response = self.get_response(request)
        response["Content-Security-Policy"] = self.csp_header
        return response
