"""Custom DRF exception handler.

DRF's default handler (``rest_framework.views.exception_handler``) only
recognises ``APIException`` subclasses, ``Http404``, and ``PermissionDenied``.
Anything else — ``DatabaseError``, ``TypeError``, ``KeyError``, etc. — is
re-raised, escapes DRF, and Django renders an HTML 500 page.

That HTML body is the *only* response Stripe (and other webhook integrators)
can show us in their dashboards. Replacing it with a JSON envelope means
future failures are diagnosable from the third-party side, not just from
inside Sentry.

History: the 2026-05-09 Stripe webhook outage took ~90 minutes to diagnose
because every failed delivery showed Django's hardcoded 500 HTML instead of
a useful error body. This handler closes that gap.
"""
import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_handler

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    """Catch every exception in DRF views, return JSON for the unhandled ones."""
    response = drf_default_handler(exc, context)
    if response is not None:
        return response

    request = context.get("request")
    view = context.get("view")

    logger.exception(
        "Unhandled exception in DRF view %s",
        view.__class__.__name__ if view else "<unknown>",
    )

    return Response(
        {
            "detail": "Internal server error.",
            "request_id": getattr(request, "request_id", None) if request else None,
        },
        status=500,
    )
