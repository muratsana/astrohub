-- FAZ 6 / adım 1 — bildirim tür ve kategori kümesini genişlet.
--
-- BU DOSYA YALNIZCA ENUM DEĞERİ EKLİYOR ve bilerek başka hiçbir şey
-- yapmıyor. PostgreSQL'de `alter type ... add value` ile eklenen bir
-- değer, EKLENDİĞİ İŞLEMİN İÇİNDE KULLANILAMAZ. Migration dosyaları tek
-- işlemde çalıştığı için, yeni kategorileri kullanan fonksiyon ve
-- tetikleyiciler bir sonraki dosyada (20260809101000) duruyor. Aynı
-- dosyaya koysaydık göç "unsafe use of new value" ile düşerdi.
--
-- ── KATEGORİ: BEŞTEN ONA ────────────────────────────────────────────
-- Plan yedi tür istiyor (sistem, mesaj, forum, içerik, galeri, ilan,
-- moderasyon); şemada beş vardı (sosyal, icerik, etkinlik, yayin,
-- sistem). Eksik beşi ekliyoruz, var olanı KALDIRMIYORUZ: `etkinlik` ve
-- `yayin` planın listesinde yok ama sitede gerçek karşılıkları var
-- (etkinlik hatırlatması, radyo/TV yayını). Planın listesi, admin
-- yenilemesi açısından yazılmış bir asgari küme; üstünü kesmek çalışan
-- iki kategoriyi çöpe atmak olurdu.
--
-- Bunun somut karşılığı: bugüne kadar "mesaj bildirimi istemiyorum ama
-- fotoğraf yorumu istiyorum" denemiyordu — ikisi de `sosyal` altındaydı
-- ve tek anahtarla birlikte susuyorlardı.

alter type app.notification_category add value if not exists 'mesaj';
alter type app.notification_category add value if not exists 'forum';
alter type app.notification_category add value if not exists 'galeri';
alter type app.notification_category add value if not exists 'ilan';
alter type app.notification_category add value if not exists 'moderasyon';

-- ── TÜR: ÜÇ YENİ DEĞER ──────────────────────────────────────────────
--
-- `forum_reply` — forum yanıtı bugüne kadar `comment_reply` türüyle
-- gidiyordu, yani fotoğraf yorumundan ayırt edilemiyordu. Ayrı tür
-- olmadan "forum" kategorisi de kurulamaz.
--
-- `content_approved` / `content_rejected` — içerik onay/ret bildirimi
-- (plan görev 3) hiç yoktu: FAZ 4 onay akışını kurdu ama karar sahibine
-- duyurulmuyordu, sahip kendi panelini yoklamak zorundaydı.
--
-- İkisi ayrı tür, çünkü `notifications_unread_unique` (user_id, kind,
-- subject_id, actor_id) okunmamış satırlarda benzersizlik arıyor. Tek
-- tür kullansaydık, reddedilmiş bir içerik düzeltilip onaylandığında
-- onay bildirimi eski ret satırına çarpar ve sessizce düşerdi.

alter type app.notification_kind add value if not exists 'forum_reply';
alter type app.notification_kind add value if not exists 'content_approved';
alter type app.notification_kind add value if not exists 'content_rejected';
