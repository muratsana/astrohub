import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { PhotoCard } from '@/features/photos/PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';
import { saveJuryVote, useJuryBallot } from '@/services/content/photoOfWeek';
import type { AstroPhoto } from '@/features/photos/types';

export function JuryPanel({ userId }: { userId: string }) {
  const ballot = useJuryBallot(userId);
  const catalog = usePhotoCatalog();
  const photos = ballot.nomineeIds.flatMap((id) => {
    const photo = catalog.items.find((item) => item.id === id);
    return photo ? [photo] : [];
  });

  if (ballot.loading) return <Panel title="Jüri"><p role="status" className="py-6 text-center text-meta text-muted-foreground">Oylama yükleniyor…</p></Panel>;
  if (ballot.error) return <Panel title="Jüri"><p className="py-4 text-meta text-danger">{ballot.error}</p></Panel>;
  if (!ballot.active) return <Panel title="Jüri"><p className="py-4 text-body-sm text-muted-foreground">Bu hesapta aktif jüri dönemi yok.</p></Panel>;
  if (!ballot.round) return <Panel title="Jüri"><p className="py-4 text-body-sm text-muted-foreground">Şu anda oylamaya açık tur yok.</p></Panel>;

  return (
    <Panel
      title={`Jüri oylaması · ${ballot.round.isoYear}-${String(ballot.round.isoWeek).padStart(2, '0')}`}
      status={`${Object.keys(ballot.votes).length} / ${ballot.nomineeIds.length} puanlandı`}
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Oylar tur kapanana kadar diğer jüri üyelerinden ve yöneticilerden gizlidir. Kendi fotoğrafınız görünür, fakat veritabanı tarafından oylanamaz.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {photos.map((photo) => (
          <JuryVoteCard
            key={photo.id}
            photo={photo}
            own={photo.ownerId === userId}
            roundId={ballot.round!.id}
            jurorId={userId}
            initial={photo.id ? ballot.votes[photo.id] : undefined}
            onSaved={ballot.refresh}
          />
        ))}
      </div>
    </Panel>
  );
}

function JuryVoteCard({
  photo,
  own,
  roundId,
  jurorId,
  initial,
  onSaved,
}: {
  photo: AstroPhoto;
  own: boolean;
  roundId: string;
  jurorId: string;
  initial?: { score: number; comment: string };
  onSaved: () => void;
}) {
  const [score, setScore] = useState(initial?.score ?? 5);
  const [comment, setComment] = useState(initial?.comment ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    setScore(initial?.score ?? 5);
    setComment(initial?.comment ?? '');
  }, [initial?.score, initial?.comment]);

  return (
    <div className="rounded-card border border-border bg-surface-2 p-2.5">
      <PhotoCard photo={photo} />
      <div className="mt-2 flex flex-wrap items-end gap-2">
        {own ? (
          <Badge tone="warning">Kendi fotoğrafınız · oy verilemez</Badge>
        ) : (
          <>
            <label className="block">
              <span className="label mb-1 block">Puan</span>
              {/* Genişlik `style` ile: `Select` taban sınıfında `w-full`
                  taşıyor ve `cn()` çakışmayı çözmüyor — `w-24` kaybediyor,
                  puan seçici panelin tamamına yayılıyordu. */}
              <Select value={score} onChange={(event) => setScore(Number(event.target.value))} style={{ width: '6rem' }} className="h-9 text-meta">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} / 10</option>)}
              </Select>
            </label>
            <label className="min-w-[180px] flex-1">
              <span className="label mb-1 block">Yorum (isteğe bağlı)</span>
              <Input value={comment} maxLength={500} onChange={(event) => setComment(event.target.value)} className="h-9 text-meta" />
            </label>
            <Button
              size="sm"
              disabled={busy || !photo.id}
              onClick={async () => {
                if (!photo.id) return;
                setBusy(true);
                setMessage(null);
                try {
                  await saveJuryVote({ roundId, jurorId, photoId: photo.id, score, comment });
                  setMessage('Oy kaydedildi.');
                  onSaved();
                } catch (error) {
                  setMessage(error instanceof Error ? error.message : 'Oy kaydedilemedi.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? 'Kaydediliyor…' : initial ? 'Güncelle' : 'Oy ver'}
            </Button>
          </>
        )}
      </div>
      {message && <p className="mt-1.5 text-meta text-muted-foreground">{message}</p>}
    </div>
  );
}
