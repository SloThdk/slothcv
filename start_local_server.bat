@echo off
REM ============================================================================
REM slothcv local dev server
REM ============================================================================
REM Mirrors the philipsloth-portfolio / mission-control pattern:
REM   1. Kill any process holding the dev port (stale Next.js from a crash, etc.)
REM   2. Clear the .next webpack lock if present (Turbopack/webpack cache lock)
REM   3. Open the browser to the dev URL
REM   4. Run `npm run dev` so the server takes over the foreground
REM
REM Port: 3020 (next-free slot per MEMORY.md port map after HausSupply=3018,
REM SlothView=3019).
REM
REM Stack: Next.js 16 + React 19 + Tailwind v4 + Supabase. Reads
REM `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
REM ============================================================================

@echo off
cd /d "%~dp0"

echo [1/3] Killing any process listening on port 3020...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :3020 ^| findstr LISTENING') do taskkill /F /PID %%p 2>nul

echo [2/3] Clearing Next webpack lock if present...
if exist .next\cache\webpack del /f /q .next\cache\webpack 2>nul

echo [3/3] Starting Next dev on http://localhost:3020 ...
start "" "http://localhost:3020"
call npm run dev -- --port 3020
