import { useEffect, useState } from 'react';
import { PlateSolveControl } from './PlateSolveControl';
import { ContentControl } from './ContentControl';
import { EventControl } from './EventControl';
import { RecordsControl } from './RecordsControl';
import { ClubControl } from './ClubControl';
import { CommentsControl } from './CommentsControl';
import { PhotoWeekAdminControl } from './PhotoWeekAdminControl';
import type { EntryKind } from '@/services/content/entries';
import type { RecordKind } from './records';
import { cn } from '@/lib/cn';

/**
 * İÇERİK SEKMELERİ — her içerik türü için ayrı sekme (§6.4, FAZ 4.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖNCEKİ HÂLİ: BEŞ PANEL ALT ALTA
 *
 * "İçerik ve Kayıtlar" ekranı beş bağımsız paneli dikey olarak
 * yığıyordu: içerik yönetimi (yalnızca haber ve yazı), haftanın
 * fotoğrafı, kayıtlar, kulüp dizini, yorumlar. Sonuç, plan §6.4'ün
 * istediği "sekmeli içerik yönetimi" DEĞİLDİ:
 *
 *   · İlan, etkinlik, fotoğraf ve saha düzenlemek için sayfanın
 *     ortasına kadar kaydırmak gerekiyordu; üstteki panel "İçerik
 *     yönetimi" adını taşıdığı için çoğu kullanıcı ötekilerin varlığını
 *     hiç fark etmiyordu.
 *   · Aynı anda beş panel birden veri çekiyordu — ekranda görünmeyen
 *     dördü dahil.
 *
 * Sekmeler bunu tersine çeviriyor: türlerin tamamı ÜSTTE tek sırada
 * görünüyor ve yalnızca seçilen tür çiziliyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN TEK BİR BİLEŞENDE BİRLEŞTİRİLMEDİ
 *
 * Türler aynı tabloda DEĞİL ve aynı alanları taşımıyor: haber/yazı
 * `content_entries`te blok gövdesiyle, ilan/etkinlik/fotoğraf/saha kendi
 * tablolarında künye alanlarıyla, kulüp dizini doğrulama akışıyla
 * yaşıyor. Hepsini tek editöre sıkıştırmak, her tür için anlamsız
 * alanlar taşımak olurdu. Sekme yalnızca GEZİNMEYİ birleştiriyor;
 * düzenleme yüzeyleri kendi kurallarını korumaya devam ediyor.
 */

type Sekme =
  | { id: EntryKind; tur: 'entry'; etiket: string }
  | { id: RecordKind; tur: 'record'; etiket: string }
  | { id: 'topluluk'; tur: 'club'; etiket: string }
  | { id: 'yorum'; tur: 'comment'; etiket: string }
  | { id: 'hafta'; tur: 'week'; etiket: string }
  /* Etkinlik `record` değil: moderasyon değil TAM DÜZENLEME yüzeyi
     alıyor. Ayrıntı `EventControl` başlığında. */
  | { id: 'etkinlik'; tur: 'event'; etiket: string };

/**
 * Sıra editoryal iş yüküne göre: en sık dokunulan tür başta.
 *
 * Haber ve yazı günlük iş; ilan ve etkinlik kullanıcıdan geliyor ve
 * onay bekliyor; sözlük/SSS ayda bir açılıyor. Alfabetik sıralamak
 * kolay olurdu ama her gün kullanılan sekmeyi ortada bırakırdı.
 */
const SEKMELER: Sekme[] = [
  { id: 'haber', tur: 'entry', etiket: 'Haberler' },
  { id: 'yazi', tur: 'entry', etiket: 'Yazılar' },
  { id: 'listing', tur: 'record', etiket: 'İlanlar' },
  { id: 'etkinlik', tur: 'event', etiket: 'Etkinlikler' },
  { id: 'photo', tur: 'record', etiket: 'Fotoğraflar' },
  { id: 'site', tur: 'record', etiket: 'Gözlem noktaları' },
  { id: 'topluluk', tur: 'club', etiket: 'Topluluklar' },
  { id: 'sozluk', tur: 'entry', etiket: 'Sözlük' },
  { id: 'sss', tur: 'entry', etiket: 'SSS' },
  { id: 'hafta', tur: 'week', etiket: 'Haftanın fotoğrafı' },
  { id: 'yorum', tur: 'comment', etiket: 'Yorumlar' },
];

export function IcerikSekmeleri({
  canWrite,
  contentKind,
  recordKind,
  targetSlug,
}: {
  canWrite: boolean;
  contentKind?: EntryKind;
  recordKind?: RecordKind;
  targetSlug?: string;
}) {
  /* Adresten gelen tür seçili açılıyor: panelden bir kayda "düzenle"
     bağlantısıyla gelen kullanıcı doğru sekmede başlamalı, yoksa
     bağlantı onu boş bir ekrana bırakır. */
  const baslangic =
    (recordKind === 'event'
      ? SEKMELER.find((s) => s.tur === 'event')
      : undefined) ??
    SEKMELER.find((s) => s.tur === 'record' && s.id === recordKind) ??
    SEKMELER.find((s) => s.tur === 'entry' && s.id === contentKind) ??
    SEKMELER[0]!;

  const [aktif, setAktif] = useState<Sekme>(baslangic);

  useEffect(() => {
    setAktif(baslangic);
  }, [baslangic]);

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="İçerik türleri"
        className="flex flex-wrap gap-1.5 rounded-card border border-border bg-surface-1 p-2"
      >
        {SEKMELER.map((s) => (
          <button
            key={`${s.tur}-${s.id}`}
            type="button"
            role="tab"
            aria-selected={aktif.id === s.id && aktif.tur === s.tur}
            onClick={() => setAktif(s)}
            className={cn(
              'rounded-card border px-3 py-1.5 text-meta transition-colors',
              aktif.id === s.id && aktif.tur === s.tur
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
            )}
          >
            {s.etiket}
          </button>
        ))}
      </div>

      {/* YALNIZCA SEÇİLİ SEKME ÇİZİLİYOR: beşi birden asılı kalırsa
          hepsi veri çeker ve görünmeyen dördü boşuna ağ turu yapar. */}
      {aktif.tur === 'entry' && (
        <ContentControl
          key={aktif.id}
          canWrite={canWrite}
          initialKind={aktif.id}
          initialSlug={targetSlug}
        />
      )}

      {aktif.tur === 'event' && (
        <EventControl canWrite={canWrite} targetSlug={targetSlug} />
      )}

      {/* Alan çözümü kuyruğu FOTOĞRAF sekmesinde: çözüm fotoğrafa ait
          bir ölçüm ve yöneticinin onu arayacağı yer, fotoğrafları
          yönettiği yer. */}
      {aktif.id === 'photo' && <PlateSolveControl />}

      {aktif.tur === 'record' && (
        <RecordsControl
          key={aktif.id}
          kinds={[aktif.id]}
          initialKind={aktif.id}
          targetSlug={targetSlug}
        />
      )}

      {aktif.tur === 'club' && <ClubControl canWrite={canWrite} />}

      {aktif.tur === 'week' && <PhotoWeekAdminControl canWrite={canWrite} />}

      {aktif.tur === 'comment' && (
        <CommentsControl kinds={['photoComment', 'siteReview']} />
      )}
    </div>
  );
}
