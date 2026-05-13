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


def _raw_event_dict() -> dict:
    return {
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


def _real_stripe_event() -> stripe.Event:
    """Return a ``stripe.Event`` constructed the way production does it.

    ``stripe.Webhook.construct_event`` internally calls
    ``stripe.Event.construct_from(parsed_json, secret)`` — the test must
    pass real ``StripeObject`` shapes to the helper, not plain dicts.
    """
    return stripe.Event.construct_from(_raw_event_dict(), key=None)


class SafeSerializeUsesRawBody(TestCase):
    """Tier 1 — primary path. The signed body is parsed and the ``data``
    field returned. No SDK behaviour involved."""

    def test_returns_parsed_data_field(self):
        raw_body = json.dumps(_raw_event_dict()).encode()
        event = _real_stripe_event()

        result = _safe_serialize_stripe_payload(event, raw_body)

        self.assertIsInstance(result, dict)
        self.assertEqual(result["object"]["amount_total"], 1000)
        self.assertEqual(result["object"]["metadata"]["app"], "masjid")

    def test_result_round_trips_through_json_dumps(self):
        """The exact assertion the original bug would have failed."""
        raw_body = json.dumps(_raw_event_dict()).encode()
        event = _real_stripe_event()

        result = _safe_serialize_stripe_payload(event, raw_body)
        json.dumps(result)  # pre-fix this raised TypeError

    def test_payload_writes_to_jsonfield(self):
        """End-to-end: real StripeObject + real raw body → helper → DB
        write must succeed and round-trip."""
        raw_body = json.dumps(_raw_event_dict()).encode()
        event = _real_stripe_event()

        StripeEvent.objects.create(
            stripe_event_id=event["id"],
            event_type=event["type"],
            processed=False,
            payload=_safe_serialize_stripe_payload(event, raw_body),
        )

        saved = StripeEvent.objects.get(stripe_event_id=event["id"])
        self.assertEqual(saved.payload["object"]["amount_total"], 1000)
        self.assertEqual(saved.payload["object"]["metadata"]["app"], "masjid")


class SafeSerializeFallsBackToSdk(TestCase):
    """Tier 2 — if the raw body is somehow unparseable but the SDK object
    is intact, ``str(StripeObject)`` produces JSON across every
    stripe-python major and rescues the conversion."""

    def test_uses_sdk_str_when_raw_body_invalid_utf8(self):
        event = _real_stripe_event()
        bad_body = b"\xff\xfe not valid utf-8"

        result = _safe_serialize_stripe_payload(event, bad_body)

        self.assertIsInstance(result, dict)
        self.assertNotIn("_unserializable", result)
        json.dumps(result)  # must round-trip


class SafeSerializeReturnsStub(TestCase):
    """Tier 3 — last resort. Both tiers failed; audit row still gets written."""

    def test_stub_when_everything_fails(self):
        event = {
            "id": "evt_test_stub",
            "type": "payment_intent.succeeded",
            "data": object(),  # no JSON-ish __str__
        }
        bad_body = b"\xff\xfe garbage"

        result = _safe_serialize_stripe_payload(event, bad_body)

        self.assertEqual(
            result,
            {"_unserializable": True, "event_type": "payment_intent.succeeded"},
        )

    def test_stub_writes_to_jsonfield(self):
        """The whole point of the stub: the audit row still gets written
        so idempotency holds and the handler still runs."""
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
