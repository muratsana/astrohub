# Astrohub — Acceptance / Regression Test Matrix

## Kayıt
- terms/KVKK -> Back -> form değerleri korunur.
- Fresh user -> doğrulama -> onboarding -> normal site.

## Galeri
- filter/search/sort/page/scroll -> detail -> Galeriye dön -> bağlam restore.
- Benzer/teknik karşılaştırma gerçek thumbnail.
- Download dropdown; original + annotated.
- Pending annotated disabled.
- 1–10 rating persist.

## Thumbnail Crop
- Upload sırasında edge object -> drag/zoom ile görünür hale getir.
- Gallery Card + Home Card preview.
- Owner sonradan edit.
- Non-owner edit denied.
- New derivative hazır olmadan old silinmez.
- Crop değişince superseded thumbnail silinir.
- Original hash değişmez.
- Orphan GC yalnız referanssız derivative siler.
- Aynı crop tekrarında duplicate output yok.

## Paylaşım Kiti
- Owner sees; non-owner direct API denied.
- Feed 1080×1350.
- Story 1080×1920.
- Caption metadata.
- Multi-season caption.
- Clipboard/TXT.
- Original/annotated source.
- Hidden location exact GPS sızdırmaz.
- Optional ZIP/watermark.

## Tarih/Sezon
- Single date; range; multiple seasons; mixed types.
- Per-season exposures.
- Aggregate integration.
- New filter row clone.

## İlan
- 1–5 accepted, 6th rejected.
- optimize <=5MB.
- delete/replace/reorder.
- edit preserves existing assets.

## Navbar/Hesap
- avatar+username.
- user menu Logout visible.
- logout clears session.
- compact verified badge.

## Public Profil
- LinkedIn-style header.
- accordion.
- 390/768/1440 no overflow.

## Ekipman/Katalog
- setup edit same id.
- multiple filters.
- dedup no orphan.
- legacy series searchable.

## Runtime
- /saha 2xx.
- Meteoblue 503 fallback.
- /etkinlikler mobile no document overflow.

## Gate
Typecheck + lint + unit + browser E2E + responsive checks geçmeden TESTED yok.
