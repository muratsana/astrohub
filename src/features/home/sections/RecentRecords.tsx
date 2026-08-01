import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ContentCardSkeletonGrid } from '@/components/ui/ContentCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoTile } from '@/components/media/PhotoTile';
import { usePhotoCatalog } from '@/services/content/photos';
import {
  formatIntegration,
  totalIntegrationSeconds,
} from '@/domain/photography/integration';
import { tintFor } from '@/components/media/tints';
import { Badge } from '@/components/ui/Badge';
import { familyOf, photoFamilies } from '@/features/photos/families';
import { targets } from '@/features/targets/data';

/**
 * GALERİDEN SON YÜKLENENLER.
 *
 * Topluluğun ürettiği kayıtlar öne alınır: site kendini anlatmadan önce
 * çalışırken gösterir. Künye her karoda görünür (yön kararı).
 */

/** Fotoğrafın hedef türünü katalogdan bulup yıldız alanı tonunu seçer. */
function tintForPhoto(catalog: string): string {
  const target = targets.find(
    (t) => t.catalog === catalog || t.aliases.includes(catalog)
  );
  return tintFor(target?.kind);
}

/*
 * IZGARA TEK YERDE TANIMLI — iskelet ve gerçek liste aynı sınıfı
 * kullanmazsa yükleme bitince kartlar yerinden oynar (CLS).
 */
const IZGARA = 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5';
const KAC_KART = 10;

export function RecentRecords({ hideWhenEmpty = false }: { hideWhenEmpty?: boolean } = {}) {
  const catalog = usePhotoCatalog();
  const photos = catalog.items;
  const recent = photos.slice(0, KAC_KART);

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
        title="Galeriden Son Yüklenenler"
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
        <ul className={IZGARA} aria-busy="true">
          <ContentCardSkeletonGrid count={KAC_KART} ratio="square" />
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
        <ul className={IZGARA}>
          {recent.map((photo) => (
            <li key={photo.slug}>
              <PhotoTile
                to={`/fotograf/${photo.slug}`}
                seed={photo.slug}
                tint={tintForPhoto(photo.target.catalog)}
                target={photo.target.catalog}
                title={photo.title}
                palette={photo.palette}
                integration={formatIntegration(
                  totalIntegrationSeconds(photo.exposures)
                )}
                bortle={photo.location.bortle}
                username={photo.user.username}
                family={{
                  label: photoFamilies[familyOf(photo.type)].label,
                  className: photoFamilies[familyOf(photo.type)].className,
                }}
                flag={
                  photo.editorsPick ? (
                    <Badge tone="primary" className="bg-background/85">
                      Editör
                    </Badge>
                  ) : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
