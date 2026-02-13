#!/bin/bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DERIVED_DATA="/tmp/safari-arr-extensions-build"
TARGET="${1:-all}"

# Build first
"$REPO_ROOT/scripts/build.sh" "$TARGET"

deploy_extension() {
    local name="$1"
    local app_path="$DERIVED_DATA/Build/Products/Debug/$name.app"

    if [ ! -d "$app_path" ]; then
        echo "Error: $app_path not found. Build may have failed."
        exit 1
    fi

    echo "Opening $name..."
    open "$app_path"
}

case "$TARGET" in
    radarr)
        deploy_extension "SafariRadarrExtension"
        ;;
    sonarr)
        deploy_extension "SafariSonarrExtension"
        ;;
    all)
        deploy_extension "SafariRadarrExtension"
        deploy_extension "SafariSonarrExtension"
        ;;
    *)
        echo "Usage: $0 [radarr|sonarr|all]"
        exit 1
        ;;
esac

echo ""
echo "If this is the first time, enable the extension in:"
echo "  Safari -> Preferences -> Extensions"
echo ""
echo "To reload after code changes:"
echo "  Develop -> Web Extension -> Reload Extensions"
