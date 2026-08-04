# Astrohub Mount Bridge

Windows tarafında ASCOM montürü okuyup Astrohub web arayüzüne `localhost` JSON
servisi olarak sunar.

## Gereksinimler

- Windows
- ASCOM Platform
- Montürünüzün ASCOM sürücüsü

## Çalıştırma

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
- `GET /status`
- `POST /connect` body: `{ "driverId": "ASCOM.Simulator.Telescope" }`
- `POST /disconnect`

İlk sürüm yalnızca TelescopeV3 uyumlu temel alanları okur: RA, DEC, Alt/Az,
site konumu, takip ve slew durumu. Capture yazılımları için `capture` alanı
ayrıldı; PHD2/SGP/TheSkyX/ZWO AIR adaptörleri buraya yazacak şekilde eklenir.
