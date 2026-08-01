-- 0056_youtube_oauth_state.sql
--
-- OAuth `state` değerine KENDİ KOLONU.
--
-- İlk yazımda state, `access_token` kolonuna geçici olarak
-- yazılıyordu. Çalışıyordu ama gerçek bir hata riski taşıyordu: yetki
-- akışı sürerken (yönlendirme ile dönüş arasında) bir senkronizasyon
-- çalışsa, `accessToken()` o state dizgisini bearer jeton sanıp
-- YouTube'a gönderirdi. 401 alırdı, kimse ölmezdi — ama sebebi
-- "senkronizasyon bazen çalışmıyor" olarak görünürdü ve bulunması
-- zor bir hata olurdu.
--
-- İki alanın anlamı farklı; kolonları da farklı olmalı.

alter table public.youtube_connection
  add column if not exists oauth_state text,
  add column if not exists oauth_state_at timestamptz;

comment on column public.youtube_connection.oauth_state is
  'CSRF nonce. Yetkilendirme başlarken yazılıyor, dönüşte doğrulanıp siliniyor.';
