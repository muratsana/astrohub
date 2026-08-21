-- Ozdens Allsky canlı görseli kullanıcının verdiği çıplak domain endpoint'inden gelir.
update public.allsky_cameras
   set page_url = 'https://ozdensobs.com/allsky/index.php',
       image_url = 'https://ozdensobs.com/allsky/image.jpg'
 where slug = 'ozdens-beypazari'
    or page_url in (
      'https://www.ozdensobs.com/allsky/index.php',
      'https://ozdensobs.com/allsky/index.php'
    )
    or image_url in (
      'https://www.ozdensobs.com/allsky/image.jpg',
      'https://ozdensobs.com/allsky/image.jpg'
    );

update public.nav_links
   set label = 'Allsky'
 where menu = 'header'
   and path = '/allsky'
   and label = 'ALLSKY';
