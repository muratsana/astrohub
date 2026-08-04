# Astrohub Mount Bridge

Windows tarafında ASCOM montürü okuyup Astrohub web arayüzüne `localhost` JSON
servisi olarak sunar.

## Gereksinimler

- Windows
- ASCOM Platform
- Montürünüzün ASCOM sürücüsü

## Çalıştırma

Kolay başlatma:

```bat
Start-AstrohubMountBridge.cmd
```

Simülatör sürücüsüyle:

```powershell
powershell -ExecutionPolicy Bypass -File .\AstrohubMountBridge.ps1 -DriverId ASCOM.Simulator.Telescope
```

Gerçek sürücüyle:

```powershell
powershell -ExecutionPolicy Bypass -File .\AstrohubMountBridge.ps1 -DriverId ASCOM.MarkaModel.Telescope
```

Sonra Astrohub’da `/simulator` sayfasını açın ve bridge adresini
`http://127.0.0.1:4765` olarak bırakın.

## Endpointler

- `GET /health`
- `GET /drivers`
- `GET /status`
- `POST /connect` body: `{ "driverId": "ASCOM.Simulator.Telescope" }`
- `POST /disconnect`

Bridge ASCOM Profile üzerinden kurulu Telescope sürücülerini listeler. Seçilen
sürücüyle TelescopeV3 uyumlu temel alanları okur: RA, DEC, Alt/Az, site konumu,
takip ve slew durumu.

PHD2 açıksa `127.0.0.1:4400` JSON-RPC üzerinden guiding durumu ve RMS
değerlerini `capture` alanına ekler. SGP/TheSkyX/ZWO AIR adaptörleri aynı
`capture` alanına yazacak şekilde eklenir.
