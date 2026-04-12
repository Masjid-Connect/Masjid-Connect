from datetime import date, time
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User, Mosque, Event, MosqueAdmin


class EventListTests(TestCase):
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
        Event.objects.create(
            mosque=self.mosque,
            title="Weekly Halaqa",
            description="Weekly gathering.",
            event_date=date(2026, 6, 15),
            start_time=time(19, 0),
            category="lesson",
            author=self.user,
        )
        Event.objects.create(
            mosque=self.mosque,
            title="Youth Night",
            description="Youth program.",
            event_date=date(2026, 6, 20),
            start_time=time(18, 0),
            category="youth",
            author=self.user,
        )

    def test_list_by_mosque_ids(self):
        response = self.client.get("/api/v1/events/", {
            "mosque_ids": str(self.mosque.id),
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totalItems"], 2)

    def test_filter_by_category(self):
        response = self.client.get("/api/v1/events/", {
            "mosque_ids": str(self.mosque.id),
            "category": "youth",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totalItems"], 1)
        self.assertEqual(response.data["items"][0]["title"], "Youth Night")

    def test_filter_by_from_date(self):
        response = self.client.get("/api/v1/events/", {
            "mosque_ids": str(self.mosque.id),
            "from_date": "2026-06-18",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["totalItems"], 1)
        self.assertEqual(response.data["items"][0]["title"], "Youth Night")


class EventCreateTests(TestCase):
    """Tests for POST /api/v1/events/"""

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

    def test_create_event(self):
        """Mosque admin can create an event."""
        response = self.client.post("/api/v1/events/", {
            "mosque": str(self.mosque.id),
            "title": "New Halaqa",
            "description": "A weekly study circle.",
            "event_date": "2026-07-01",
            "start_time": "19:00:00",
            "category": "lesson",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "New Halaqa")
        self.assertTrue(Event.objects.filter(title="New Halaqa").exists())

    def test_create_event_unauthenticated(self):
        """Unauthenticated user cannot create events."""
        client = APIClient()
        response = client.post("/api/v1/events/", {
            "mosque": str(self.mosque.id),
            "title": "Should Fail",
            "event_date": "2026-07-01",
            "start_time": "19:00:00",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_event_non_admin(self):
        """Non-admin user cannot create events (403)."""
        other_user = User.objects.create_user(
            username="regular@test.com",
            email="regular@test.com",
            password="testpass123",
        )
        other_client = APIClient()
        response = other_client.post("/api/v1/auth/login/", {
            "email": "regular@test.com",
            "password": "testpass123",
        })
        other_client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")

        response = other_client.post("/api/v1/events/", {
            "mosque": str(self.mosque.id),
            "title": "Unauthorized Event",
            "event_date": "2026-07-01",
            "start_time": "19:00:00",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class EventUpdateDeleteTests(TestCase):
    """Tests for PATCH and DELETE on /api/v1/events/{id}/"""

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

        self.event = Event.objects.create(
            mosque=self.mosque,
            title="Original Event",
            description="Original description.",
            event_date=date(2026, 7, 15),
            start_time=time(19, 0),
            category="lesson",
            author=self.user,
        )

    def test_update_event(self):
        """PATCH updates the event fields."""
        response = self.client.patch(
            f"/api/v1/events/{self.event.id}/",
            {"title": "Updated Event", "speaker": "Sheikh Ahmad"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.event.refresh_from_db()
        self.assertEqual(self.event.title, "Updated Event")
        self.assertEqual(self.event.speaker, "Sheikh Ahmad")
        # Description should remain unchanged
        self.assertEqual(self.event.description, "Original description.")

    def test_update_event_unauthenticated(self):
        """Unauthenticated PATCH returns 401."""
        client = APIClient()
        response = client.patch(
            f"/api/v1/events/{self.event.id}/",
            {"title": "Hacked"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_event_non_admin(self):
        """Non-admin user cannot update events (403)."""
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
            f"/api/v1/events/{self.event.id}/",
            {"title": "Should Fail"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_event(self):
        """DELETE removes the event."""
        event_id = self.event.id
        response = self.client.delete(f"/api/v1/events/{event_id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Event.objects.filter(id=event_id).exists())

    def test_delete_event_unauthenticated(self):
        """Unauthenticated DELETE returns 401."""
        client = APIClient()
        response = client.delete(f"/api/v1/events/{self.event.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
