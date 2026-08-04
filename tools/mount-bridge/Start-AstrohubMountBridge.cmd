@echo off
setlocal
set DRIVER=%ASTROHUB_ASCOM_DRIVER_ID%
if "%DRIVER%"=="" set DRIVER=ASCOM.Simulator.Telescope
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0AstrohubMountBridge.ps1" -DriverId "%DRIVER%"
