from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from core.models import VersionPolicy


class VersionPolicyEndpointTests(TestCase):
    """GET /api/v1/version-policy/ — public, AllowAny, returns the singleton."""

    def setUp(self):
        self.client = APIClient()

    def test_returns_200_on_first_call_and_creates_singleton(self):
        """A fresh deployment has no row yet — the endpoint must auto-create one."""
        self.assertEqual(VersionPolicy.objects.count(), 0)

        response = self.client.get("/api/v1/version-policy/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(VersionPolicy.objects.count(), 1)

    def test_response_shape_is_per_platform(self):
        """Response is split into ios/android sub-objects + a flat policy block.

        Mobile clients only consume their own platform. Keeping the shape
        explicit (rather than a flat list) means the client never accidentally
        compares iOS minimum against an Android version.
        """
        response = self.client.get("/api/v1/version-policy/")

        data = response.data
        self.assertIn("ios", data)
        self.assertIn("android", data)
        self.assertIn("policy", data)

        for platform in ("ios", "android"):
            self.assertIn("minimum", data[platform])
            self.assertIn("recommended", data[platform])
            self.assertIn("store_url", data[platform])

        self.assertIn("below_minimum", data["policy"])
        self.assertIn("below_recommended", data["policy"])

    def test_default_policy_is_safe(self):
        """Defaults must NOT lock anyone out.

        The block tier is reserved for documented break-glass events (security
        incident, contract break). A fresh deployment with default values must
        leave every existing client running.
        """
        response = self.client.get("/api/v1/version-policy/")

        data = response.data
        # minimum=1.0.0 means no shipped version is below it; block tier won't fire.
        self.assertEqual(data["ios"]["minimum"], "1.0.0")
        self.assertEqual(data["android"]["minimum"], "1.0.0")
        # Default behaviours match the design — block on minimum, soft on recommended.
        self.assertEqual(data["policy"]["below_minimum"], "block")
        self.assertEqual(data["policy"]["below_recommended"], "soft")

    def test_returns_admin_edited_values(self):
        """When staff bumps the policy via the admin, the API reflects the new values."""
        VersionPolicy.objects.create(
            ios_recommended="1.0.5",
            android_recommended="1.0.5",
            ios_minimum="1.0.0",
            android_minimum="1.0.0",
        )

        response = self.client.get("/api/v1/version-policy/")

        self.assertEqual(response.data["ios"]["recommended"], "1.0.5")
        self.assertEqual(response.data["android"]["recommended"], "1.0.5")

    def test_no_authentication_required(self):
        """The endpoint is public — clients fetch it before any sign-in.

        AllowAny + AnonRateThrottle (60/min) is the right combination: legit
        clients hit it twice per session at most, abuse is throttled.
        """
        # Fresh client with no auth header.
        anon = APIClient()
        response = anon.get("/api/v1/version-policy/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_singleton_enforced_on_save(self):
        """Multiple .create()/.save() calls all collapse onto pk=1."""
        VersionPolicy.objects.create(ios_recommended="1.0.5")
        VersionPolicy(ios_recommended="1.0.6").save()

        self.assertEqual(VersionPolicy.objects.count(), 1)
        # Last save wins — pk is forced to 1.
        self.assertEqual(VersionPolicy.objects.first().ios_recommended, "1.0.6")

    def test_singleton_refuses_deletion(self):
        """Calling .delete() on the singleton must be a no-op."""
        policy = VersionPolicy.solo()
        policy.delete()  # should NOT actually delete
        self.assertEqual(VersionPolicy.objects.count(), 1)
