"""Generate HMRC R68 Gift Aid XML for a claim.

Usage:
    python manage.py generate_gift_aid_xml GACLAIM-2026-001
    python manage.py generate_gift_aid_xml GACLAIM-2026-001 --envelope
    python manage.py generate_gift_aid_xml GACLAIM-2026-001 -o claim.xml
"""

import sys

from django.core.management.base import BaseCommand, CommandError

from core.models import GiftAidClaim


class Command(BaseCommand):
    help = "Generate HMRC R68 Gift Aid XML for a claim reference"

    def add_arguments(self, parser):
        parser.add_argument(
            "reference",
            help="Gift Aid Claim reference (e.g. GACLAIM-2026-001)",
        )
        parser.add_argument(
            "--envelope",
            action="store_true",
            default=False,
            help="Include full GovTalkMessage envelope (for Transaction Engine API). "
                 "Default is IRenvelope only (for Charities Online web upload).",
        )
        parser.add_argument(
            "-o", "--output",
            help="Output file path. Defaults to stdout.",
        )

    def handle(self, *args, **options):
        reference = options["reference"]

        try:
            claim = GiftAidClaim.objects.get(reference=reference)
        except GiftAidClaim.DoesNotExist:
            raise CommandError(f"No Gift Aid Claim found with reference '{reference}'")

        from core.gift_aid_xml import generate_r68_xml

        try:
            xml_bytes = generate_r68_xml(
                claim, include_govtalk_envelope=options["envelope"],
            )
        except ValueError as e:
            raise CommandError(str(e))

        output_path = options.get("output")
        if output_path:
            with open(output_path, "wb") as f:
                f.write(xml_bytes)
            self.stdout.write(
                self.style.SUCCESS(f"Written {len(xml_bytes)} bytes to {output_path}")
            )
        else:
            sys.stdout.buffer.write(xml_bytes)

        donation_count = claim.donations.filter(gift_aid_eligible=True).count()
        total = claim.donations.filter(gift_aid_eligible=True)
        from django.db.models import Sum
        agg = total.aggregate(
            donations=Sum("amount_pence"),
            gift_aid=Sum("gift_aid_amount_pence"),
        )
        self.stderr.write(
            f"\nClaim: {reference}\n"
            f"Donations: {donation_count}\n"
            f"Total donated: £{(agg['donations'] or 0) / 100:.2f}\n"
            f"Gift Aid reclaimable: £{(agg['gift_aid'] or 0) / 100:.2f}\n"
        )
