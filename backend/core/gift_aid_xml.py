"""HMRC R68 Gift Aid XML generator for Charities Online submissions.

Generates XML conforming to the HMRC R68 v2.0 schema:
  - Namespace: http://www.govtalk.gov.uk/taxation/charities/r68/2
  - Message class: HMRC-CHAR-CLM
  - Submission via Charities Online Transaction Engine

Reference:
  - HMRC Charities Technical Pack v1.3
  - https://developer.service.hmrc.gov.uk/api-documentation/docs/api/xml/Charities%20Online
  - https://www.gov.uk/government/publications/charities-generic-technical-specifications

Usage:
  from core.gift_aid_xml import generate_r68_xml
  xml_bytes = generate_r68_xml(claim)
"""

import hashlib
import re
from base64 import b64encode
from datetime import date
from io import BytesIO
from xml.etree.ElementTree import Element, SubElement, tostring

from lxml import etree

# ── Namespaces ───────────────────────────────────────────────────────

NS_GOVTALK = "http://www.govtalk.gov.uk/CM/envelope"
NS_R68 = "http://www.govtalk.gov.uk/taxation/charities/r68/2"

NSMAP_GOVTALK = {"": NS_GOVTALK}
NSMAP_R68 = {"": NS_R68}


# ── Name sanitiser ───────────────────────────────────────────────────

# HMRC only allows alpha, backslash, and hyphen in name fields
_NAME_RE = re.compile(r"[^a-zA-Z\\-]")


def _sanitise_name(name: str) -> str:
    """Remove characters not allowed in HMRC donor name fields."""
    return _NAME_RE.sub("", name).strip() or "Unknown"


def _split_name(full_name: str) -> tuple[str, str]:
    """Split a full name into (forename, surname) with HMRC-safe characters."""
    parts = full_name.strip().split(None, 1)
    fore = _sanitise_name(parts[0]) if parts else "Unknown"
    sur = _sanitise_name(parts[1]) if len(parts) > 1 else "Unknown"
    return fore, sur


def _extract_house(address_line: str) -> str:
    """Extract house name/number from address line 1.

    HMRC wants just the house number or name, not the full street.
    Best-effort: take everything before the first comma, or the first
    word if it looks like a number.
    """
    if not address_line:
        return ""
    # If it starts with a number, take just the number
    match = re.match(r"^(\d+\w?)", address_line)
    if match:
        return match.group(1)
    # Otherwise take everything before first comma
    return address_line.split(",")[0].strip()


# ── IRmark computation ───────────────────────────────────────────────


def _compute_irmark(body_element: etree._Element) -> str:
    """Compute the IRmark (SHA-1 of C14N-canonicalised body XML).

    HMRC requires the IRmark to be a base64-encoded SHA-1 hash of the
    exclusive canonical form of the IRenvelope element.
    """
    canonical = etree.tostring(body_element, method="c14n", exclusive=True)
    sha1 = hashlib.sha1(canonical).digest()  # noqa: S324 — required by HMRC spec
    return b64encode(sha1).decode("ascii")


# ── XML builder ──────────────────────────────────────────────────────


def generate_r68_xml(claim, include_govtalk_envelope: bool = True) -> bytes:
    """Generate HMRC R68 Gift Aid XML for a GiftAidClaim.

    Args:
        claim: A GiftAidClaim instance with linked donations.
        include_govtalk_envelope: If True, wraps in a full GovTalkMessage
            envelope ready for Charities Online submission. If False,
            returns just the IRenvelope (useful for the HMRC spreadsheet
            upload or local testing).

    Returns:
        UTF-8 encoded XML bytes.

    Raises:
        ValueError: If charity settings are not configured or claim has
            no eligible donations.
    """
    from core.models import CharityGiftAidSettings

    settings = CharityGiftAidSettings.get()
    if not settings:
        raise ValueError(
            "Gift Aid settings not configured. "
            "Go to Admin → Gift Aid Settings and fill in your charity details."
        )

    donations = (
        claim.donations
        .filter(gift_aid_eligible=True, gift_aid_declaration__isnull=False)
        .select_related("gift_aid_declaration")
        .order_by("donation_date")
    )
    if not donations.exists():
        raise ValueError("This claim has no Gift Aid eligible donations with declarations.")

    # ── Build IRenvelope ─────────────────────────────────────────────
    ir_envelope = etree.Element("IRenvelope", nsmap=NSMAP_R68)

    # IRheader
    ir_header = etree.SubElement(ir_envelope, "IRheader")

    keys = etree.SubElement(ir_header, "Keys")
    key = etree.SubElement(keys, "Key", Type="CHARID")
    key.text = settings.hmrc_reference

    period_end = etree.SubElement(ir_header, "PeriodEnd")
    period_end.text = claim.period_end.strftime("%Y-%m-%d")

    currency = etree.SubElement(ir_header, "DefaultCurrency")
    currency.text = "GBP"

    # IRmark placeholder — computed after body is built
    irmark_el = etree.SubElement(ir_header, "IRmark", Type="generic")
    irmark_el.text = ""

    sender = etree.SubElement(ir_header, "Sender")
    sender.text = "Individual"

    # ── R68 body ─────────────────────────────────────────────────────
    r68 = etree.SubElement(ir_envelope, "R68")

    # AuthOfficial
    auth_official = etree.SubElement(r68, "AuthOfficial")
    off_name = etree.SubElement(auth_official, "OffName")
    if settings.official_title:
        ttl = etree.SubElement(off_name, "Ttl")
        ttl.text = settings.official_title
    fore = etree.SubElement(off_name, "Fore")
    fore.text = _sanitise_name(settings.official_forename)
    sur = etree.SubElement(off_name, "Sur")
    sur.text = _sanitise_name(settings.official_surname)

    off_id = etree.SubElement(auth_official, "OffID")
    off_postcode = etree.SubElement(off_id, "Postcode")
    off_postcode.text = settings.official_postcode

    phone = etree.SubElement(auth_official, "Phone")
    phone.text = settings.official_phone

    # Declaration
    declaration = etree.SubElement(r68, "Declaration")
    declaration.text = "yes"

    # ── Claim ────────────────────────────────────────────────────────
    claim_el = etree.SubElement(r68, "Claim")

    org_name = etree.SubElement(claim_el, "OrgName")
    org_name.text = settings.charity_name

    hmrc_ref = etree.SubElement(claim_el, "HMRCref")
    hmrc_ref.text = settings.hmrc_reference

    # Regulator
    regulator = etree.SubElement(claim_el, "Regulator")
    reg_name = etree.SubElement(regulator, "RegName")
    reg_name.text = settings.regulator_name
    reg_no = etree.SubElement(regulator, "RegNo")
    reg_no.text = settings.regulator_number

    # ── Repayment (individual donations) ─────────────────────────────
    repayment = etree.SubElement(claim_el, "Repayment")

    earliest_date = None

    for donation in donations:
        decl = donation.gift_aid_declaration
        if not decl:
            continue

        gad = etree.SubElement(repayment, "GAD")

        # Donor details
        donor_el = etree.SubElement(gad, "Donor")

        donor_fore, donor_sur = _split_name(decl.donor_name)
        fore_el = etree.SubElement(donor_el, "Fore")
        fore_el.text = donor_fore
        sur_el = etree.SubElement(donor_el, "Sur")
        sur_el.text = donor_sur

        house_el = etree.SubElement(donor_el, "House")
        house_el.text = _extract_house(decl.donor_address_line1) or "Unknown"

        # Postcode or Overseas flag
        if decl.donor_country == "GB" and decl.donor_postcode:
            postcode_el = etree.SubElement(donor_el, "Postcode")
            postcode_el.text = decl.donor_postcode.upper().strip()
        else:
            overseas_el = etree.SubElement(donor_el, "Overseas")
            overseas_el.text = "yes"

        # Donation date and amount
        date_el = etree.SubElement(gad, "Date")
        date_el.text = donation.donation_date.strftime("%Y-%m-%d")

        total_el = etree.SubElement(gad, "Total")
        total_el.text = f"{donation.amount_pence / 100:.2f}"

        if earliest_date is None or donation.donation_date < earliest_date:
            earliest_date = donation.donation_date

    # EarliestGAdate
    if earliest_date:
        earliest_el = etree.SubElement(repayment, "EarliestGAdate")
        earliest_el.text = earliest_date.strftime("%Y-%m-%d")

    # ── Compute and insert IRmark ────────────────────────────────────
    irmark_el.text = _compute_irmark(ir_envelope)

    # ── Wrap in GovTalkMessage if requested ──────────────────────────
    if not include_govtalk_envelope:
        return etree.tostring(
            ir_envelope, xml_declaration=True, encoding="UTF-8", pretty_print=True,
        )

    gov_talk = etree.Element("GovTalkMessage", nsmap=NSMAP_GOVTALK)

    # Header
    header = etree.SubElement(gov_talk, "Header")
    msg_details = etree.SubElement(header, "MessageDetails")

    msg_class = etree.SubElement(msg_details, "Class")
    msg_class.text = "HMRC-CHAR-CLM"

    qualifier = etree.SubElement(msg_details, "Qualifier")
    qualifier.text = "request"

    function = etree.SubElement(msg_details, "Function")
    function.text = "submit"

    transformation = etree.SubElement(msg_details, "Transformation")
    transformation.text = "XML"

    # SenderDetails (credentials placeholder — filled at submission time)
    sender_details = etree.SubElement(header, "SenderDetails")
    id_auth = etree.SubElement(sender_details, "IDAuthentication")

    sender_id = etree.SubElement(id_auth, "SenderID")
    sender_id.text = settings.gateway_sender_id or "PLACEHOLDER"

    auth = etree.SubElement(id_auth, "Authentication")
    method = etree.SubElement(auth, "Method")
    method.text = "clear"
    role = etree.SubElement(auth, "Role")
    role.text = "principal"
    value = etree.SubElement(auth, "Value")
    value.text = ""  # Password — never stored, filled at submission time

    # GovTalkDetails
    gov_talk_details = etree.SubElement(gov_talk, "GovTalkDetails")
    gt_keys = etree.SubElement(gov_talk_details, "Keys")
    gt_key = etree.SubElement(gt_keys, "Key", Type="CHARID")
    gt_key.text = settings.hmrc_reference

    channel_routing = etree.SubElement(gov_talk_details, "ChannelRouting")
    channel = etree.SubElement(channel_routing, "Channel")
    channel_uri = etree.SubElement(channel, "URI")
    channel_uri.text = "1234"  # Vendor ID — update with your HMRC vendor ID
    product = etree.SubElement(channel, "Product")
    product.text = "Masjid Connect"
    version = etree.SubElement(channel, "Version")
    version.text = "1.0"

    # Body — contains the IRenvelope
    body = etree.SubElement(gov_talk, "Body")
    body.append(ir_envelope)

    return etree.tostring(
        gov_talk, xml_declaration=True, encoding="UTF-8", pretty_print=True,
    )


def generate_r68_schedule_xml(claim) -> bytes:
    """Generate just the IRenvelope (no GovTalk wrapper).

    Use this for uploading via the HMRC Charities Online web portal
    rather than the Transaction Engine API.
    """
    return generate_r68_xml(claim, include_govtalk_envelope=False)
