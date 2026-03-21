"""Custom token authentication with expiration."""

from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

# Default: tokens expire after 30 days
TOKEN_TTL = getattr(settings, "TOKEN_TTL", timedelta(days=30))


class ExpiringTokenAuthentication(TokenAuthentication):
    """TokenAuthentication subclass that rejects expired tokens."""

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)

        if TOKEN_TTL and timezone.now() > token.created + TOKEN_TTL:
            token.delete()
            raise AuthenticationFailed("Token has expired. Please log in again.")

        return user, token
