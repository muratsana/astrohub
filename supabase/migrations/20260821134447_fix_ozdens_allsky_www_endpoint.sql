-- Ozdens Allsky kaynağının çıplak domainindeki TLS zinciri bazı istemcilerde
-- güvenilir doğrulanmıyor. Aynı içerik `www` hostundan doğru sertifikayla
-- geldiği için mevcut kayıtları güvenilir endpoint'e taşı.

update public.allsky_cameras
   set page_url = replace(page_url, 'https://ozdensobs.com/', 'https://www.ozdensobs.com/'),
       image_url = replace(image_url, 'https://ozdensobs.com/', 'https://www.ozdensobs.com/')
 where page_url like 'https://ozdensobs.com/%'
    or image_url like 'https://ozdensobs.com/%';
