import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { NightViews } from './NightViews';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import {
  FilterBar,
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import { targets, targetKindLabels } from '@/features/targets/data';
import {
  astronomicalNight,
  moonPhase,
  parseRa,
  parseDec,
  formatClock,
  formatDuration,
} from '@/domain/astronomy/ephemeris';
import { zonedMidnight } from '@/domain/time/zonedDay';
import {
  planSession,
  altitudeCurve,
  skipReasonLabels,
} from '@/domain/astronomy/sessionPlan';
import type { PlanRequest } from '@/domain/astronomy/sessionPlan';
import { AltitudeChart } from './AltitudeChart';
import { cn } from '@/lib/cn';
import { useTargetFavorites } from '@/features/targets/favorites';
import { downloadText } from '@/lib/ics';
import {
  buildPlanIcs,
  decodeSelection,
  encodeSelection,
  planIcsFileName,
} from './planShare';

/**
 * GÖZLEM VE ÇEKİM PLANLAYICI (§7.10).
 *
 * Kullanıcı hedefleri ve her birine ayırmak istediği süreyi seçer; planlayıcı
 * bunları gecenin karanlık penceresine çakışmayacak biçimde dizer.
 *
 * TASARIM KARARI: plan **kaydedilmez**. Kalıcı plan, hesabı ve sunucu tarafını
 * gerektiriyor (§4). Buradaki plan tarayıcıda hesaplanır ve yazdırılabilir bir
 * çıktı gibi davranır. Sunucu tarafı geldiğinde `planSession` imzası
 * değişmeden aynı sonuç saklanabilir — bu yüzden hesap domain katmanında.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GÖZLEM LİSTESİ = FAVORİLER (§14.1)
 *
 * §14.1 "favori hedefler" ve "gözlem listesi"ni ayrı maddeler sayıyor;
 * biz ikinciyi birincinin BU GECEYE göre süzülmüş hâli olarak
 * yorumladık (gerekçe `0066`da). Pratik karşılığı: kullanıcının
 * favorilediği hedefler planlayıcıyı açtığında SEÇİLİ geliyor.
 *
 * Favori yoksa eski davranış duruyor — katalogdan ilk üç hedef. Boş bir
 * planlayıcı, aracın ne yaptığını göstermez; kullanıcı önce bir şey
 * görmeli, sonra kendi listesini kurmalı.
 *
 * SEÇİM YİNE YEREL DURUM: favoriler başlangıç değeri, bağlayıcı kaynak
 * değil. Kullanıcı bu gece favorisi olmayan bir hedef eklemek isteyebilir
 * ve bunun için favorilemek zorunda kalmamalı.
 */

/** Varsayılan seçili hedefler — kullanıcı boş ekranla karşılaşmasın. */
const DEFAULT_SELECTION = 3;

interface Selection {
  slug: string;
  minutes: number;
}

export function PlannerPage() {
  const { location } = useLocationContext();
  const [minAltitude, setMinAltitude] = useState(30);
  const favorites = useTargetFavorites();
  /*
    SEÇİMİN KAYNAK SIRASI: adres çubuğu → favoriler → katalog.

    Paylaşılan bir bağlantı açılmışsa o KAZANIR ve favoriler devreye
    girmez; birinin gönderdiği planı açan kullanıcı kendi favorilerini
    değil, gönderilen planı görmeli. `dokunuldu` bu yüzden burada da
    işaretleniyor.

    `window` PRERENDER'DA DA VAR: `scripts/prerender.mjs` jsdom kuruyor ve
    `globalThis.window`a atıyor. Statik çıktıda arama parçası boş olduğu
    için katalog varsayılanı yazılıyor — ölçüldü, `/bu-gece/plan` ham
    HTML'de tam içerikle çıkıyor. Bu bağımlılık yazılı olsun ki prerender
    ortamı değişirse burasının da gözden geçirilmesi gerektiği bilinsin.
  */
  const [selection, setSelection] = useState<Selection[]>(() => {
    const bilinen = new Set(targets.map((t) => t.slug));
    const paylasilan = decodeSelection(
      new URLSearchParams(window.location.search).get('h'),
      bilinen
    );
    if (paylasilan.length > 0) return paylasilan;
    return targets
      .slice(0, DEFAULT_SELECTION)
      .map((t) => ({ slug: t.slug, minutes: 90 }));
  });
  const [pick, setPick] = useState('');
  /* Favoriler ağdan geliyor; geldiklerinde seçimi BİR KEZ değiştiriyoruz.
     `dokunuldu` olmadan her yüklemede kullanıcının eklediği hedefler
     silinirdi — favori listesi geç gelen bir yanıt olduğu için bu,
     kullanıcı yazarken elini vurmak demekti. */
  const [dokunuldu, setDokunuldu] = useState(
    () => new URLSearchParams(window.location.search).has('h')
  );

  useEffect(() => {
    if (dokunuldu || favorites.loading || favorites.slugs.size === 0) return;
    const bilinen = new Set(targets.map((t) => t.slug));
    const favori = [...favorites.slugs].filter((s) => bilinen.has(s));
    if (favori.length === 0) return;
    setSelection(favori.map((slug) => ({ slug, minutes: 90 })));
    setDokunuldu(true);
  }, [dokunuldu, favorites.loading, favorites.slugs]);

  // Gün, gözlem konumunun takvimine göre anahtarlanır (ASTRO-01).
  const dayStartMs = zonedMidnight(new Date(), location.timeZone).getTime();

  const night = useMemo(() => {
    const date = new Date(dayStartMs);
    const window = astronomicalNight(
      date,
      location.latitude,
      location.longitude,
      location.timeZone
    );
    return {
      window:
        window.start && window.end
          ? { start: window.start, end: window.end }
          : null,
      raw: window,
      moon: moonPhase(date),
    };
  }, [dayStartMs, location.latitude, location.longitude, location.timeZone]);

  const plan = useMemo(() => {
    if (!night.window) return null;

    const requests: PlanRequest[] = selection
      .map(({ slug, minutes }) => {
        const target = targets.find((t) => t.slug === slug);
        if (!target) return null;
        const coords = { ra: parseRa(target.ra), dec: parseDec(target.dec) };
        if (Number.isNaN(coords.ra) || Number.isNaN(coords.dec)) return null;
        return { id: slug, coords, requestedMinutes: minutes };
      })
      .filter((r): r is PlanRequest => r !== null);

    return planSession(
      requests,
      night.window,
      location.latitude,
      location.longitude,
      minAltitude
    );
  }, [selection, night.window, location.latitude, location.longitude, minAltitude]);

  const curves = useMemo(() => {
    if (!night.window) return new Map<string, ReturnType<typeof altitudeCurve>>();
    const map = new Map<string, ReturnType<typeof altitudeCurve>>();
    for (const { slug } of selection) {
      const target = targets.find((t) => t.slug === slug);
      if (!target) continue;
      const coords = { ra: parseRa(target.ra), dec: parseDec(target.dec) };
      if (Number.isNaN(coords.ra) || Number.isNaN(coords.dec)) continue;
      map.set(
        slug,
        altitudeCurve(coords, night.window, location.latitude, location.longitude, 15)
      );
    }
    return map;
  }, [selection, night.window, location.latitude, location.longitude]);

  const addTarget = (slug: string) => {
    if (!slug || selection.some((s) => s.slug === slug)) return;
    setSelection((current) => [...current, { slug, minutes: 90 }]);
    setPick('');
  };

  const available = targets.filter(
    (t) => !selection.some((s) => s.slug === t.slug)
  );

  const [kopyalandi, setKopyalandi] = useState(false);

  /**
   * Planı paylaş — adres çubuğuna kodlanıyor, sunucuya YAZILMIYOR.
   *
   * Gerekçenin tamamı `planShare.ts` başlığında: paylaşılan şey birkaç
   * yüz baytlık bir seçim ve tablo açmak; RLS, sahiplik, silme akışı ve
   * "paylaştığım plan ne zaman silinir" sorusu demekti.
   *
   * `history.replaceState` KULLANILIYOR, `pushState` DEĞİL: her paylaş
   * tıklaması geri düğmesine bir adım eklemesin.
   */
  async function paylas() {
    const url = new URL(window.location.href);
    url.searchParams.set('h', encodeSelection(selection));
    url.searchParams.set('y', String(minAltitude));
    window.history.replaceState(null, '', url.toString());

    try {
      await navigator.clipboard.writeText(url.toString());
      setKopyalandi(true);
      window.setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      /* Pano izni yoksa adres çubuğu zaten güncellendi — kullanıcı
         oradan kopyalayabilir. Sessiz kalmak burada doğru: yapılacak iş
         yapıldı, yalnızca kısayol çalışmadı. */
    }
  }

  function takvimeEkle() {
    if (!plan || plan.scheduled.length === 0) return;
    const metin = buildPlanIcs({
      slots: plan.scheduled,
      labelOf: (slug) =>
        targets.find((t) => t.slug === slug)?.name ?? slug,
      locationLabel: location.label,
    });
    downloadText(planIcsFileName(plan.scheduled), metin);
  }

  return (
    <>
      <PageMeta
        title="Gözlem ve Çekim Planlayıcı"
        description="Hedeflerinizi gecenin karanlık penceresine göre sıraya dizin: kullanılabilir pencere, zirve saati ve çakışmasız çekim programı."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Bu Gece', path: '/bu-gece' },
          { name: 'Gece Planı', path: '/bu-gece/plan' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Bu Gece', to: '/bu-gece' },
            { label: 'Gece Planı' },
          ]}
          title="Gece Planı"
          description="Hedefleri seçin, her birine ayırmak istediğiniz süreyi girin. Plan, batmak üzere olan hedefi öne alır — kaybedilecek olanı kurtarmak ilk kuraldır."
          meta={location.label}
          actions={
            <>
              <Button size="sm" variant="secondary" onClick={paylas}>
                {kopyalandi ? 'Bağlantı kopyalandı' : 'Planı paylaş'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={!plan || plan.scheduled.length === 0}
                onClick={takvimeEkle}
              >
                Takvime ekle
              </Button>
            </>
          }
        />

        <NightViews />

        {!night.window ? (
          <EmptyState
            message="Bu gece astronomik karanlık oluşmuyor"
            hint="Bu enlemde yılın bu döneminde güneş −18°'nin altına inmiyor; plan hesaplanamıyor."
            action={
              <ButtonLink to="/bu-gece/takvim" size="sm" variant="secondary">
                Karanlık Takvimi
              </ButtonLink>
            }
          />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Readout
                label="Karanlık pencere"
                value={formatClock(night.window.start, location.timeZone)}
                unit={`– ${formatClock(night.window.end, location.timeZone)}`}
              />
              <Readout
                label="Toplam karanlık"
                value={formatDuration(night.raw.durationMinutes)}
                tone="cold"
              />
              <Readout
                label="Planlanan"
                value={formatDuration(Math.round(plan?.totalMinutes ?? 0))}
                hint={`${plan?.scheduled.length ?? 0} hedef`}
              />
              <Readout
                label="Boşta"
                value={formatDuration(plan?.idleMinutes ?? 0)}
                hint={`ay %${Math.round(night.moon.illumination * 100)}`}
                tone="muted"
              />
            </div>

            <FilterBar columns={2}>
              <FilterCell label="Hedef ekle" htmlFor="planner-add">
                <Select
                  id="planner-add"
                  value={pick}
                  className={filterControlClass}
                  onChange={(e) => addTarget(e.target.value)}
                >
                  <option value="">
                    {available.length > 0
                      ? 'Katalogdan seç…'
                      : 'Tüm hedefler eklendi'}
                  </option>
                  {available.map((t) => (
                    <option key={t.slug} value={t.slug}>
                      {t.catalog} — {t.name} ({targetKindLabels[t.kind]})
                    </option>
                  ))}
                </Select>
              </FilterCell>
              <FilterCell label="Minimum yükseklik (°)" htmlFor="planner-alt">
                <Input
                  id="planner-alt"
                  type="number"
                  min={0}
                  max={80}
                  value={minAltitude}
                  onChange={(e) => setMinAltitude(Number(e.target.value))}
                  className={filterControlClass}
                />
              </FilterCell>
            </FilterBar>

            {selection.length === 0 ? (
              <EmptyState
                message="Henüz hedef seçilmedi"
                hint="Yukarıdaki listeden hedef ekleyin; plan anında hesaplanır."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                {/* ───────── Seçim listesi ───────── */}
                <Panel title="Seçilen hedefler" status={`${selection.length} hedef`}>
                  <ul className="space-y-px">
                    {selection.map(({ slug, minutes }) => {
                      const target = targets.find((t) => t.slug === slug);
                      if (!target) return null;
                      const skipped = plan?.skipped.find((s) => s.id === slug);

                      return (
                        <li
                          key={slug}
                          className="flex items-center gap-2 border-b border-border py-2 last:border-0"
                        >
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/hedef/${target.slug}`}
                              className="block truncate text-caption text-foreground transition-colors hover:text-primary"
                            >
                              <span className="font-medium">{target.catalog}</span>
                              <span className="ml-1.5 text-muted-foreground">
                                {target.name}
                              </span>
                            </Link>
                            {skipped && (
                              <p className="mt-0.5 text-meta leading-snug text-warning">
                                {skipReasonLabels[skipped.reason]}
                              </p>
                            )}
                          </div>

                          <label className="sr-only" htmlFor={`min-${slug}`}>
                            {target.name} için süre (dakika)
                          </label>
                          <Input
                            id={`min-${slug}`}
                            type="number"
                            min={15}
                            step={15}
                            value={minutes}
                            onChange={(e) =>
                              setSelection((current) =>
                                current.map((s) =>
                                  s.slug === slug
                                    ? { ...s, minutes: Number(e.target.value) }
                                    : s
                                )
                              )
                            }
                            /* Genişlik `width` prop'uyla — `className="w-20"`
                               sessizce yok sayılır, gerekçe `ui/Input.tsx`. */
                            width="5rem"
                            className="h-8 shrink-0 text-meta"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`${target.name} hedefini çıkar`}
                            onClick={() =>
                              setSelection((current) =>
                                current.filter((s) => s.slug !== slug)
                              )
                            }
                          >
                            ×
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>

                {/* ───────── Plan ───────── */}
                <div className="space-y-4">
                  <Panel
                    title="Program"
                    status={
                      plan && plan.scheduled.length > 0
                        ? `${formatClock(plan.scheduled[0].start, location.timeZone)} başlangıç`
                        : 'boş'
                    }
                  >
                    {!plan || plan.scheduled.length === 0 ? (
                      <p className="py-6 text-center text-meta text-muted-foreground">
                        Seçilen hedeflerin hiçbiri bu gece {minAltitude}° üstünde
                        yeterli süre kalmıyor. Minimum yüksekliği düşürmeyi ya da
                        başka hedef seçmeyi deneyin.
                      </p>
                    ) : (
                      <ol className="space-y-3">
                        {plan.scheduled.map((slot, i) => {
                          const target = targets.find((t) => t.slug === slot.id);
                          if (!target) return null;
                          const curve = curves.get(slot.id) ?? [];

                          return (
                            <li
                              key={slot.id}
                              className="border-b border-border pb-3 last:border-0 last:pb-0"
                            >
                              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                <span className="flex items-baseline gap-2">
                                  <span className="tabular label text-primary">
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <Link
                                    to={`/hedef/${target.slug}`}
                                    className="text-body-sm font-medium text-foreground transition-colors hover:text-primary"
                                  >
                                    {target.catalog} — {target.name}
                                  </Link>
                                </span>
                                <span className="tabular text-body-sm text-cold">
                                  {formatClock(slot.start, location.timeZone)} –{' '}
                                  {formatClock(slot.end, location.timeZone)}
                                </span>
                              </div>

                              <div className="mt-1.5">
                                <AltitudeChart
                                  points={curve}
                                  timeZone={location.timeZone}
                                  minAltitude={minAltitude}
                                  highlight={{ start: slot.start, end: slot.end }}
                                  label={target.name}
                                />
                              </div>

                              <p
                                className={cn(
                                  'mt-1 text-meta leading-snug',
                                  slot.fulfillment < 1 ? 'text-warning' : 'text-faint'
                                )}
                              >
                                {formatDuration(Math.round(slot.minutes))} ayrıldı
                                {slot.fulfillment < 1 &&
                                  ` — istenen sürenin %${Math.round(slot.fulfillment * 100)}'i`}
                                . Zirve {Math.round(slot.peakAltitude)}° ·{' '}
                                {formatClock(slot.peakAt, location.timeZone)}.
                              </p>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </Panel>

                  {plan && plan.skipped.length > 0 && (
                    <Panel title="Plana girmeyenler" status={`${plan.skipped.length}`}>
                      <ul className="space-y-1.5">
                        {plan.skipped.map((skip) => {
                          const target = targets.find((t) => t.slug === skip.id);
                          if (!target) return null;
                          return (
                            <li
                              key={skip.id}
                              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border pb-1.5 last:border-0 last:pb-0"
                            >
                              <span className="text-meta text-foreground">
                                {target.catalog} — {target.name}
                              </span>
                              <span className="text-meta text-muted-foreground">
                                {skipReasonLabels[skip.reason]}
                                {skip.window &&
                                  ` (${formatClock(skip.window.start, location.timeZone)}–${formatClock(skip.window.end, location.timeZone)} müsaitti)`}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </Panel>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
}
