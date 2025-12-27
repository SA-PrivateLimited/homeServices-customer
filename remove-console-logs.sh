#!/bin/bash
# Remove console.log, console.warn, console.info, console.debug statements
# Keep console.error for critical errors but wrap with logger

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -name "logger.ts" -exec sed -i '' \
  -e '/^\s*console\.log(/d' \
  -e '/^\s*console\.warn(/d' \
  -e '/^\s*console\.info(/d' \
  -e '/^\s*console\.debug(/d' \
  {} +

# Remove multi-line console statements (with // or /* comments on same line)
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -name "logger.ts" -exec sed -i '' \
  -e '/^\s*console\.log.*\/\//d' \
  -e '/^\s*console\.warn.*\/\//d' \
  {} +

