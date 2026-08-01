-- ════════════════════════════════════════════════════════════════════════════
-- 0047 — MESAJ RAPORLAMA
--
-- §8.2 mesajlaşma için "Raporlama" istiyor. Kuyruk (`moderation_queue`) ve
-- bildirme düğmesi (`ReportButton`) zaten var; eksik olan tek şey hedef
-- türüydü: `app.moderation_target` enum'unda `message` yoktu ve enum
-- dışında bir değer yazmak reddediliyordu.
--
-- ══════════════════════════════════════════════════════════════════════════
-- MODERATÖR TÜM YAZIŞMALARI OKUYAMIYOR — VE OKUMAMALI
--
-- İlk akla gelen çözüm `messages` üstüne "moderatör her şeyi görür"
-- politikası eklemekti. Eklemedik. Rapor edilen TEK mesajı görmek için
-- iki kişinin bütün yazışma geçmişini moderasyona açmak, orantısız bir
-- yetki: bir kullanıcı tek bir cümleyi şikâyet ettiğinde aylarca süren
-- özel bir konuşmanın tamamı okunabilir hâle gelirdi.
--
-- Bunun yerine RAPOR EDEN KİŞİ, ŞİKÂYET ETTİĞİ METNİ KENDİSİ TAŞIYOR:
-- arayüz mesajın gövdesini rapor notuna kopyalıyor (bkz. `ReportButton`
-- çağrısı). Moderatör tam olarak şikâyet edilen cümleyi görüyor, bir
-- fazlasını değil. Hukuki olarak da temiz: paylaşılan içerik, alıcının
-- kendi rızasıyla ilettiği kendi gelen kutusundaki metin.
--
-- Daha derin bir inceleme gerekirse (taciz kalıbı, dolandırıcılık ağı)
-- o ayrı bir süreç: yasal talep + `service_role` erişimi + denetim kaydı.
-- Onu bir RLS politikasına gömmek, istisnayı varsayılan yapmak olurdu.
-- ════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_enum e
     join pg_type t on t.oid = e.enumtypid
     join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'app' and t.typname = 'moderation_target'
      and e.enumlabel = 'message'
  ) then
    alter type app.moderation_target add value 'message';
  end if;
end $$;
