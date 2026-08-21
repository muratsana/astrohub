-- Ozdens Allsky çıplak domaini tarayıcıda ERR_CERT_AUTHORITY_INVALID üretiyor.
-- Aynı canlı dosya sertifika zinciri geçerli www endpoint'inden güvenilir yüklenir.
update public.allsky_cameras
   set page_url = 'https://www.ozdensobs.com/allsky/index.php',
       image_url = 'https://www.ozdensobs.com/allsky/image.jpg'
 where slug = 'ozdens-beypazari'
    or page_url in (
      'https://ozdensobs.com/allsky/index.php',
      'https://www.ozdensobs.com/allsky/index.php'
    )
    or image_url in (
      'https://ozdensobs.com/allsky/image.jpg',
      'https://www.ozdensobs.com/allsky/image.jpg'
    );
