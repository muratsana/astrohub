-- ══════════════════════════════════════════════════════════════════════
-- ŞİKÂYET AÇIKLAMASI ZORUNLU (en az 120 karakter)
--
-- `note` kolonu `not null` ama BOŞ DİZEYİ kabul ediyordu ve arayüz de
-- alanı "Açıklama (isteğe bağlı)" diye sunuyordu. Canlıdaki tek şikâyet
-- kaydının açıklaması tam olarak bu yüzden sıfır karakter: moderatörün
-- elinde yalnızca "telif ihlali" etiketi kaldı ve kararı verebilmek için
-- içeriği kendi başına yorumlamak zorunda kaldı.
--
-- Bir tıkla gönderilebilen şikâyet, kötüye kullanımı da ucuzlatıyor:
-- birini susturmak isteyen kişi için maliyet sıfır.
--
-- ── EŞİK NEDEN 120 ─────────────────────────────────────────────────
--
-- "Bu fotoğraf çalıntı" 20 karakter ve hiçbir şey anlatmıyor. 120
-- karakter, hangi kuralın nerede çiğnendiğini yazmaya yetecek en kısa
-- metin — telif şikâyetinde özgün eserin adresini yazmaya da yeter.
-- Üst sınır 2000'de kalıyor (arayüz de orada kesiyor).
--
-- ── NEDEN `NOT VALID` ──────────────────────────────────────────────
--
-- Var olan kayıt kısıtı ihlal ediyor. `NOT VALID` yeni ve GÜNCELLENEN
-- satırları bağlıyor, geçmişe dokunmuyor.
--
-- Alternatif, o satırı silmek ya da açıklamasını uydurmaktı: biri gerçek
-- bir moderasyon kaydını yok etmek, öteki kayda hiç kimsenin yazmadığı
-- bir cümleyi koymak olurdu. İkisi de denetim günlüğünü bozar.
-- ══════════════════════════════════════════════════════════════════════

alter table public.moderation_queue
  drop constraint if exists moderation_queue_note_min;

alter table public.moderation_queue
  add constraint moderation_queue_note_min
  check (length(btrim(note)) >= 120)
  not valid;

comment on constraint moderation_queue_note_min on public.moderation_queue is
  'Şikâyet açıklaması en az 120 karakter. NOT VALID: 0134 öncesi kayıtlar muaf.';
