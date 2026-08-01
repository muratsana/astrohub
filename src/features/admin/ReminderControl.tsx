import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { reminderLabels, type ReminderKind } from '@/features/events/reminders';
import {
  broadcastAnnouncement,
  fetchDeliveryStats,
  fetchFailedReminders,
  fetchReminderDefaults,
  retryReminder,
  saveReminderDefault,
  type DeliveryStats,
  type FailedReminder,
} from './reminderAdmin';

/**
 * HATIRLATMA TESLİMİ VE DUYURU — yönetici yüzeyi (§9).
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÖRT BÖLÜM, TEK SEKME
 *
 * İstatistik, hatalı işler, varsayılan ve duyuru aynı soruya bakıyor:
 * "site kullanıcılara ne gönderiyor ve gönderebiliyor mu". Ayrı
 * sekmelere bölmek, hatalı bir teslim gördükten sonra yeniden denemek
 * için sekme değiştirmek demekti.
 *
 * DUYURU EN ALTTA VE TEK TIKLA GİTMİYOR. Diğer üçü okuma ya da geri
 * alınabilir işlem; duyuru geri alınamaz ve herkese gidiyor. Onay adımı
 * bu yüzden var — "kaç kişiye gideceği" yazılı olarak gösteriliyor.
 */
export function ReminderControl({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="space-y-4">
      <DeliverySection canWrite={canWrite} />
      <DefaultSection canWrite={canWrite} />
      <AnnouncementSection canWrite={canWrite} />
    </div>
  );
}

function DeliverySection({ canWrite }: { canWrite: boolean }) {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [failed, setFailed] = useState<FailedReminder[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      /* İki okuma paralel: hatalı liste istatistiği beklemiyor. */
      const [s, f] = await Promise.all([
        fetchDeliveryStats(),
        fetchFailedReminders(),
      ]);
      setStats(s);
      setFailed(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okunamadı');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = useCallback(
    async (id: string) => {
      setBusy(id);
      setNotice(null);
      setError(null);
      try {
        const ok = await retryReminder(id);
        setNotice(
          ok
            ? 'Hatırlatma gönderildi.'
            : 'Gönderilemedi — etkinlik iptal edilmiş ya da hata sürüyor olabilir.'
        );
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Yeniden deneme başarısız');
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  return (
    <Panel
      title="Hatırlatma teslimi"
      status={
        stats ? `${stats.toplam} kayıt · ${stats.hatali} hatalı` : 'okunuyor…'
      }
      bodyClassName="p-4"
    >
      {error && (
        <Alert variant="text" className="mb-3">
          {error}
        </Alert>
      )}

      {stats && (
        <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Stat label="Bekleyen" value={stats.bekleyen} />
          {/* "Vakti gelen" bekleyenin alt kümesi: taraması gecikmiş
              satırlar. Sıfırdan büyükse cron'a bakılır. */}
          <Stat label="Vakti gelen" value={stats.vakti_gelen} />
          <Stat label="Hatalı" value={stats.hatali} tone="danger" />
          <Stat label="Gönderilen" value={stats.gonderilen} />
          <Stat label="Son 24 saat" value={stats.gonderilen_24s} />
          <Stat label="Toplam" value={stats.toplam} />
        </dl>
      )}

      {notice && (
        <Alert variant="text" className="mb-3">
          {notice}
        </Alert>
      )}

      <h4 className="label mb-2 text-muted-foreground">Hatalı işler</h4>

      {failed === null && (
        <p className="text-body-sm text-muted-foreground">Okunuyor…</p>
      )}

      {failed !== null && failed.length === 0 && (
        <p className="text-body-sm text-muted-foreground">
          Bekleyen hatalı teslim yok.
        </p>
      )}

      {failed !== null && failed.length > 0 && (
        <ul className="space-y-2">
          {failed.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-card border border-border bg-surface-2 p-2.5"
            >
              <div className="min-w-0">
                <p className="text-body-sm text-foreground">{row.eventTitle}</p>
                <p className="tabular text-meta text-faint">
                  {new Date(row.dueAt).toLocaleString('tr-TR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}{' '}
                  · {row.attempts} deneme
                </p>
                {/* Hata metni kırpılmıyor: teşhis edilecek şey burada. */}
                <p className="mt-1 break-words text-meta text-danger">
                  {row.lastError}
                </p>
              </div>
              {canWrite && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy === row.id}
                  onClick={() => void retry(row.id)}
                >
                  {busy === row.id ? 'Deneniyor…' : 'Yeniden dene'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'danger';
}) {
  return (
    <div className="rounded-card border border-border bg-surface-2 px-3 py-2">
      <dt className="text-meta text-muted-foreground">{label}</dt>
      <dd
        className={
          tone === 'danger' && value > 0
            ? 'tabular text-body font-medium text-danger'
            : 'tabular text-body font-medium text-foreground'
        }
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * GLOBAL VARSAYILAN.
 *
 * Seçilen değer kullanıcıya ÖN SEÇİLİ geliyor, kurulmuş hatırlatma
 * olarak değil (0050). Takip eden herkese kendiliğinden hatırlatma
 * açmak, kimsenin istemediği bildirimi varsayılan yapardı; bu ayar
 * "hangi seçenek üstte dursun" sorusunun cevabı.
 */
function DefaultSection({ canWrite }: { canWrite: boolean }) {
  const [kind, setKind] = useState<ReminderKind | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const defaults = await fetchReminderDefaults();
        setKind(defaults.onerilen);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Ayar okunamadı');
      }
    })();
  }, []);

  const save = useCallback(async () => {
    if (!kind) return;
    setBusy(true);
    setSaved(false);
    setError(null);
    try {
      await saveReminderDefault(kind);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setBusy(false);
    }
  }, [kind]);

  const kinds: ReminderKind[] = ['hafta', 'gun', 'etkinlik_gunu'];

  return (
    <Panel title="Varsayılan hatırlatma" bodyClassName="p-4">
      <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
        Etkinlik sayfasında ön seçili gelen seçenek. Kullanıcıya hatırlatma
        kurulmuyor, yalnızca öneriliyor.
      </p>

      {error && (
        <Alert variant="text" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="varsayilan-hatirlatma" className="sr-only">
          Varsayılan hatırlatma
        </label>
        <select
          id="varsayilan-hatirlatma"
          value={kind ?? ''}
          disabled={!kind || !canWrite}
          onChange={(e) => {
            setSaved(false);
            setKind(e.target.value as ReminderKind);
          }}
          className="rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm text-foreground outline-none focus:border-primary"
        >
          {kinds.map((option) => (
            <option key={option} value={option}>
              {reminderLabels[option]}
            </option>
          ))}
        </select>

        {canWrite && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || !kind}
            onClick={() => void save()}
          >
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        )}

        {saved && <span className="text-meta text-muted-foreground">Kaydedildi.</span>}
      </div>
    </Panel>
  );
}

/**
 * ZORUNLU DUYURU.
 *
 * SINIR KODDA DEĞİL KULLANIMDA. Duyuru `sistem` kategorisinde üretiliyor
 * ve o kategori kapatılamıyor — çünkü hesabı, üyeliği, güvenliği
 * ilgilendiren bilgiler kapatılamaz olmalı. Pazarlama bu kapıdan
 * geçmemeli; ekranda da böyle yazıyor ve her duyuru denetim kaydına
 * kimin gönderdiğiyle birlikte düşüyor.
 */
function AnnouncementSection({ canWrite }: { canWrite: boolean }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const count = await broadcastAnnouncement({ title, body, url });
      setResult(`${count} kullanıcıya gönderildi.`);
      setTitle('');
      setBody('');
      setUrl('');
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Duyuru gönderilemedi');
    } finally {
      setBusy(false);
    }
  }, [title, body, url]);

  if (!canWrite) return null;

  return (
    <Panel title="Zorunlu duyuru" bodyClassName="p-4">
      <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
        Bütün kullanıcılara site içi bildirim gider ve kapatılamaz. Yalnızca
        hesabı, üyeliği ya da güvenliği ilgilendiren duyurular için —
        pazarlama iletisi bu kanaldan gönderilmez. Her gönderim denetim
        kaydına işlenir.
      </p>

      {error && (
        <Alert variant="text" className="mb-3">
          {error}
        </Alert>
      )}
      {result && (
        <Alert variant="text" className="mb-3">
          {result}
        </Alert>
      )}

      <div className="space-y-2">
        <label htmlFor="duyuru-baslik" className="label block text-muted-foreground">
          Başlık
        </label>
        <input
          id="duyuru-baslik"
          value={title}
          onChange={(e) => {
            setConfirming(false);
            setTitle(e.target.value);
          }}
          className="w-full rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm text-foreground outline-none focus:border-primary"
        />

        <label htmlFor="duyuru-govde" className="label block text-muted-foreground">
          Metin (isteğe bağlı)
        </label>
        <textarea
          id="duyuru-govde"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm leading-relaxed text-foreground outline-none focus:border-primary"
        />

        <label htmlFor="duyuru-adres" className="label block text-muted-foreground">
          Bağlantı (isteğe bağlı)
        </label>
        <input
          id="duyuru-adres"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="/kullanim-kosullari"
          className="w-full rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm text-foreground outline-none placeholder:text-faint focus:border-primary"
        />

        {/* İki adım: duyuru geri alınamıyor ve herkese gidiyor. */}
        {!confirming ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={title.trim().length < 3}
            onClick={() => setConfirming(true)}
          >
            Duyuruyu gönder
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-sm text-warning">
              Bütün kullanıcılara gidecek. Emin misiniz?
            </span>
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => void send()}
            >
              {busy ? 'Gönderiliyor…' : 'Evet, gönder'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Vazgeç
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
