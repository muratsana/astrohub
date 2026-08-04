@echo off
setlocal
dotnet publish "%~dp0exe\AstrohubMountBridge.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "%~dp0dist\win-x64"
echo.
echo EXE: %~dp0dist\win-x64\AstrohubMountBridge.exe
