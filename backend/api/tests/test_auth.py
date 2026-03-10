from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User


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
