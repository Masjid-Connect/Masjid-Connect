import os
from unittest.mock import MagicMock, patch

import jwt as pyjwt
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Announcement, Event, Mosque, MosqueAdmin, PushToken, User, UserSubscription


class AuthRegistrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_success(self):
        response = self.client.post("/api/v1/auth/register/", {
            "email": "test@example.com",
            "password": "securepass123",
            "name": "Test User",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "test@example.com")

    def test_register_duplicate_email(self):
        User.objects.create_user(username="test@example.com", email="test@example.com", password="pass1234")
        response = self.client.post("/api/v1/auth/register/", {
            "email": "test@example.com",
            "password": "securepass123",
            "name": "Test User",
        })
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_409_CONFLICT])

    def test_register_missing_fields(self):
        response = self.client.post("/api/v1/auth/register/", {"email": "test@example.com"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AuthLoginTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="user@test.com",
            email="user@test.com",
            password="testpass123",
            name="Test User",
        )

    def test_login_success(self):
        response = self.client.post("/api/v1/auth/login/", {
            "email": "user@test.com",
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)

    def test_login_wrong_password(self):
        response = self.client.post("/api/v1/auth/login/", {
            "email": "user@test.com",
            "password": "wrongpassword",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AuthLogoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="user@test.com",
            email="user@test.com",
            password="testpass123",
        )
        # Login to get token
        response = self.client.post("/api/v1/auth/login/", {
            "email": "user@test.com",
            "password": "testpass123",
        })
        self.token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

    def test_logout_success(self):
        response = self.client.post("/api/v1/auth/logout/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class AuthMeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="user@test.com",
            email="user@test.com",
            password="testpass123",
            name="Test User",
        )
        response = self.client.post("/api/v1/auth/login/", {
            "email": "user@test.com",
            "password": "testpass123",
        })
        self.token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

    def test_me_authenticated(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "user@test.com")

    def test_me_unauthenticated(self):
        client = APIClient()
        response = client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AuthExportDataTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="user@test.com",
            email="user@test.com",
            password="testpass123",
            name="Test User",
        )
        response = self.client.post("/api/v1/auth/login/", {
            "email": "user@test.com",
            "password": "testpass123",
        })
        self.token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

        # Create related data
        self.mosque = Mosque.objects.create(
            name="Test Mosque",
            city="London",
            country="UK",
            latitude=51.5,
            longitude=-0.1,
        )
        self.subscription = UserSubscription.objects.create(
            user=self.user,
            mosque=self.mosque,
        )
        self.push_token = PushToken.objects.create(
            user=self.user,
            token="ExponentPushToken[test123]",
            platform="ios",
        )
        self.announcement = Announcement.objects.create(
            mosque=self.mosque,
            title="Test Announcement",
            body="Body text",
            author=self.user,
        )
        self.event = Event.objects.create(
            mosque=self.mosque,
            title="Test Event",
            event_date="2026-04-01",
            start_time="18:00:00",
            author=self.user,
        )
        self.admin_role = MosqueAdmin.objects.create(
            mosque=self.mosque,
            user=self.user,
            role="admin",
        )

    def test_export_data_authenticated(self):
        response = self.client.get("/api/v1/auth/export-data/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        self.assertIn("profile", data)
        self.assertIn("subscriptions", data)
        self.assertIn("push_tokens", data)
        self.assertIn("announcements", data)
        self.assertIn("events", data)
        self.assertIn("admin_roles", data)
        self.assertIn("exported_at", data)

        # Verify profile
        self.assertEqual(data["profile"]["email"], "user@test.com")
        self.assertEqual(data["profile"]["name"], "Test User")

        # Verify related data is present
        self.assertEqual(len(data["subscriptions"]), 1)
        self.assertEqual(len(data["push_tokens"]), 1)
        self.assertEqual(len(data["announcements"]), 1)
        self.assertEqual(len(data["events"]), 1)
        self.assertEqual(len(data["admin_roles"]), 1)

        # Verify specific content
        self.assertEqual(data["announcements"][0]["title"], "Test Announcement")
        self.assertEqual(data["events"][0]["title"], "Test Event")
        self.assertEqual(data["admin_roles"][0]["role"], "admin")

    def test_export_data_unauthenticated(self):
        client = APIClient()
        response = client.get("/api/v1/auth/export-data/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AuthDeleteAccountTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="user@test.com",
            email="user@test.com",
            password="testpass123",
            name="Test User",
        )
        response = self.client.post("/api/v1/auth/login/", {
            "email": "user@test.com",
            "password": "testpass123",
        })
        self.token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

    def test_delete_account_success(self):
        """Delete account with correct password returns 204 and user is gone."""
        user_id = self.user.id
        response = self.client.delete("/api/v1/auth/delete-account/", {
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=user_id).exists())

    def test_delete_account_wrong_password(self):
        """Delete account with wrong password returns 400."""
        response = self.client.delete("/api/v1/auth/delete-account/", {
            "password": "wrongpassword",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # User should still exist
        self.assertTrue(User.objects.filter(id=self.user.id).exists())

    def test_delete_account_unauthenticated(self):
        """Unauthenticated request to delete account returns 401."""
        client = APIClient()
        response = client.delete("/api/v1/auth/delete-account/", {
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_account_cascades(self):
        """Deleting account removes all related subscriptions and push tokens."""
        mosque = Mosque.objects.create(
            name="Test Mosque",
            city="London",
            country="UK",
            latitude=51.5,
            longitude=-0.1,
        )
        subscription = UserSubscription.objects.create(
            user=self.user,
            mosque=mosque,
        )
        push_token = PushToken.objects.create(
            user=self.user,
            token="ExponentPushToken[cascade-test]",
            platform="ios",
        )

        sub_id = subscription.id
        token_id = push_token.id
        user_id = self.user.id

        response = self.client.delete("/api/v1/auth/delete-account/", {
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # All related records should be gone
        self.assertFalse(User.objects.filter(id=user_id).exists())
        self.assertFalse(UserSubscription.objects.filter(id=sub_id).exists())
        self.assertFalse(PushToken.objects.filter(id=token_id).exists())

    def test_delete_account_social_no_password(self):
        """Social user (unusable password) can delete without providing password."""
        social_user = User.objects.create_user(
            username="social@test.com",
            email="social@test.com",
            password="temppass123",
            name="Social User",
        )
        social_user.set_unusable_password()
        social_user.save()

        # Login via token directly since social users can't use password login
        from rest_framework.authtoken.models import Token
        token = Token.objects.create(user=social_user)

        social_client = APIClient()
        social_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        social_user_id = social_user.id
        response = social_client.delete("/api/v1/auth/delete-account/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(id=social_user_id).exists())


@patch.dict(os.environ, {
    "APPLE_BUNDLE_ID": "app.salafimasjid.test",
    "GOOGLE_CLIENT_ID": "test-google-client-id",
    "GOOGLE_IOS_CLIENT_ID": "test-google-ios-client-id",
})
class SocialLoginTests(TestCase):
    """Tests for POST /api/v1/auth/social/ (Apple & Google social login)."""

    def setUp(self):
        self.client = APIClient()
        self.apple_payload = {
            "email": "apple@example.com",
            "email_verified": True,
            "sub": "apple-user-id-001",
        }
        self.google_payload = {
            "email": "google@example.com",
            "email_verified": True,
            "name": "Google User",
            "sub": "google-user-id-001",
        }
        self.fake_jwks_keys = [{"kid": "test-kid", "kty": "RSA", "n": "fake", "e": "AQAB"}]

    def _mock_jwt_verification(self, mock_from_jwk, mock_get_header, mock_jwt_decode, mock_requests_get, payload):
        """Helper to configure all JWT verification mocks."""
        # Mock requests.get to return fake JWKS keys
        mock_response = MagicMock()
        mock_response.json.return_value = {"keys": self.fake_jwks_keys}
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_requests_get.return_value = mock_response

        # Mock JWT header extraction
        mock_get_header.return_value = {"kid": "test-kid"}

        # Mock RSA key extraction
        mock_from_jwk.return_value = MagicMock()

        # Mock JWT decode to return the payload
        mock_jwt_decode.return_value = payload

    @patch("api.views.jwt.algorithms.RSAAlgorithm.from_jwk")
    @patch("api.views.jwt.get_unverified_header")
    @patch("api.views.jwt.decode")
    @patch("api.views.requests.get")
    def test_apple_social_login_creates_user(self, mock_requests_get, mock_jwt_decode, mock_get_header, mock_from_jwk):
        """Apple social login with a valid token creates a new user and returns a token."""
        self._mock_jwt_verification(mock_from_jwk, mock_get_header, mock_jwt_decode, mock_requests_get, self.apple_payload)

        response = self.client.post("/api/v1/auth/social/", {
            "provider": "apple",
            "token": "fake-apple-id-token",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "apple@example.com")
        # Verify user was actually created in the database
        self.assertTrue(User.objects.filter(email="apple@example.com").exists())
        user = User.objects.get(email="apple@example.com")
        self.assertFalse(user.has_usable_password())

    @patch("api.views.jwt.algorithms.RSAAlgorithm.from_jwk")
    @patch("api.views.jwt.get_unverified_header")
    @patch("api.views.jwt.decode")
    @patch("api.views.requests.get")
    def test_google_social_login_creates_user(self, mock_requests_get, mock_jwt_decode, mock_get_header, mock_from_jwk):
        """Google social login with a valid token creates a new user and returns a token."""
        self._mock_jwt_verification(mock_from_jwk, mock_get_header, mock_jwt_decode, mock_requests_get, self.google_payload)

        response = self.client.post("/api/v1/auth/social/", {
            "provider": "google",
            "token": "fake-google-id-token",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "google@example.com")
        self.assertTrue(User.objects.filter(email="google@example.com").exists())

    @patch("api.views.jwt.algorithms.RSAAlgorithm.from_jwk")
    @patch("api.views.jwt.get_unverified_header")
    @patch("api.views.jwt.decode")
    @patch("api.views.requests.get")
    def test_social_login_existing_user(self, mock_requests_get, mock_jwt_decode, mock_get_header, mock_from_jwk):
        """Social login with an email that already exists returns the existing user's token."""
        existing_user = User.objects.create_user(
            username="google@example.com",
            email="google@example.com",
            password="existingpass123",
            name="Existing User",
        )
        self._mock_jwt_verification(mock_from_jwk, mock_get_header, mock_jwt_decode, mock_requests_get, self.google_payload)

        response = self.client.post("/api/v1/auth/social/", {
            "provider": "google",
            "token": "fake-google-id-token",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["email"], "google@example.com")
        # Should NOT create a new user
        self.assertEqual(User.objects.filter(email="google@example.com").count(), 1)

    @patch("api.views.jwt.algorithms.RSAAlgorithm.from_jwk")
    @patch("api.views.jwt.get_unverified_header")
    @patch("api.views.jwt.decode")
    @patch("api.views.requests.get")
    def test_social_login_invalid_token(self, mock_requests_get, mock_jwt_decode, mock_get_header, mock_from_jwk):
        """Social login with an invalid token returns 401."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"keys": self.fake_jwks_keys}
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_requests_get.return_value = mock_response
        mock_get_header.return_value = {"kid": "test-kid"}
        mock_from_jwk.return_value = MagicMock()
        # Simulate JWT decode failure
        mock_jwt_decode.side_effect = pyjwt.PyJWTError("Invalid token")

        response = self.client.post("/api/v1/auth/social/", {
            "provider": "apple",
            "token": "invalid-token",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_social_login_missing_fields(self):
        """Social login without provider or token returns 400."""
        # Missing both
        response = self.client.post("/api/v1/auth/social/", {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing token
        response = self.client.post("/api/v1/auth/social/", {"provider": "apple"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Missing provider
        response = self.client.post("/api/v1/auth/social/", {"token": "some-token"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
