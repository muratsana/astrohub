@echo off
setlocal
set DRIVER=%ASTROHUB_ASCOM_DRIVER_ID%
if "%DRIVER%"=="" set DRIVER=ASCOM.Simulator.Telescope
"%~dp0AstrohubMountBridge.exe" --driver "%DRIVER%"
pause
