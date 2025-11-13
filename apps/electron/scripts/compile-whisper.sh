#!/bin/bash
# Compile whisper.cpp for whisper-node

echo "🔧 Compiling whisper.cpp..."

# Find project root by looking for package.json with workspaces
CURRENT_DIR="$PWD"
PROJECT_ROOT="$CURRENT_DIR"

# Search up for the root package.json
while [ "$PROJECT_ROOT" != "/" ]; do
  if [ -f "$PROJECT_ROOT/pnpm-workspace.yaml" ] || [ -f "$PROJECT_ROOT/pnpm-lock.yaml" ]; then
    break
  fi
  PROJECT_ROOT=$(dirname "$PROJECT_ROOT")
done

echo "Searching from project root: $PROJECT_ROOT"

# Find whisper-node in node_modules (check both root and local)
WHISPER_DIR=$(find "$PROJECT_ROOT" -path "*/whisper-node/lib/whisper.cpp" -type d 2>/dev/null | head -1)

if [ -z "$WHISPER_DIR" ]; then
  echo "⚠️  Warning: whisper-node not found - voice features will be unavailable"
  echo "    Make sure dependencies are installed with 'pnpm install'"
  exit 0
fi

echo "Found whisper.cpp at: $WHISPER_DIR"

# Compile whisper.cpp
cd "$WHISPER_DIR" || exit 1

if make -j4; then
  echo "✅ whisper.cpp compiled successfully"
  exit 0
else
  echo "⚠️  Warning: whisper.cpp compilation failed - voice features will be unavailable"
  echo "    You may need to install build tools (make, gcc/clang)"
  exit 0
fi
