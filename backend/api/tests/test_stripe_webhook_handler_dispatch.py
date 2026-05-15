"""Regression test for the StripeObject -> handler dispatch crash.

Sentry 2026-05-15 production crash: ``AttributeError: get`` raised inside
``_handle_subscription_deleted`` when it called ``subscription.get("customer")``.
Root cause: ``stripe_webhook`` was dispatching with
``data_object = event["data"]["object"]`` -- in stripe-python 15.x that
is a ``stripe.StripeObject``, which does not expose ``.get()``. Every
handler uses dict ``.get(...)``, so every event type hits the same wall.

The previous fix (b2f413d) addressed ``.get()`` only on the top-level
event envelope (via ``_safe_event_field``). Handlers were left exposed.

The structural gap was the existing test surface: every test passed
plain ``dict``s straight to the inner handlers, so the StripeObject path
was never exercised. This file closes that gap by driving the *view*
end-to-end with a real ``stripe.Event`` constructed exactly the way
``stripe.Webhook.construct_event`` constructs it in production.

If the dispatcher ever regresses to using the raw ``StripeObject``,
every test in this file will fail with ``AttributeError: get``.
"""
import json
from unittest.mock import patch

import stripe
from django.test import TestCase, override_settings
from django.urls import reverse

from core.models import Donation, StripeEvent


WEBHOOK_URL = reverse("stripe-webhook")
DUMMY_SECRET = "whsec_test_dummy"


def _send(event_dict: dict, client) -> "tuple[int, str]":
    """POST a Stripe event through the view exactly like production.

    Patches ``stripe.Webhook.construct_event`` to return a real
    ``stripe.Event`` (the same shape ``construct_from`` produces inside
    the SDK), so the view sees a real ``StripeObject`` and not a dict
    convenience that papers over the bug.
    """
    body = json.dumps(event_dict).encode("utf-8")
    event = stripe.Event.construct_from(event_dict, key=None)
    with patch("stripe.Webhook.construct_event", return_value=event):
        response = client.post(
            WEBHOOK_URL,
            data=body,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=1,v1=dummy",
        )
    return response.status_code, response.content.decode("utf-8")


@override_settings(STRIPE_WEBHOOK_SECRET=DUMMY_SECRET)
class StripeObjectDispatchTests(TestCase):
    """Every handler must survive receiving data parsed from a real
    ``stripe.Event``. Pre-fix: each one raised ``AttributeError: get``."""

    def test_subscription_deleted_does_not_crash(self):
        """The exact failure mode reported in Sentry 2026-05-15."""
        status_code, body = _send(
            {
                "id": "evt_test_sub_deleted",
                "object": "event",
                "type": "customer.subscription.deleted",
                "data": {
                    "object": {
                        "id": "sub_test_xyz",
                        "customer": "cus_test_xyz",
                        "status": "canceled",
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)
        self.assertTrue(
            StripeEvent.objects.filter(stripe_event_id="evt_test_sub_deleted").exists()
        )
        self.assertTrue(
            StripeEvent.objects.get(stripe_event_id="evt_test_sub_deleted").processed
        )

    def test_subscription_created_does_not_crash(self):
        status_code, body = _send(
            {
                "id": "evt_test_sub_created",
                "object": "event",
                "type": "customer.subscription.created",
                "data": {
                    "object": {
                        "id": "sub_new_xyz",
                        "customer": "cus_xyz",
                        "status": "active",
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)
        self.assertTrue(
            StripeEvent.objects.filter(stripe_event_id="evt_test_sub_created").exists()
        )

    def test_invoice_payment_succeeded_masjid_creates_donation(self):
        """A masjid recurring payment must dispatch and reach the DB.

        Proves dispatch works for the path that actually creates donor
        rows -- the original 9-day outage was here."""
        status_code, body = _send(
            {
                "id": "evt_test_invoice_paid",
                "object": "event",
                "type": "invoice.payment_succeeded",
                "data": {
                    "object": {
                        "id": "in_test_masjid",
                        "customer": "cus_recurring",
                        "customer_email": "monthly@example.com",
                        "customer_name": "Monthly Donor",
                        "customer_address": {
                            "line1": "1 Test St",
                            "city": "Birmingham",
                            "postal_code": "B1 1AA",
                            "country": "GB",
                        },
                        "amount_paid": 1500,
                        "currency": "gbp",
                        "metadata": {
                            "app": "masjid",
                            "donation_amount": "1500",
                            "frequency": "monthly",
                        },
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)
        self.assertEqual(Donation.objects.count(), 1)
        donation = Donation.objects.first()
        self.assertEqual(donation.amount_pence, 1500)
        self.assertEqual(donation.donor_email, "monthly@example.com")
        self.assertEqual(donation.donor_postcode, "B1 1AA")

    def test_invoice_payment_succeeded_bookstore_creates_no_donation(self):
        """Bookstore invoices (no masjid metadata) must be filtered without
        crashing on .get."""
        status_code, body = _send(
            {
                "id": "evt_test_invoice_bookstore",
                "object": "event",
                "type": "invoice.payment_succeeded",
                "data": {
                    "object": {
                        "id": "in_test_bookstore",
                        "amount_paid": 4500,
                        "currency": "gbp",
                        "metadata": {"order_id": "ORD-99"},
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)
        self.assertEqual(Donation.objects.count(), 0)

    def test_invoice_payment_failed_does_not_crash(self):
        status_code, body = _send(
            {
                "id": "evt_test_invoice_failed",
                "object": "event",
                "type": "invoice.payment_failed",
                "data": {
                    "object": {
                        "id": "in_test_failed",
                        "customer_email": "donor@example.com",
                        "attempt_count": 2,
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)

    def test_charge_refunded_does_not_crash(self):
        status_code, body = _send(
            {
                "id": "evt_test_charge_refund",
                "object": "event",
                "type": "charge.refunded",
                "data": {
                    "object": {
                        "id": "ch_test_xyz",
                        "payment_intent": "pi_does_not_exist_in_db",
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)

    def test_payment_intent_succeeded_does_not_crash(self):
        status_code, body = _send(
            {
                "id": "evt_test_pi_succeeded",
                "object": "event",
                "type": "payment_intent.succeeded",
                "data": {
                    "object": {
                        "id": "pi_test_xyz",
                        "amount": 1000,
                        "currency": "gbp",
                        "metadata": {"frequency": "one-time"},
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)

    def test_checkout_completed_masjid_creates_donation(self):
        status_code, body = _send(
            {
                "id": "evt_test_checkout",
                "object": "event",
                "type": "checkout.session.completed",
                "data": {
                    "object": {
                        "id": "cs_test_xyz",
                        "amount_total": 2500,
                        "currency": "gbp",
                        "customer": "cus_x",
                        "payment_intent": "pi_x",
                        "customer_email": "donor@example.com",
                        "customer_details": {
                            "email": "donor@example.com",
                            "name": "Test Donor",
                            "address": {
                                "line1": "10 Test St",
                                "city": "Birmingham",
                                "postal_code": "B2 2BB",
                                "country": "GB",
                            },
                        },
                        "metadata": {
                            "app": "masjid",
                            "frequency": "one-time",
                            "donation_amount": "2500",
                            "gift_aid": "no",
                        },
                    },
                },
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)
        self.assertEqual(Donation.objects.count(), 1)
        d = Donation.objects.first()
        self.assertEqual(d.amount_pence, 2500)


@override_settings(STRIPE_WEBHOOK_SECRET=DUMMY_SECRET)
class DispatchGuardsTests(TestCase):
    """Behaviour at the edges of the dispatch path."""

    def test_duplicate_event_id_is_idempotent(self):
        event_dict = {
            "id": "evt_test_dupe",
            "object": "event",
            "type": "customer.subscription.deleted",
            "data": {
                "object": {"id": "sub_dupe", "customer": "cus_dupe"},
            },
        }

        first_status, _ = _send(event_dict, self.client)
        second_status, second_body = _send(event_dict, self.client)

        self.assertEqual(first_status, 200)
        self.assertEqual(second_status, 200)
        self.assertIn("Already processed", second_body)
        self.assertEqual(
            StripeEvent.objects.filter(stripe_event_id="evt_test_dupe").count(), 1
        )

    def test_unhandled_event_type_records_audit_and_returns_200(self):
        """An event type we don't dispatch must still record the audit row
        and not crash, even though every field is a StripeObject."""
        status_code, body = _send(
            {
                "id": "evt_test_unhandled",
                "object": "event",
                "type": "customer.updated",
                "data": {"object": {"id": "cus_test", "email": "x@example.com"}},
            },
            self.client,
        )

        self.assertEqual(status_code, 200, body)
        self.assertTrue(
            StripeEvent.objects.get(stripe_event_id="evt_test_unhandled").processed
        )
