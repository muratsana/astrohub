import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import {
  describeClubInfoProblem,
  fetchAdminClubs,
  saveClubInfo,
  setClubListed,
  unverifyClub,
  verifyClub,
  type AdminClub,
  type ClubInfoDraft,
} from './clubsAdmin';

/**
 * KULÜP DİZİNİ — yönetim ekranı (§14.7).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BU EKRAN ZORUNLUYDU
 *
 * Faz 10'da aynı hata dört kez çıktı: tablo açıldı, panel yazdı,
 * ZİYARETÇİ OKUMADI. Buradaki hâli tersi olurdu — dizin okunuyor ama
 * yönetilemiyordu: `0067` öncesinde bir kulübün adresini düzeltmek
 * dağıtım almak demekti. Tablo açılıp bu ekran yazılmasaydı, §14.7'nin
 * "moderasyon" ve "güncellik doğrulaması" maddeleri yine kâğıt üstünde
 * kalırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DOĞRULAMA AYRI DÜĞMEDE, "KAYDET"İN İÇİNDE DEĞİL
 *
 * "Doğrula" bir GÜVEN ifadesi: kulüp yöneticisiyle iletişim kurulduğunu
 * ve kaydın gerçek olduğunu söylüyor. Bunu form kaydetmenin yan etkisi
 * yapsaydık, bir telefon numarasını düzelten yönetici farkında olmadan
 * kulübü doğrulanmış ilan ederdi. Ayrı düğme, ayrı karar.
 *
 * Aynı sebeple "son kontrol tarihi" formun içinde: o bir güven ifadesi
 * değil, bakım işi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YENİ KULÜP EKLEME BU EKRANDA YOK
 *
 * Dizine kulüp eklemek yalnızca bir satır yazmak değil: adın doğrulanması,
 * kaynağın kaydedilmesi ve slug'ın kalıcı seçilmesi gerekiyor — slug
 * adreste görünüyor (`/topluluk/...`) ve sonradan değiştirmek verilmiş
 * bağlantıları kırardı. Bugünkü dizin tohumla geliyor; ekleme akışı
 * yazılana kadar burada YARIM bir form göstermek, çalışmayan bir
 * düğmeden farksız olurdu.
 */
export function ClubControl({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<AdminClub[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acik, setAcik] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClubInfoDraft | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchAdminClubs()
      .then(setItems)
      .catch((e: unknown) => {
        setItems([]);
        setError(e instanceof Error ? e.message : 'Dizin okunamadı');
      });
  }, []);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  function duzenle(club: AdminClub) {
    setAcik(club.slug);
    setDraft({
      website: club.website ?? '',
      contactEmail: club.contactEmail ?? '',
      joinUrl: club.joinUrl ?? '',
      sourceName: club.sourceName ?? '',
      infoCheckedOn: club.infoCheckedOn ?? '',
    });
  }

  const dogrulanmis = items?.filter((c) => c.verifiedAt).length ?? 0;
  /* Kaydetmeden önceki sorun ekranda yazıyor: PostgREST hata metni
     yerine anlaşılır bir cümle. */
  const sorun = draft ? describeClubInfoProblem(draft) : null;

  return (
    <Panel
      title="Kulüp dizini"
      status={
        items ? `${items.length} kayıt · ${dogrulanmis} doğrulanmış` : 'okunuyor…'
      }
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        <strong className="text-foreground">İki ayrı doğrulama var.</strong>{' '}
        <em>Doğrula</em> düğmesi KULÜBÜN KENDİSİNİ teyit eder — yöneticisiyle
        iletişim kuruldu, kulüp gerçek ve aktif; ziyaretçi bunu rozet olarak
        görür. <em>Son kontrol</em> tarihi ise BİLGİNİN tazeliğidir: adres,
        iletişim ve etkinlik bilgisi en son ne zaman gözden geçirildi. Dizinden
        çıkarılan kayıt silinmez, ziyaretçiden gizlenir.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      {items && items.length === 0 && !error && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          Dizinde kayıt yok. Tohum göçü (<code>0067</code>) uygulanmamış olabilir.
        </p>
      )}

      <ul>
        {(items ?? []).map((club) => (
          <li key={club.slug} className="border-b border-border py-2.5 last:border-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-caption font-medium text-foreground">
                  {club.name}
                </span>
                <span className="block truncate text-meta text-faint">
                  {club.city} · {club.slug}
                  {club.infoCheckedOn && ` · son kontrol ${club.infoCheckedOn}`}
                </span>
              </span>

              {club.verifiedAt ? (
                <Badge tone="success">Doğrulanmış</Badge>
              ) : (
                <Badge tone="muted">Doğrulanmamış</Badge>
              )}
              {!club.listed && <Badge tone="warning">Listede değil</Badge>}

              {canWrite && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      acik === club.slug ? setAcik(null) : duzenle(club)
                    }
                  >
                    {acik === club.slug ? 'Kapat' : 'Düzenle'}
                  </Button>
                  <Button
                    size="sm"
                    variant={club.verifiedAt ? 'ghost' : 'secondary'}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        club.verifiedAt ? unverifyClub(club.slug) : verifyClub(club.slug)
                      )
                    }
                  >
                    {club.verifiedAt ? 'Doğrulamayı kaldır' : 'Doğrula'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => run(() => setClubListed(club.slug, !club.listed))}
                  >
                    {club.listed ? 'Dizinden çıkar' : 'Dizine al'}
                  </Button>
                </>
              )}
            </div>

            {canWrite && acik === club.slug && draft && (
              <div className="mt-3 grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
                <Alan
                  id={`club-web-${club.slug}`}
                  label="Web adresi"
                  placeholder="https://..."
                  value={draft.website}
                  onChange={(v) => setDraft({ ...draft, website: v })}
                />
                <Alan
                  id={`club-mail-${club.slug}`}
                  label="İletişim e-postası"
                  placeholder="bilgi@..."
                  value={draft.contactEmail}
                  onChange={(v) => setDraft({ ...draft, contactEmail: v })}
                />
                <Alan
                  id={`club-join-${club.slug}`}
                  label="Katılım bağlantısı"
                  placeholder="https://..."
                  value={draft.joinUrl}
                  onChange={(v) => setDraft({ ...draft, joinUrl: v })}
                />
                <Alan
                  id={`club-source-${club.slug}`}
                  label="Bilginin kaynağı"
                  placeholder="Dernek duyurusu"
                  value={draft.sourceName}
                  onChange={(v) => setDraft({ ...draft, sourceName: v })}
                />
                <Alan
                  id={`club-checked-${club.slug}`}
                  label="Son kontrol tarihi"
                  type="date"
                  value={draft.infoCheckedOn}
                  onChange={(v) => setDraft({ ...draft, infoCheckedOn: v })}
                />

                <div className="flex items-end gap-2 sm:col-span-2">
                  <Button
                    size="sm"
                    disabled={busy || Boolean(sorun)}
                    onClick={() =>
                      run(async () => {
                        await saveClubInfo(club.slug, draft);
                        setAcik(null);
                      })
                    }
                  >
                    Kaydet
                  </Button>
                  {sorun && (
                    <span className="text-meta text-warning">{sorun}</span>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Alan({
  id,
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label mb-1 block">
        {label}
      </label>
      <Input
        id={id}
        type={type ?? 'text'}
        value={value}
        placeholder={placeholder ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
