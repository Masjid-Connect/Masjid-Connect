#!/usr/bin/env python3
"""One-shot rewrite: convert all download CTAs across web/*.html so iOS shows
'Coming soon' and Android links to the real Play listing.

Run from repo root:
    python3 scripts/update-store-buttons.py

Idempotent — safe to re-run; skips already-converted markup.
"""
from __future__ import annotations

import pathlib
import re
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB_DIR = REPO_ROOT / "web"

PLAY_URL = "https://play.google.com/store/apps/details?id=app.salafimasjid"

# ── iOS button rewrites ────────────────────────────────────────────────────

# Hero variant: <a class="store-badge" target="_blank">…</a>
HERO_IOS = re.compile(
    r'<a href="/download" class="store-badge" aria-label="Download on the App Store"'
    r' target="_blank" rel="noopener">\s*'
    r'(<svg[^>]*class="store-badge__svg".*?</svg>)\s*'
    r'</a>',
    re.DOTALL,
)
HERO_IOS_REPLACEMENT = (
    r'<span class="store-badge store-badge--coming-soon" role="img" '
    r'aria-label="iOS app coming soon">\1'
    r'<span class="store-badge__coming-soon-pill" aria-hidden="true">Coming soon</span>'
    r'</span>'
)

# Footer variant: <a>…</a> (no class, no target)
FOOTER_IOS = re.compile(
    r'<a href="/download" aria-label="Download on the App Store">\s*'
    r'(<svg[^>]*class="footer__store-svg".*?</svg>)\s*'
    r'</a>',
    re.DOTALL,
)
FOOTER_IOS_REPLACEMENT = (
    r'<span class="store-badge--coming-soon" role="img" '
    r'aria-label="iOS app coming soon">\1'
    r'<span class="store-badge__coming-soon-pill" aria-hidden="true">Coming soon</span>'
    r'</span>'
)

# ── Android button rewrites ────────────────────────────────────────────────

HERO_PLAY = re.compile(
    r'<a href="/download" class="store-badge" aria-label="Get it on Google Play"'
    r' target="_blank" rel="noopener">'
)
HERO_PLAY_REPLACEMENT = (
    f'<a href="{PLAY_URL}" class="store-badge" '
    f'aria-label="Get Masjid Connect on Google Play" '
    f'target="_blank" rel="noopener noreferrer">'
)

FOOTER_PLAY = re.compile(
    r'<a href="/download" aria-label="Get it on Google Play">'
)
FOOTER_PLAY_REPLACEMENT = (
    f'<a href="{PLAY_URL}" aria-label="Get Masjid Connect on Google Play" '
    f'target="_blank" rel="noopener noreferrer">'
)


def rewrite_file(path: pathlib.Path) -> int:
    """Apply all four rewrites; return total substitutions made."""
    text = path.read_text(encoding="utf-8")
    original = text
    total = 0

    text, n = HERO_IOS.subn(HERO_IOS_REPLACEMENT, text)
    total += n
    text, n = FOOTER_IOS.subn(FOOTER_IOS_REPLACEMENT, text)
    total += n
    text, n = HERO_PLAY.subn(HERO_PLAY_REPLACEMENT, text)
    total += n
    text, n = FOOTER_PLAY.subn(FOOTER_PLAY_REPLACEMENT, text)
    total += n

    if text != original:
        path.write_text(text, encoding="utf-8")
    return total


def main() -> int:
    if not WEB_DIR.is_dir():
        print(f"ERROR: {WEB_DIR} does not exist", file=sys.stderr)
        return 1

    grand_total = 0
    for html in sorted(WEB_DIR.glob("*.html")):
        n = rewrite_file(html)
        if n:
            print(f"  {html.name}: {n} substitution(s)")
            grand_total += n
        else:
            print(f"  {html.name}: (no change)")
    print(f"\nTotal substitutions: {grand_total}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
