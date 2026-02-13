#!/bin/bash
# Store App Store Connect API credentials in macOS Keychain.
# Run once to import your Key ID, Issuer ID, and P8 private key.
# After storing, you can safely delete the .p8 file from disk.
#
# Usage:
#   ./scripts/store-credentials.sh
#   ./scripts/store-credentials.sh --key-id ABC123 --issuer-id DEF456 --p8-file ~/Downloads/AuthKey_ABC123.p8

set -euo pipefail

SERVICE="safari-arr-fastlane"

KEY_ID=""
ISSUER_ID=""
P8_PATH=""

# Parse optional flags
while [[ $# -gt 0 ]]; do
    case "$1" in
        --key-id)    KEY_ID="$2"; shift 2 ;;
        --issuer-id) ISSUER_ID="$2"; shift 2 ;;
        --p8-file)   P8_PATH="$2"; shift 2 ;;
        *)           echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Prompt for any missing values
if [[ -z "$KEY_ID" ]]; then
    read -rp "Key ID: " KEY_ID
fi
if [[ -z "$ISSUER_ID" ]]; then
    read -rp "Issuer ID: " ISSUER_ID
fi
if [[ -z "$P8_PATH" ]]; then
    read -rp "Path to AuthKey .p8 file: " P8_PATH
fi

# Validate P8 file exists
if [[ ! -f "$P8_PATH" ]]; then
    echo "Error: File not found: $P8_PATH"
    exit 1
fi

KEY_CONTENT=$(cat "$P8_PATH")

# Store in Keychain (-U updates if entry already exists)
security add-generic-password -s "$SERVICE" -a "key_id" -w "$KEY_ID" -U
security add-generic-password -s "$SERVICE" -a "issuer_id" -w "$ISSUER_ID" -U
security add-generic-password -s "$SERVICE" -a "key_content" -w "$KEY_CONTENT" -U

echo ""
echo "Credentials stored in Keychain (service: $SERVICE)"
echo "  Key ID:     $KEY_ID"
echo "  Issuer ID:  $ISSUER_ID"
echo "  Key content: $(echo "$KEY_CONTENT" | head -1)..."
echo ""
echo "Fastlane will now read credentials from Keychain automatically."
echo "You can safely delete the .p8 file from disk if desired."
