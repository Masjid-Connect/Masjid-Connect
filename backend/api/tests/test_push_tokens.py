from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import PushToken, User


class PushTokenTests(TestCase):
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

    def test_register_push_token_ios(self):
        """Register a push token for iOS."""
        response = self.client.post("/api/v1/push-tokens/", {
            "token": "ExponentPushToken[ios-device-123]",
            "platform": "ios",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["platform"], "ios")
        self.assertEqual(response.data["token"], "ExponentPushToken[ios-device-123]")
        self.assertTrue(
            PushToken.objects.filter(
                user=self.user,
                token="ExponentPushToken[ios-device-123]",
                platform="ios",
            ).exists()
        )

    def test_register_push_token_android(self):
        """Register a push token for Android."""
        response = self.client.post("/api/v1/push-tokens/", {
            "token": "ExponentPushToken[android-device-456]",
            "platform": "android",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["platform"], "android")
        self.assertEqual(response.data["token"], "ExponentPushToken[android-device-456]")
        self.assertTrue(
            PushToken.objects.filter(
                user=self.user,
                token="ExponentPushToken[android-device-456]",
                platform="android",
            ).exists()
        )

    def test_register_push_token_unauthenticated(self):
        """Anonymous users can register push tokens. The app registers early
        (before sign-in) so announcements and prayer-time reminders reach the
        device regardless of auth state. The stored row has user=None until a
        later sign-in links it."""
        client = APIClient()
        response = client.post("/api/v1/push-tokens/", {
            "token": "ExponentPushToken[unauth-test]",
            "platform": "ios",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["token"], "ExponentPushToken[unauth-test]")

    def test_update_existing_push_token(self):
        """Re-registering the same token with a different platform updates it."""
        # First registration as iOS
        response1 = self.client.post("/api/v1/push-tokens/", {
            "token": "ExponentPushToken[shared-device]",
            "platform": "ios",
        })
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)

        # Second registration with same token but different platform
        response2 = self.client.post("/api/v1/push-tokens/", {
            "token": "ExponentPushToken[shared-device]",
            "platform": "android",
        })
        self.assertEqual(response2.status_code, status.HTTP_200_OK)

        # Should still be only one record for this token
        tokens = PushToken.objects.filter(token="ExponentPushToken[shared-device]")
        self.assertEqual(tokens.count(), 1)
        self.assertEqual(tokens.first().platform, "android")
