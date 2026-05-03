@echo off
REM ============================================================================
REM slothcv local dev server
REM ============================================================================
REM Pattern (mirrors philipsloth-portfolio / mission-control):
REM   1. Kill anything already listening on the dev port (stale Next.js from a
REM      crash, a previous run that didn't clean up, or the old "ghost" Next 16
REM      lockfile that holds the port even after the process exits).
REM   2. Spawn a hidden background poller. It hits the dev URL every 500 ms;
REM      the moment Next responds, it opens the browser to /editor and exits.
REM      This fixes the symptom Philip reported ("localhost ingenting sker") —
REM      the previous version `start "" "URL"` opened the browser BEFORE the
REM      server compiled, so the browser hit a connection-refused dead page
REM      and never auto-refreshed when the server eventually came up.
REM   3. Run Next dev in the foreground so the user sees compile + route logs
REM      and Ctrl-C cleanly tears the whole thing down.
REM
REM Package manager: bun (project ships bun.lock, no package-lock.json).
REM Switching from `npm run dev` to `bun run dev` removes the
REM npm-translates-args ambiguity and matches the rest of Philip's stack.
REM
REM Port: 3020 (slothcv slot per workspace MEMORY.md port map after
REM HausSupply=3018, SlothView=3019).
REM ============================================================================

cd /d "%~dp0"

set PORT=3020
set URL=http://localhost:%PORT%

echo [1/3] Killing any process listening on port %PORT%...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /F /PID %%p 2>nul

echo [2/3] Browser-opener armed (will open %URL%/editor when server responds)...
REM PowerShell one-liner: poll the URL every 500 ms; on the first 200 OK,
REM open /editor in the default browser, then exit. Hidden window keeps the
REM console clean for the dev-server output below.
start "" /B powershell -NoProfile -WindowStyle Hidden -Command "while ($true) { try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1 -ErrorAction Stop | Out-Null; Start-Process '%URL%/editor'; break } catch { Start-Sleep -Milliseconds 500 } }"

echo [3/3] Starting Next dev on %URL% (Ctrl-C to stop)...
echo.
call bun run dev -- --port %PORT%
