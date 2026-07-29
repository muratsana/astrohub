#!/bin/bash
#
# Claude Code oturum başlangıç kancası.
#
# Uzak oturumlar (Claude Code on the web) depoyu her seferinde sıfırdan
# klonlar; node_modules gelmez. Bu betik olmadan ilk `npm test` ya da
# `npm run lint` "command not found" ile düşer. Yerel makinede zaten kurulu
# bağımlılıkların üzerinden geçmenin anlamı yok — bu yüzden yalnızca uzak
# ortamda çalışır.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# `npm ci` değil `npm install`: konteyner durumu kanca bittikten sonra
# önbelleğe alınıyor ve `install` mevcut node_modules'ün üzerine yalnızca
# farkı uyguluyor. `ci` ise her seferinde klasörü silip baştan kuruyor.
npm install --no-audit --no-fund --loglevel=error

# Chromium ortamda hazır kurulu (PLAYWRIGHT_BROWSERS_PATH); scripts/browser.mjs
# onu bulup kullanıyor. `npx playwright install` çağırmıyoruz — yüzlerce MB'ı
# gereksiz yere yeniden indirirdi.
echo "session-start: bağımlılıklar hazır ($(node --version), npm $(npm --version))"
