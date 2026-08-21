import { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import {
  formatPhotoWeekLabel,
  isoWeekFromDateString,
  isPhotoWeekRoundClosed,
} from '@/features/photos/weeklyPick';
import {
  closePhotoWeekRound,
  fetchPhotoWeekResults,
  setEditorsPick,
  syncPhotoWeekAutomation,
  type PhotoWeekResult,
} from './photoWeekAdmin';
import { roundLabel } from './photoWeekRoundDates';
import type { AstroPhoto } from '@/features/photos/types';

const STATUS_LABELS: Record<string, string> = {
  aday_toplama: 'Eski aday toplama',
  oylama: 'Otomatik takip',
  sonuclandi: 'Sonuçlandı',
  yayinda: 'Yayında',
};

type IdentifiedPhoto = AstroPhoto & { id: string };

function hasPhotoId(photo: AstroPhoto): photo is IdentifiedPhoto {
  return typeof photo.id === 'string' && photo.id.length > 0;
}

function ratingAverage(photo: AstroPhoto) {
  return photo.rating.sayi > 0 ? photo.rating.toplam / photo.rating.sayi : 0;
}

function compareByWeeklyScore(a: AstroPhoto, b: AstroPhoto) {
  return (
    ratingAverage(b) - ratingAverage(a) ||
    b.rating.sayi - a.rating.sayi ||
    new Date(a.publishedAt ?? a.capturedAt).getTime() -
      new Date(b.publishedAt ?? b.capturedAt).getTime() ||
    a.slug.localeCompare(b.slug)
  );
}

function currentWeekPhotos(photos: AstroPhoto[], label: string | null) {
  if (!label) return [];
  return photos
    .filter((photo) => {
      const week = isoWeekFromDateString(photo.publishedAt ?? photo.capturedAt);
      return week?.label === label;
    })
    .sort(compareByWeeklyScore);
}

export function PhotoWeekAdminControl({ canWrite }: { canWrite: boolean }) {
  const rounds = usePhotoWeekRounds();
  const catalog = usePhotoCatalog();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [resultRoundId, setResultRoundId] = useState('');
  const [results, setResults] = useState<PhotoWeekResult[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const currentWeek = isoWeekFromDateString(new Date().toISOString());
  const currentRound = useMemo(
    () =>
      currentWeek
        ? (rounds.rounds.find(
            (round) =>
              round.isoYear === currentWeek.isoYear &&
              round.isoWeek === currentWeek.isoWeek
          ) ?? null)
        : null,
    [currentWeek, rounds.rounds]
  );
  const thisWeekPhotos = useMemo(
    () => currentWeekPhotos(catalog.items, currentWeek?.label ?? null),
    [catalog.items, currentWeek?.label]
  );
  const ratedThisWeek = thisWeekPhotos.filter((photo) => photo.rating.sayi > 0);
  const leader = ratedThisWeek[0] ?? null;
  const currentRoundClosed = currentRound
    ? isPhotoWeekRoundClosed(currentRound)
    : false;
  const resultRounds = useMemo(
    () =>
      rounds.rounds.filter((round) =>
        ['oylama', 'sonuclandi', 'yayinda'].includes(round.status)
      ),
    [rounds.rounds]
  );
  const resultRound = useMemo(
    () => rounds.rounds.find((round) => round.id === resultRoundId) ?? null,
    [resultRoundId, rounds.rounds]
  );
  const photoById = useMemo(
    () =>
      new Map(
        catalog.items.filter(hasPhotoId).map((photo) => [photo.id, photo])
      ),
    [catalog.items]
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage('İşlem tamamlandı.');
      rounds.refresh();
      catalog.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'İşlem uygulanamadı.'
      );
    } finally {
      setBusy(false);
    }
  };

  const refreshResults = useCallback(() => {
    if (!resultRoundId) {
      setResults([]);
      setResultsError(null);
      return;
    }
    fetchPhotoWeekResults(resultRoundId)
      .then((nextResults) => {
        setResults(nextResults);
        setResultsError(null);
      })
      .catch((error: unknown) => {
        setResults([]);
        setResultsError(
          error instanceof Error ? error.message : 'Sonuçlar okunamadı.'
        );
      });
  }, [resultRoundId]);

  useEffect(() => {
    if (!resultRoundId && resultRounds[0]) setResultRoundId(resultRounds[0].id);
  }, [resultRoundId, resultRounds]);

  useEffect(refreshResults, [refreshResults, rounds.rounds]);

  return (
    <Panel
      title="Haftanın Fotoğrafı"
      status={currentWeek ? `${currentWeek.label} otomatik` : 'otomatik'}
    >
      <div className="rounded-card border border-border bg-surface-2 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Badge tone="success">Otomatik seçim</Badge>
            <h3 className="mt-2 text-body-sm font-semibold text-foreground">
              {currentWeek
                ? `${formatPhotoWeekLabel(currentWeek.label).weekLabel} değerlendirmesi`
                : 'Haftalık değerlendirme'}
            </h3>
            <p className="mt-1 max-w-3xl text-meta leading-relaxed text-muted-foreground">
              Sistem o hafta yayına alınan fotoğrafları otomatik aday sayar.
              Kazanan önce 10 üzerinden ortalama puana, eşitlikte değerlendirme
              sayısına, son eşitlikte yayın tarihine göre belirlenir. Seçim
              Pazar 23:59 kapanışından önce yayımlanmaz.
            </p>
          </div>
          <Button
            size="sm"
            disabled={!canWrite || busy}
            onClick={() => void run(syncPhotoWeekAutomation)}
          >
            Senkronize et
          </Button>
        </div>

        <div className="mt-4 grid gap-px overflow-hidden rounded-card border border-border bg-border md:grid-cols-4">
          <Metric label="Bu hafta yüklenen" value={thisWeekPhotos.length} />
          <Metric label="Puanlanan fotoğraf" value={ratedThisWeek.length} />
          <Metric
            label="Mevcut lider"
            value={leader ? leader.title : 'Yok'}
            compact
          />
          <Metric
            label="Durum"
            value={
              currentRound
                ? currentRoundClosed
                  ? STATUS_LABELS[currentRound.status]
                  : 'Pazar 23:59 bekleniyor'
                : 'Hazırlanıyor'
            }
            compact
          />
        </div>

        {leader ? (
          <div className="mt-4 rounded-card border border-border bg-background px-3 py-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-foreground">
                  {leader.title}
                </p>
                <p className="mt-0.5 text-meta text-muted-foreground">
                  @{leader.user.username} · {ratingAverage(leader).toFixed(2)} /
                  10 · {leader.rating.sayi} değerlendirme
                </p>
              </div>
              {currentRound && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!canWrite || busy || !currentRoundClosed}
                  onClick={() =>
                    void run(() => closePhotoWeekRound(currentRound.id))
                  }
                >
                  {currentRoundClosed
                    ? 'Bu haftayı hesapla'
                    : 'Pazar 23:59 sonrası'}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-card border border-border bg-background px-3 py-2 text-meta text-muted-foreground">
            Bu hafta puanlanmış fotoğraf yok. İlk değerlendirmeden sonra lider
            burada görünür.
          </p>
        )}
      </div>

      <section className="mt-4 rounded-card border border-border bg-surface-2 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="label text-foreground">Haftalık sonuçlar</h3>
            <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
              Geçmiş haftaların kazananları fotoğraf detaylarında hafta
              rozetiyle görünür.
            </p>
          </div>
          <Select
            value={resultRoundId}
            onChange={(event) => setResultRoundId(event.target.value)}
            aria-label="Sonuç haftası"
            width="12rem"
          >
            <option value="">Hafta seçin</option>
            {resultRounds.map((round) => (
              <option key={round.id} value={round.id}>
                {roundLabel(round)} ·{' '}
                {STATUS_LABELS[round.status] ?? round.status}
              </option>
            ))}
          </Select>
        </div>

        {resultRoundId && resultsError ? (
          <p className="mt-3 text-meta text-danger">{resultsError}</p>
        ) : resultRoundId && results.length ? (
          <ol className="mt-3 divide-y divide-border">
            {results.map((result, index) => {
              const photo = photoById.get(result.photoId);
              return (
                <li
                  key={result.photoId}
                  className="grid gap-3 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center"
                >
                  <span className="tabular text-meta text-primary">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {photo ? photo.title : result.photoId}
                    </p>
                    <p className="mt-0.5 text-meta text-muted-foreground">
                      {photo
                        ? `@${photo.user.username}`
                        : 'Fotoğraf katalogda bulunamadı'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {resultRound?.winnerPhotoId === result.photoId && (
                      <Badge tone="primary">Haftanın Fotoğrafı</Badge>
                    )}
                    <Badge tone={index === 0 ? 'success' : 'muted'}>
                      {result.averageScore.toFixed(2)} / 10
                    </Badge>
                    <span className="tabular text-meta text-muted-foreground">
                      {result.voteCount} değerlendirme
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-meta text-muted-foreground">
            Bu hafta için puanlanmış fotoğraf yok.
          </p>
        )}
      </section>

      <section className="mt-4 rounded-card border border-border bg-surface-2 p-3">
        <h3 className="label mb-2 text-foreground">Editör seçkisi</h3>
        <div className="flex flex-wrap gap-1.5">
          {catalog.items
            .filter(hasPhotoId)
            .slice(0, 30)
            .map((photo) => (
              <button
                key={photo.id}
                type="button"
                disabled={!canWrite || busy}
                onClick={() =>
                  void run(() => setEditorsPick(photo.id, !photo.editorsPick))
                }
                className={`rounded-card border px-2 py-1 text-meta ${
                  photo.editorsPick
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {photo.editorsPick ? '✓ ' : '+ '}
                {photo.title}
              </button>
            ))}
        </div>
      </section>
      {message && (
        <p className="mt-2 text-meta text-muted-foreground">{message}</p>
      )}
    </Panel>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="bg-surface-1 px-3 py-2">
      <p className="text-meta text-muted-foreground">{label}</p>
      <p
        className={`tabular mt-1 font-semibold text-foreground ${
          compact ? 'truncate text-body-sm' : 'text-xl'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
