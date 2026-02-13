#!/usr/bin/env bash
set -euo pipefail

# Archive, export, validate, and upload both Safari extensions to the App Store.
# Usage:
#   scripts/archive.sh                  # archive + export both
#   scripts/archive.sh radarr           # just Radarr
#   scripts/archive.sh sonarr           # just Sonarr
#   scripts/archive.sh --upload         # archive + export + validate + upload both
#   scripts/archive.sh radarr --upload  # archive + export + validate + upload Radarr

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$ROOT_DIR/build"

UPLOAD=false
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --upload) UPLOAD=true ;;
    radarr)   TARGET="radarr" ;;
    sonarr)   TARGET="sonarr" ;;
    *)        echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

archive_extension() {
  local name="$1"        # SafariRadarrExtension or SafariSonarrExtension
  local display="$2"     # Radarr Adder or Sonarr Adder
  local project_dir="$ROOT_DIR/$name"
  local archive_path="$BUILD_DIR/$name.xcarchive"
  local export_path="$BUILD_DIR/$name-export"
  local export_options="$BUILD_DIR/ExportOptions.plist"

  echo "============================================"
  echo "  Archiving: $display"
  echo "============================================"

  # Create ExportOptions.plist for App Store distribution
  cat > "$export_options" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>destination</key>
    <string>upload</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>teamID</key>
    <string>CJXZNY36RV</string>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
PLIST

  # Clean & archive
  xcodebuild clean archive \
    -project "$project_dir/$name.xcodeproj" \
    -scheme "$name" \
    -configuration Release \
    -archivePath "$archive_path" \
    -quiet \
    CODE_SIGN_STYLE=Automatic \
    DEVELOPMENT_TEAM=CJXZNY36RV

  echo "  Archive created: $archive_path"

  # Export for App Store
  xcodebuild -exportArchive \
    -archivePath "$archive_path" \
    -exportOptionsPlist "$export_options" \
    -exportPath "$export_path" \
    -quiet

  echo "  Export created: $export_path"

  # Find the exported pkg/app
  local pkg
  pkg=$(find "$export_path" -name "*.pkg" -o -name "*.ipa" 2>/dev/null | head -1)
  if [ -z "$pkg" ]; then
    echo "  Warning: No .pkg found in export. Checking for .app..."
    pkg=$(find "$export_path" -name "*.app" 2>/dev/null | head -1)
  fi

  if [ -z "$pkg" ]; then
    echo "  Error: No exportable artifact found in $export_path"
    return 1
  fi

  echo "  Artifact: $pkg"

  if [ "$UPLOAD" = true ]; then
    echo ""
    echo "  Validating..."
    xcrun altool --validate-app \
      -f "$pkg" \
      -t macos \
      --apiKey "${APP_STORE_API_KEY:-}" \
      --apiIssuer "${APP_STORE_API_ISSUER:-}" \
      2>/dev/null || {
        echo ""
        echo "  If API key auth fails, use Apple ID auth instead:"
        echo "    xcrun altool --validate-app -f \"$pkg\" -t macos -u YOUR_APPLE_ID -p @keychain:AC_PASSWORD"
        echo ""
        echo "  Or use the newer notarytool/Transporter workflow:"
        echo "    xcrun notarytool submit \"$pkg\" --apple-id YOUR_APPLE_ID --team-id CJXZNY36RV --password @keychain:AC_PASSWORD"
        return 1
      }

    echo "  Uploading..."
    xcrun altool --upload-app \
      -f "$pkg" \
      -t macos \
      --apiKey "${APP_STORE_API_KEY:-}" \
      --apiIssuer "${APP_STORE_API_ISSUER:-}" \
      2>/dev/null || {
        echo ""
        echo "  If API key auth fails, use Apple ID auth instead:"
        echo "    xcrun altool --upload-app -f \"$pkg\" -t macos -u YOUR_APPLE_ID -p @keychain:AC_PASSWORD"
        return 1
      }

    echo "  Upload complete for $display!"
  fi

  echo ""
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

mkdir -p "$BUILD_DIR"

if [ -z "$TARGET" ] || [ "$TARGET" = "radarr" ]; then
  archive_extension "SafariRadarrExtension" "Radarr Adder"
fi

if [ -z "$TARGET" ] || [ "$TARGET" = "sonarr" ]; then
  archive_extension "SafariSonarrExtension" "Sonarr Adder"
fi

echo "============================================"
echo "  Done!"
echo "============================================"
echo ""
echo "Archives:  $BUILD_DIR/*.xcarchive"
echo "Exports:   $BUILD_DIR/*-export/"
echo ""

if [ "$UPLOAD" = false ]; then
  echo "To validate and upload, run:"
  echo "  scripts/archive.sh --upload"
  echo ""
  echo "Set these env vars for API key auth:"
  echo "  export APP_STORE_API_KEY=your_key_id"
  echo "  export APP_STORE_API_ISSUER=your_issuer_id"
  echo ""
  echo "Or upload manually with Apple ID:"
  echo "  xcrun altool --upload-app -f build/*-export/*.pkg -t macos -u YOUR_APPLE_ID -p @keychain:AC_PASSWORD"
fi
