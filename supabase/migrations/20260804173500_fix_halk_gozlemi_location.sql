-- Halka Açık Teleskop Gözlemi'nin mekanı Maltepe Sahil Parkı; eski değer
-- İstanbul il merkeziydi ve yakınlık hesabında hatalı 0 m üretiyordu.
update public.events
set latitude = 40.923900,
    longitude = 29.131500
where slug = 'halk-gozlemi'
  and venue = 'Maltepe Sahil Parkı';
