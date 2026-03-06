@echo off
REM Deploy Edge Functions for LoRA Training Pipeline
REM Section E02: Dataset Management

echo ============================================
echo Deploying Edge Functions
echo ============================================
echo.

echo Deploying validate-datasets function...
call supabase functions deploy validate-datasets

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo [ERROR] Failed to deploy validate-datasets
  exit /b 1
)

echo.
echo ============================================
echo All Edge Functions deployed successfully!
echo ============================================
echo.
echo Next steps:
echo 1. Configure Cron trigger in Supabase Dashboard:
echo    - Navigate to Database -^> Cron Jobs
echo    - Create new job with schedule: * * * * * (every 1 minute^)
echo    - Target function: validate-datasets
echo.
echo 2. Verify deployment:
echo    supabase functions invoke validate-datasets --no-verify-jwt
echo.
echo 3. Check logs:
echo    supabase functions logs validate-datasets
echo.
pause

