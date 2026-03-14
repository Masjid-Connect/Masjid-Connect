from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User, Mosque, Announcement


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
