#!/bin/bash
# BRAT release for obsidian-two-pane-navigator
# Usage: bash release.sh 0.1.0 "Initial release"

set -e

VERSION="$1"
DESC="${2:-Release v$VERSION}"

if [ -z "$VERSION" ]; then
  echo "Usage: bash release.sh VERSION [DESCRIPTION]"
  exit 1
fi

# Update versions
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" manifest.json
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$VERSION\"/" package.json

# Build
npm run build

# Commit, tag, push
git add manifest.json package.json main.js
git commit -m "Release v$VERSION: $DESC"
git push

# Create GitHub release with required assets
gh release create "v$VERSION" main.js manifest.json styles.css --title "v$VERSION" --notes "$DESC"

echo "Released v$VERSION"
