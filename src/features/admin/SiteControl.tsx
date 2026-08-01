import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Input, Select } from '@/components/ui/Input';
import {
  fetchHomeModules,
  saveHomeDraft,
  publishHomeDraft,
  discardHomeDraft,
  fetchFeatureFlags,
  setFeatureFlag,
  fetchHistory,
  rollbackSetting,
  summarize,
  scopeLabels,
  moduleLabels,
  type HomeModule,
  type HomeDraftPatch,
  type FeatureFlag,
  type HistoryEntry,
} from './siteSettings';

/**
 * SİTE YÖNETİMİ — panelin ana sayfa, özellik anahtarı ve geçmiş yüzeyi
 * (§13.2, §13.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN TASLAK ÜZERİNDEN ÇALIŞIYOR
 *
 * §13.3 kritik ayarlarda draft → preview → publish istiyor. Buradaki her
 * düzenleme CANLI SİTEYE DEĞİL taslağa yazılıyor; ana sayfa yayımlanana
 * kadar değişmiyor. Sebep pratik: ana sayfa sıralamasını düzeltmek altı
 * modüle dokunmak demek ve her dokunuş anında yayına girseydi ziyaretçi
 * yarım kalmış bir düzen görürdü.
 *
 * Yayımlama ATOMİK: `publish_home_draft` bütün taslakları tek `update`
 * ile uyguluyor. Sıra takasında (news 4↔events 5) geçici olarak iki
 * modülde aynı `position` oluşuyor; kısıt `deferrable` olduğu için
 * denetim commit'e erteleniyor. Bu davranış canlı projede gerçek commit
 * ile ölçüldü — geri alınan bir işlemde ölçmek yanıltıcı olurdu, çünkü
 * ertelenmiş kısıt rollback'te hiç denetlenmez.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "ETKİN DEĞER" KAVRAMI
 *
 * Ekranda gösterilen değer `taslak[alan] ?? canlı[alan]`. Yönetici
 * yayımlamadan önce sonucu görüyor; canlı değeri ayrıca göstermiyoruz
 * çünkü iki sütunlu bir tablo, bir alan değiştirmek isteyen kişiye
 * cevaplaması gereken ikinci bir soru sorar. Fark ROZETLE belirtiliyor:
 * taslağı olan modülde "taslak" rozeti var.
 */
export function SiteControl({ canWrite }: { canWrite: boolean }) {
  const [tazele, setTazele] = useState(0);
  const yenile = useCallback(() => setTazele((n) => n + 1), []);

  return (
    <div className="space-y-4">
      <HomeModulesSection canWrite={canWrite} onChange={yenile} />
      <FeatureFlagsSection canWrite={canWrite} onChange={yenile} />
      <HistorySection canWrite={canWrite} tazele={tazele} onChange={yenile} />
    </div>
  );
}

/* ── Ana sayfa modülleri ─────────────────────────────────────────────── */

function HomeModulesSection({
  canWrite,
  onChange,
}: {
  canWrite: boolean;
  onChange: () => void;
}) {
  const [moduller, setModuller] = useState<HomeModule[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [not, setNot] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [gerekce, setGerekce] = useState('');

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      setModuller(await fetchHomeModules());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Modüller okunamadı');
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const taslakliSayi = (moduller ?? []).filter((m) => m.draft !== null).length;

  /* Tek alan yazma. Her değişiklik ANINDA taslağa gidiyor — "kaydet"
     düğmesi yok. Altı modül × on bir alan için ayrı kaydet düğmesi,
     yöneticiyi kaydetmeyi unutabileceği bir ekranda bırakırdı. */
  async function yaz(key: string, patch: HomeDraftPatch) {
    if (!canWrite) return;
    setMesgul(true);
    setHata(null);
    setNot(null);
    try {
      await saveHomeDraft(key, patch);
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setMesgul(false);
    }
  }

  async function yayimla() {
    setMesgul(true);
    setHata(null);
    setNot(null);
    try {
      const sayi = await publishHomeDraft(gerekce);
      setGerekce('');
      setNot(
        sayi === 0
          ? 'Yayımlanacak taslak yoktu.'
          : `${sayi} modül yayımlandı — ana sayfa güncellendi.`
      );
      await yukle();
      onChange();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yayımlanamadı');
    } finally {
      setMesgul(false);
    }
  }

  async function vazgec() {
    setMesgul(true);
    setHata(null);
    setNot(null);
    try {
      const sayi = await discardHomeDraft();
      setNot(
        sayi === 0 ? 'Atılacak taslak yoktu.' : `${sayi} modülün taslağı atıldı.`
      );
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Taslak atılamadı');
    } finally {
      setMesgul(false);
    }
  }

  /* Sıra takası taslağa yazılıyor, canlıya değil: iki modülün konumu
     birlikte değişmeli ve arada ana sayfa tutarsız görünmemeli. */
  async function tasi(index: number, yon: -1 | 1) {
    if (!moduller) return;
    const hedef = index + yon;
    if (hedef < 0 || hedef >= moduller.length) return;
    const a = moduller[index];
    const b = moduller[hedef];
    if (!a || !b) return;
    setMesgul(true);
    setHata(null);
    try {
      await saveHomeDraft(a.key, { position: etkin(b, 'position') });
      await saveHomeDraft(b.key, { position: etkin(a, 'position') });
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Sıra değiştirilemedi');
    } finally {
      setMesgul(false);
    }
  }

  return (
    <Panel
      title="Ana sayfa modülleri"
      status={
        taslakliSayi > 0
          ? `${taslakliSayi} modülde yayımlanmamış değişiklik`
          : 'yayındaki düzen'
      }
    >
      {hata && (
        <Alert tone="danger" className="mb-3">
          {hata}
        </Alert>
      )}
      {not && (
        <Alert tone="success" className="mb-3">
          {not}
        </Alert>
      )}
      {!canWrite && (
        <Alert tone="info" className="mb-3">
          Bu bölümü yalnızca yönetici değiştirebilir. Yetki veritabanında
          zorlanıyor — buradaki kilit ekranı boş bırakmamak için.
        </Alert>
      )}

      {moduller === null ? (
        <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
      ) : (
        <div className="space-y-3">
          {moduller.map((m, i) => (
            <ModuleRow
              key={m.key}
              modul={m}
              canWrite={canWrite && !mesgul}
              ilk={i === 0}
              son={i === moduller.length - 1}
              onYaz={(p) => void yaz(m.key, p)}
              onTasi={(yon) => void tasi(i, yon)}
            />
          ))}
        </div>
      )}

      {/* YAYIMLAMA ŞERİDİ — taslak yokken de duruyor ama düğmesi kapalı.
          Gizleseydik yönetici "yayımla nerede" diye ararken taslağının
          kaydedilmediğini sanabilirdi. */}
      <div className="mt-4 border-t border-border pt-3">
        <label
          htmlFor="yayin-gerekce"
          className="mb-1.5 block text-meta text-muted-foreground"
        >
          Gerekçe (değişiklik geçmişine yazılır)
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="yayin-gerekce"
            value={gerekce}
            onChange={(e) => setGerekce(e.target.value)}
            placeholder="Örn. kış dönemi için etkinlikler öne alındı"
            className="min-w-56 flex-1"
            disabled={!canWrite || taslakliSayi === 0}
          />
          <Button
            onClick={() => void yayimla()}
            disabled={!canWrite || mesgul || taslakliSayi === 0}
          >
            Yayımla
          </Button>
          <Button
            variant="ghost"
            onClick={() => void vazgec()}
            disabled={!canWrite || mesgul || taslakliSayi === 0}
          >
            Taslağı at
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/** Etkin değer: taslak varsa taslaktaki, yoksa canlıdaki. */
function etkin<K extends keyof HomeDraftPatch & keyof HomeModule>(
  m: HomeModule,
  alan: K
): NonNullable<HomeModule[K]> {
  const taslak = m.draft?.[alan];
  return (taslak === undefined ? m[alan] : taslak) as NonNullable<
    HomeModule[K]
  >;
}

function ModuleRow({
  modul,
  canWrite,
  ilk,
  son,
  onYaz,
  onTasi,
}: {
  modul: HomeModule;
  canWrite: boolean;
  ilk: boolean;
  son: boolean;
  onYaz: (patch: HomeDraftPatch) => void;
  onTasi: (yon: -1 | 1) => void;
}) {
  const acik = etkin(modul, 'enabled');

  return (
    <div className="rounded-card border border-border bg-surface-2 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-meta text-muted-foreground">
          {etkin(modul, 'position')}
        </span>
        <span className="text-body-sm font-medium text-foreground">
          {moduleLabels[modul.key] ?? modul.key}
        </span>
        <code className="text-meta text-faint">{modul.key}</code>
        {modul.draft !== null && <Badge tone="warning">taslak</Badge>}
        {!acik && <Badge tone="muted">kapalı</Badge>}

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Yukarı taşı"
            disabled={!canWrite || ilk}
            onClick={() => onTasi(-1)}
          >
            ↑
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label="Aşağı taşı"
            disabled={!canWrite || son}
            onClick={() => onTasi(1)}
          >
            ↓
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Alan etiket="Başlık">
          <Input
            defaultValue={etkin(modul, 'title') ?? ''}
            maxLength={60}
            disabled={!canWrite}
            placeholder="Varsayılan başlık"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (etkin(modul, 'title') ?? '')) onYaz({ title: v });
            }}
          />
        </Alan>
        <Alan etiket="Alt başlık">
          <Input
            defaultValue={etkin(modul, 'subtitle') ?? ''}
            maxLength={120}
            disabled={!canWrite}
            placeholder="Yok"
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== (etkin(modul, 'subtitle') ?? '')) onYaz({ subtitle: v });
            }}
          />
        </Alan>
        <Alan etiket="Öğe sayısı (1–24)">
          <Input
            type="number"
            min={1}
            max={24}
            defaultValue={etkin(modul, 'item_limit')}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v) && v !== etkin(modul, 'item_limit'))
                onYaz({ item_limit: v });
            }}
          />
        </Alan>
        <Alan etiket="Düzen">
          <Select
            value={etkin(modul, 'layout')}
            disabled={!canWrite}
            onChange={(e) =>
              onYaz({ layout: e.target.value as 'grid' | 'list' })
            }
          >
            <option value="grid">Izgara</option>
            <option value="list">Liste</option>
          </Select>
        </Alan>
        {/* Yayın penceresi: `home_modules_admin` bunu UYGULAMADIĞI için
            ileri tarihli modül burada görünmeye devam ediyor ve geri
            alınabiliyor. Ziyaretçi tarafında `home_layout` uyguluyor. */}
        <Alan etiket="Yayın başlangıcı">
          <Input
            type="datetime-local"
            defaultValue={yerelZaman(etkin(modul, 'publish_from'))}
            disabled={!canWrite}
            onBlur={(e) => onYaz({ publish_from: utcDamga(e.target.value) })}
          />
        </Alan>
        <Alan etiket="Yayın bitişi">
          <Input
            type="datetime-local"
            defaultValue={yerelZaman(etkin(modul, 'publish_to'))}
            disabled={!canWrite}
            onBlur={(e) => onYaz({ publish_to: utcDamga(e.target.value) })}
          />
        </Alan>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        <Kutu
          etiket="Açık"
          isaretli={acik}
          disabled={!canWrite}
          onChange={(v) => onYaz({ enabled: v })}
        />
        <Kutu
          etiket="Boşsa gizle"
          isaretli={etkin(modul, 'hide_when_empty')}
          disabled={!canWrite}
          onChange={(v) => onYaz({ hide_when_empty: v })}
        />
        <Kutu
          etiket="Mobilde"
          isaretli={etkin(modul, 'show_mobile')}
          disabled={!canWrite}
          onChange={(v) => onYaz({ show_mobile: v })}
        />
        <Kutu
          etiket="Masaüstünde"
          isaretli={etkin(modul, 'show_desktop')}
          disabled={!canWrite}
          onChange={(v) => onYaz({ show_desktop: v })}
        />
      </div>
    </div>
  );
}

function Alan({
  etiket,
  children,
}: {
  etiket: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-meta text-muted-foreground">
        {etiket}
      </span>
      {children}
    </label>
  );
}

function Kutu({
  etiket,
  isaretli,
  disabled,
  onChange,
}: {
  etiket: string;
  isaretli: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-body-sm text-foreground">
      <input
        type="checkbox"
        checked={isaretli}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-border"
      />
      {etiket}
    </label>
  );
}

/**
 * `timestamptz` → `datetime-local` değeri.
 *
 * `<input type="datetime-local">` saat dilimi TAŞIMAZ; tarayıcının yerel
 * saatini bekler. ISO damgasını olduğu gibi vermek, kutuya UTC saatini
 * yazıp yöneticiye kendi saati gibi göstermek olurdu.
 */
function yerelZaman(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/**
 * `datetime-local` değeri → `timestamptz` için ISO damgası.
 *
 * `yerelZaman`ın TERSİ ve öyle kalmalı. Kutunun ham değeri ("2026-08-01T12:30")
 * saat dilimi taşımıyor; olduğu gibi gönderilirse veritabanı onu kendi
 * diliminde — Supabase'de UTC — okuyor. Yani okuma yönü UTC'den yerele
 * çevirirken yazma yönü çevirmiyordu ve pencere, yöneticinin UTC'ye olan
 * farkı kadar kayıyordu: İstanbul'da 12:30 yazan yönetici kutuyu 15:30
 * olarak geri okuyordu. Ölçüldü, sonra bu fonksiyon yazıldı.
 *
 * `new Date(...)` dilimsiz bir tarih-saat dizgesini YEREL kabul eder
 * (ECMA-262); `toISOString()` de onu UTC damgasına çevirir. Dönüşüm
 * böylece tarayıcının kendi diliminden geçiyor — sabit bir ofis
 * yazsaydık yaz saati uygulamasında yılda iki kez yanlış olurdu.
 */
function utcDamga(deger: string): string | null {
  if (!deger) return null;
  const d = new Date(deger);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/* ── Özellik anahtarları ─────────────────────────────────────────────── */

function FeatureFlagsSection({
  canWrite,
  onChange,
}: {
  canWrite: boolean;
  onChange: () => void;
}) {
  const [flags, setFlags] = useState<FeatureFlag[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState<string | null>(null);
  const [onay, setOnay] = useState<{ key: string; hedef: boolean } | null>(null);
  const [gerekce, setGerekce] = useState('');

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      setFlags(await fetchFeatureFlags());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Anahtarlar okunamadı');
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function uygula(key: string, hedef: boolean, sebep?: string) {
    setMesgul(key);
    setHata(null);
    try {
      await setFeatureFlag(key, hedef, sebep);
      setOnay(null);
      setGerekce('');
      await yukle();
      onChange();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Değiştirilemedi');
    } finally {
      setMesgul(null);
    }
  }

  return (
    <Panel title="Özellik anahtarları">
      {hata && (
        <Alert tone="danger" className="mb-3">
          {hata}
        </Alert>
      )}
      {flags === null ? (
        <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
      ) : flags.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">Tanımlı anahtar yok.</p>
      ) : (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li
              key={f.key}
              className="rounded-card border border-border bg-surface-2 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body-sm font-medium text-foreground">
                  {f.label}
                </span>
                <code className="text-meta text-faint">{f.key}</code>
                {f.high_risk && <Badge tone="danger">yüksek risk</Badge>}
                <div className="ml-auto">
                  <Button
                    size="sm"
                    variant={f.enabled ? 'secondary' : 'primary'}
                    disabled={!canWrite || mesgul === f.key}
                    onClick={() => {
                      /* Yüksek riskli anahtar GEREKÇESİZ değişmiyor —
                         tetikleyici zaten reddediyor, ama hatayı
                         veritabanından duymak yerine burada soruyoruz. */
                      if (f.high_risk)
                        setOnay({ key: f.key, hedef: !f.enabled });
                      else void uygula(f.key, !f.enabled);
                    }}
                  >
                    {f.enabled ? 'Kapat' : 'Aç'}
                  </Button>
                </div>
              </div>
              {f.description && (
                <p className="mt-1 text-meta text-muted-foreground">
                  {f.description}
                </p>
              )}

              {onay?.key === f.key && (
                <div className="mt-2 border-t border-border pt-2">
                  <p className="mb-1.5 text-meta text-muted-foreground">
                    Bu anahtar yüksek riskli. Gerekçe zorunlu.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={gerekce}
                      onChange={(e) => setGerekce(e.target.value)}
                      placeholder="Neden değiştiriliyor?"
                      className="min-w-48 flex-1"
                    />
                    <Button
                      size="sm"
                      disabled={!gerekce.trim() || mesgul === f.key}
                      onClick={() => void uygula(f.key, onay.hedef, gerekce)}
                    >
                      Onayla
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setOnay(null);
                        setGerekce('');
                      }}
                    >
                      Vazgeç
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* ── Değişiklik geçmişi ──────────────────────────────────────────────── */

function HistorySection({
  canWrite,
  tazele,
  onChange,
}: {
  canWrite: boolean;
  tazele: number;
  onChange: () => void;
}) {
  const [kayitlar, setKayitlar] = useState<HistoryEntry[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState<number | null>(null);

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      setKayitlar(await fetchHistory(30));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Geçmiş okunamadı');
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle, tazele]);

  async function geriAl(entry: HistoryEntry) {
    setMesgul(entry.id);
    setHata(null);
    try {
      await rollbackSetting(entry.id, `#${entry.id} geri alındı`);
      await yukle();
      onChange();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Geri alınamadı');
    } finally {
      setMesgul(null);
    }
  }

  return (
    <Panel title="Değişiklik geçmişi" status="son 30 kayıt">
      {hata && (
        <Alert tone="danger" className="mb-3">
          {hata}
        </Alert>
      )}
      {kayitlar === null ? (
        <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
      ) : kayitlar.length === 0 ? (
        /* Taslak oynaması 0060'tan beri buraya düşmüyor; bu liste
           yalnızca CANLI yapılandırmanın değiştiği anları taşıyor. */
        <p className="text-body-sm text-muted-foreground">
          Henüz yayımlanmış bir ayar değişikliği yok.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {kayitlar.map((k) => (
            <li key={k.id} className="flex flex-wrap items-start gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="muted">{scopeLabels[k.scope] ?? k.scope}</Badge>
                  <code className="text-meta text-faint">{k.record_key}</code>
                  {k.rolled_back_from !== null && (
                    <Badge tone="warning">geri alma</Badge>
                  )}
                </div>
                <p className="mt-1 break-words text-body-sm text-foreground">
                  {summarize(k)}
                </p>
                <p className="mt-0.5 text-meta text-muted-foreground">
                  {new Date(k.created_at).toLocaleString('tr-TR')}
                  {k.reason ? ` · ${k.reason}` : ''}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={!canWrite || mesgul === k.id}
                onClick={() => void geriAl(k)}
              >
                Geri al
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
