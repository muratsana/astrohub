import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { RemoteImage } from '@/components/media/RemoteImage';
import {
  comparePhotos,
  differenceCount,
  type ComparablePhoto,
} from '@/domain/photography/versions';
import { usePhotoCatalog } from '@/services/content/photos';
import type { AstroPhoto } from './types';
import { cn } from '@/lib/cn';

/**
 * AYNI HEDEFİN İKİ KAYDININ TEKNİK KARŞILAŞTIRMASI (§8.1).
 *
 * Karşılaştırılacak aday **aynı hedefin** diğer kayıtlarıdır; farklı hedefte
 * "entegrasyon farkı" bir şey öğretmez, çünkü hedefin parlaklığı da farklıdır.
 * Aynı hedefte başka kayıt yoksa bölüm bunu açıkça söyler ve galeriye
 * yönlendirir — boş bir seçici bırakmak kullanıcıyı arayışta bırakıyor.
 *
 * Farklı satırlar vurgulanır; aynı olanlar sönük kalır. Amaç "neden bu daha
 * temiz çıkmış" sorusunu bir bakışta cevaplamak.
 */
export function PhotoComparison({ photo }: { photo: AstroPhoto }) {
  const all = usePhotoCatalog().items;

  const candidates = useMemo(
    () =>
      all.filter(
        (p) => p.slug !== photo.slug && p.target.catalog === photo.target.catalog
      ),
    [all, photo]
  );

  const [otherSlug, setOtherSlug] = useState(candidates[0]?.slug ?? '');
  const other = candidates.find((p) => p.slug === otherSlug) ?? candidates[0];

  const rows = useMemo(
    () => (other ? comparePhotos(toComparable(photo), toComparable(other)) : []),
    [photo, other]
  );

  if (!other) {
    return (
      <Panel title="Karşılaştırma">
        <p className="text-meta leading-relaxed text-muted-foreground">
          {photo.target.catalog} için galeride başka kayıt yok, bu yüzden
          karşılaştıracak ikinci fotoğraf bulunamadı. Aynı hedefi siz de
          çektiyseniz kaydınızı ekleyerek bu karşılaştırmayı açabilirsiniz.
        </p>
        <p className="mt-2 text-meta">
          <Link to="/galeri" className="text-primary hover:underline">
            Galeriye dön →
          </Link>
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <figure className="m-0">
            {/* Gerçek thumbnail — yoksa RemoteImage yıldız alanına düşer (A11). */}
            <div className="aspect-[4/3] w-full overflow-hidden border border-border">
              <RemoteImage
                src={photo.image?.thumbUrl ?? photo.image?.url}
                alt={photo.title}
                seed={photo.slug}
                tint={photo.gradient}
                sizes="(max-width: 640px) 45vw, 220px"
              />
            </div>
            <figcaption className="mt-1 truncate text-meta text-foreground">
              <span className="label mr-1.5">A</span>
              {photo.title}
            </figcaption>
          </figure>

          <figure className="m-0">
            <div className="aspect-[4/3] w-full overflow-hidden border border-border">
              <RemoteImage
                src={other.image?.thumbUrl ?? other.image?.url}
                alt={other.title}
                seed={other.slug}
                tint={other.gradient}
                sizes="(max-width: 640px) 45vw, 220px"
              />
            </div>
            <figcaption className="mt-1 truncate text-meta text-foreground">
              <span className="label mr-1.5">B</span>
              <Link
                to={`/fotograf/${other.slug}`}
                className="transition-colors hover:text-primary"
              >
                {other.title}
              </Link>
            </figcaption>
          </figure>
        </div>

        <div className="bg-surface-1 px-3 pb-1 pt-1.5 ring-1 ring-border">
          <label htmlFor="compare-with" className="label block">
            Karşılaştırılan kayıt (B)
          </label>
          <Select
            id="compare-with"
            value={other.slug}
            onChange={(e) => setOtherSlug(e.target.value)}
            className="h-8 border-0 bg-transparent px-0 text-meta focus:bg-transparent"
          >
            {candidates.map((candidate) => (
              <option key={candidate.slug} value={candidate.slug}>
                {candidate.title} — @{candidate.user.username}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Panel
        title="Fark tablosu"
        status={`${differenceCount(rows)} / ${rows.length} alan farklı`}
      >
        <dl>
          {rows.map((row) => (
            <div
              key={row.label}
              className={cn(
                'grid grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-2 border-b border-border py-2 last:border-0',
                !row.differs && 'opacity-55'
              )}
            >
              <dt className="label">{row.label}</dt>
              <dd className="text-body-sm text-foreground">{row.a}</dd>
              <dd
                className={cn(
                  'text-body-sm',
                  row.differs ? 'text-primary' : 'text-foreground'
                )}
              >
                {row.b}
                {row.delta && (
                  <span className="mt-0.5 block text-meta text-faint">
                    {row.delta}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={differenceCount(rows) === 0 ? 'muted' : 'primary'}>
            {differenceCount(rows) === 0
              ? 'Teknik olarak aynı'
              : `${differenceCount(rows)} fark`}
          </Badge>
          <span className="text-meta leading-snug text-faint">
            A: bu sayfa · B: seçilen kayıt
          </span>
        </div>
      </Panel>
    </div>
  );
}

/** `AstroPhoto` kaydını domain karşılaştırma tipine indirger. */
function toComparable(photo: AstroPhoto): ComparablePhoto {
  return {
    slug: photo.slug,
    title: photo.title,
    exposures: photo.exposures,
    palette: photo.palette,
    setup: photo.setup,
    bortle: photo.location.bortle,
    capturedAt: photo.capturedAt,
  };
}
