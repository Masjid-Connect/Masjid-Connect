"""Regression test for the StripeObject → JSONField serialization bug.

History: between 2026-05-09 and 2026-05-13, every Stripe webhook event
returned HTTP 500. Root cause in ``backend/api/views.py``:

    StripeEvent.objects.get_or_create(
        ...,
        defaults={"payload": event["data"]},   # ← a stripe.StripeObject,
    )                                          #    not a plain dict.

Django's ``JSONField`` calls ``json.dumps`` on writes, and the stdlib JSON
encoder doesn't know how to serialise ``stripe.StripeObject``. Result:
``TypeError: Object of type Data is not JSON serializable`` — uncaught,
re-raised past DRF, Django served HTML 500, Stripe recorded 447 failed
deliveries.

The existing test suite passed plain dicts to the inner handlers, never
exercising the StripeObject path the production webhook actually receives.
This file fills that gap.
"""
import json

import stripe
from django.test import TestCase

from api.views import _safe_serialize_stripe_payload
from core.models import StripeEvent


def _real_stripe_event() -> stripe.Event:
    """Return a ``stripe.Event`` constructed the way production does it.

    ``stripe.Webhook.construct_event`` internally calls
    ``stripe.Event.construct_from(parsed_json, secret)``, which converts
    every nested dict into a ``StripeObject``. Tests that hand-build a
    plain dict bypass this and never see the real shape.
    """
    raw = {
        "id": "evt_test_serialization",
        "object": "event",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_serialization",
                "amount_total": 1000,
                "currency": "gbp",
                "metadata": {
                    "app": "masjid",
                    "donation_amount": "1000",
                },
            },
        },
    }
    return stripe.Event.construct_from(raw, key=None)


class SafeSerializeReturnsJsonable(TestCase):
    """Tier 1 of the helper — the canonical path for healthy events."""

    def test_returns_a_plain_dict(self):
        event = _real_stripe_event()
        raw_body = b'{"id":"evt_test_serialization"}'

        result = _safe_serialize_stripe_payload(event, raw_body)

        self.assertIsInstance(result, dict)

    def test_result_round_trips_through_json_dumps(self):
        """The exact assertion the original bug would have failed."""
        event = _real_stripe_event()
        raw_body = b'{"id":"evt_test_serialization"}'

        result = _safe_serialize_stripe_payload(event, raw_body)
        json.dumps(result)  # would raise TypeError pre-fix

    def test_payload_writes_to_jsonfield(self):
        """End-to-end: real StripeObject → helper → DB write must succeed."""
        event = _real_stripe_event()
        raw_body = b'{"id":"evt_test_serialization"}'

        StripeEvent.objects.create(
            stripe_event_id=event["id"],
            event_type=event["type"],
            processed=False,
            payload=_safe_serialize_stripe_payload(event, raw_body),
        )

        saved = StripeEvent.objects.get(stripe_event_id=event["id"])
        self.assertEqual(saved.payload["object"]["amount_total"], 1000)
        self.assertEqual(saved.payload["object"]["metadata"]["app"], "masjid")


class SafeSerializeFallsBackToRawBody(TestCase):
    """Tier 2 — if ``to_dict_recursive`` ever disappears or raises, we
    recover the payload from the raw signed request bytes."""

    def test_uses_raw_body_when_method_missing(self):
        class FutureSDKShape:
            """Mimics a future stripe-python that drops ``to_dict_recursive``."""

        event = {
            "id": "evt_test_fallback",
            "type": "checkout.session.completed",
            "data": FutureSDKShape(),
        }
        raw_body = json.dumps(
            {
                "id": "evt_test_fallback",
                "data": {"object": {"amount_total": 500}},
            }
        ).encode()

        result = _safe_serialize_stripe_payload(event, raw_body)

        self.assertEqual(result["object"]["amount_total"], 500)


class SafeSerializeReturnsStub(TestCase):
    """Tier 3 — last resort. Both tiers failed; we still return a dict so
    the audit row is created and Stripe gets a 200."""

    def test_stub_when_data_and_body_both_unparseable(self):
        event = {
            "id": "evt_test_stub",
            "type": "payment_intent.succeeded",
            "data": object(),  # no to_dict_recursive, not a dict
        }
        bad_body = b"\xff\xfe not valid json \x00"

        result = _safe_serialize_stripe_payload(event, bad_body)

        self.assertEqual(
            result,
            {"_unserializable": True, "event_type": "payment_intent.succeeded"},
        )

    def test_stub_writes_to_jsonfield(self):
        """The whole point of the stub: the audit row still gets written."""
        event = {
            "id": "evt_test_stub_write",
            "type": "charge.refunded",
            "data": object(),
        }
        bad_body = b"\xff\xfe"

        StripeEvent.objects.create(
            stripe_event_id=event["id"],
            event_type=event["type"],
            processed=False,
            payload=_safe_serialize_stripe_payload(event, bad_body),
        )

        self.assertEqual(StripeEvent.objects.count(), 1)
