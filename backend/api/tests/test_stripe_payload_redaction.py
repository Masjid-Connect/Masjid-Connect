"""Tests for `_redact_pii` — the masker applied to StripeEvent.payload.

Context: the Donation table is the canonical store for donor PII (needed
for Gift Aid filing). StripeEvent.payload is for webhook debugging only —
it does not need a second copy of names, emails, addresses, phones. UK GDPR
data minimisation principle says we shouldn't keep what we don't need.

The redactor walks the payload recursively, masks values whose keys are
in a conservative blocklist, and leaves everything else (IDs, amounts,
metadata, timestamps, status) intact so debugging is still possible.
"""
from django.test import TestCase

from api.views import _redact_pii, _STRIPE_PAYLOAD_PII_KEYS


class RedactPiiMasksKnownKeys(TestCase):
    def test_masks_top_level_email(self):
        result = _redact_pii({"customer_email": "donor@example.com", "id": "cs_123"})
        self.assertEqual(result["customer_email"], "[redacted]")
        self.assertEqual(result["id"], "cs_123")

    def test_masks_every_listed_key_at_top_level(self):
        payload = {key: "sensitive" for key in _STRIPE_PAYLOAD_PII_KEYS}
        payload["amount_total"] = 1000  # one non-PII key as a control

        result = _redact_pii(payload)

        for key in _STRIPE_PAYLOAD_PII_KEYS:
            self.assertEqual(
                result[key], "[redacted]",
                f"PII key '{key}' was not masked",
            )
        self.assertEqual(result["amount_total"], 1000)


class RedactPiiPreservesAuditFields(TestCase):
    """Object IDs, amounts, metadata, status — kept so we can still
    triage donations from the audit row alone."""

    def test_preserves_stripe_object_ids(self):
        payload = {
            "id": "cs_test_123",
            "payment_intent": "pi_test_456",
            "customer": "cus_test_789",
            "invoice": "in_test_abc",
            "charge": "ch_test_def",
            "subscription": "sub_test_xyz",
        }
        self.assertEqual(_redact_pii(payload), payload)

    def test_preserves_amounts_and_status(self):
        payload = {
            "amount_total": 1000,
            "amount_paid": 500,
            "amount_refunded": 0,
            "currency": "gbp",
            "status": "complete",
            "payment_status": "paid",
            "livemode": True,
            "refunded": False,
        }
        self.assertEqual(_redact_pii(payload), payload)

    def test_preserves_metadata_intact(self):
        """Metadata is OUR data — the gate signals (`app=masjid`,
        `donation_amount`) live here. Must survive untouched."""
        payload = {
            "metadata": {
                "app": "masjid",
                "donation_amount": "1000",
                "frequency": "one-time",
                "gift_aid": "yes",
            },
        }
        result = _redact_pii(payload)
        self.assertEqual(result["metadata"]["app"], "masjid")
        self.assertEqual(result["metadata"]["donation_amount"], "1000")
        self.assertEqual(result["metadata"]["gift_aid"], "yes")


class RedactPiiHandlesNestedStructures(TestCase):
    def test_masks_deeply_nested_email(self):
        payload = {
            "object": {
                "id": "cs_test",
                "amount_total": 1000,
                "customer_details": "would-also-be-masked-as-a-whole",
            },
        }
        result = _redact_pii(payload)
        self.assertEqual(result["object"]["customer_details"], "[redacted]")
        self.assertEqual(result["object"]["amount_total"], 1000)

    def test_realistic_checkout_session(self):
        """The shape Stripe actually sends for checkout.session.completed."""
        payload = {
            "object": {
                "id": "cs_test_realistic",
                "amount_total": 5000,
                "currency": "gbp",
                "status": "complete",
                "customer": "cus_xyz",
                "payment_intent": "pi_xyz",
                "customer_email": "donor@example.com",
                "customer_details": {
                    "email": "donor@example.com",
                    "name": "Test Donor",
                    "phone": "+44...",
                    "address": {"line1": "1 High St", "postal_code": "B1 1AA"},
                },
                "metadata": {"app": "masjid", "donation_amount": "5000"},
            },
        }

        result = _redact_pii(payload)
        obj = result["object"]

        # PII masked
        self.assertEqual(obj["customer_email"], "[redacted]")
        self.assertEqual(obj["customer_details"], "[redacted]")
        # Audit fields intact
        self.assertEqual(obj["id"], "cs_test_realistic")
        self.assertEqual(obj["amount_total"], 5000)
        self.assertEqual(obj["customer"], "cus_xyz")
        self.assertEqual(obj["payment_intent"], "pi_xyz")
        self.assertEqual(obj["status"], "complete")
        self.assertEqual(obj["metadata"]["app"], "masjid")
        self.assertEqual(obj["metadata"]["donation_amount"], "5000")

    def test_walks_into_lists(self):
        """Stripe events have list-of-dicts in fields like `line_items`.
        PII inside list items must also be masked."""
        payload = {
            "line_items": [
                {"id": "li_1", "amount": 100, "name": "Donation"},
                {"id": "li_2", "amount": 200, "name": "Tip"},
            ],
        }

        result = _redact_pii(payload)

        self.assertEqual(result["line_items"][0]["name"], "[redacted]")
        self.assertEqual(result["line_items"][0]["amount"], 100)
        self.assertEqual(result["line_items"][1]["name"], "[redacted]")


class RedactPiiHandlesEdgeCases(TestCase):
    def test_empty_dict(self):
        self.assertEqual(_redact_pii({}), {})

    def test_non_dict_top_level_returned_as_is(self):
        self.assertEqual(_redact_pii("a string"), "a string")
        self.assertEqual(_redact_pii(42), 42)
        self.assertEqual(_redact_pii(None), None)

    def test_none_value_inside_pii_key_still_masked(self):
        """If Stripe sends a null email, the key is still in the blocklist,
        so we still mask — defensive against future changes that might
        send placeholder nulls."""
        result = _redact_pii({"email": None, "id": "cs_1"})
        self.assertEqual(result["email"], "[redacted]")
        self.assertEqual(result["id"], "cs_1")
