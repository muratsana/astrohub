import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useSchedule, useStation } from '@/services/content/radioStation';
import {
  currentOccurrence,
  nextOccurrence,
  occurrences,
  weekdayName,
  type Occurrence,
  type ProgramSlot,
} from './schedule';
import { cn } from '@/lib/cn';

/**
 * PROGRAM TAKVİMİ (§10.2).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * TAKVİM "CANLI" DEMİYOR — BU BÖLÜMÜN ASIL KURALI
 *
 * Takvim "bu saatte şu program olmalı" diyor. Yayının gerçekten ayakta
 * olup olmadığı AYRI bir ölçüm (`station_is_live`). İkisi ayrı rozetle
 * gösteriliyor:
 *
 *   CANLI       yayın ayakta VE takvimde o an bir program var
 *   YAYINDA     yayın ayakta ama takvimde program yok (AutoDJ)
 *   PROGRAMDA   takvimde program var ama yayın ayakta değil
 *   ÇEVRİMDIŞI  ikisi de yok
 *
 * Üçüncüsü tuhaf görünüyor ve tam da bu yüzden var: yayın düşmüşken
 * takvim hâlâ "Gece Gökyüzü 21:00" diyor. O anda "CANLI" yazmak
 * §10.2'nin yasakladığı yalandır; takvimi hiç göstermemek de dinleyiciyi
 * "program iptal mi oldu" diye bırakırdı. Doğru cevap ikisini ayırmak.
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * TİK ATAN SAAT — "şu an" gerçekten şu an olsun diye.
 *
 * `new Date()`i render sırasında kurup bırakmak iki şeyi birden bozuyordu:
 * memo bağımlılıkları her render'da değişiyordu (yani memo hiç işe
 * yaramıyordu) ve sayfa açık kalınca "şu an" donuyordu — program bittiği
 * hâlde "Şu an: Gece Gökyüzü" yazmaya devam ederdi. Bu, canlı olmayan
 * bir şeyi canlı göstermenin sessiz hâli.
 *
 * Otuz saniye: bir dakikalık program sınırını kaçırmayacak kadar sık,
 * boşuna render etmeyecek kadar seyrek.
 */
function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Haftanın pazartesi 00:00'ı (yerel) — ızgaranın başlangıcı. */
function weekStart(offsetWeeks: number, now: Date): Date {
  const d = new Date(now);
  /* `getDay()` pazar = 0; ISO'da hafta pazartesi başlıyor. */
  const iso = d.getDay() === 0 ? 7 : d.getDay();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (iso - 1) + offsetWeeks * 7);
  return d;
}

function saat(value: Date): string {
  return value.toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RadioSchedule() {
  const { station, live, loading: stationLoading } = useStation();
  const { programs, slots, loading, error } = useSchedule();
  const [hafta, setHafta] = useState(0);

  const programById = useMemo(
    () => new Map(programs.map((p) => [p.id, p])),
    [programs]
  );

  const now = useNow();

  /* Hafta sınırı yalnızca gece yarısı ve hafta değişiminde kayıyor;
     tikte yeniden hesaplanması ucuz ve doğru — sayfa açıkken pazartesi
     olduğunda ızgara kendiliğinden yeni haftaya geçiyor. */
  const basla = useMemo(() => weekStart(hafta, now), [hafta, now]);
  const bitir = useMemo(
    () => new Date(basla.getTime() + 7 * 86_400_000),
    [basla]
  );

  const haftalik = useMemo(
    () => occurrences(slots, basla, bitir),
    [slots, basla, bitir]
  );

  const suan = useMemo(() => currentOccurrence(slots, now), [slots, now]);
  const sirada = useMemo(() => nextOccurrence(slots, now), [slots, now]);

  /* Takvim boşsa bölüm hiç görünmüyor. Boş bir "Program takvimi"
     başlığı, henüz programı olmayan bir radyoda kullanıcıya bir şey
     söylemez ve sayfada yer kaplar. */
  if (loading || stationLoading) return null;
  if (error || (programs.length === 0 && !station)) return null;
  if (programs.length === 0) return null;

  const gunler = Array.from({ length: 7 }, (_, i) => {
    const gun = new Date(basla.getTime() + i * 86_400_000);
    return {
      gun,
      isoWeekday: i + 1,
      yayinlar: haftalik.filter(
        (o) =>
          o.start >= gun && o.start < new Date(gun.getTime() + 86_400_000)
      ),
    };
  });

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="type-section font-semibold text-foreground">
          Program takvimi
        </h2>
        <DurumRozeti live={live} programda={Boolean(suan)} />
      </div>

      <SuAnVeSirada suan={suan} sirada={sirada} programById={programById} live={live} />

      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setHafta((h) => h - 1)}
          aria-label="Önceki hafta"
        >
          ‹
        </Button>
        <span className="tabular text-body-sm text-muted-foreground">
          {basla.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
          {' – '}
          {new Date(bitir.getTime() - 1).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
          })}
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setHafta((h) => h + 1)}
          aria-label="Sonraki hafta"
        >
          ›
        </Button>
        {hafta !== 0 && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setHafta(0)}
          >
            Bu hafta
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {gunler.map(({ gun, isoWeekday, yayinlar }) => (
          <Panel
            key={isoWeekday}
            title={weekdayName(isoWeekday)}
            status={gun.toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'short',
            })}
            bodyClassName="p-2.5"
          >
            {yayinlar.length === 0 ? (
              <p className="text-meta text-faint">Program yok</p>
            ) : (
              <ul className="space-y-1.5">
                {yayinlar.map((o) => {
                  const program = programById.get(o.programId);
                  if (!program) return null;
                  const aktif = suan?.slotId === o.slotId;
                  return (
                    <li key={`${o.slotId}-${o.start.toISOString()}`}>
                      <div
                        className={cn(
                          'rounded-card border px-2 py-1.5',
                          aktif
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface-2'
                        )}
                      >
                        <p className="tabular text-meta text-muted-foreground">
                          {saat(o.start)}–{saat(o.end)}
                          {/* Tekrar rozeti dinleyici canlı sanmasın diye
                              var (§10.5 "tekrar planı"). */}
                          {o.isRepeat && ' · tekrar'}
                        </p>
                        <p className="text-body-sm leading-snug text-foreground">
                          {program.title}
                        </p>
                        {program.hosts.length > 0 && (
                          <p className="text-meta text-faint">
                            {program.hosts.map((h) => h.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </section>
  );
}

/**
 * Dört durumlu rozet — dosya başındaki tabloyu ekrana çeviriyor.
 * "CANLI" yalnızca iki koşul birden sağlandığında yazıyor.
 */
function DurumRozeti({ live, programda }: { live: boolean; programda: boolean }) {
  if (live && programda) return <Badge tone="success">Canlı</Badge>;
  if (live) return <Badge tone="success">Yayında</Badge>;
  if (programda) return <Badge tone="warning">Programda — yayın kapalı</Badge>;
  return <Badge>Çevrimdışı</Badge>;
}

function SuAnVeSirada({
  suan,
  sirada,
  programById,
  live,
}: {
  suan: Occurrence | null;
  sirada: Occurrence | null;
  programById: Map<string, { title: string }>;
  live: boolean;
}) {
  if (!suan && !sirada) return null;

  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      {suan && (
        <div className="rounded-card border border-border bg-surface-1 p-3">
          <p className="label mb-1 text-muted-foreground">
            {/* Yayın kapalıyken "şu an" demek yanıltıcı: takvimde var
                ama duyulmuyor. Başlık bunu söylüyor. */}
            {live ? 'Şu an' : 'Takvimde şu an'}
          </p>
          <p className="text-body text-foreground">
            {programById.get(suan.programId)?.title ?? '—'}
          </p>
          <p className="tabular text-meta text-faint">
            {saat(suan.start)}–{saat(suan.end)}
          </p>
        </div>
      )}
      {sirada && (
        <div className="rounded-card border border-border bg-surface-1 p-3">
          <p className="label mb-1 text-muted-foreground">Sonraki program</p>
          <p className="text-body text-foreground">
            {programById.get(sirada.programId)?.title ?? '—'}
          </p>
          <p className="tabular text-meta text-faint">
            {sirada.start.toLocaleDateString('tr-TR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}{' '}
            {saat(sirada.start)}
          </p>
        </div>
      )}
    </div>
  );
}

export type { ProgramSlot };
