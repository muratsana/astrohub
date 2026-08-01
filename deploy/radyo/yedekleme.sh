#!/usr/bin/env bash
#
# AstroHub Radyo — yedekleme (§10.1 "yedekleme planı").
#
# ══════════════════════════════════════════════════════════════════════
# NEYİN YEDEĞİ ALINIYOR VE NEYİN ALINMIYOR
#
# Alınıyor:  AzuraCast veritabanı (istasyon ayarları, playlist'ler,
#            program takvimi, kullanıcı hesapları) ve medya kütüphanesi.
# Alınmıyor: Docker imajları ve konteyner katmanları — onlar
#            `docker-compose.yml`den yeniden üretiliyor. Yedeklenmesi
#            gereken şey ÜRETİLEMEYEN şeydir.
#
# ══════════════════════════════════════════════════════════════════════
# TEST EDİLMEMİŞ YEDEK, YEDEK DEĞİLDİR
#
# Bu betik yedeği alır ve boyutunu kontrol eder. Geri yükleme provası
# TAKVİME BAĞLANMALI (README, "Yedekleme"): yılda bir kez boş bir
# sunucuya geri yüklenmemiş bir yedeğin çalıştığı bilinmiyor, umuluyor.
#
# Kullanım:
#   ./yedekleme.sh                      # varsayılan dizine
#   HEDEF=/mnt/yedek ./yedekleme.sh     # başka dizine
#
# Cron örneği (her gece 04:00, yerel saat):
#   0 4 * * * /opt/astrohub-radyo/yedekleme.sh >> /var/log/radyo-yedek.log 2>&1

set -euo pipefail

HEDEF="${HEDEF:-/var/backups/astrohub-radyo}"
SAKLAMA_GUN="${SAKLAMA_GUN:-14}"
# En küçük makul yedek boyutu. Bunun altındaki bir dosya "yedek alındı"
# demek değil; boş bir arşiv de sıfırla dönmeyen bir hatadır.
ASGARI_BAYT="${ASGARI_BAYT:-1048576}"

DAMGA="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$HEDEF"

echo "[$(date -Is)] Yedek başlıyor → $HEDEF"

# AzuraCast'in kendi yedek komutu: veritabanını tutarlı bir anda alıyor.
# `pg_dump`ı dışarıdan çağırmak, yazma sürerken tutarsız yedek üretme
# riski taşırdı.
docker compose exec -T web azuracast_cli azuracast:backup \
  "/var/azuracast/backups/astrohub-${DAMGA}.zip"

# Konteynerden dışarı kopyala: konteyner volume'u sunucuyla birlikte
# kaybolur, yedeğin ayrı bir yerde olması gerekiyor.
docker compose cp \
  "web:/var/azuracast/backups/astrohub-${DAMGA}.zip" \
  "${HEDEF}/astrohub-${DAMGA}.zip"

# Konteyner içindeki kopyayı bırakma: disk dolduğunda yayın durur ve
# sebebi "yedekler" olur.
docker compose exec -T web rm -f "/var/azuracast/backups/astrohub-${DAMGA}.zip"

BOYUT="$(stat -c%s "${HEDEF}/astrohub-${DAMGA}.zip")"
if [ "$BOYUT" -lt "$ASGARI_BAYT" ]; then
  echo "[HATA] Yedek beklenenden küçük (${BOYUT} bayt). Kurulum kontrol edilmeli." >&2
  exit 1
fi

# Eski yedekleri sil — ama YALNIZCA yenisi doğrulandıktan sonra.
# Sıra tersine olsaydı, başarısız bir yedek gecesi elde hiçbir şey
# kalmazdı.
find "$HEDEF" -name 'astrohub-*.zip' -mtime "+${SAKLAMA_GUN}" -delete

echo "[$(date -Is)] Yedek tamam: ${HEDEF}/astrohub-${DAMGA}.zip (${BOYUT} bayt)"
