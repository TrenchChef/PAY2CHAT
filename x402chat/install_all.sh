#!/bin/bash
set -euo pipefail

echo "== x402 Complete Agent Suite Installer =="

ROOT="$(pwd)"
SRC_AGENTS="$ROOT/agents"
SRC_RULES="$ROOT/cursor/rules"

DST_CURSOR="$ROOT/.cursor"
DST_AGENTS="$DST_CURSOR/agents"
DST_RULES="$DST_CURSOR/rules"

echo "Creating Cursor directories..."
mkdir -p "$DST_AGENTS"
mkdir -p "$DST_RULES"

echo "Installing agents..."
for f in "$SRC_AGENTS"/*.json; do
  base="$(basename "$f")"
  cp "$f" "$DST_AGENTS/$base"
  echo "  Installed $base"
done

echo "Installing ruleset..."
cp "$SRC_RULES/x402.rules.json" "$DST_RULES/x402.rules.json"
echo "  Installed x402.rules.json"

echo "Creating helper dirs..."
mkdir -p "$ROOT/logs/agents" "$ROOT/logs/progress" "$ROOT/backups"

cat > "$ROOT/logs/AGENT_DASHBOARD.md" <<'EOF'
# x402 Agent Dashboard

This file is maintained by x402AgentLogDashboard.

## Latest Run
- (empty)

## Agent Outputs Index
- (empty)

## Errors / Warnings
- (empty)

## Files Changed
- (empty)

## Next Steps
- Run x402MetaRunner.
EOF

cat > "$ROOT/PROGRESS.md" <<'EOF'
# x402 Progress Log

This file is appended to by x402ProgressReporter.
EOF

echo ""
echo "Done. Restart Cursor to load agents."
echo "Primary auto pipeline agent: x402MetaRunner"
