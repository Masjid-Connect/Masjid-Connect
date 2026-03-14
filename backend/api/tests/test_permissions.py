from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Mosque, MosqueAdmin, User


class AnnouncementPermissionTests(TestCase):
    def setUp(self):
        self.mosque = Mosque.objects.create(
            name="Test Mosque",
            city="London",
            country="UK",
            latitude=51.5,
            longitude=-0.1,
        )

        # Regular user (no mosque admin role)
        self.regular_user = User.objects.create_user(
            username="regular@test.com",
            email="regular@test.com",
            password="testpass123",
            name="Regular User",
        )

        # Mosque admin user
        self.admin_user = User.objects.create_user(
            username="admin@test.com",
            email="admin@test.com",
            password="testpass123",
            name="Admin User",
        )
        MosqueAdmin.objects.create(
            mosque=self.mosque,
            user=self.admin_user,
            role="admin",
        )

        # Staff user (Django staff, not mosque admin)
        self.staff_user = User.objects.create_user(
            username="staff@test.com",
            email="staff@test.com",
            password="testpass123",
            name="Staff User",
            is_staff=True,
        )

        self.announcement_data = {
            "mosque": str(self.mosque.id),
            "title": "Test Announcement",
            "body": "This is a test announcement body.",
        }

    def _get_auth_client(self, email, password="testpass123"):
        """Helper to create an authenticated API client."""
        client = APIClient()
        response = client.post("/api/v1/auth/login/", {
            "email": email,
            "password": password,
        })
        client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
        return client

    def test_mosque_admin_can_create_announcement(self):
        """A user with MosqueAdmin role for the mosque can create an announcement."""
        client = self._get_auth_client("admin@test.com")
        response = client.post("/api/v1/announcements/", self.announcement_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Test Announcement")

    def test_non_admin_cannot_create_announcement(self):
        """A regular authenticated user without MosqueAdmin role cannot create."""
        client = self._get_auth_client("regular@test.com")
        response = client.post("/api/v1/announcements/", self.announcement_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_create_announcement(self):
        """A Django staff user can create announcements regardless of MosqueAdmin role."""
        client = self._get_auth_client("staff@test.com")
        response = client.post("/api/v1/announcements/", self.announcement_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_unauthenticated_can_read_announcements(self):
        """Unauthenticated users can read (list) announcements."""
        client = APIClient()
        response = client.get("/api/v1/announcements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
