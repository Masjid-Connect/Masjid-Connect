"""Tests for the metadata gate that filters out non-masjid Stripe events.

Context: the production Stripe account is shared with at least Salafi
Bookstore. Their checkouts also fire `checkout.session.completed` webhooks
to api.salafimasjid.app/api/v1/stripe/webhook/. Without filtering, the
masjid handler would create phantom Donation rows from bookstore sales —
and crash whenever bookstore data didn't conform to the masjid Donation
schema (this caused 475 webhook 500s over 9 days, until Stripe disabled
the endpoint on ~2026-05-09).

The fix is `_is_masjid_donation_metadata` — checks for `app=masjid` (going
forward) or `donation_amount` (legacy). Handlers early-return for events
that don't pass the gate.
"""

from django.test import TestCase

from api.views import (
    _is_masjid_donation_metadata,
    _handle_checkout_completed,
    _handle_invoice_payment_succeeded,
)
from core.models import Donation


class IsMasjidDonationMetadataTests(TestCase):
    def test_app_masjid_signal_passes(self):
        self.assertTrue(_is_masjid_donation_metadata({"app": "masjid"}))

    def test_legacy_donation_amount_signal_passes(self):
        # Older masjid donations were created before the `app` field; they
        # always had `donation_amount` set. Must still pass the gate.
        self.assertTrue(_is_masjid_donation_metadata({"donation_amount": "1000"}))

    def test_both_signals_passes(self):
        self.assertTrue(_is_masjid_donation_metadata(
            {"app": "masjid", "donation_amount": "1000"}
        ))

    def test_empty_metadata_blocked(self):
        # Bookstore checkouts have no metadata at all — must NOT enter the
        # masjid donation pipeline.
        self.assertFalse(_is_masjid_donation_metadata({}))

    def test_none_metadata_blocked(self):
        self.assertFalse(_is_masjid_donation_metadata(None))

    def test_unrelated_metadata_blocked(self):
        # Bookstore happens to set its own metadata (e.g. order_id) — that
        # alone must not be mistaken for a masjid signal.
        self.assertFalse(_is_masjid_donation_metadata({"order_id": "12345"}))

    def test_other_app_value_blocked(self):
        # If someone sets app=bookstore explicitly, definitely not masjid.
        self.assertFalse(_is_masjid_donation_metadata({"app": "bookstore"}))

    def test_empty_donation_amount_blocked(self):
        # Falsy donation_amount (empty string) should not count — guard
        # against zero-byte writes from bad client code.
        self.assertFalse(_is_masjid_donation_metadata({"donation_amount": ""}))


class CheckoutCompletedHandlerGateTests(TestCase):
    """Verify _handle_checkout_completed early-returns for non-masjid events."""

    def _bookstore_session(self) -> dict:
        return {
            "id": "cs_test_bookstore_xyz",
            "customer_email": "buyer@example.com",
            "amount_total": 4500,
            "currency": "gbp",
            # Bookstore metadata: no app=masjid, no donation_amount.
            "metadata": {"order_id": "ORD-1234", "product": "book"},
            "customer_details": {
                "email": "buyer@example.com",
                "name": "Bookstore Buyer",
                "address": {"country": "GB"},
            },
        }

    def _masjid_session(self) -> dict:
        return {
            "id": "cs_test_masjid_xyz",
            "customer_email": "donor@example.com",
            "amount_total": 1000,
            "currency": "gbp",
            "metadata": {
                "app": "masjid",
                "frequency": "one-time",
                "source": "website",
                "gift_aid": "no",
                "cover_fees": "no",
                "donation_amount": "1000",
            },
            "customer_details": {
                "email": "donor@example.com",
                "name": "Masjid Donor",
                "address": {"country": "GB"},
            },
        }

    def test_bookstore_session_creates_no_donation(self):
        """The whole point of the fix — bookstore checkouts must not create
        Donation rows in the masjid database."""
        self.assertEqual(Donation.objects.count(), 0)
        _handle_checkout_completed(self._bookstore_session())
        self.assertEqual(Donation.objects.count(), 0)

    def test_masjid_session_creates_a_donation(self):
        """The gate must NOT block legitimate masjid donations."""
        self.assertEqual(Donation.objects.count(), 0)
        _handle_checkout_completed(self._masjid_session())
        self.assertEqual(Donation.objects.count(), 1)

        donation = Donation.objects.first()
        self.assertEqual(donation.donor_email, "donor@example.com")
        self.assertEqual(donation.amount_pence, 1000)

    def test_legacy_session_without_app_field_still_works(self):
        """Donations from before the `app=masjid` field was added still pass —
        they have donation_amount set, which is the legacy gate."""
        legacy = self._masjid_session()
        del legacy["metadata"]["app"]  # simulate pre-fix donation
        _handle_checkout_completed(legacy)
        self.assertEqual(Donation.objects.count(), 1)


class InvoicePaymentSucceededHandlerGateTests(TestCase):
    def test_bookstore_invoice_creates_no_donation(self):
        bookstore_invoice = {
            "id": "in_test_bookstore",
            "amount_paid": 4500,
            "currency": "gbp",
            "metadata": {"order_id": "ORD-1234"},
        }
        self.assertEqual(Donation.objects.count(), 0)
        _handle_invoice_payment_succeeded(bookstore_invoice)
        self.assertEqual(Donation.objects.count(), 0)

    def test_masjid_invoice_creates_a_donation(self):
        masjid_invoice = {
            "id": "in_test_masjid",
            "amount_paid": 1500,
            "currency": "gbp",
            "customer_email": "monthly@example.com",
            "metadata": {
                "app": "masjid",
                "donation_amount": "1500",
                "frequency": "monthly",
            },
            "customer_address": {"country": "GB"},
        }
        _handle_invoice_payment_succeeded(masjid_invoice)
        self.assertEqual(Donation.objects.count(), 1)
        d = Donation.objects.first()
        self.assertEqual(d.amount_pence, 1500)
        self.assertEqual(d.frequency, Donation.Frequency.MONTHLY)

    def test_invoice_with_subscription_details_metadata_passes(self):
        """Some Stripe API versions inline subscription metadata under
        `subscription_details.metadata` rather than on the invoice directly.
        The handler must check there too."""
        invoice = {
            "id": "in_test_sub_details",
            "amount_paid": 2000,
            "currency": "gbp",
            "customer_email": "sub@example.com",
            "metadata": {},  # invoice metadata empty
            "subscription_details": {
                "metadata": {"app": "masjid", "donation_amount": "2000"},
            },
            "customer_address": {"country": "GB"},
        }
        _handle_invoice_payment_succeeded(invoice)
        self.assertEqual(Donation.objects.count(), 1)
