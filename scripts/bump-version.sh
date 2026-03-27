#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
# bump-version.sh — Bump app version in package.json AND app.json
#
# Usage:
#   ./scripts/bump-version.sh patch    # 1.0.0 → 1.0.1
#   ./scripts/bump-version.sh minor    # 1.0.0 → 1.1.0
#   ./scripts/bump-version.sh major    # 1.0.0 → 2.0.0
#   ./scripts/bump-version.sh 2.3.1   # Set an explicit version
# ─────────────────────────────────────────────────────────
set -euo pipefail

LEVEL="${1:-}"

if [ -z "$LEVEL" ]; then
  echo "Usage: ./scripts/bump-version.sh <patch|minor|major|X.Y.Z>"
  echo ""
  echo "Current versions:"
  echo "  package.json: $(node -p "require('./package.json').version")"
  echo "  app.json:     $(node -p "require('./app.json').expo.version")"
  exit 1
fi

# ── Determine the new version ──
if echo "$LEVEL" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  # Explicit version provided
  NEW_VERSION="$LEVEL"
  # Update package.json without git tag (npm version creates tags by default)
  npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version
else
  # Bump by level (patch/minor/major)
  npm version "$LEVEL" --no-git-tag-version
  NEW_VERSION=$(node -p "require('./package.json').version")
fi

# ── Sync app.json to match ──
node -e "
  const fs = require('fs');
  const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  app.expo.version = '$NEW_VERSION';
  fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
"

echo ""
echo "✓ Version bumped to $NEW_VERSION"
echo "  • package.json  → $NEW_VERSION"
echo "  • app.json      → $NEW_VERSION"
echo ""
echo "Next steps:"
echo "  git add package.json app.json"
echo "  git commit -m \"chore: bump version to $NEW_VERSION\""
