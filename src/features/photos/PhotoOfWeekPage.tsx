import { useEffect, useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useAuth } from '@/features/auth/AuthContext';
import { usePhotoCatalog } from '@/services/content/photos';
import {
  savePhotoWeekVote,
  usePhotoWeekBallot,
  usePhotoWeekRounds,
} from '@/services/content/photoOfWeek';
import { PhotoCard } from './PhotoCard';
import { photoWeekArchive } from './weeklyPick';
import type { AstroPhoto } from './types';

export function PhotoOfWeekPage() {
  const { user } = useAuth();
  const catalog = usePhotoCatalog();
  const rounds = usePhotoWeekRounds();
  const ballot = usePhotoWeekBallot(user?.id);
  const winners = photoWeekArchive(catalog.items, rounds.rounds);
  const current = winners[0];
  const activeRound = ballot.round ?? rounds.rounds.find((round) => round.status === 'oylama') ?? null;
  const activeRoundLabel = activeRound
    ? `${activeRound.isoYear}-${String(activeRound.isoWeek).padStart(2, '0')}`
    : null;
  const activeNominees = useMemo(() => {
    if (!activeRoundLabel) return [];
    const photoById = new Map(catalog.items.filter((photo) => photo.id).map((photo) => [photo.id!, photo]));
    const fromBallot = ballot.nomineeIds
      .map((id) => photoById.get(id))
      .filter((photo): photo is AstroPhoto => Boolean(photo));
    if (fromBallot.length > 0) return fromBallot;
    return catalog.items.filter((photo) => photo.photoOfWeekCandidates?.includes(activeRoundLabel));
  }, [activeRoundLabel, ballot.nomineeIds, catalog.items]);
  const hasActiveVote = Boolean(activeRound && activeNominees.length > 0);

  return (
    <>
      <PageMeta
        title="Haftanın Fotoğrafı"
        description="Topluluk oylamasıyla seçilen haftalık astrofotoğraflar ve kazanan arşivi."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Galeri', path: '/galeri' },
          { name: 'Haftanın Fotoğrafı', path: '/haftanin-fotografi' },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Galeri', to: '/galeri' }, { label: 'Haftanın Fotoğrafı' }]}
          title="Haftanın Fotoğrafı"
          description="Aday fotoğraflar belirlenen süre boyunca topluluk oylarına açılır. Sistem dönem sonunda en yüksek ortalamayı, eşitlikte en yüksek oy sayısını öne alır."
          meta={winners.length > 0 ? `${winners.length} kazanan` : undefined}
        />

        {rounds.loading || catalog.status === 'loading' ? (
          <EmptyState message="Kazananlar yükleniyor" hint="Haftalık seçki arşivi hazırlanıyor." />
        ) : rounds.error || catalog.status === 'error' ? (
          <EmptyState message="Arşiv okunamadı" hint="Veri bağlantısı şu anda yanıt vermiyor." />
        ) : (
          <>
            {hasActiveVote && activeRound && (
              <section className="mb-10 rounded-card border border-border bg-surface-1 p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <Badge tone="primary">Oylama açık</Badge>
                    <h2 className="type-section mt-2 text-foreground">Haftanın Fotoğrafı adayları</h2>
                    <p className="mt-1 text-body-sm text-muted-foreground">
                      Oylama {new Date(activeRound.closesAt).toLocaleString('tr-TR')} tarihinde kapanır.
                    </p>
                  </div>
                  {!user && (
                    <p className="text-meta text-muted-foreground">Oy vermek için giriş yapın.</p>
                  )}
                </div>
                {ballot.error && <p className="mb-3 text-meta text-danger">{ballot.error}</p>}
                <CardGrid view="grid">
                  {activeNominees.map((photo) => (
                    <li key={photo.id}>
                      <PhotoCard photo={photo} />
                      <PhotoWeekVoteControl
                        photo={photo}
                        roundId={activeRound.id}
                        userId={user?.id}
                        vote={photo.id ? ballot.votes[photo.id] : undefined}
                        onSaved={ballot.refresh}
                      />
                    </li>
                  ))}
                </CardGrid>
              </section>
            )}

            {!current && !hasActiveVote ? (
              <EmptyState message="Henüz tamamlanmış tur yok" hint="İlk topluluk oylaması kapanınca kazanan burada yayımlanacak." />
            ) : current ? (
              <>
                <section className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
                  <div>
                    <PhotoCard photo={current.photo} />
                  </div>
                  <div className="rounded-card border border-border bg-surface-1 p-4">
                    <Badge tone="success">Haftanın Fotoğrafı</Badge>
                    {current.yearLabel && (
                      <p className="mt-2 text-meta tabular text-faint">
                        {current.yearLabel}
                      </p>
                    )}
                    <h2 className="type-section mt-3 text-foreground">{current.photo.title}</h2>
                    <p className="mt-2 text-body-sm text-muted-foreground">{current.photo.target.name} · @{current.photo.user.username}</p>
                    <p className="mt-5 text-meta leading-relaxed text-faint">
                      Kazanan topluluk puanlarının ortalamasıyla belirlenir; eşitlikte daha çok oy alan fotoğraf öne geçer.
                    </p>
                  </div>
                </section>

                {winners.length > 1 && (
                  <section>
                    <h2 className="type-section mb-3 text-foreground">
                      Geçmiş haftaların arşivi
                    </h2>
                    <CardGrid view="grid">
                      {winners.slice(1).map(({ id, photo }) => (
                        <li key={id}>
                          <div>
                            <PhotoCard photo={photo} />
                          </div>
                        </li>
                      ))}
                    </CardGrid>
                  </section>
                )}
              </>
            ) : (
              <EmptyState message="Kazanan bekleniyor" hint="Oylama kapanınca sistem haftanın fotoğrafını otomatik yayımlayacak." />
            )}
          </>
        )}
      </Container>
    </>
  );
}

function PhotoWeekVoteControl({
  photo,
  roundId,
  userId,
  vote,
  onSaved,
}: {
  photo: AstroPhoto;
  roundId: string;
  userId: string | undefined;
  vote?: { score: number };
  onSaved: () => void;
}) {
  const [score, setScore] = useState(vote?.score ?? 10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScore(vote?.score ?? 10);
  }, [photo.id, vote?.score]);

  if (!userId) {
    return (
      <p className="mt-2 rounded-card border border-border bg-surface-2 px-3 py-2 text-meta text-muted-foreground">
        Oy vermek için giriş yapın.
      </p>
    );
  }

  if (photo.ownerId === userId) {
    return (
      <p className="mt-2 rounded-card border border-border bg-surface-2 px-3 py-2 text-meta text-muted-foreground">
        Kendi fotoğrafınıza oy veremezsiniz.
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-card border border-border bg-surface-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={String(score)}
          onChange={(event) => setScore(Number(event.target.value))}
          aria-label={`${photo.title} için puan`}
          width="7rem"
        >
          {Array.from({ length: 10 }, (_, index) => 10 - index).map((value) => (
            <option key={value} value={value}>
              {value} / 10
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          disabled={saving || !photo.id}
          onClick={async () => {
            if (!photo.id) return;
            setSaving(true);
            setError(null);
            try {
              await savePhotoWeekVote({ roundId, userId, photoId: photo.id, score });
              onSaved();
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Oy kaydedilemedi.');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Kaydediliyor…' : vote ? 'Oyunu güncelle' : 'Oy ver'}
        </Button>
        {vote && <Badge tone="success">Oyunuz: {vote.score}/10</Badge>}
      </div>
      {error && <p className="mt-2 text-meta text-danger">{error}</p>}
    </div>
  );
}
