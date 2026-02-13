#!/usr/bin/env bash
set -euo pipefail

# Pretty-print all Fastlane metadata for both apps across all locales.
# Usage: scripts/show-metadata.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BOLD="\033[1m"
DIM="\033[2m"
CYAN="\033[36m"
GREEN="\033[32m"
RESET="\033[0m"

show_metadata() {
  local app_label="$1"
  local metadata_dir="$2"

  echo ""
  echo -e "${BOLD}${GREEN}═══════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${GREEN}  ${app_label}${RESET}"
  echo -e "${BOLD}${GREEN}═══════════════════════════════════════════${RESET}"

  for locale_dir in "$metadata_dir"/*/; do
    [ -d "$locale_dir" ] || continue
    local locale
    locale=$(basename "$locale_dir")

    echo ""
    echo -e "  ${BOLD}${CYAN}── ${locale} ──${RESET}"

    for file in "$locale_dir"*.txt; do
      [ -f "$file" ] || continue
      local field
      field=$(basename "$file" .txt)
      local content
      content=$(cat "$file")

      # Indent multi-line content
      if [ "$(echo "$content" | wc -l)" -gt 1 ]; then
        echo -e "  ${BOLD}${field}:${RESET}"
        echo "$content" | sed 's/^/    /'
      else
        echo -e "  ${BOLD}${field}:${RESET} ${content}"
      fi
    done
  done

  echo ""
}

show_metadata "Radarr Adder" "$ROOT_DIR/fastlane/metadata_radarr"
show_metadata "Sonarr Adder" "$ROOT_DIR/fastlane/metadata_sonarr"
