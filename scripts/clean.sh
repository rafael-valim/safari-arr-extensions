#!/bin/bash
set -euo pipefail

DERIVED_DATA="/tmp/safari-arr-extensions-build"

if [ -d "$DERIVED_DATA" ]; then
    echo "Removing $DERIVED_DATA..."
    rm -rf "$DERIVED_DATA"
    echo "Build artifacts removed."
else
    echo "No build directory found. Nothing to clean."
fi
