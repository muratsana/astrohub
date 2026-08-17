import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import {
  deleteRecord,
  restoreRecord,
  softDeleteRecord,
  fetchAuditFacets,
  fetchAuditLog,
  fetchRecords,
  setRecordStatus,
  setThreadLocked,
  RECORD_KINDS,
  type AuditQuery,
  type AuditRow,
  type RecordKind,
  type RecordRow,
  recordStatusLabel,
} from './records';
import { cn } from '@/lib/cn';

/**
 * İÇERİK KAYITLARI — beş türün ortak yönetim yüzeyi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SİLME İKİ ADIM
 *
 * Kalıcı silme geri alınamıyor ve bağlı kayıtları da götürüyor
 * (fotoğrafın beğenileri, yorumları, puanları `on delete cascade`).
 * Tek tıkla silinebilen bir liste, yanlış satıra basıldığında sessiz bir
 * veri kaybı demekti. İkinci tık ayrı bir düğmeye ve açık bir uyarıya
 * basıyor.
 *
 * `confirm()` KULLANILMADI: tarayıcı diyaloğu odağı çalıyor, mobilde
 * kırpılıyor ve neyin silineceğini satırdan kopuk gösteriyor. Onay
 * satırın kendi içinde açılıyor — hangi kaydın silineceği gözden
 * kaybolmuyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VARSAYILAN EYLEM ARŞİVLEMEK
 *
 * Moderasyon kararları geri alınabilir olmalı. Durum açılır listesi ilk
 * sırada duruyor, silme en sağda ve sönük — sıralama bir tercih beyanı.
 */

/* Ortak durum kümesi (FAZ 3). 'kilitli' foruma özgü ve kümede yok. */
const statusTone = (
  s: string
): 'muted' | 'primary' | 'success' | 'danger' | 'warning' => {
  if (s === 'yayinda') return 'success';
  if (s === 'taslak' || s === 'incelemede') return 'warning';
  if (s === 'reddedildi' || s === 'kilitli') return 'danger';
  if (s === 'arsivlendi' || s === 'yayindan_kaldirildi' || s === 'silindi')
    return 'muted';
  return 'primary';
};

const KIND_ORDER: RecordKind[] = [
  'photo',
  'listing',
  'thread',
  'event',
  'site',
];

export function RecordsControl({
  kinds = KIND_ORDER,
  title = 'İçerik kayıtları',
  initialKind,
  targetSlug,
}: {
  /**
   * Hangi türler gösterilsin.
   *
   * Sekmeli panelde forum kendi bölümüne taşındı; "İçerik" sekmesinin
   * forum konusunu da listelemesi, aynı kaydı iki yerden yönetmek
   * demekti — biri güncellenirken diğeri eski kalırdı.
   */
  kinds?: RecordKind[];
  title?: string;
  initialKind?: RecordKind;
  targetSlug?: string | null;
}) {
  const initialAllowedKind =
    initialKind && kinds.includes(initialKind) ? initialKind : undefined;
  const [kind, setKind] = useState<RecordKind>(initialAllowedKind ?? kinds[0]);
  const [rows, setRows] = useState<RecordRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  /*
   * SİLİNMİŞLER AYRI GÖRÜNÜM (FAZ 3, plan görev 5).
   *
   * Yaşayan ve silinmiş kayıtları tek listede karıştırmak, silinmiş bir
   * kaydı yanlışlıkla düzenlemeye açık bırakırdı. Ayrı sekme "burada
   * olanlar geri alınabilir" diyor.
   */
  const [silinmisler, setSilinmisler] = useState(false);

  const load = useCallback(
    (k: RecordKind, deleted = false) => {
      setRows(null);
      setError(null);
      setConfirming(null);
      const slug = k === initialKind ? targetSlug : null;
      fetchRecords(k, slug ? 1 : 40, slug, { deleted })
        .then(setRows)
        .catch((e: unknown) => {
          setRows([]);
          setError(e instanceof Error ? e.message : 'Kayıtlar okunamadı');
        });
    },
    [initialKind, targetSlug]
  );

  useEffect(() => load(kind, silinmisler), [load, kind, silinmisler]);

  useEffect(() => {
    if (initialAllowedKind) setKind(initialAllowedKind);
  }, [initialAllowedKind]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load(kind, silinmisler);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  const spec = RECORD_KINDS[kind];
  const hasReadOnlyRows = rows?.some((row) => row.readOnly) ?? false;

  return (
    <Panel title={title} status={rows ? `${rows.length} kayıt` : 'okunuyor…'}>
      {kinds.length > 1 && (
        <div
          role="tablist"
          aria-label="İçerik türü"
          className="mb-3 flex flex-wrap gap-1.5"
        >
          {kinds.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={k === kind}
              onClick={() => setKind(k)}
              className={cn(
                'h-8 rounded-card border px-2.5 text-meta font-medium transition-colors',
                k === kind
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
              )}
            >
              {RECORD_KINDS[k].label}
            </button>
          ))}
        </div>
      )}

      {/*
        Silinmişler yalnızca `deleted_at` taşıyan türlerde anlamlı; forum
        konularında o kolon yok ve anahtarı göstermek var olmayan bir
        görünüm vaat etmek olurdu.
      */}
      {spec.softDeletable && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={silinmisler ? 'secondary' : 'ghost'}
            disabled={busy}
            onClick={() => setSilinmisler((v) => !v)}
          >
            {silinmisler ? '← Yayındakilere dön' : 'Silinmişler'}
          </Button>
          {silinmisler && (
            /*
             * METİN NEDEN "ZİYARETÇİYE" DİYOR.
             *
             * Önceki hâli "public'te görünmüyor" diyordu ve bu, metni
             * OKUYAN kişi için yanlıştı: okuma politikaları
             * `icerik_gorunur` yanında sahiplik ve rol dallarını da
             * taşıyor, dolayısıyla silinmiş kayıt sahibine, yöneticiye ve
             * moderatöre public sayfada görünmeye devam ediyordu — yani
             * tam da bu paneli açan kişiye. Ziyaretçi için doğruydu,
             * okuyucu için değil.
             *
             * İstemci sorgularına `deleted_at` süzgeci eklendi; artık
             * ikisi için de doğru. Metin yine de kimin için konuştuğunu
             * söylüyor, çünkü ayrım gerçek ve panelde görünmüyor.
             */
            <span className="text-meta text-faint">
              Bu kayıtlar ziyaretçiye gösterilmiyor ama veritabanında
              duruyor — geri alınabilirler.
            </span>
          )}
        </div>
      )}

      {error && <Alert className="mb-3">{error}</Alert>}

      {hasReadOnlyRows && !silinmisler && (
        <Alert className="mb-3">
          Bu listede sitede görünen katalog tohumu kayıtları da var. DB kaydı
          olmayan satırlar görünürlük için listelenir; düzenleme, kaldırma ve
          kalıcı silme yalnızca gerçek veritabanı kayıtlarında çalışır.
        </Alert>
      )}

      {rows && rows.length === 0 && !error && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          {targetSlug && kind === initialKind
            ? 'Bu adreste kayıt bulunamadı.'
            : `${spec.label} listesi boş.`}
        </p>
      )}

      <ul className="divide-y divide-border">
        {(rows ?? []).map((row) => (
          <li
            key={row.id}
            className="py-2"
          >
            <div className="grid items-center gap-2 md:grid-cols-[7rem_minmax(0,1fr)_7rem_auto]">
              <span className="flex items-center gap-1.5">
                <Badge tone={statusTone(row.status)}>
                  {recordStatusLabel(row.status)}
                </Badge>
                {row.readOnly && <Badge tone="muted">Katalog tohumu</Badge>}
              </span>

              <span className="min-w-0 truncate text-caption text-foreground">
                {row.path ? (
                  <Link to={row.path} className="hover:text-primary">
                    {row.title}
                  </Link>
                ) : (
                  row.title
                )}
                {row.subtitle && (
                  <span className="text-muted-foreground">
                    {' '}
                    · {row.subtitle}
                  </span>
                )}
              </span>

              <span className="tabular text-meta text-faint">
                {row.createdAt
                  ? new Date(row.createdAt).toLocaleDateString('tr-TR')
                  : '—'}
              </span>

              <span className="flex flex-wrap justify-start gap-2 md:justify-end">
                {row.readOnly ? (
                  <span className="text-meta text-faint">
                    DB kaydı yok — sadece sitedeki katalog kaydı
                  </span>
                ) : (
                  <>

              {/* Durum değiştirme — türün kendi enum'u. */}
              {spec.statusColumn && (
                <Select
                  aria-label={`${row.title} durumu`}
                  value={row.status}
                  disabled={busy}
                  onChange={(e) =>
                    void run(() =>
                      setRecordStatus(kind, row.id, e.target.value)
                    )
                  }
                  width="auto"
                  className="h-8 text-meta"
                >
                  {spec.statuses.map((st) => (
                    <option key={st} value={st}>
                      {recordStatusLabel(st)}
                    </option>
                  ))}
                </Select>
              )}

              {/* Foruma özgü: kilit. */}
              {kind === 'thread' && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      setThreadLocked(row.id, row.status !== 'kilitli')
                    )
                  }
                >
                  {row.status === 'kilitli' ? 'Kilidi aç' : 'Kilitle'}
                </Button>
              )}

              {/*
                KALDIR ARTIK SOFT DELETE (FAZ 3). Kayıt public'ten düşüyor
                ama duruyor; kalıcı silme ayrı ve onaylı bir adım.
              */}
              {spec.softDeletable && !silinmisler && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(() => softDeleteRecord(kind, row.id))
                  }
                >
                  Kaldır
                </Button>
              )}

              {silinmisler && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void run(() => restoreRecord(kind, row.id))}
                >
                  Geri al
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  setConfirming(confirming === row.id ? null : row.id)
                }
              >
                Kalıcı sil
              </Button>
                  </>
                )}
              </span>
            </div>

            {!row.readOnly && confirming === row.id && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-card border border-warm/40 bg-warm/8 px-3 py-2">
                <span className="flex-1 text-meta leading-relaxed text-warm">
                  <strong>{row.title}</strong> kalıcı olarak silinecek. Bağlı
                  kayıtlar (beğeni, yorum, puan, fotoğraf) da gider ve geri
                  alınamaz. Yalnızca yönetici yapabilir. Kaldırmak yeterliyse{' '}
                  <em>Kaldır</em> deyin — o işlem geri alınabilir.
                </span>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(() => deleteRecord(kind, row.id))}
                >
                  Kalıcı sil
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setConfirming(null)}
                >
                  Vazgeç
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * DENETİM KAYDI — salt okunur.
 *
 * Değiştirilebilen bir denetim kaydı denetim kaydı değildir; tabloda
 * admin için yalnızca `select` politikası var ve öyle kalmalı. Panelde
 * de hiçbir eylem düğmesi yok.
 */
/**
 * DENETİM KAYDI GÖRÜNTÜLEYİCİSİ (Görev 1.6).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SALT OKUNUR — VE BU BİR ARAYÜZ KARARI DEĞİL
 *
 * `audit_logs` üzerinde istemci için YALNIZCA `select` politikası var
 * (`0007_moderation_and_audit.sql:163`). INSERT/UPDATE/DELETE politikası
 * hiç yok, yani bu ekran düğme koysa bile veritabanı reddederdi.
 *
 * Kayıtlar iki yoldan düşüyor: tetikleyiciler ve `public.denetim_yaz`
 * SECURITY DEFINER fonksiyonu (`20260815120000_denetim_yaz.sql`).
 * İkisi de sunucu tarafı — istemci kendi izini uyduramıyor.
 *
 * NOT: Buradaki açıklama önceden "yalnızca INSERT politikası var"
 * diyordu; yanlıştı ve tam tersi bir güven veriyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FİLTRE SEÇENEKLERİ KAYITTAN TÜRÜYOR
 *
 * Eylem kodları sabit bir listeye yazılmadı: yeni bir tetikleyici yeni
 * bir kod getirdiğinde filtre onu kendiliğinden görüyor. Elle tutulan
 * liste bir gün eksik kalırdı ve eksik olduğu da fark edilmezdi —
 * filtrede olmayan eylem, yokmuş gibi görünür.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DETAY AÇILIR, VARSAYILAN KAPALI
 *
 * `detail` jsonb'sinin şekli eyleme göre değişiyor (durum değişikliğinde
 * öncesi/sonrası, dışa aktarımda kayıt sayısı ve filtre). Hepsini her
 * satırda açmak listeyi okunmaz yapardı; satır tıklanınca açılıyor.
 */
export function AuditControl() {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [facets, setFacets] = useState<{
    actions: string[];
    targetTypes: string[];
  }>({ actions: [], targetTypes: [] });
  const [query, setQuery] = useState<AuditQuery>({});
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditLog(query)
      .then(setRows)
      .catch((e: unknown) => {
        setRows([]);
        setError(e instanceof Error ? e.message : 'Denetim kaydı okunamadı');
      });
  }, [query]);

  useEffect(() => {
    fetchAuditFacets()
      .then(setFacets)
      .catch(() => {
        /* Filtre listesi gelmezse ekran yine çalışsın: seçenekler boş
           kalır, serbest metin araması ve tarih aralığı iş görür. */
      });
  }, []);

  const filtreVar =
    Boolean(query.action) ||
    Boolean(query.targetType) ||
    Boolean(query.from) ||
    Boolean(query.to);

  return (
    <Panel
      title="Denetim kaydı"
      status={rows ? `${rows.length} kayıt` : 'okunuyor…'}
    >
      <p className="mb-2 text-meta leading-relaxed text-muted-foreground">
        Salt okunur. İstemci için tabloda yalnızca okuma politikası var — bu kayıt
        panelden de, başka bir istemciden de değiştirilemez.
      </p>

      {error && <Alert className="mb-2">{error}</Alert>}

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label>
          <span className="label mb-1 block">Eylem</span>
          <Select
            value={query.action ?? ''}
            onChange={(e) =>
              setQuery((q) => ({ ...q, action: e.target.value || undefined }))
            }
            className="h-8 text-meta"
          >
            <option value="">Hepsi</option>
            {facets.actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </label>

        <label>
          <span className="label mb-1 block">Hedef tipi</span>
          <Select
            value={query.targetType ?? ''}
            onChange={(e) =>
              setQuery((q) => ({
                ...q,
                targetType: e.target.value || undefined,
              }))
            }
            className="h-8 text-meta"
          >
            <option value="">Hepsi</option>
            {facets.targetTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </label>

        <label>
          <span className="label mb-1 block">Başlangıç</span>
          <Input
            type="date"
            value={query.from ?? ''}
            onChange={(e) =>
              setQuery((q) => ({ ...q, from: e.target.value || undefined }))
            }
            className="h-8 text-meta"
          />
        </label>

        <label>
          <span className="label mb-1 block">Bitiş</span>
          <Input
            type="date"
            value={query.to ?? ''}
            onChange={(e) =>
              setQuery((q) => ({ ...q, to: e.target.value || undefined }))
            }
            className="h-8 text-meta"
          />
        </label>

        {filtreVar && (
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => setQuery({})}
          >
            Filtreyi kaldır
          </Button>
        )}
      </div>

      {rows && rows.length === 0 && !error && (
        <p className="py-3 text-center text-meta text-muted-foreground">
          {filtreVar ? 'Filtreye uyan kayıt yok.' : 'Henüz kayıt yok.'}
        </p>
      )}

      <ul className="space-y-px">
        {(rows ?? []).map((r) => {
          const acik = open === r.id;
          const detaylar = Object.entries(r.detail);
          return (
            <li key={r.id} className="border-b border-border py-1.5 last:border-0">
              <button
                type="button"
                onClick={() => setOpen(acik ? null : r.id)}
                aria-expanded={acik}
                disabled={detaylar.length === 0}
                className="flex w-full flex-wrap items-baseline gap-x-2 text-left text-meta disabled:cursor-default"
              >
                <span className="tabular text-faint">
                  {new Date(r.createdAt).toLocaleString('tr-TR')}
                </span>
                <span className="font-medium text-foreground">{r.action}</span>
                {r.actorName && (
                  <span className="text-primary">@{r.actorName}</span>
                )}
                {r.targetType && (
                  <span className="text-muted-foreground">
                    {r.targetType}
                    {r.targetId && ` · ${r.targetId.slice(0, 8)}`}
                  </span>
                )}
                {detaylar.length > 0 && (
                  <span className="ml-auto text-faint">
                    {acik ? '−' : `+${detaylar.length}`}
                  </span>
                )}
              </button>

              {acik && detaylar.length > 0 && (
                <dl className="mt-1.5 grid gap-x-4 gap-y-1 rounded-card border border-border bg-surface-2 px-3 py-2 text-meta sm:grid-cols-2">
                  {detaylar.map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="shrink-0 text-faint">{k}</dt>
                      <dd className="min-w-0 break-words text-foreground">
                        {v === null
                          ? '—'
                          : typeof v === 'object'
                            ? JSON.stringify(v)
                            : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
