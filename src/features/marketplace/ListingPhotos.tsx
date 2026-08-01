import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import {
  deleteListingPhoto,
  fetchListingPhotos,
  uploadListingPhoto,
  LISTING_PHOTO_LIMIT,
  type ListingPhoto,
} from '@/services/marketplace/photos';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { tintFromSeed } from '@/components/media/tints';
import { cn } from '@/lib/cn';
import type { Listing } from './data';

/**
 * İLAN FOTOĞRAFLARI — galeri ve (sahibiyse) yükleme.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İLAN OLUŞTURMA FORMUNDA DEĞİL
 *
 * Fotoğraf satırı `listing_id`ye yabancı anahtarla bağlı: ilan var
 * olmadan fotoğraf eklenemiyor. Formda toplayıp ilanla birlikte
 * göndermek mümkündü ama o zaman ilan açılıp fotoğraf yüklemesi
 * düştüğünde kullanıcı ne olduğunu anlamazdı — ilan yayında, fotoğraflar
 * yok, hata mesajı bir önceki ekranda kalmış.
 *
 * Akış zaten ilan açılınca detay sayfasına gidiyor. Fotoğraf oraya
 * eklendiğinde her adımın sonucu kendi ekranında görünüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YER TUTUCU YALNIZCA FOTOĞRAF YOKKEN
 *
 * Eskiden HER ilan yıldız alanı çiziyor ve altına "medya pipeline'ı
 * bağlandığında açılacak" yazıyordu. Boru hattı 0012'de bağlandı;
 * eksik olan ilan tarafıydı. Artık fotoğrafı olan ilan fotoğrafını,
 * olmayan ilan dürüst bir "fotoğraf eklenmemiş" notunu gösteriyor.
 */
export function ListingPhotos({ listing }: { listing: Listing }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOwner = Boolean(user && listing.sellerId && user.id === listing.sellerId);

  const load = useCallback(() => {
    if (!listing.id) return;
    fetchListingPhotos(listing.id)
      .then((rows) => {
        setPhotos(rows);
        /* Seçili sıra listenin dışında kalabilir (silme sonrası); başa
           çekiliyor, yoksa galeri boş kare gösterirdi. */
        setActive((i) => (i < rows.length ? i : 0));
      })
      .catch(() => {
        /* Okunamadıysa galeri yer tutucuya düşüyor; ilan metni ve künye
           zaten görünür durumda. */
      });
  }, [listing.id]);

  useEffect(load, [load]);

  async function handleFiles(files: FileList) {
    if (!listing.id || !user) return;
    const liste = Array.from(files).slice(
      0,
      Math.max(0, LISTING_PHOTO_LIMIT - photos.length)
    );
    if (liste.length === 0) {
      setError(`Bir ilana en fazla ${LISTING_PHOTO_LIMIT} fotoğraf eklenebilir.`);
      return;
    }

    setBusy(true);
    setError(null);
    /* Sırayla: paralel yükleme saha bağlantısında hepsini birden
       düşürür ve hangisinin geçtiği belirsiz kalır. */
    for (let i = 0; i < liste.length; i += 1) {
      try {
        await uploadListingPhoto({
          listingId: listing.id,
          userId: user.id,
          file: liste[i],
          position: photos.length + i,
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Fotoğraf yüklenemedi');
        break;
      }
    }
    setBusy(false);
    load();
  }

  async function remove(photo: ListingPhoto) {
    setBusy(true);
    setError(null);
    try {
      await deleteListingPhoto(photo.id, photo.url);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fotoğraf silinemedi');
    } finally {
      setBusy(false);
    }
  }

  const current = photos[active];

  return (
    <div className="space-y-2">
      {current ? (
        <>
          <div className="overflow-hidden rounded-card border border-border bg-black">
            <img
              src={current.url}
              alt={`${listing.title} — fotoğraf ${active + 1}`}
              /*
                `object-contain`: ilan fotoğrafı kırpılmamalı. Alıcının
                görmesi gereken şey kenardaki çizik olabilir ve `cover`
                onu tam da kadraj dışına atardı.
              */
              className="mx-auto block max-h-[60vh] w-full object-contain"
              width={current.width ?? undefined}
              height={current.height ?? undefined}
              decoding="async"
            />
          </div>

          {photos.length > 1 && (
            <div
              role="tablist"
              aria-label="İlan fotoğrafları"
              className="flex flex-wrap gap-1.5"
            >
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Fotoğraf ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={cn(
                    'h-14 w-14 overflow-hidden rounded-card border transition-colors',
                    i === active
                      ? 'border-primary'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <PlateFrame>
            <StarField
              seed={listing.slug}
              tint={tintFromSeed(listing.slug)}
            />
          </PlateFrame>
          <p className="text-meta leading-snug text-faint">
            {isOwner
              ? 'Bu ilanda henüz fotoğraf yok. Fotoğraf ekleyen ilanlar belirgin biçimde daha hızlı satılıyor.'
              : 'Satıcı bu ilana fotoğraf eklememiş — görsel temsilîdir.'}
          </p>
        </>
      )}

      {error && <Alert>{error}</Alert>}

      {isOwner && listing.id && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void handleFiles(e.target.files);
              /* Aynı dosya ikinci kez seçilebilsin. */
              e.target.value = '';
            }}
          />
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || photos.length >= LISTING_PHOTO_LIMIT}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? 'Yükleniyor…' : 'Fotoğraf ekle'}
          </Button>

          {current && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => void remove(current)}
            >
              Bu fotoğrafı sil
            </Button>
          )}

          <span className="text-meta text-faint">
            {photos.length}/{LISTING_PHOTO_LIMIT}
          </span>
        </div>
      )}
    </div>
  );
}
