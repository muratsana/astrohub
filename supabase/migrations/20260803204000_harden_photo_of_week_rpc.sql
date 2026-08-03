-- Supabase'in proje varsayılan yetkileri yeni public fonksiyonlara anon
-- EXECUTE verebilir. Tur kapatma yalnız admin kontrolünden geçse de anonim
-- çağrının API yüzeyinde hiç görünmemesi daha dar ve denetlenebilir yüzeydir.
revoke all on function public.close_photo_of_week(uuid) from public, anon;
grant execute on function public.close_photo_of_week(uuid) to authenticated;
