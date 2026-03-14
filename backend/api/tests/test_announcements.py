from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User, Mosque, Announcement, MosqueAdmin


class AnnouncementListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.mosque = Mosque.objects.create(
            name="Test Mosque",
            address="123 Main St",
            city="Test City",
            state="TS",
            country="US",
            latitude=40.7128,
            longitude=-74.0060,
        )
        self.user = User.objects.create_user(
            username="admin@test.com",
            email="admin@test.com",
            password="testpass123",
        )
        Announcement.objects.create(
            mosque=self.mosque,
            title="Friday Announcement",
            body="Important message for the community.",
            priority="normal",
            author=self.user,
        )
        Announcement.objects.create(
            mosque=self.mosque,
            title="Urgent Notice",
            body="Please read immediately.",
            priority="urgent",
            author=self.user,
        )

    def test_list_by_mosque_ids(self):
        response = self.client.get("/api/v1/announcements/", {
            "mosque_ids": str(self.mosque.id),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_list_without_mosque_ids(self):
        response = self.client.get("/api/v1/announcements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_expired_announcements_excluded(self):
        Announcement.objects.create(
            mosque=self.mosque,
            title="Expired",
            body="This has expired.",
            priority="normal",
            author=self.user,
            expires_at=timezone.now() - timezone.timedelta(days=1),
        )
        response = self.client.get("/api/v1/announcements/", {
            "mosque_ids": str(self.mosque.id),
        })
        titles = [a["title"] for a in response.data["results"]]
        self.assertNotIn("Expired", titles)


class AnnouncementCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="admin@test.com",
            email="admin@test.com",
            password="testpass123",
        )
        self.mosque = Mosque.objects.create(
            name="Test Mosque",
            address="123 Main St",
            city="Test City",
            state="TS",
            country="US",
            latitude=40.7128,
            longitude=-74.0060,
        )
        response = self.client.post("/api/v1/auth/login/", {
            "email": "admin@test.com",
            "password": "testpass123",
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
        # Make user a mosque admin so they can create announcements
        from core.models import MosqueAdmin
        MosqueAdmin.objects.create(user=self.user, mosque=self.mosque, role="admin")

    def test_create_announcement(self):
        response = self.client.post("/api/v1/announcements/", {
            "mosque": str(self.mosque.id),
            "title": "New Announcement",
            "body": "Test body content.",
            "priority": "normal",
        })
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    def test_create_unauthenticated(self):
        client = APIClient()
        response = client.post("/api/v1/announcements/", {
            "mosque": str(self.mosque.id),
            "title": "Should Fail",
            "body": "Unauthenticated.",
            "priority": "normal",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AnnouncementUpdateDeleteTests(TestCase):
    """Tests for PATCH and DELETE on /api/v1/announcements/{id}/"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="admin@test.com",
            email="admin@test.com",
            password="testpass123",
            name="Admin User",
        )
        self.mosque = Mosque.objects.create(
            name="Test Mosque",
            address="123 Main St",
            city="Test City",
            state="TS",
            country="US",
            latitude=40.7128,
            longitude=-74.0060,
        )
        MosqueAdmin.objects.create(user=self.user, mosque=self.mosque, role="admin")
        response = self.client.post("/api/v1/auth/login/", {
            "email": "admin@test.com",
            "password": "testpass123",
        })
        self.token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token}")

        self.announcement = Announcement.objects.create(
            mosque=self.mosque,
            title="Original Title",
            body="Original body content.",
            priority="normal",
            author=self.user,
        )

    def test_update_announcement(self):
        """PATCH updates the announcement fields."""
        response = self.client.patch(
            f"/api/v1/announcements/{self.announcement.id}/",
            {"title": "Updated Title"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.announcement.refresh_from_db()
        self.assertEqual(self.announcement.title, "Updated Title")
        # Body should remain unchanged
        self.assertEqual(self.announcement.body, "Original body content.")

    def test_update_announcement_unauthenticated(self):
        """Unauthenticated PATCH returns 401."""
        client = APIClient()
        response = client.patch(
            f"/api/v1/announcements/{self.announcement.id}/",
            {"title": "Hacked Title"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_announcement_non_admin(self):
        """Non-admin user cannot update announcements (403)."""
        other_user = User.objects.create_user(
            username="nonadmin@test.com",
            email="nonadmin@test.com",
            password="testpass123",
        )
        other_client = APIClient()
        response = other_client.post("/api/v1/auth/login/", {
            "email": "nonadmin@test.com",
            "password": "testpass123",
        })
        other_client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")

        response = other_client.patch(
            f"/api/v1/announcements/{self.announcement.id}/",
            {"title": "Should Fail"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_announcement(self):
        """DELETE removes the announcement."""
        ann_id = self.announcement.id
        response = self.client.delete(f"/api/v1/announcements/{ann_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Announcement.objects.filter(id=ann_id).exists())

    def test_delete_announcement_unauthenticated(self):
        """Unauthenticated DELETE returns 401."""
        client = APIClient()
        response = client.delete(f"/api/v1/announcements/{self.announcement.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
