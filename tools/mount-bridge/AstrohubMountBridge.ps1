param(
  [string]$DriverId = $env:ASTROHUB_ASCOM_DRIVER_ID,
  [string]$Prefix = "http://127.0.0.1:4765/"
)

$ErrorActionPreference = "Stop"
$mount = $null
$activeDriverId = $DriverId

function Add-Cors($context) {
  $response = $context.Response
  $origin = $context.Request.Headers["Origin"]
  if ($origin -match "^https://astrohub\.com\.tr$" -or $origin -match "^http://(localhost|127\.0\.0\.1)(:\d+)?$" -or -not $origin) {
    $response.Headers["Access-Control-Allow-Origin"] = $(if ($origin) { $origin } else { "*" })
  }
  $response.Headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
  $response.Headers["Access-Control-Allow-Headers"] = "content-type"
}

function Send-Json($context, $statusCode, $data) {
  $response = $context.Response
  Add-Cors $context
  $response.StatusCode = $statusCode
  $response.ContentType = "application/json; charset=utf-8"
  $json = $data | ConvertTo-Json -Depth 8 -Compress
  $bytes = [Text.Encoding]::UTF8.GetBytes($json)
  $response.ContentLength64 = $bytes.Length
  $response.OutputStream.Write($bytes, 0, $bytes.Length)
  $response.OutputStream.Close()
}

function Get-BodyJson($request) {
  if (-not $request.HasEntityBody) { return @{} }
  $reader = [IO.StreamReader]::new($request.InputStream, $request.ContentEncoding)
  $text = $reader.ReadToEnd()
  if (-not $text.Trim()) { return @{} }
  return $text | ConvertFrom-Json
}

function Read-Com($object, $name) {
  try { return $object.$name } catch { return $null }
}

function Invoke-Phd2($method) {
  $client = $null
  try {
    $client = [Net.Sockets.TcpClient]::new()
    $client.ReceiveTimeout = 700
    $client.SendTimeout = 700
    $connected = $client.ConnectAsync("127.0.0.1", 4400).Wait(700)
    if (-not $connected) { return $null }

    $stream = $client.GetStream()
    $writer = [IO.StreamWriter]::new($stream, [Text.Encoding]::UTF8)
    $writer.NewLine = "`n"
    $writer.AutoFlush = $true
    $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::UTF8)
    $writer.WriteLine((@{ jsonrpc = "2.0"; method = $method; id = 1 } | ConvertTo-Json -Compress))
    $line = $reader.ReadLine()
    if (-not $line) { return $null }
    return ($line | ConvertFrom-Json).result
  } catch {
    return $null
  } finally {
    if ($client -ne $null) { $client.Close() }
  }
}

function Read-Phd2Capture {
  $state = Invoke-Phd2 "get_app_state"
  $stats = Invoke-Phd2 "get_stats"
  if ($state -eq $null -and $stats -eq $null) { return $null }

  $stateText = "çalışıyor"
  if ($state -ne $null) { $stateText = "$state" }

  return @{
    app = "PHD2"
    state = $stateText
    rmsArcsec = Read-Com $stats "rms_tot"
    raRmsArcsec = Read-Com $stats "rms_ra"
    decRmsArcsec = Read-Com $stats "rms_dec"
  }
}

function Connect-Mount($driverId) {
  if (-not $driverId) { throw "DriverId gerekli. Örn: ASCOM.Simulator.Telescope" }
  if ($script:mount -eq $null -or $script:activeDriverId -ne $driverId) {
    $script:mount = New-Object -ComObject $driverId
    $script:activeDriverId = $driverId
  }
  try { $script:mount.Connected = $true } catch {}
}

function Mount-Status {
  if ($script:mount -eq $null) {
    return @{
      ok = $true
      connected = $false
      driverId = $script:activeDriverId
      utc = (Get-Date).ToUniversalTime().ToString("o")
    }
  }

  $connected = [bool](Read-Com $script:mount "Connected")
  return @{
    ok = $true
    connected = $connected
    driverId = $script:activeDriverId
    name = Read-Com $script:mount "Name"
    description = Read-Com $script:mount "Description"
    driverInfo = Read-Com $script:mount "DriverInfo"
    driverVersion = Read-Com $script:mount "DriverVersion"
    rightAscensionHours = Read-Com $script:mount "RightAscension"
    declinationDeg = Read-Com $script:mount "Declination"
    altitudeDeg = Read-Com $script:mount "Altitude"
    azimuthDeg = Read-Com $script:mount "Azimuth"
    siteLatitudeDeg = Read-Com $script:mount "SiteLatitude"
    siteLongitudeDeg = Read-Com $script:mount "SiteLongitude"
    siteElevationM = Read-Com $script:mount "SiteElevation"
    tracking = Read-Com $script:mount "Tracking"
    slewing = Read-Com $script:mount "Slewing"
    atPark = Read-Com $script:mount "AtPark"
    sideOfPier = "$(Read-Com $script:mount "SideOfPier")"
    capture = Read-Phd2Capture
    utc = (Get-Date).ToUniversalTime().ToString("o")
  }
}

if (-not $DriverId) {
  $activeDriverId = "ASCOM.Simulator.Telescope"
}

$listener = [Net.HttpListener]::new()
$listener.Prefixes.Add($Prefix)
$listener.Start()
Write-Host "Astrohub Mount Bridge dinliyor: $Prefix"
Write-Host "Varsayılan driver: $activeDriverId"

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $path = $context.Request.Url.AbsolutePath.ToLowerInvariant()

    if ($context.Request.HttpMethod -eq "OPTIONS") {
      Send-Json $context 204 @{}
      continue
    }

    try {
      switch ($path) {
        "/health" {
          Send-Json $context 200 @{ ok = $true; app = "Astrohub Mount Bridge"; version = "0.1.0" }
        }
        "/status" {
          Send-Json $context 200 (Mount-Status)
        }
        "/connect" {
          $body = Get-BodyJson $context.Request
          $driver = $(if ($body.driverId) { [string]$body.driverId } else { $activeDriverId })
          Connect-Mount $driver
          Send-Json $context 200 (Mount-Status)
        }
        "/disconnect" {
          if ($script:mount -ne $null) {
            try { $script:mount.Connected = $false } catch {}
          }
          Send-Json $context 200 (Mount-Status)
        }
        default {
          Send-Json $context 404 @{ ok = $false; connected = $false; error = "Bilinmeyen endpoint" }
        }
      }
    } catch {
      Send-Json $context 500 @{ ok = $false; connected = $false; error = $_.Exception.Message }
    }
  }
} finally {
  if ($mount -ne $null) {
    try { $mount.Connected = $false } catch {}
  }
  $listener.Stop()
}
