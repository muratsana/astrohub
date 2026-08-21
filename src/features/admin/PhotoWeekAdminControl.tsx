import { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { isoWeekFromDateString } from '@/features/photos/weeklyPick';
import type { AstroPhoto } from '@/features/photos/types';
import {
  findCandidateRoundForPhoto,
  photoNominationWeek,
  roundLabel,
} from './photoWeekRoundDates';
import {
  addPhotoWeekNominee,
  closePhotoWeekRound,
  createPhotoWeekRound,
  fetchPhotoWeekResults,
  setEditorsPick,
  setPhotoWeekRoundStatus,
  type PhotoWeekResult,
} from './photoWeekAdmin';

const STATUS_LABELS: Record<string, string> = {
  aday_toplama: 'Aday toplama',
  oylama: 'Topluluk oylaması',
  sonuclandi: 'Sonuçlandı',
  yayinda: 'Yayında',
};

type IdentifiedPhoto = AstroPhoto & { id: string };

function hasPhotoId(photo: AstroPhoto): photo is IdentifiedPhoto {
  return typeof photo.id === 'string' && photo.id.length > 0;
}

export function PhotoWeekAdminControl({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const rounds = usePhotoWeekRounds();
  const catalog = usePhotoCatalog();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [resultRoundId, setResultRoundId] = useState('');
  const [results, setResults] = useState<PhotoWeekResult[]>([]);
  const [resultsError, setResultsError] = useState<string | null>(null);

  const now = new Date();
  const [opensAt, setOpensAt] = useState(now.toISOString().slice(0, 16));
  const [closesAt, setClosesAt] = useState(
    new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 16)
  );

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage('İşlem tamamlandı.');
      rounds.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İşlem uygulanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const resultRounds = useMemo(
    () => rounds.rounds.filter((round) => round.status === 'sonuclandi' || round.status === 'yayinda'),
    [rounds.rounds]
  );
  const resultRound = useMemo(
    () => rounds.rounds.find((round) => round.id === resultRoundId) ?? null,
    [resultRoundId, rounds.rounds]
  );
  const photoById = useMemo(
    () => new Map(catalog.items.filter(hasPhotoId).map((photo) => [photo.id, photo])),
    [catalog.items]
  );
  const roundDraft = useMemo(() => isoWeekFromDateString(opensAt), [opensAt]);
  const selectedPhotoItem = useMemo(
    () => photoById.get(selectedPhoto) ?? null,
    [photoById, selectedPhoto]
  );
  const selectedPhotoWeek = useMemo(
    () => photoNominationWeek(selectedPhotoItem),
    [selectedPhotoItem]
  );
  const autoCandidateRound = useMemo(
    () => findCandidateRoundForPhoto(rounds.rounds, selectedPhotoItem),
    [rounds.rounds, selectedPhotoItem]
  );

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
        setResultsError(error instanceof Error ? error.message : 'Sonuçlar okunamadı.');
      });
  }, [resultRoundId]);

  useEffect(() => {
    if (!resultRoundId && resultRounds[0]) setResultRoundId(resultRounds[0].id);
  }, [resultRoundId, resultRounds]);

  useEffect(refreshResults, [refreshResults, rounds.rounds]);

  return (
    <Panel title="Haftanın Fotoğrafı" status={`${rounds.rounds.length} tur`}>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-card border border-border bg-surface-2 p-3">
          <h3 className="label mb-2 text-foreground">Tur takvimi</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(7rem,0.75fr)_1fr_1fr]">
            <div className="rounded-card border border-border bg-background px-3 py-2">
              <span className="label block text-muted-foreground">Hafta</span>
              <span className="tabular mt-1 block text-body-sm font-semibold text-foreground">
                {roundDraft ? roundDraft.label : 'Tarih seçin'}
              </span>
            </div>
            <Input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} aria-label="Oylama açılışı" />
            <Input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} aria-label="Oylama kapanışı" />
          </div>
          <Button
            className="mt-2"
            size="sm"
            disabled={!canWrite || busy || !user || !roundDraft}
            onClick={() =>
              user && roundDraft && void run(() => createPhotoWeekRound({
                isoYear: roundDraft.isoYear,
                isoWeek: roundDraft.isoWeek,
                opensAt: new Date(opensAt).toISOString(),
                closesAt: new Date(closesAt).toISOString(),
                createdBy: user.id,
              }))
            }
          >
            Tur oluştur
          </Button>

          <ul className="mt-3">
            {rounds.rounds.map((round) => (
              <li key={round.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0">
                <span className="tabular text-meta text-foreground">{roundLabel(round)}</span>
                <Badge>{STATUS_LABELS[round.status] ?? round.status}</Badge>
                {round.status === 'aday_toplama' && (
                  <Button size="sm" variant="ghost" disabled={!canWrite || busy} onClick={() => void run(() => setPhotoWeekRoundStatus(round.id, 'oylama'))}>
                    Oylamayı aç
                  </Button>
                )}
                {round.status === 'oylama' && (
                  <Button size="sm" variant="ghost" disabled={!canWrite || busy} onClick={() => void run(() => closePhotoWeekRound(round.id))}>
                    Şimdi sonuçlandır
                  </Button>
                )}
                {round.status === 'sonuclandi' && (
                  <Button size="sm" variant="ghost" disabled={!canWrite || busy} onClick={() => void run(() => setPhotoWeekRoundStatus(round.id, 'yayinda'))}>
                    Yayımla
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-card border border-border bg-surface-2 p-3">
          <h3 className="label mb-2 text-foreground">Aday fotoğraf</h3>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={selectedPhoto} onChange={(event) => setSelectedPhoto(event.target.value)} aria-label="Aday fotoğraf">
              <option value="">Fotoğraf seçin</option>
              {catalog.items.filter(hasPhotoId).map((photo) => (
                <option key={photo.id} value={photo.id}>
                  {photo.title} · @{photo.user.username}
                </option>
              ))}
            </Select>
            <Button
              size="sm"
              disabled={!canWrite || busy || !user || !selectedPhoto || !autoCandidateRound}
              onClick={() => user && autoCandidateRound && void run(() => addPhotoWeekNominee(autoCandidateRound.id, selectedPhoto, user.id))}
            >
              Aday ekle
            </Button>
          </div>
          <p className="mt-2 rounded-card border border-border bg-background px-3 py-2 text-meta text-muted-foreground">
            {selectedPhotoItem && selectedPhotoWeek && autoCandidateRound
              ? `Aday ${selectedPhotoWeek.label} turuna eklenecek.`
              : selectedPhotoItem && selectedPhotoWeek
                ? `${selectedPhotoWeek.label} için aday toplama turu yok. Önce bu haftanın turunu oluşturun.`
                : 'Fotoğraf seçilince aday turu, fotoğrafın yayın veya çekim haftasına göre otomatik belirlenir.'}
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-card border border-border bg-surface-2 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="label text-foreground">Sonuçlar ve yayın</h3>
            <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
              Sistem kazananı 10 üzerinden en yüksek ortalamaya göre seçer; eşitlikte en çok oy alan, sonra daha erken yayımlanan fotoğraf öne geçer.
            </p>
          </div>
          <Select value={resultRoundId} onChange={(event) => setResultRoundId(event.target.value)} aria-label="Sonuç turu" width="11rem">
            <option value="">Tur seçin</option>
            {resultRounds.map((round) => (
              <option key={round.id} value={round.id}>
                {roundLabel(round)} · {STATUS_LABELS[round.status] ?? round.status}
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
                <li key={result.photoId} className="grid gap-3 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
                  <span className="tabular text-meta text-primary">{String(index + 1).padStart(2, '0')}</span>
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {photo ? photo.title : result.photoId}
                    </p>
                    <p className="mt-0.5 text-meta text-muted-foreground">
                      {photo ? `@${photo.user.username}` : 'Fotoğraf katalogda bulunamadı'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {resultRound?.winnerPhotoId === result.photoId && <Badge tone="primary">Kazanan</Badge>}
                    <Badge tone={index === 0 ? 'success' : 'muted'}>
                      {result.averageScore.toFixed(2)} / 10
                    </Badge>
                    <span className="tabular text-meta text-muted-foreground">
                      {result.voteCount} oy
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-meta text-muted-foreground">
            Sonuçlanmış tur yok. Oylama kapanınca sistem kazananı otomatik hesaplar.
          </p>
        )}

        {resultRound?.status === 'sonuclandi' && (
          <Button className="mt-3" size="sm" disabled={!canWrite || busy} onClick={() => void run(() => setPhotoWeekRoundStatus(resultRound.id, 'yayinda'))}>
            Kazananı yayımla
          </Button>
        )}
      </section>

      <section className="mt-4 rounded-card border border-border bg-surface-2 p-3">
        <h3 className="label mb-2 text-foreground">Editör seçkisi</h3>
        <div className="flex flex-wrap gap-1.5">
          {catalog.items.filter(hasPhotoId).slice(0, 30).map((photo) => (
            <button
              key={photo.id}
              type="button"
              disabled={!canWrite || busy}
              onClick={() => void run(() => setEditorsPick(photo.id, !photo.editorsPick))}
              className={`rounded-card border px-2 py-1 text-meta ${photo.editorsPick ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'}`}
            >
              {photo.editorsPick ? '✓ ' : '+ '}{photo.title}
            </button>
          ))}
        </div>
      </section>
      {message && <p className="mt-2 text-meta text-muted-foreground">{message}</p>}
    </Panel>
  );
}
