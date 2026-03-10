from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Mosque


class MosqueListTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        Mosque.objects.create(
            name="Masjid Al-Haram",
            address="Al Haram",
            city="Makkah",
            state="Makkah",
            country="Saudi Arabia",
            latitude=21.4225,
            longitude=39.8262,
        )
        Mosque.objects.create(
            name="Masjid An-Nabawi",
            address="Al Madinah",
            city="Madinah",
            state="Madinah",
            country="Saudi Arabia",
            latitude=24.4672,
            longitude=39.6112,
        )

    def test_list_all_mosques(self):
        response = self.client.get("/api/v1/mosques/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_city(self):
        response = self.client.get("/api/v1/mosques/", {"city": "Makkah"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Masjid Al-Haram")

    def test_search_by_name(self):
        response = self.client.get("/api/v1/mosques/", {"search": "Nabawi"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


class MosqueDetailTests(TestCase):
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

    def test_get_detail(self):
        response = self.client.get(f"/api/v1/mosques/{self.mosque.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Test Mosque")


class MosqueNearbyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Mosque in Makkah
        Mosque.objects.create(
            name="Close Mosque",
            address="Close",
            city="Makkah",
            state="Makkah",
            country="SA",
            latitude=21.4225,
            longitude=39.8262,
        )
        # Mosque far away
        Mosque.objects.create(
            name="Far Mosque",
            address="Far",
            city="London",
            state="London",
            country="UK",
            latitude=51.5074,
            longitude=-0.1278,
        )

    def test_nearby_returns_close_mosques(self):
        response = self.client.get("/api/v1/mosques/nearby/", {
            "lat": 21.4225,
            "lng": 39.8262,
            "radius": 10,
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        names = [m["name"] for m in results]
        self.assertIn("Close Mosque", names)
        self.assertNotIn("Far Mosque", names)
