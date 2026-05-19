@echo off
REM ============================================================================
REM slothcv local dev server (Windows)
REM ============================================================================
REM Fresh-clone-safe parity with the macOS/Linux start_local_server.sh.
REM Anyone on Windows can double-click this on a clean clone - gets pre-flight
REM checks, dep install, .env scaffolding, placeholder warnings, browser open,
REM and Next dev all from one launcher.
REM
REM Flow:
REM   1. Verify bun + node + Node 18+ on PATH (fail loud with clear hints)
REM   2. If node_modules missing, bun install (fresh-clone case)
REM   3. If .env missing, copy from .env.example (placeholders only - never
REM      Philip's real Supabase creds; .env is .gitignored)
REM   4. Credential-doctor: warn if .env still has YOUR_PROJECT_REF / your-*
REM      placeholders so user knows what to fill in for full functionality
REM   5. Kill anything listening on port 3020 (stale Next or ghost lockfile)
REM   6. Background PowerShell browser-opener polls URL every 500ms; opens
REM      /editor on first 200 OK
REM   7. Foreground bun run dev so user sees compile/route logs and Ctrl+C
REM      cleanly tears the whole thing down
REM
REM Package manager: bun (project ships bun.lock).
REM Port: 3020 (slothcv slot per workspace port-map).
REM ============================================================================

setlocal
cd /d "%~dp0"

set PORT=3020
set URL=http://localhost:%PORT%
set EDITOR_URL=%URL%/editor

REM 1. Pre-flight checks.
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found in PATH.
    echo Install Node 18.18 or newer from https://nodejs.org
    pause
    exit /b 1
)
where bun >nul 2>&1
if errorlevel 1 (
    echo [ERROR] bun not found in PATH.
    echo Install Bun from https://bun.sh
    echo   - Windows: PowerShell one-liner from the homepage
    echo   - Or use scoop / winget if you prefer
    pause
    exit /b 1
)

REM 1b. Node version check (need 18.18+ for Next 16 + bun compatibility).
node -e "process.exit(parseInt(process.versions.node.split('.')[0]) >= 18 ? 0 : 1)" 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js version is too old.
    node --version
    echo This project needs Node 18.18 or newer.
    echo Upgrade from https://nodejs.org
    pause
    exit /b 1
)

REM 2. Install deps if node_modules is missing (fresh-clone case).
if not exist "node_modules" (
    echo [setup] node_modules missing - running bun install...
    call bun install
    if errorlevel 1 (
        echo [ERROR] bun install failed.
        echo Common fixes:
        echo   - No internet connection
        echo   - Behind a corporate proxy: set HTTP_PROXY and HTTPS_PROXY
        echo   - Out of disk space
        pause
        exit /b 1
    )
)

REM 3. Auto-copy .env.example to .env if .env is missing. Note: all .env*
REM    files are in .gitignore (verified) and never reach git history.
REM    Your local Supabase credentials stay on YOUR machine.
if not exist ".env" if exist ".env.example" (
    echo [setup] .env not found - copying .env.example to .env...
    copy /Y ".env.example" ".env" >nul
    echo [setup] Created .env from the example template.
)

REM 4. Credential-doctor: scan .env for placeholder Supabase values.
REM    Pure findstr instead of PowerShell - line-continuation `^` inside
REM    a `powershell -Command "..."` arg gets parsed by cmd before
REM    powershell sees it, so multi-line `^`-broken commands fail with
REM    "The term '^' is not recognized" (smoke-test caught this 2026-05-19).
REM    Single-line findstr is simpler + faster + can't break.
set CRED_BAD=0
findstr /C:"NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co" .env >nul 2>&1 && set CRED_BAD=1
findstr /C:"NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" .env >nul 2>&1 && set CRED_BAD=1
findstr /C:"SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" .env >nul 2>&1 && set CRED_BAD=1
if "%CRED_BAD%"=="1" (
    echo.
    echo   [warning] Your .env has placeholder Supabase values.
    echo       Local dev: UI loads but persistence is no-op without real keys.
    echo       To enable CV-save + AI-edit features:
    echo         1. https://supabase.com - create a free project
    echo         2. Project Settings - API - copy URL + anon-key + service-role-key
    echo         3. Update NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
    echo            SUPABASE_SERVICE_ROLE_KEY in .env
    echo.
)

REM 5. Free port 3020.
echo [setup] Killing any process listening on port %PORT%...
for /f "tokens=5" %%p in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do taskkill /F /PID %%p 2>nul

REM 6. Background browser-opener. Polls dev URL every 500ms; on first 200
REM    OK, opens /editor in default browser and exits. Hidden window so
REM    the foreground Next dev output stays clean.
echo [setup] Browser-opener armed (will open %EDITOR_URL% when server responds)...
start "" /B powershell -NoProfile -WindowStyle Hidden -Command ^
    "while ($true) { try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1 -ErrorAction Stop ^| Out-Null; Start-Process '%EDITOR_URL%'; break } catch { Start-Sleep -Milliseconds 500 } }"

REM 7. Foreground Next dev so user sees output + Ctrl+C cleanup.
echo [setup] Starting Next dev on %URL% (Ctrl+C to stop)...
echo.
call bun run dev -- --port %PORT%

echo.
echo [setup] Dev server exited. Press any key to close this window.
pause >nul

endlocal
