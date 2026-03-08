#!/usr/bin/env bash
# =============================================================
# Masjid Connect — Dependency Update Script
# =============================================================
# WHAT THIS DOES:
#   Updates all Python packages to their latest compatible versions,
#   runs tests to make sure nothing broke, and shows you what changed.
#
# HOW OFTEN TO RUN:
#   Every 3 months (quarterly). Put a reminder in your calendar!
#
# HOW TO USE:
#   cd /home/mosque/Masjid-Connect/backend
#   ./scripts/update-deps.sh
# =============================================================

set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BACKEND_DIR"

echo "=== Masjid Connect Dependency Update ==="
echo "Time: $(date)"
echo ""

# -----------------------------------------------------------
# Step 1: Show current versions
# -----------------------------------------------------------
echo "Step 1/5: Current package versions"
echo "-----------------------------------"
pip list --format=columns 2>/dev/null | head -30
echo ""

# -----------------------------------------------------------
# Step 2: Save current state (so we can compare)
# -----------------------------------------------------------
echo "Step 2/5: Saving current state..."
pip freeze > /tmp/requirements_before.txt

# -----------------------------------------------------------
# Step 3: Update packages
# -----------------------------------------------------------
echo ""
echo "Step 3/5: Updating packages..."
pip install --upgrade -r requirements.txt

# -----------------------------------------------------------
# Step 4: Run tests
# -----------------------------------------------------------
echo ""
echo "Step 4/5: Running tests to make sure nothing broke..."
echo ""

if python manage.py test --verbosity=2; then
    echo ""
    echo "All tests passed!"
else
    echo ""
    echo "WARNING: Some tests FAILED after updating."
    echo "This means a package update might have broken something."
    echo ""
    echo "What to do:"
    echo "  1. Read the error messages above"
    echo "  2. Check which packages were updated (shown below)"
    echo "  3. Google the package name + 'changelog' to see what changed"
    echo "  4. Fix your code or pin the old version in requirements.txt"
    echo ""
fi

# -----------------------------------------------------------
# Step 5: Show what changed
# -----------------------------------------------------------
pip freeze > /tmp/requirements_after.txt

echo ""
echo "Step 5/5: What changed"
echo "----------------------"

if diff /tmp/requirements_before.txt /tmp/requirements_after.txt > /dev/null 2>&1; then
    echo "Nothing changed! All packages were already up to date."
else
    echo ""
    echo "UPDATED PACKAGES:"
    diff /tmp/requirements_before.txt /tmp/requirements_after.txt | grep "^[<>]" | sort || true
    echo ""
    echo "Lines starting with < are OLD versions"
    echo "Lines starting with > are NEW versions"
fi

# -----------------------------------------------------------
# Reminder
# -----------------------------------------------------------
echo ""
echo "=== Next Steps ==="
echo "1. If tests passed: commit the changes"
echo "   git add requirements.txt"
echo "   git commit -m 'Update Python dependencies (quarterly maintenance)'"
echo "   git push"
echo ""
echo "2. If tests failed: fix the issues before committing"
echo ""
echo "3. Deploy to production:"
echo "   ssh mosque@your-server-ip"
echo "   cd /home/mosque/Masjid-Connect/backend"
echo "   ./scripts/deploy.sh"
echo "=== Done ==="

# Clean up
rm -f /tmp/requirements_before.txt /tmp/requirements_after.txt
