#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED_DATA="/tmp/safari-arr-extensions-build"
TEAM_ID="CJXZNY36RV"

TARGET="${1:-all}"

build_extension() {
    local name="$1"
    local project="$REPO_ROOT/$name/$name.xcodeproj"

    # Strip extended attributes that break code signing
    xattr -cr "$REPO_ROOT/$name" 2>/dev/null || true

    echo "Building $name..."
    xcodebuild \
        -project "$project" \
        -scheme "$name" \
        -configuration Debug \
        -derivedDataPath "$DERIVED_DATA" \
        DEVELOPMENT_TEAM="$TEAM_ID" \
        CODE_SIGN_STYLE=Automatic \
        build | tail -1

    echo "$name built successfully."
}

case "$TARGET" in
    radarr)
        build_extension "SafariRadarrExtension"
        ;;
    sonarr)
        build_extension "SafariSonarrExtension"
        ;;
    all)
        build_extension "SafariRadarrExtension"
        build_extension "SafariSonarrExtension"
        ;;
    *)
        echo "Usage: $0 [radarr|sonarr|all]"
        exit 1
        ;;
esac
