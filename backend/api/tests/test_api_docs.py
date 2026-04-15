"""
/api/docs/ and /api/schema/ must be gated behind a Django staff session.

Exposing the OpenAPI schema publicly hands attackers the full endpoint map
(including admin-adjacent routes like /api/v1/gift-aid/summary/). The gate
uses `staff_member_required`, which redirects unauthenticated and non-staff
requests to the Django admin login page.

Seat 9 (Elena Voronova, Security) + Seat 16 (Dr. Rachel Kim, QA) required
this test when the gate landed.
"""

from django.test import TestCase, Client

from core.models import User


class ApiDocsAccessTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.regular_user = User.objects.create_user(
            username="regular@test.com",
            email="regular@test.com",
            password="testpass123",
            name="Regular User",
        )
        self.staff_user = User.objects.create_user(
            username="staff@test.com",
            email="staff@test.com",
            password="testpass123",
            name="Staff User",
            is_staff=True,
        )

    # ── /api/docs/ (Swagger UI HTML) ────────────────────────────

    def test_docs_anonymous_redirects_to_login(self):
        """An unauthenticated request must not see the Swagger UI."""
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response["Location"])

    def test_docs_regular_user_redirects_to_login(self):
        """A non-staff authenticated user must not see the Swagger UI."""
        self.client.force_login(self.regular_user)
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response["Location"])

    def test_docs_staff_user_sees_swagger_html(self):
        """A staff user sees the Swagger UI HTML."""
        self.client.force_login(self.staff_user)
        response = self.client.get("/api/docs/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"swagger-ui", response.content)

    # ── /api/schema/ (raw OpenAPI YAML) ─────────────────────────

    def test_schema_anonymous_redirects_to_login(self):
        """Gating /api/docs/ alone is insufficient — Swagger UI loads the
        schema client-side, so a public schema endpoint leaks everything
        regardless. The schema must be gated too."""
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 302)
        self.assertIn("/admin/login/", response["Location"])

    def test_schema_regular_user_redirects_to_login(self):
        self.client.force_login(self.regular_user)
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 302)

    def test_schema_staff_user_sees_openapi_yaml(self):
        self.client.force_login(self.staff_user)
        response = self.client.get("/api/schema/")
        self.assertEqual(response.status_code, 200)
        # The schema is served as OpenAPI YAML (or JSON with format=json).
        body = response.content.decode()
        self.assertIn("openapi:", body)
        self.assertIn("The Salafi Masjid API", body)

    # ── api_root no longer advertises docs publicly ─────────────

    def test_api_root_does_not_advertise_docs_publicly(self):
        """The root endpoint must not expose the docs URL to anonymous
        callers — it used to and that effectively signposted attackers."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertNotIn("docs", body)
