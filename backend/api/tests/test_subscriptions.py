from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from core.models import Mosque, User, UserSubscription


class SubscriptionTests(TestCase):
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

        self.mosque = Mosque.objects.create(
            name="Test Mosque",
            city="London",
            country="UK",
            latitude=51.5,
            longitude=-0.1,
        )
        self.mosque2 = Mosque.objects.create(
            name="Second Mosque",
            city="Birmingham",
            country="UK",
            latitude=52.5,
            longitude=-1.9,
        )

    def test_list_subscriptions_authenticated(self):
        """Authenticated user can list their subscriptions."""
        UserSubscription.objects.create(user=self.user, mosque=self.mosque)
        UserSubscription.objects.create(user=self.user, mosque=self.mosque2)

        response = self.client.get("/api/v1/subscriptions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # DRF may paginate; check results key or direct list
        results = response.data.get("results", response.data)
        self.assertEqual(len(results), 2)

    def test_list_subscriptions_unauthenticated(self):
        """Unauthenticated request to list subscriptions returns 401."""
        client = APIClient()
        response = client.get("/api/v1/subscriptions/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_subscription(self):
        """Authenticated user can subscribe to a mosque."""
        response = self.client.post("/api/v1/subscriptions/", {
            "mosque": str(self.mosque.id),
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(response.data["mosque"]), str(self.mosque.id))
        self.assertTrue(
            UserSubscription.objects.filter(user=self.user, mosque=self.mosque).exists()
        )

    def test_create_duplicate_subscription(self):
        """Creating a duplicate subscription should fail (unique_together)."""
        UserSubscription.objects.create(user=self.user, mosque=self.mosque)

        response = self.client.post("/api/v1/subscriptions/", {
            "mosque": str(self.mosque.id),
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_subscription(self):
        """Authenticated user can unsubscribe from a mosque."""
        sub = UserSubscription.objects.create(user=self.user, mosque=self.mosque)

        response = self.client.delete(f"/api/v1/subscriptions/{sub.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            UserSubscription.objects.filter(id=sub.id).exists()
        )

    def test_update_preferences(self):
        """PATCH a subscription to update notification preferences."""
        sub = UserSubscription.objects.create(
            user=self.user,
            mosque=self.mosque,
            notify_prayers=True,
        )

        response = self.client.patch(
            f"/api/v1/subscriptions/{sub.id}/",
            {"notify_prayers": False},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        sub.refresh_from_db()
        self.assertFalse(sub.notify_prayers)
