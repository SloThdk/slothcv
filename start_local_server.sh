#!/usr/bin/env bash
# ============================================================================
# slothcv local dev server (macOS / Linux)
# ============================================================================
# Mirrors start_local_server.bat for cross-platform parity. Pattern:
#   1. Kill anything already listening on port 3020
#   2. Background browser-opener polls dev URL every 500ms; on first 200
#      OK, opens /editor in default browser and exits.
#   3. Run `bun run dev` in the foreground so the user sees compile + route
#      logs and Ctrl+C cleanly tears the whole thing down.
#
# Package manager: bun (project ships bun.lock, no package-lock.json).
# Port: 3020 (slothcv slot in workspace port-map).
#
# Prereqs:
#   - bun installed (https://bun.sh — one-liner install on macOS/Linux):
#       curl -fsSL https://bun.sh/install | bash
#   - Node 18.18+ (some bun internals shell out to node)
#
# Usage:
#   chmod +x start_local_server.sh && ./start_local_server.sh
# ============================================================================

set -euo pipefail

PORT=3020
URL="http://localhost:${PORT}"
EDITOR_URL="${URL}/editor"

cd "$(dirname "$0")"

have() { command -v "$1" >/dev/null 2>&1; }

# Pre-flight: bun + node.
if ! have bun; then
    echo "[ERROR] bun not found in PATH."
    echo "  Install: curl -fsSL https://bun.sh/install | bash"
    echo "  Then restart your shell or 'source ~/.bashrc'."
    exit 1
fi
if ! have node; then
    echo "[ERROR] node not found in PATH."
    echo "  Install Node 18.18+ from https://nodejs.org"
    exit 1
fi

# Node version >= 18.
if ! node -e "process.exit(parseInt(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)" 2>/dev/null; then
    echo "[ERROR] Node.js version is too old ($(node --version))."
    echo "  Need 18.18+. Upgrade from https://nodejs.org or via nvm."
    exit 1
fi

# Install deps if missing.
if [ ! -d "node_modules" ]; then
    echo "[setup] node_modules missing - running bun install..."
    if ! bun install; then
        echo "[ERROR] bun install failed."
        echo "  Common fixes: no internet / behind proxy / disk full."
        exit 1
    fi
fi

# Auto-copy .env.example to .env if .env is missing. Note: all .env*
# files are in .gitignore (verified) and never committed to git history.
# Your local credentials stay on YOUR machine.
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[setup] .env not found - copying .env.example to .env..."
    cp ".env.example" ".env"
    echo "[setup] Created .env from the example template."
fi

# Credential-doctor: warn about placeholder Supabase values so users
# know what to fill in for full functionality. Local dev partially works
# without real Supabase credentials (UI renders, but persistence is a
# no-op). Real credentials unlock the actual CV-save + AI-edit features.
print_credential_status() {
    [ -f ".env" ] || return 0
    local needs=()
    local supabase_url
    supabase_url=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env | cut -d= -f2- || true)
    local supabase_anon
    supabase_anon=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env | cut -d= -f2- || true)
    local supabase_service
    supabase_service=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env | cut -d= -f2- || true)

    [[ "$supabase_url" == *YOUR_PROJECT_REF* ]] || [ -z "$supabase_url" ] && needs+=("NEXT_PUBLIC_SUPABASE_URL|Supabase project URL (https://YOUR_REF.supabase.co)")
    [[ "$supabase_anon" == your-* ]] || [ -z "$supabase_anon" ] && needs+=("NEXT_PUBLIC_SUPABASE_ANON_KEY|Supabase anon key (Dashboard -> Project Settings -> API)")
    [[ "$supabase_service" == your-* ]] || [ -z "$supabase_service" ] && needs+=("SUPABASE_SERVICE_ROLE_KEY|Supabase service role key (Dashboard -> Project Settings -> API)")

    if [ ${#needs[@]} -gt 0 ]; then
        echo
        echo "  ⚠️  Your .env has placeholder Supabase values."
        echo "      Local dev: UI loads but persistence is no-op without real keys."
        echo "      To enable CV-save + AI-edit, get real values from:"
        echo "        https://supabase.com -> create free project -> Project Settings -> API"
        echo "      Then set in .env:"
        for n in "${needs[@]}"; do
            IFS='|' read -r var purpose <<<"$n"
            printf "        %-32s  %s\n" "$var" "$purpose"
        done
        echo
    fi
}

print_credential_status

# 1. Free port.
echo "[1/3] Killing any process listening on port $PORT..."
if have lsof; then
    pids=$(lsof -ti "tcp:${PORT}" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        # shellcheck disable=SC2086
        kill -9 $pids 2>/dev/null || true
    fi
elif have fuser; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi

# 2. Background browser-opener. Polls the URL every 500ms; opens /editor
#    on first 200 OK. Runs detached so the foreground dev server isn't
#    blocked. Exits the poll loop after 90s if dev never comes up.
echo "[2/3] Browser-opener armed (will open $EDITOR_URL when server responds)..."
(
    tries=0
    while [ $tries -lt 180 ]; do
        if curl -s -o /dev/null -w "%{http_code}" --max-time 1 "$URL" 2>/dev/null | grep -q "200\|301\|302"; then
            # Server up - open /editor in default browser.
            if have open; then
                open "$EDITOR_URL" 2>/dev/null || true
            elif have xdg-open; then
                xdg-open "$EDITOR_URL" >/dev/null 2>&1 &
            elif have cmd.exe; then
                cmd.exe /c start "" "$EDITOR_URL" >/dev/null 2>&1 || true
            fi
            exit 0
        fi
        sleep 0.5
        tries=$((tries + 1))
    done
) &
BROWSER_PID=$!

# Trap Ctrl+C so the browser-opener + dev child are both killed.
trap 'kill $BROWSER_PID 2>/dev/null || true; kill $(jobs -p) 2>/dev/null || true; exit 0' INT TERM

# 3. Run Next dev in foreground via bun.
echo "[3/3] Starting Next dev on $URL (Ctrl+C to stop)..."
echo
bun run dev -- --port "$PORT"
