#!/usr/bin/env bash
set -euo pipefail

# Backward-compatible entrypoint preserved for existing workflows.
# Delegates to the enhanced gate runner using the full profile.

"$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/enhancement-gates.sh" --profile full "$@"
