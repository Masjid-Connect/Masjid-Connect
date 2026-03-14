from datetime import date, time

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import Mosque, MosquePrayerTime


class MosquePrayerTimeTests(TestCase):
    """Tests for GET /api/v1/mosques/{mosque_pk}/prayer-times/"""

    def setUp(self):
        self.client = APIClient()
        self.mosque = Mosque.objects.create(
            name="East London Mosque",
            address="82-92 Whitechapel Rd",
            city="London",
            state="",
            country="UK",
            latitude=51.5194,
            longitude=-0.0658,
        )
        # Create prayer times for several dates
        self.pt1 = MosquePrayerTime.objects.create(
            mosque=self.mosque,
            date=date(2026, 3, 14),
            fajr_jamat=time(5, 30),
            dhuhr_jamat=time(12, 30),
            asr_jamat=time(15, 45),
            maghrib_jamat=time(18, 15),
            isha_jamat=time(20, 0),
            fajr_start=time(5, 10),
            sunrise=time(6, 30),
        )
        self.pt2 = MosquePrayerTime.objects.create(
            mosque=self.mosque,
            date=date(2026, 3, 15),
            fajr_jamat=time(5, 28),
            dhuhr_jamat=time(12, 30),
            asr_jamat=time(15, 46),
            maghrib_jamat=time(18, 17),
            isha_jamat=time(20, 0),
        )
        self.pt3 = MosquePrayerTime.objects.create(
            mosque=self.mosque,
            date=date(2026, 3, 16),
            fajr_jamat=time(5, 26),
            dhuhr_jamat=time(12, 30),
            asr_jamat=time(15, 47),
            maghrib_jamat=time(18, 19),
            isha_jamat=time(20, 0),
        )

    def _url(self, mosque_id=None):
        mid = mosque_id or self.mosque.id
        return f"/api/v1/mosques/{mid}/prayer-times/"

    def test_list_prayer_times(self):
        """GET prayer-times for a mosque returns all entries."""
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 3)
        # Verify data structure includes jamat times
        first = results[0]
        self.assertIn("fajr_jamat", first)
        self.assertIn("dhuhr_jamat", first)
        self.assertIn("asr_jamat", first)
        self.assertIn("maghrib_jamat", first)
        self.assertIn("isha_jamat", first)
        self.assertIn("date", first)

    def test_filter_by_date(self):
        """?date=YYYY-MM-DD returns only that single date."""
        response = self.client.get(self._url(), {"date": "2026-03-15"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["date"], "2026-03-15")

    def test_filter_by_date_range(self):
        """?from_date=X&to_date=Y returns only dates in that inclusive range."""
        response = self.client.get(self._url(), {
            "from_date": "2026-03-14",
            "to_date": "2026-03-15",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)
        dates = [r["date"] for r in results]
        self.assertIn("2026-03-14", dates)
        self.assertIn("2026-03-15", dates)

    def test_filter_by_from_date_only(self):
        """?from_date=X returns all dates from X onwards."""
        response = self.client.get(self._url(), {"from_date": "2026-03-16"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["date"], "2026-03-16")

    def test_invalid_date_handled(self):
        """?date=invalid does not crash — returns empty or all results gracefully."""
        response = self.client.get(self._url(), {"date": "not-a-date"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Invalid date is ignored by parse_date, so it falls through to range filters
        # which are also absent — returns all results
        results = response.data.get("results", response.data)
        self.assertIsInstance(results, list)

    def test_no_prayer_times_for_other_mosque(self):
        """Prayer times for a different mosque are not returned."""
        other_mosque = Mosque.objects.create(
            name="Other Mosque",
            city="Manchester",
            country="UK",
            latitude=53.48,
            longitude=-2.24,
        )
        response = self.client.get(self._url(other_mosque.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 0)
