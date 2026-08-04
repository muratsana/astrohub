# Astrohub Mount Panel Chrome Extension

Bu eklenti ASCOM’a doğrudan bağlanmaz. Chrome uzantıları Windows COM/ASCOM
nesnelerine erişemez; eklenti `tools/mount-bridge` tarafından açılan yerel
`http://127.0.0.1:4765/status` endpoint’ini okur.

## Kurulum

1. Chrome’da `chrome://extensions` açın.
2. Developer mode’u açın.
3. "Load unpacked" ile bu klasörü seçin.
4. `tools/mount-bridge` bridge uygulamasını başlatın.
5. Eklenti ikonundan canlı RA/DEC durumunu görün veya Astrohub Simülatör’ü açın.
