"""Replay Stripe webhook events that the live endpoint failed to process.

Use case: the production webhook endpoint returned HTTP 500 for ~9 days
(2026-04-30 → 2026-05-09), causing Stripe to disable it after 475 failed
deliveries. Donations were charged but no Donation/GiftAidDeclaration rows
were created locally. This command pulls events from the Stripe API for a
given date range and replays them through the existing webhook handlers.

Idempotent — events already in the StripeEvent table (i.e. already
processed before the gap) are skipped.

Usage:
    # Dry-run to see what would happen
    python manage.py reconcile_stripe_events --since 2026-04-30 --dry-run

    # Apply for real
    python manage.py reconcile_stripe_events --since 2026-04-30

    # Replay only one event type
    python manage.py reconcile_stripe_events --since 2026-04-30 \\
        --types checkout.session.completed

After running:
    1. Re-enable the webhook endpoint in Stripe Dashboard.
    2. Verify the Donation table count matches Stripe Dashboard payments
       for the period.
    3. Send retroactive receipt emails if any failed (the handlers fire
       send_donation_receipt_email automatically; they may have failed
       silently for the same reason as the original webhook).
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone as dt_timezone

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

logger = logging.getLogger("api")

DEFAULT_TYPES = (
    "checkout.session.completed",
    "invoice.payment_succeeded",
    "invoice.payment_failed",
    "customer.subscription.created",
    "customer.subscription.deleted",
    "payment_intent.succeeded",
    "charge.refunded",
)


class Command(BaseCommand):
    help = "Replay missed Stripe webhook events from a given date."

    def add_arguments(self, parser):
        parser.add_argument(
            "--since",
            required=True,
            help="ISO date or datetime — replay events created at-or-after this. "
                 "Examples: 2026-04-30, 2026-04-30T00:00:00Z",
        )
        parser.add_argument(
            "--until",
            default=None,
            help="ISO date or datetime — replay events created BEFORE this. "
                 "Defaults to now.",
        )
        parser.add_argument(
            "--types",
            default=",".join(DEFAULT_TYPES),
            help=f"Comma-separated event types to replay. "
                 f"Default: {','.join(DEFAULT_TYPES)}",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List events without calling handlers or writing to DB.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=1000,
            help="Maximum events to fetch from Stripe (paginated). Default 1000.",
        )

    def handle(self, *args, **options):
        # ── Imports inside handle() so management discovery doesn't pull
        # them at startup (matches the lazy-import style in webhook handler).
        try:
            import stripe as stripe_lib
        except ImportError as exc:
            raise CommandError("stripe library not installed") from exc

        from api import views as api_views
        from core.models import StripeEvent

        # ── Validate Stripe credentials
        api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
        if not api_key:
            raise CommandError("STRIPE_SECRET_KEY is not set in settings.")
        if not api_key.startswith("sk_live_"):
            self.stdout.write(self.style.WARNING(
                f"WARNING: Stripe key starts with '{api_key[:8]}…' — "
                "this is NOT a live key. Continuing anyway, but verify."
            ))

        stripe_lib.api_key = api_key

        # ── Parse date arguments
        since_ts = _parse_to_unix(options["since"], end_of_day=False)
        until_ts = (
            _parse_to_unix(options["until"], end_of_day=True)
            if options["until"]
            else None
        )

        wanted_types = {t.strip() for t in options["types"].split(",") if t.strip()}
        dry_run = options["dry_run"]
        limit = options["limit"]

        self.stdout.write(self.style.HTTP_INFO(
            f"Reconciling Stripe events since {options['since']}"
            + (f" until {options['until']}" if options['until'] else "")
            + f" ({len(wanted_types)} event types)"
            + (" [DRY RUN]" if dry_run else "")
        ))

        # ── Map event types → handler functions
        # We import _handle_* from views; they're private by convention but
        # importable. Each takes the event's `data.object` dict.
        handlers = {
            "checkout.session.completed": api_views._handle_checkout_completed,
            "invoice.payment_succeeded": api_views._handle_invoice_payment_succeeded,
            "invoice.payment_failed": api_views._handle_invoice_payment_failed,
            "customer.subscription.created": api_views._handle_subscription_created,
            "customer.subscription.deleted": api_views._handle_subscription_deleted,
            "payment_intent.succeeded": api_views._handle_payment_intent_succeeded,
            "charge.refunded": api_views._handle_charge_refunded,
        }

        # ── Fetch events (Stripe paginates; auto_paging_iter walks all pages)
        created_filter = {"gte": since_ts}
        if until_ts:
            created_filter["lt"] = until_ts

        try:
            events_iter = stripe_lib.Event.list(
                created=created_filter,
                limit=100,  # per page
            ).auto_paging_iter()
        except stripe_lib.error.StripeError as exc:
            raise CommandError(f"Stripe API error: {exc}") from exc

        # ── Tallies
        seen = 0
        skipped_already_processed = 0
        skipped_unsupported_type = 0
        replayed = 0
        failed = 0
        failures: list[tuple[str, str, str]] = []  # (event_id, type, error)

        for event in events_iter:
            seen += 1
            if seen > limit:
                self.stdout.write(self.style.WARNING(
                    f"Hit --limit={limit}; stopping. Re-run with --since "
                    f"set to before the last processed event ({event.id}) to continue."
                ))
                break

            event_type = event.get("type", "")
            event_id = event.get("id", "")

            if event_type not in wanted_types:
                continue

            handler = handlers.get(event_type)
            if not handler:
                skipped_unsupported_type += 1
                continue

            # Idempotency: was this event already processed before the gap?
            if StripeEvent.objects.filter(
                stripe_event_id=event_id, processed=True
            ).exists():
                skipped_already_processed += 1
                continue

            data_object = event["data"]["object"]

            if dry_run:
                self.stdout.write(
                    f"  [dry-run] would replay {event_type} {event_id}"
                )
                replayed += 1
                continue

            # Replay through the same path the webhook handler uses:
            # record StripeEvent, run handler in atomic, mark processed.
            try:
                with transaction.atomic():
                    stripe_event, _created = StripeEvent.objects.update_or_create(
                        stripe_event_id=event_id,
                        defaults={
                            "event_type": event_type,
                            "processed": False,
                            "payload": event["data"],
                        },
                    )
                    handler(data_object)
                    stripe_event.processed = True
                    stripe_event.save(update_fields=["processed"])
                replayed += 1
                self.stdout.write(self.style.SUCCESS(
                    f"  ✓ {event_type} {event_id}"
                ))
            except Exception as exc:
                failed += 1
                failures.append((event_id, event_type, str(exc)))
                self.stdout.write(self.style.ERROR(
                    f"  ✗ {event_type} {event_id} — {exc}"
                ))
                logger.exception(
                    "Reconcile: handler failed for %s (%s)", event_type, event_id
                )

        # ── Summary
        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("Summary:"))
        self.stdout.write(f"  scanned:                  {seen}")
        self.stdout.write(f"  replayed:                 {replayed}")
        self.stdout.write(f"  already processed (skip): {skipped_already_processed}")
        self.stdout.write(f"  unsupported type (skip):  {skipped_unsupported_type}")
        self.stdout.write(f"  failed:                   {failed}")

        if failures:
            self.stdout.write("")
            self.stdout.write(self.style.ERROR("Failures (investigate manually):"))
            for event_id, event_type, err in failures[:20]:
                self.stdout.write(f"  {event_id} ({event_type}): {err}")
            if len(failures) > 20:
                self.stdout.write(f"  …and {len(failures) - 20} more")

        if dry_run:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING(
                "Dry run only — no changes written. Re-run without --dry-run to apply."
            ))


def _parse_to_unix(s: str, *, end_of_day: bool) -> int:
    """Parse '2026-04-30' or '2026-04-30T12:34:56Z' to a Unix timestamp.

    Bare dates (no time) become start-of-day (00:00:00 UTC) unless
    end_of_day=True, in which case they become end-of-day (23:59:59 UTC).
    """
    s = s.strip()
    # Try full ISO datetime first
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        pass
    else:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=dt_timezone.utc)
        return int(dt.timestamp())

    # Bare date
    try:
        d = datetime.strptime(s, "%Y-%m-%d")
    except ValueError as exc:
        raise CommandError(
            f"Could not parse '{s}'. Use YYYY-MM-DD or ISO datetime."
        ) from exc

    if end_of_day:
        d = d.replace(hour=23, minute=59, second=59)
    return int(d.replace(tzinfo=dt_timezone.utc).timestamp())
