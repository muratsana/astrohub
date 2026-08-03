import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ContentCardSkeletonGrid } from '@/components/ui/ContentCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoCard } from '@/features/photos/PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';

/**
 * GALERİDEN SON YÜKLENENLER.
 *
 * Topluluğun ürettiği kayıtlar öne alınır: site kendini anlatmadan önce
 * çalışırken gösterir. Künye her karoda görünür (yön kararı).
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAROYU `PhotoCard` ÇİZİYOR — BURADA İKİNCİ BİR EŞLEME YOK
 *
 * BULUNAN HATA: bu bölüm `PhotoTile`ı DOĞRUDAN çağırıyor ve `AstroPhoto`
 * alanlarını elle eşliyordu. `PhotoTile` bilinçli olarak "aptal" bir
 * bileşen — veri modelini tanımaz, ne verilirse onu çizer — ve elle
 * yapılan o eşlemede `imageUrl` YOKTU. Görsel adresi verilmeyince karo
 * yer tutucu yıldız alanına düşüyor; yani ana sayfa, gerçek fotoğraflar
 * yüklenmiş olmasına rağmen herkese üretilmiş desenler gösteriyordu.
 * Kullanıcı fotoğrafının kaybolduğunu sanıyordu, oysa hiç istenmemişti.
 *
 * `PhotoCard`ın dosya başlığı bu tuzağı zaten yazıyor: "AstroPhoto
 * kaydını PhotoTile'a bağlayan TEK YER". Eşlemenin ikinci bir kopyası
 * olduğu anda biri eksik kalıyor — nitekim kaldı. Puan rozeti de aynı
 * sebeple burada hiç görünmüyordu.
 */

/*
 * IZGARA TEK YERDE TANIMLI — iskelet ve gerçek liste aynı sınıfı
 * kullanmazsa yükleme bitince kartlar yerinden oynar (CLS).
 */
const IZGARA = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5';
const LISTE = 'grid gap-2.5';
const KAC_KART = 10;
type HomeSectionLayout = 'grid' | 'list';

/**
 * `limit` ve `title` artık `home_modules`tan geliyor (§13.2); verilmezse
 * `KAC_KART` ve bugünkü başlık. Yorumdaki "Faz 10'da bağlanır" sözü
 * `hideWhenEmpty` için de gerçekleşti: anahtar `HomePage` üzerinden
 * doğrudan tablodan besleniyor.
 */
export function RecentRecords({
  hideWhenEmpty = false,
  limit = KAC_KART,
  layout = 'grid',
  subtitle,
  title = 'Galeriden Son Yüklenenler',
}: {
  hideWhenEmpty?: boolean;
  limit?: number;
  layout?: HomeSectionLayout;
  subtitle?: string;
  title?: string;
} = {}) {
  const catalog = usePhotoCatalog();
  const photos = catalog.items;
  const recent = photos.slice(0, limit);
  const list = layout === 'list';

  /*
   * "BOŞSA GİZLE" BİR AYAR, MUTLAK KURAL DEĞİL (§6.2).
   *
   * Belge "içerik yoksa modül otomatik gizlenir" diyor ama hemen ardından
   * "admin panelinden 'boşsa gizle' davranışı YÖNETİLEBİLİR olmalıdır"
   * diyor — yani bu bir tercih. Davranış burada bir prop; Faz 10'da
   * `home_modules` tablosu gelince admin anahtarı doğrudan buraya bağlanır.
   *
   * VARSAYILAN GİZLEMEK DEĞİL, ÇAĞRI YAPMAK. Galeri sitenin çekirdek
   * içeriği: boş olması bir kusur değil, ilk yükleyecek kişi için bir
   * fırsat. Modülü gizlemek o fırsatı da gizler. Kardeş bölümler
   * (ilanlar, etkinlikler) ikincil olduğu için orada çağrı yok.
   *
   * Gizleme YALNIZCA otoriter bir "boş" sonucunda: yükleniyorken gizlemek
   * sayfanın ortasında zıplama üretir, hata durumunda gizlemek modülü hiç
   * yokmuş gibi gösterir.
   */
  if (hideWhenEmpty && catalog.status === 'ready' && recent.length === 0) {
    return null;
  }

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title={title}
        description={subtitle}
        meta={`${photos.length} fotoğraf`}
        linkTo="/galeri"
        linkLabel="Galeri"
      />

      {catalog.status === 'loading' ? (
        /*
         * YÜKLENİYOR — ÖNCEDEN TOHUM ÇİZİLİYORDU.
         *
         * Sorgu sonuçlanana kadar `selectContent` tohum listesini
         * veriyor; yani kullanıcı bir an KURGU fotoğrafları gerçek
         * sanıyor, sonra hepsi değişiyordu. İskelet hem o yanılgıyı
         * bitiriyor hem de ızgarayı aynı sınıfla çizdiği için liste
         * gelince hiçbir şey yerinden oynamıyor.
         */
        <ul className={list ? LISTE : IZGARA} aria-busy="true">
          {/* İskelet sayısı da `limit` — sabit kalsaydı yönetici sayıyı
              değiştirdiğinde yükleme ile sonuç farklı sayıda kart çizer,
              liste gelince ızgara zıplardı. */}
          <ContentCardSkeletonGrid
            count={limit}
            ratio="square"
            variant={list ? 'list' : 'grid'}
          />
        </ul>
      ) : catalog.status === 'error' ? (
        /*
         * HATA SİTEYİ BOZMAMALI (§6.2). Bölüm ayakta kalıyor, kullanıcıya
         * ne olduğu söyleniyor ve yeniden deneme veriliyor. Eldeki tohum
         * listesi ÇİZİLMİYOR: gerçek sanılabilecek kurgu içerik göstermek,
         * hiçbir şey göstermemekten kötü.
         */
        <Alert tone="warning">
          <p className="text-body-sm leading-relaxed">
            Galeri şu anda okunamadı; bağlantı kurulamadı. Sayfanın diğer
            bölümleri etkilenmedi.
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="mt-2.5"
            onClick={catalog.refresh}
          >
            Yeniden dene
          </Button>
        </Alert>
      ) : recent.length === 0 ? (
        /*
         * BOŞ GALERİ SESSİZ KALMAMALI.
         *
         * SIRA ÖNEMLİ: bu dal hata dalının ALTINDA. Önce yazdığımda
         * `status === 'error'` + boş liste "henüz fotoğraf yok" diyordu —
         * yani okuma düştüğünde kullanıcıya galerinin BOŞ olduğu
         * söyleniyordu. Yanlış bilgi, sessiz boşluktan kötü. (Kendi
         * testim yakaladı.)
         *
         * Bölüm boş listede yalnızca başlığı ve `Container`ın dolgusunu
         * çiziyordu: canlıda "0 fotoğraf" yazısının altında yüz piksellik
         * bir boşluk kalıyor ve sayfa bozuk görünüyordu.
         *
         * Boşluk yayın öncesi geçici bir durum değil, T-203'ün doğrudan
         * sonucu: boş bir veritabanı tablosu artık üretimde tohuma
         * DÜŞMÜYOR. Doğru karar — sahte fotoğrafla dolu bir galeri
         * kullanıcıyı yanıltırdı — ama arayüzün buna bir cevabı olması
         * gerekiyordu.
         */
        <p className="rounded-card border border-border bg-surface-1 px-3 py-6 text-center text-meta text-muted-foreground">
          Galeride henüz yayımlanmış fotoğraf yok.{' '}
          <Link to="/galeri/yukle" className="text-primary hover:underline">
            İlk kareyi sen yükle →
          </Link>
        </p>
      ) : (
        <ul className={list ? LISTE : IZGARA}>
          {recent.map((photo) => (
            <li key={photo.slug}>
              <PhotoCard photo={photo} variant={list ? 'list' : 'grid'} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
