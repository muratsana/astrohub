do $mig$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'venue_events')
     or exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'studio_profiles') then
    raise exception 'YANLIS PROJE: venue_events/studio_profiles goruldu - burasi StageHub. Goc durduruldu.';
  end if;
end;
$mig$;

alter table public.events
  add column if not exists registration_portal_enabled boolean not null default false,
  add column if not exists registration_portal_label text not null default 'Astrohub kayıt portalı',
  add column if not exists registration_portal_note text;

comment on column public.events.registration_portal_enabled is
  'Astrohub içi kayıt portalı açık mı. Açıkken katılım event_registrations üzerinden yönetilir.';
comment on column public.events.registration_portal_label is
  'Etkinlik detayında görünen kayıt portalı başlığı.';
comment on column public.events.registration_portal_note is
  'Etkinlik detayında kayıt düğmelerinin üstünde görünen kısa açıklama.';

alter table public.events
  drop constraint if exists events_registration_portal_label_len;

alter table public.events
  add constraint events_registration_portal_label_len
  check (char_length(registration_portal_label) between 3 and 80);

insert into public.events (
  slug,
  title,
  event_type,
  status,
  city,
  district,
  venue,
  latitude,
  longitude,
  starts_at,
  ends_at,
  free,
  camping,
  kids_friendly,
  astrophoto_focused,
  telescopes_provided,
  capacity,
  organizer_name,
  organizer_verified,
  description,
  observed_targets,
  rules,
  source_name,
  source_last_verified_at,
  registration_portal_enabled,
  registration_portal_label,
  registration_portal_note
)
values (
  'ethem-hoca-gokyuzu-gozlem-senligi-2026',
  'Ethem Hoca ile Gökyüzü Gözlem Şenliği',
  'gozlem-senligi',
  'yayinda',
  'Denizli',
  'Beyağaç',
  'Topuklu Yaylası, Beyağaç (1.700 m)',
  37.249400,
  28.895600,
  '2026-08-11T16:00:00+03:00',
  '2026-08-15T12:00:00+03:00',
  true,
  true,
  true,
  true,
  true,
  null,
  'Denizli Büyükşehir Belediyesi & Beyağaç Belediyesi',
  true,
  'Beyağaç''taki 1.700 metre rakımlı Topuklu Yaylası, ışık kirliliğinden Türkiye''nin en uzak noktalarından biri olarak biliniyor; SQM ölçümleri bölgenin gökyüzü kalitesini doğruluyor. Geçen yıl yaklaşık 5.000 katılımcı ve 50 profesyonel/amatör astronom şenliğe katıldı.',
  array['Perseid meteorları', 'Samanyolu', 'Satürn'],
  array[
    'Yayla 1.700 metrede; ağustosta bile gece sıcaklığı belirgin düşer.',
    'Beyaz ışık karanlık adaptasyonunu bozar - kırmızı fener getirin.'
  ],
  'Denizli Kent Haber',
  '2026-07-28',
  true,
  'Astrohub kayıt portalı',
  'Katılım başvuruları Astrohub hesabınızla alınır; düzenleyiciye iletmek istediğiniz kısa notu kayıt sırasında ekleyebilirsiniz.'
)
on conflict (slug) do update set
  title = excluded.title,
  event_type = excluded.event_type,
  status = excluded.status,
  city = excluded.city,
  district = excluded.district,
  venue = excluded.venue,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  free = excluded.free,
  camping = excluded.camping,
  kids_friendly = excluded.kids_friendly,
  astrophoto_focused = excluded.astrophoto_focused,
  telescopes_provided = excluded.telescopes_provided,
  organizer_name = excluded.organizer_name,
  organizer_verified = excluded.organizer_verified,
  description = excluded.description,
  observed_targets = excluded.observed_targets,
  rules = excluded.rules,
  source_name = excluded.source_name,
  source_last_verified_at = excluded.source_last_verified_at,
  registration_portal_enabled = excluded.registration_portal_enabled,
  registration_portal_label = excluded.registration_portal_label,
  registration_portal_note = excluded.registration_portal_note,
  updated_at = now();

with ethem as (
  select id from public.events
  where slug = 'ethem-hoca-gokyuzu-gozlem-senligi-2026'
)
delete from public.event_sessions s
using ethem
where s.event_id = ethem.id;

with ethem as (
  select id from public.events
  where slug = 'ethem-hoca-gokyuzu-gozlem-senligi-2026'
)
insert into public.event_sessions (event_id, starts_at, title, speaker, position)
select ethem.id, session.starts_at, session.title, null, session.position
from ethem
cross join (
  values
    ('Gündüz', 'Astronomi dersleri ve bilim etkinlikleri', 10),
    ('Akşam', 'Teleskoplarla gökyüzü gözlemi', 20),
    ('12-13 Ağustos gecesi', 'Perseid meteor yağmuru zirvesi', 30)
) as session(starts_at, title, position);
