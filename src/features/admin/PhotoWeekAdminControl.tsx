import { useCallback, useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { fetchUsers, type AdminUser } from './users';
import {
  addPhotoWeekNominee,
  appointJuror,
  closePhotoWeekRound,
  createPhotoWeekRound,
  endJuryTerm,
  fetchJuryMembers,
  setEditorsPick,
  setPhotoWeekRoundStatus,
  type JuryMemberAdmin,
} from './photoWeekAdmin';

export function PhotoWeekAdminControl({ canWrite }: { canWrite: boolean }) {
  const { user } = useAuth();
  const rounds = usePhotoWeekRounds();
  const catalog = usePhotoCatalog();
  const [members, setMembers] = useState<JuryMemberAdmin[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedRound, setSelectedRound] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState('');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [week, setWeek] = useState(1);
  const [opensAt, setOpensAt] = useState(now.toISOString().slice(0, 16));
  const [closesAt, setClosesAt] = useState(new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 16));

  const loadMembers = useCallback(() => {
    fetchJuryMembers().then(setMembers).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Jüri okunamadı.'));
  }, []);
  useEffect(loadMembers, [loadMembers]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage('İşlem tamamlandı.');
      loadMembers();
      rounds.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İşlem uygulanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const activeMembers = useMemo(() => members.filter((member) => !member.termEnd || member.termEnd >= new Date().toISOString().slice(0, 10)), [members]);

  return (
    <Panel title="Haftanın Fotoğrafı ve Jüri" status={`${activeMembers.length} aktif jüri · ${rounds.rounds.length} tur`}>
      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-card border border-border bg-surface-2 p-3">
          <h3 className="label mb-2 text-foreground">Dönemli jüri</h3>
          <form
            className="mb-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              fetchUsers({ search, pageSize: 10 })
                .then((sayfa) => setUsers(sayfa.rows)).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Kullanıcı aranamadı.'));
            }}
          >
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kullanıcı ara" aria-label="Jüri için kullanıcı ara" className="h-9 flex-1 text-meta" />
            <Button size="sm" type="submit">Ara</Button>
          </form>
          {users.length > 0 && (
            <ul className="mb-3 rounded-card border border-border bg-background px-2">
              {users.map((candidate) => (
                <li key={candidate.id} className="flex items-center justify-between gap-2 border-b border-border py-2 last:border-0">
                  <span className="text-meta text-foreground">@{candidate.username}{candidate.displayName ? ` · ${candidate.displayName}` : ''}</span>
                  <Button size="sm" variant="ghost" disabled={!canWrite || busy || !user} onClick={() => user && void run(() => appointJuror(candidate.id, user.id))}>Jüri yap</Button>
                </li>
              ))}
            </ul>
          )}
          <ul>
            {members.map((member) => (
              <li key={`${member.userId}-${member.termStart}`} className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0">
                <span className="min-w-0 flex-1 text-meta text-foreground">@{member.username}{member.displayName ? ` · ${member.displayName}` : ''}</span>
                <Badge tone={member.termEnd ? 'muted' : 'primary'}>{member.termStart} → {member.termEnd ?? 'sürüyor'}</Badge>
                {!member.termEnd && <Button size="sm" variant="ghost" disabled={!canWrite || busy} onClick={() => void run(() => endJuryTerm(member.userId, member.termStart))}>Görevi bitir</Button>}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-card border border-border bg-surface-2 p-3">
          <h3 className="label mb-2 text-foreground">Tur takvimi</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input type="number" min={2020} max={2200} value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="ISO yıl" />
            <Input type="number" min={1} max={53} value={week} onChange={(event) => setWeek(Number(event.target.value))} aria-label="ISO hafta" />
            <Input type="datetime-local" value={opensAt} onChange={(event) => setOpensAt(event.target.value)} aria-label="Tur açılışı" />
            <Input type="datetime-local" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} aria-label="Tur kapanışı" />
          </div>
          <Button className="mt-2" size="sm" disabled={!canWrite || busy || !user} onClick={() => user && void run(() => createPhotoWeekRound({ isoYear: year, isoWeek: week, opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString(), createdBy: user.id }))}>Tur oluştur</Button>

          <ul className="mt-3">
            {rounds.rounds.map((round) => (
              <li key={round.id} className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0">
                <span className="tabular text-meta text-foreground">{round.isoYear}-{String(round.isoWeek).padStart(2, '0')}</span>
                <Badge>{round.status}</Badge>
                {round.status === 'aday_toplama' && <Button size="sm" variant="ghost" disabled={!canWrite || busy} onClick={() => void run(() => setPhotoWeekRoundStatus(round.id, 'oylama'))}>Oylamayı aç</Button>}
                {round.status === 'oylama' && <Button size="sm" variant="ghost" disabled={!canWrite || busy} onClick={() => void run(() => closePhotoWeekRound(round.id))}>Sonuçlandır</Button>}
                {round.status === 'sonuclandi' && <Button size="sm" variant="ghost" disabled={!canWrite || busy} onClick={() => void run(() => setPhotoWeekRoundStatus(round.id, 'yayinda'))}>Yayımla</Button>}
              </li>
            ))}
          </ul>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Select value={selectedRound} onChange={(event) => setSelectedRound(event.target.value)} aria-label="Aday eklenecek tur">
              <option value="">Tur seçin</option>
              {rounds.rounds.filter((round) => round.status === 'aday_toplama').map((round) => <option key={round.id} value={round.id}>{round.isoYear}-{round.isoWeek}</option>)}
            </Select>
            <Select value={selectedPhoto} onChange={(event) => setSelectedPhoto(event.target.value)} aria-label="Aday fotoğraf">
              <option value="">Fotoğraf seçin</option>
              {catalog.items.filter((photo) => photo.id).map((photo) => <option key={photo.id} value={photo.id}>{photo.title} · @{photo.user.username}</option>)}
            </Select>
            <Button size="sm" disabled={!canWrite || busy || !user || !selectedRound || !selectedPhoto} onClick={() => user && void run(() => addPhotoWeekNominee(selectedRound, selectedPhoto, user.id))}>Aday ekle</Button>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-card border border-border bg-surface-2 p-3">
        <h3 className="label mb-2 text-foreground">Editör seçkisi</h3>
        <div className="flex flex-wrap gap-1.5">
          {catalog.items.filter((photo) => photo.id).slice(0, 30).map((photo) => (
            <button
              key={photo.id}
              type="button"
              disabled={!canWrite || busy}
              onClick={() => photo.id && void run(() => setEditorsPick(photo.id!, !photo.editorsPick))}
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
