Astrohub Mount Bridge test paketi

Gereksinimler:
- Windows 10/11 x64
- ASCOM Platform
- Test için ASCOM Telescope Simulator veya kendi montürünüzün ASCOM sürücüsü
- İsteğe bağlı: PHD2 açık olursa guiding RMS okunur

Çalıştırma:
1. Zip dosyasını çıkarın.
2. Start-AstrohubMountBridge.cmd dosyasına çift tıklayın.
3. Tarayıcıdan https://astrohub.com.tr/simulator sayfasını açın.
4. Bridge adresi http://127.0.0.1:4765 olarak kalsın.
5. "Sürücüleri tara" ile kurulu ASCOM sürücülerini listeleyin.
6. Sürücüyü seçip "Bağlan" düğmesine basın.

Diagnostic:
- Program açılışta diagnostic bilgisini konsola yazar.
- Tarayıcıdan şu adresler kontrol edilebilir:
  http://127.0.0.1:4765/health
  http://127.0.0.1:4765/diagnostics
  http://127.0.0.1:4765/drivers
  http://127.0.0.1:4765/status

Gerçek sürücü ile başlatma:
AstrohubMountBridge.exe --driver ASCOM.MarkaModel.Telescope

Not:
Windows Defender ilk çalıştırmada bilinmeyen yayıncı uyarısı gösterebilir.
Bu test build'i imzalı değildir.
