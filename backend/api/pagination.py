"""Custom pagination to match the mobile app's expected response format.

The React Native API client expects paginated responses shaped as:
    { "items": [...], "totalItems": N, "hasMore": true/false }

This replaces DRF's default { "count", "next", "previous", "results" }.
"""

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class AppPageNumberPagination(PageNumberPagination):
    """Page-number pagination returning { items, totalItems, hasMore }."""

    page_size = 50

    def get_paginated_response(self, data):
        return Response(
            {
                "items": data,
                "totalItems": self.page.paginator.count,
                "hasMore": self.page.has_next(),
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "required": ["items", "totalItems", "hasMore"],
            "properties": {
                "items": schema,
                "totalItems": {
                    "type": "integer",
                    "description": "Total number of items across all pages.",
                },
                "hasMore": {
                    "type": "boolean",
                    "description": "Whether more pages are available.",
                },
            },
        }
