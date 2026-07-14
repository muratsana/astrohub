# Astrohub — Supabase

Bu klasör Astrohub'ın veritabanı şemasını (migrations), edge fonksiyonlarını
ve seed verilerini içerir. Şema plan §12.4'teki konsolide gruplara göre temiz
biçimde yönetilir; StageHub migration mirası taşınmaz.

## Migration'lar

| Dosya | İçerik |
|---|---|
| `0001_extensions_and_core.sql` | postgis, pg_trgm, citext, pgcrypto; `app` şeması; `updated_at` tetikleyicisi; `app_role` enum |
| `0002_auth_profiles_membership.sql` | profiles, user_roles, memberships, billing, notification_preferences, push, KVKK tabloları + RLS |

Sonraki gruplar (§12.4): `0003_equipment_and_setups` … `0012_storage_and_rls`.

## Yerel geliştirme

```bash
# Supabase CLI ile yerel stack
supabase start
supabase db reset          # tüm migration'ları uygular

# Yeni proje bağlama
supabase link --project-ref <ref>
supabase db push           # migration'ları uzak projeye uygular
```

## İlkeler

- Her tabloda açık **RLS** vardır (§15.1).
- Admin yetkisi `app.is_admin()` ile **veritabanı rol tablosundan** kontrol
  edilir; JWT metadata'ya güvenilmez.
- `service_role` anahtarı asla istemciye gönderilmez.
- Üyelik durumu ve roller yalnızca admin/service-role tarafından yazılır
  (webhook entitlement — §14.5).
