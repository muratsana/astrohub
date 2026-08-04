@echo off
setlocal
set DRIVER=%ASTROHUB_ASCOM_DRIVER_ID%
if "%DRIVER%"=="" set DRIVER=ASCOM.Simulator.Telescope
"%~dp0dist\win-x64\AstrohubMountBridge.exe" --driver "%DRIVER%"
