# ASTROHUB PATCH — AI AGENT BAŞLANGIÇ TALİMATI

Bu ZIP içindeki belgeler **tek bir patch kapsamıdır**. Hiçbir satırı sessizce atlama.

## Çalışma politikası
1. Repository: `muratsana/astrohub`.
2. **Yeni branch açma. Tüm uygulama doğrudan `main` üzerinde.**
3. Başlangıç:
   ```bash
   git checkout main
   git status
   git pull --ff-only origin main
   ```
4. Force-push YAPMA.
5. Her işi küçük/atomik commitlerle yap.
6. Her task başlamadan `IMPLEMENTATION_PROGRESS.md` + `PROGRESS_TRACKER.csv` satırını `IN_PROGRESS` yap.
7. Kod bitince `CODED`, test geçince `TESTED`, kullanıcı kontrolüne hazırsa `READY_FOR_USER`.
8. `VERIFIED` durumunu agent kendisi veremez. Kullanıcı doğrulaması gerekir.
9. CODED/TESTED satırlarında commit SHA + test komutu/path + screenshot/artifact kanıtı yaz.
10. Bir madde "zaten çalışıyor" denerek kapatılamaz; gerçek browser ile yeniden üret/kanıtla.
11. P0 işlerini önce bitir; sonra P1, P2 ve Extra.
12. DB/media silme işlemlerinde backup/dry-run/referans kontrolü olmadan destructive işlem yapma.

## Branch / PR temizliği
Audit anında bilinen branchler:
- `main`
- `claude/claude-code-gorev-steps-cb2ora`
- `codex/product-ux-audit-20260818`

Audit PR #22 kapatılmıştır. Non-main branchleri körlemesine silme:
```bash
git fetch --all --prune
git log main..origin/<branch>
git diff main...origin/<branch>
```
Gerekli benzersiz değişiklikleri önce main'e taşı; sonra gereksiz remote branchi sil. Main history rewrite yok.

## Başarı tanımı
- Tüm P0/P1/P2 görevler en az `READY_FOR_USER`.
- P0/P1 görevlerde regresyon testi.
- lint/typecheck/unit/E2E başarı.
- canlı public/member/owner/non-owner/admin testleri.
- 390/1440 responsive testleri.
- gereksiz branch/PR/dead code temizliği.
- DB dedup ve media GC işlerinde dry-run + rollback.
- son kullanıcı doğrulaması.

Önce `01_ASTROHUB_MASTER_AUDIT_IMPLEMENTATION.md`, sonra `IMPLEMENTATION_PROGRESS.md` oku.
