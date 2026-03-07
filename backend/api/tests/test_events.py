from datetime import date, time
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User, Mosque, Event


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
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_category(self):
        response = self.client.get("/api/v1/events/", {
            "mosque_ids": str(self.mosque.id),
            "category": "youth",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Youth Night")

    def test_filter_by_from_date(self):
        response = self.client.get("/api/v1/events/", {
            "mosque_ids": str(self.mosque.id),
            "from_date": "2026-06-18",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["title"], "Youth Night")
