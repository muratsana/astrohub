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
  fetchHeroSlides,
  updateHeroSlide,
  createHeroSlide,
  deleteHeroSlide,
  describeHeroKeyProblem,
  describeHeroImageProblem,
  normalizeHeroImageUrl,
  fetchNavLinks,
  upsertNavLink,
  deleteNavLink,
  describePathProblem,
  fetchFeatureFlags,
  setFeatureFlag,
  fetchAppSettings,
  setAppSetting,
  fetchHistory,
  rollbackSetting,
  summarize,
  scopeLabels,
  moduleLabels,
  type HomeModule,
  type HomeDraftPatch,
  type NavLink,
  type HeroSlideRow,
  type HeroSlidePatch,
  type FeatureFlag,
  type HistoryEntry,
} from './siteSettings';
import {
  DEFAULT_WEATHER_PROVIDER,
  toWeatherProvider,
  weatherProviderLabels,
  type WeatherProvider,
} from '@/features/site/siteConfig';
import {
  HERO_SCENES,
  heroSceneLabels,
  effectiveBadge,
  effectiveTint,
} from '@/features/site/heroSlides';
import type { HeroScene } from '@/components/media/HeroBackdrop';

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
      <HeroSlidesSection canWrite={canWrite} onChange={yenile} />
      <NavLinksSection canWrite={canWrite} onChange={yenile} />
      <WeatherProviderSection canWrite={canWrite} onChange={yenile} />
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

/**
 * Hero rengi: "R,G,B" ↔ "#rrggbb".
 *
 * Sütun "150,185,235" biçimini tutuyor çünkü renk `HeroBackdrop` içinde
 * canvas'a sayı üçlüsü olarak gidiyor. Yöneticiye bu üçlüyü ELLE
 * YAZDIRMAK istemedik: metin kutusu "biraz daha mavi" sorusunun cevabını
 * denemesi imkânsız bir hâle sokar ve biçimi bozan her giriş sessizce
 * varsayılana düşerdi (`effectiveTint`). `<input type="color">` aynı
 * değeri gösterip seçtiriyor; dönüşüm burada, tek yerde.
 */
function tintHex(tint: string): string {
  const [r = 0, g = 0, b = 0] = tint.split(',').map(Number);
  const pad = (n: number) =>
    Math.min(255, Math.max(0, Math.round(n))).toString(16).padStart(2, '0');
  return `#${pad(r)}${pad(g)}${pad(b)}`;
}

function hexTint(hex: string): string | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return null;
  return [m[1], m[2], m[3]].map((h) => parseInt(h!, 16)).join(',');
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

/* ── Menü ve footer bağlantıları ─────────────────────────────────────── */

/**
 * MENÜ YÖNETİMİ (§13.2 "Navigasyon menüsü ve sırası", "Footer linkleri").
 *
 * 0058 tabloyu ve `siteSettings.ts` veri katmanını yazmıştı; bu yüzey
 * hiç yazılmamıştı. Yani `upsertNavLink`/`deleteNavLink` aylarca
 * çağıranı olmayan fonksiyonlar olarak durdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TAM MODÜL HARİTASI BURADA YÖNETİLMİYOR
 *
 * Yalnızca üst menü ve footer'ın kurumsal satırı düzenlenebiliyor.
 * Çekmecedeki ve komut paletindeki 58 bağlantılık harita (`siteMap`)
 * kodda kalıyor — o bir menü değil, her sayfaya bir yol olduğunun
 * garantisi. Panelden silinebilir olsaydı bir sayfaya giden tek yol yok
 * edilebilirdi ve hata sessiz olurdu: rota çalışır, sayfa durur, kimse
 * bulamaz. Gerekçenin tamamı `features/site/navLinks.ts` başlığında.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIRA TAKASI İKİ YAZMA, TEK İŞLEM DEĞİL
 *
 * `nav_links.position` üzerinde benzersizlik kısıtı YOK (ana sayfa
 * modüllerinin aksine), bu yüzden iki satırın `position`ını takas etmek
 * için ertelenmiş kısıt hilesine gerek kalmıyor. İlk yazma başarılı olup
 * ikincisi düşerse iki bağlantı aynı sırayı paylaşır — görünürde bir
 * karışıklık, veri kaybı değil; sonraki takas düzeltir.
 */
function NavLinksSection({
  canWrite,
  onChange,
}: {
  canWrite: boolean;
  onChange: () => void;
}) {
  const [links, setLinks] = useState<NavLink[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      setLinks(await fetchNavLinks());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Bağlantılar okunamadı');
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function calistir(is: () => Promise<void>) {
    setMesgul(true);
    setHata(null);
    try {
      await is();
      await yukle();
      onChange();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setMesgul(false);
    }
  }

  return (
    <Panel title="Menü ve footer">
      {hata && (
        <Alert tone="danger" className="mb-3">
          {hata}
        </Alert>
      )}

      {links === null ? (
        <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
      ) : (
        <div className="space-y-4">
          {(['header', 'footer'] as const).map((menu) => (
            <MenuList
              key={menu}
              menu={menu}
              links={links.filter((l) => l.menu === menu)}
              canWrite={canWrite && !mesgul}
              calistir={calistir}
            />
          ))}

          {/* Modül haritasının neden burada olmadığını yöneticiye de
              söylüyoruz: panelde göremediği bir liste olduğunu bilmezse
              "menüye ekledim ama çekmecede yok" diye arar. */}
          <p className="border-t border-border pt-3 text-meta text-faint">
            Çekmecedeki ve ⌘K paletindeki tam modül haritası buradan
            yönetilmiyor: her sayfaya bir yol kalmasını garanti ettiği için
            kodda tutuluyor.
          </p>
        </div>
      )}
    </Panel>
  );
}

const menuBasliklari: Record<'header' | 'footer', string> = {
  header: 'Üst menü',
  footer: 'Footer — kurumsal satır',
};

function MenuList({
  menu,
  links,
  canWrite,
  calistir,
}: {
  menu: 'header' | 'footer';
  links: NavLink[];
  canWrite: boolean;
  calistir: (is: () => Promise<void>) => Promise<void>;
}) {
  const sirali = [...links].sort((a, b) => a.position - b.position);

  function tasi(index: number, yon: -1 | 1) {
    const a = sirali[index];
    const b = sirali[index + yon];
    if (!a || !b) return;
    void calistir(async () => {
      await upsertNavLink({ ...a, group_label: a.group_label ?? '', position: b.position });
      await upsertNavLink({ ...b, group_label: b.group_label ?? '', position: a.position });
    });
  }

  function ekle() {
    const sonSira = sirali.length > 0 ? (sirali[sirali.length - 1]?.position ?? 0) : 0;
    void calistir(() =>
      upsertNavLink({
        menu,
        group_label: '',
        label: 'Yeni bağlantı',
        path: '/',
        position: sonSira + 1,
        enabled: false,
        new_tab: false,
        auth_only: false,
      })
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-body-sm font-medium text-foreground">
          {menuBasliklari[menu]}
        </h3>
        <span className="text-meta text-faint">{sirali.length} bağlantı</span>
        <Button
          size="sm"
          variant="secondary"
          className="ml-auto"
          disabled={!canWrite}
          onClick={ekle}
        >
          Ekle
        </Button>
      </div>

      {sirali.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          Bu menüde bağlantı yok — ziyaretçi koddaki varsayılan listeyi
          görüyor.
        </p>
      ) : (
        <ul className="space-y-2">
          {sirali.map((link, i) => (
            <NavLinkRow
              key={link.id}
              link={link}
              canWrite={canWrite}
              ilk={i === 0}
              son={i === sirali.length - 1}
              onTasi={(yon) => tasi(i, yon)}
              calistir={calistir}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NavLinkRow({
  link,
  canWrite,
  ilk,
  son,
  onTasi,
  calistir,
}: {
  link: NavLink;
  canWrite: boolean;
  ilk: boolean;
  son: boolean;
  onTasi: (yon: -1 | 1) => void;
  calistir: (is: () => Promise<void>) => Promise<void>;
}) {
  /* Adres sorunu YAZARKEN gösteriliyor: kaydedip veritabanı hatası almak
     yerine kutunun altında ne beklendiği yazıyor. */
  const [adres, setAdres] = useState(link.path);
  const sorun = describePathProblem(adres);

  /* `group_label` bilerek yamalanamıyor: bu iki menüde grup başlığı yok
     (grup kavramı yalnızca modül haritasında var, o da kodda). Tipten
     çıkarmak, ileride yanlışlıkla `null` yazılmasını da engelliyor. */
  function yaz(patch: Partial<Omit<NavLink, 'id' | 'menu' | 'group_label'>>) {
    void calistir(() =>
      upsertNavLink({
        id: link.id,
        menu: link.menu,
        group_label: link.group_label ?? '',
        label: link.label,
        path: link.path,
        position: link.position,
        enabled: link.enabled,
        new_tab: link.new_tab,
        auth_only: link.auth_only,
        ...patch,
      })
    );
  }

  return (
    <li className="rounded-card border border-border bg-surface-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-meta text-muted-foreground">
          {link.position}
        </span>
        {!link.enabled && <Badge tone="muted">kapalı</Badge>}
        {link.auth_only && <Badge tone="cold">üyeye özel</Badge>}

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
          <Button
            size="sm"
            variant="ghost"
            aria-label={`${link.label} bağlantısını sil`}
            disabled={!canWrite}
            onClick={() => void calistir(() => deleteNavLink(link.id))}
          >
            Sil
          </Button>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Alan etiket="Etiket">
          <Input
            defaultValue={link.label}
            maxLength={40}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== link.label) yaz({ label: v });
            }}
          />
        </Alan>
        <Alan etiket="Adres">
          <Input
            value={adres}
            disabled={!canWrite}
            onChange={(e) => setAdres(e.target.value)}
            onBlur={() => {
              if (!sorun && adres.trim() !== link.path) yaz({ path: adres.trim() });
            }}
          />
        </Alan>
      </div>

      {sorun && (
        <Alert tone="warning" variant="text" className="mt-1">
          {sorun}
        </Alert>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        <Kutu
          etiket="Açık"
          isaretli={link.enabled}
          disabled={!canWrite}
          onChange={(v) => yaz({ enabled: v })}
        />
        <Kutu
          etiket="Yeni sekmede"
          isaretli={link.new_tab}
          disabled={!canWrite}
          onChange={(v) => yaz({ new_tab: v })}
        />
        <Kutu
          etiket="Yalnızca üyeye"
          isaretli={link.auth_only}
          disabled={!canWrite}
          onChange={(v) => yaz({ auth_only: v })}
        />
      </div>
    </li>
  );
}

/* ── Hero slaytları ──────────────────────────────────────────────────── */

/**
 * HERO SLAYT YÖNETİMİ (§6.3 son madde, §13.2).
 *
 * §6.3'ün istediği beş kontrol burada: yayın tarihleri, sıralama, görsel
 * odak noktası, metin hizası ve CTA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * EKLEME VE SİLME ARTIK VAR — ESKİ GEREKÇE NEDEN DÜŞTÜ
 *
 * Burada uzun süre "ekleme/silme yok" yazıyordu ve gerekçesi şuydu:
 * `scene` kodda çizilen bir bileşene karşılık geliyor, panelden yeni
 * anahtar açılırsa sahnesi olmayan slayt oluşur. Gerekçe doğru, çıkarım
 * yanlıştı: sahne SEÇİLEBİLİR bir liste (beş sahne), serbest metin değil.
 * Aşağıdaki form sahneyi `HERO_SCENES`ten seçtiriyor, veritabanı da
 * `hero_slides_scene_check` ile aynı beşliyi tutuyor — sahnesiz slayt
 * üretmenin yolu kalmadı.
 *
 * Not: düğmeler tek başına yetmezdi. `hero_slides` üzerinde INSERT ve
 * DELETE politikası HİÇ YOKTU; RLS ikisini de sessizce sıfır satırla
 * geçiriyordu. Göç 20260810100000 politikaları, 20260810101000 da
 * silinen slaydın geri alınmasını ekledi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ODAK NOKTASI İKİ SAYI, GÖRSEL SEÇİCİ DEĞİL
 *
 * Görselin üstünde tıklanan bir odak seçici daha iyi olurdu; yazılmadı
 * çünkü hero görseli panelde 1800px genişliğinde iniyor ve küçültülmüş
 * bir önizleme üzerinde seçilen nokta ile gerçek kırpma arasındaki
 * ilişkiyi doğru kurmak, bu turda ölçemeyeceğimiz bir iş. İki sayı
 * kaba ama DOĞRU; yanlış çalışan bir seçiciden iyi.
 */
function HeroSlidesSection({
  canWrite,
  onChange,
}: {
  canWrite: boolean;
  onChange: () => void;
}) {
  const [slides, setSlides] = useState<HeroSlideRow[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      setSlides(await fetchHeroSlides());
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Slaytlar okunamadı');
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function calistir(is: () => Promise<void>) {
    setMesgul(true);
    setHata(null);
    try {
      await is();
      await yukle();
      onChange();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setMesgul(false);
    }
  }

  function tasi(index: number, yon: -1 | 1) {
    if (!slides) return;
    const a = slides[index];
    const b = slides[index + yon];
    if (!a || !b) return;
    /* Sıra takası: `position` benzersiz ama kısıt `deferrable`, yani
       geçici çakışma commit'e kadar sorun değil. */
    void calistir(async () => {
      await updateHeroSlide(a.key, { position: b.position });
      await updateHeroSlide(b.key, { position: a.position });
    });
  }

  /* Yeni slaydın yeri SONU. `position` benzersiz olduğu için "en büyük + 1"
     boş bir sıra garantisi; liste sıralı geldiği halde `max` ile
     hesaplıyoruz, çünkü sıra numaraları bitişik olmak zorunda değil. */
  const sonrakiSira =
    slides && slides.length > 0
      ? Math.max(...slides.map((s) => s.position)) + 1
      : 1;

  return (
    <Panel title="Hero slaytları">
      {hata && (
        <Alert tone="danger" className="mb-3">
          {hata}
        </Alert>
      )}

      {slides === null ? (
        <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
      ) : (
        <>
          {slides.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">
              Tanımlı slayt yok — ziyaretçi koddaki varsayılan beş slaytı
              görüyor.
            </p>
          ) : (
            <ul className="space-y-2">
              {slides.map((slide, i) => (
                <HeroSlideRowEditor
                  key={slide.key}
                  slide={slide}
                  canWrite={canWrite && !mesgul}
                  ilk={i === 0}
                  son={i === slides.length - 1}
                  onTasi={(yon) => tasi(i, yon)}
                  onYaz={(patch) =>
                    void calistir(() => updateHeroSlide(slide.key, patch))
                  }
                  onSil={() => void calistir(() => deleteHeroSlide(slide.key))}
                />
              ))}
            </ul>
          )}

          <YeniHeroSlaydi
            canWrite={canWrite && !mesgul}
            sonrakiSira={sonrakiSira}
            onEkle={(girdi) => calistir(() => createHeroSlide(girdi))}
          />
        </>
      )}
    </Panel>
  );
}

/**
 * YENİ SLAYT FORMU.
 *
 * ══════════════════════════════════════════════════════════════════════
 * MENÜDEKİ "EKLE" GİBİ TEK DÜĞME DEĞİL, DÖRT ALANLI FORM
 *
 * `nav_links` tarafında "Ekle" düğmesi doğrudan yer tutucu bir satır
 * yazıyor ("Yeni bağlantı", `/`) — orada bu güvenli, çünkü her alan
 * sonradan düzenlenebilir. Hero'da `key` DÜZENLENEMEZ: satırın kimliği,
 * güncelleme filtresi ve varsayılan rozet eşleşmesi ona bağlı. Yer tutucu
 * bir anahtarla oluşturulan slaydın adını sonradan düzeltmenin yolu
 * "sil ve yeniden ekle" olurdu; ayrıca ikinci kez basıldığında anahtar
 * çakışırdı. O yüzden anahtar ve sahne baştan soruluyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BURADA DÖRT ALAN VAR, SATIRDA ON İKİ
 *
 * Form yalnızca `not null` olup varsayılanı OLMAYAN alanları soruyor:
 * anahtar, sahne, başlık, CTA adresi. Rozet, alt metin, sahne rengi, odak
 * noktası, yayın penceresi — hepsi boş/varsayılan doğuyor ve satır
 * düzenleyicisinden giriliyor. Formu on iki alana çıkarmak, "yeni slayt"
 * eylemini tek oturumda bitirilmesi gereken bir işe çevirirdi.
 *
 * Bu bölünme ancak satırda KARŞILIĞI VARSA dürüst: rozet ve sahne rengi
 * alanları bu yüzden satır düzenleyicisine eklendi. Koddaki beş slaytta
 * ikisi de boşken varsayılana düştüğü için eksiklikleri görünmüyordu;
 * panelden açılan yeni bir anahtarın kodda karşılığı olmadığı için o
 * slayt rozetsiz ve tek renk kalırdı — düzeltmenin yolu da yoktu.
 */
function YeniHeroSlaydi({
  canWrite,
  sonrakiSira,
  onEkle,
}: {
  canWrite: boolean;
  sonrakiSira: number;
  onEkle: (girdi: {
    key: string;
    scene: HeroScene;
    title: string;
    cta_to: string;
    position: number;
  }) => Promise<void>;
}) {
  const [acik, setAcik] = useState(false);
  const [anahtar, setAnahtar] = useState('');
  const [sahne, setSahne] = useState<HeroScene>('nebula');
  const [baslik, setBaslik] = useState('');
  const [adres, setAdres] = useState('/');

  /* Sorunlar YAZARKEN gösteriliyor — `NavLinkRow`daki adres kutusuyla aynı
     tercih: kaydedip veritabanı kısıtının metnini okumak yerine ne
     beklendiği kutunun altında yazıyor. */
  const anahtarSorunu = anahtar ? describeHeroKeyProblem(anahtar) : null;
  const adresSorunu = describePathProblem(adres);
  const eksik = !anahtar.trim() || !baslik.trim();
  const gonderilebilir =
    canWrite && !eksik && !anahtarSorunu && !adresSorunu;

  async function gonder() {
    if (!gonderilebilir) return;
    await onEkle({
      key: anahtar.trim(),
      scene: sahne,
      title: baslik.trim(),
      cta_to: adres.trim(),
      position: sonrakiSira,
    });
    /* Form yalnızca BAŞARIDA temizleniyor: `calistir` hatayı yukarıda
       gösteriyor ve yönetici yazdıklarını kaybetmeden düzeltebiliyor. */
    setAnahtar('');
    setBaslik('');
    setAdres('/');
    setSahne('nebula');
    setAcik(false);
  }

  if (!acik) {
    return (
      <div className="mt-3 border-t border-border pt-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={!canWrite}
          onClick={() => setAcik(true)}
        >
          Yeni slayt
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-card border border-border bg-surface-2 px-3 py-2.5">
      <h3 className="mb-2 text-body-sm font-medium text-foreground">
        Yeni slayt
      </h3>

      <div className="grid gap-2 sm:grid-cols-2">
        <Alan etiket="Anahtar (sonradan değiştirilemez)">
          <Input
            value={anahtar}
            maxLength={40}
            placeholder="yaz-kampi"
            disabled={!canWrite}
            onChange={(e) => setAnahtar(e.target.value)}
          />
        </Alan>
        <Alan etiket="Sahne (arka plan)">
          <Select
            value={sahne}
            disabled={!canWrite}
            onChange={(e) => setSahne(e.target.value as HeroScene)}
          >
            {HERO_SCENES.map((s) => (
              <option key={s} value={s}>
                {heroSceneLabels[s]}
              </option>
            ))}
          </Select>
        </Alan>
        <Alan etiket="Başlık">
          <Input
            value={baslik}
            maxLength={90}
            disabled={!canWrite}
            onChange={(e) => setBaslik(e.target.value)}
          />
        </Alan>
        <Alan etiket="CTA adresi">
          <Input
            value={adres}
            disabled={!canWrite}
            onChange={(e) => setAdres(e.target.value)}
          />
        </Alan>
      </div>

      {(anahtarSorunu || adresSorunu) && (
        <Alert tone="warning" variant="text" className="mt-1">
          {anahtarSorunu ?? adresSorunu}
        </Alert>
      )}

      <p className="mt-2 text-meta leading-relaxed text-faint">
        Slayt <strong className="text-foreground">kapalı</strong> oluşturulur
        ve {sonrakiSira}. sıraya eklenir; rozet, alt metin ve sahne rengini
        satırdan girdikten sonra “Açık” kutusuyla yayına alın.
      </p>

      <div className="mt-2 flex gap-2">
        <Button size="sm" disabled={!gonderilebilir} onClick={() => void gonder()}>
          Oluştur
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAcik(false)}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}

function HeroSlideRowEditor({
  slide,
  canWrite,
  ilk,
  son,
  onTasi,
  onYaz,
  onSil,
}: {
  slide: HeroSlideRow;
  canWrite: boolean;
  ilk: boolean;
  son: boolean;
  onTasi: (yon: -1 | 1) => void;
  onYaz: (patch: HeroSlidePatch) => void;
  onSil: () => void;
}) {
  /* İKİ BASAMAKLI SİLME — menü bağlantısında olmayan bir fren.
     Bir slayt tek bir adres değil; başlık, alt metin, görsel künyesi ve
     yayın penceresi taşıyor, hepsi tek tıkla giderdi. Geri alma artık
     gerçekten çalışıyor (göç 20260810101000) ama geçmişte doğru satırı
     bulmayı gerektiriyor; onay kutusu o aramayı hiç gerektirmiyor. */
  const [silmeSoruldu, setSilmeSoruldu] = useState(false);

  return (
    <li className="rounded-card border border-border bg-surface-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-meta text-muted-foreground">
          {slide.position}
        </span>
        {/* Rozeti boş olan yeni slaytta satır başlıksız görünürdü; sitede
            ne çiziliyorsa listede de o yazıyor, o da yoksa başlık. */}
        <span className="text-body-sm font-medium text-foreground">
          {effectiveBadge(slide.key, slide.badge) || slide.title}
        </span>
        <code className="text-meta text-faint">{slide.key}</code>
        {!slide.enabled && <Badge tone="muted">kapalı</Badge>}
        {(slide.publish_from || slide.publish_to) && (
          <Badge tone="cold">zamanlı</Badge>
        )}

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
          <Button
            size="sm"
            variant="ghost"
            aria-label={`${slide.title} slaydını sil`}
            disabled={!canWrite}
            onClick={() => setSilmeSoruldu(true)}
          >
            Sil
          </Button>
        </div>
      </div>

      {silmeSoruldu && (
        <Alert tone="danger" className="mt-2">
          <p className="text-body-sm">
            <strong>{slide.title}</strong> slaydı silinsin mi? Başlık, alt
            metin, görsel künyesi ve yayın penceresi birlikte gider.
          </p>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="danger"
              disabled={!canWrite}
              onClick={() => {
                setSilmeSoruldu(false);
                onSil();
              }}
            >
              Sil
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSilmeSoruldu(false)}
            >
              Vazgeç
            </Button>
          </div>
        </Alert>
      )}

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Alan etiket="Başlık">
          <Input
            defaultValue={slide.title}
            maxLength={90}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== slide.title) onYaz({ title: v });
            }}
          />
        </Alan>
        {/* ROZET: koddaki beş slaytta boş bırakmak "kodda ne yazıyorsa o"
            demek ve yer tutucu bunu gösteriyor. Panelden açılan yeni bir
            anahtarın kodda karşılığı olmadığı için orada boş gerçekten
            boş — alan bu yüzden var. */}
        <Alan etiket="Rozet">
          <Input
            defaultValue={slide.badge}
            maxLength={40}
            placeholder={effectiveBadge(slide.key, '') || 'Rozetsiz'}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== slide.badge) onYaz({ badge: v });
            }}
          />
        </Alan>
        <Alan etiket="Alt metin">
          <Input
            defaultValue={slide.subtitle}
            maxLength={180}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== slide.subtitle) onYaz({ subtitle: v });
            }}
          />
        </Alan>
        <Alan etiket="CTA metni">
          <Input
            defaultValue={slide.cta_label}
            maxLength={40}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== slide.cta_label) onYaz({ cta_label: v });
            }}
          />
        </Alan>
        <Alan etiket="CTA adresi">
          <Input
            defaultValue={slide.cta_to}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== slide.cta_to) onYaz({ cta_to: v });
            }}
          />
        </Alan>
        <Alan etiket="Metin hizası">
          <Select
            value={slide.text_align}
            disabled={!canWrite}
            onChange={(e) =>
              onYaz({ text_align: e.target.value as 'left' | 'center' })
            }
          >
            <option value="left">Sola</option>
            <option value="center">Ortaya</option>
          </Select>
        </Alan>
        {/* Sahne artık düzenlenebilir: liste kapalı olduğu için yanlış bir
            değer yazılamıyor, kısıt da veritabanında duruyor. Görseli olan
            slaytta sahne yalnızca görsel yüklenene kadar/altında görünür —
            yine de kilitli tutmak, görseli kaldırınca eski arka planla
            kalmak demekti. */}
        <Alan etiket="Sahne (arka plan)">
          <Select
            value={slide.scene}
            disabled={!canWrite}
            onChange={(e) => onYaz({ scene: e.target.value as HeroScene })}
          >
            {HERO_SCENES.map((s) => (
              <option key={s} value={s}>
                {heroSceneLabels[s]}
              </option>
            ))}
          </Select>
        </Alan>
        {/* Sahne rengi: kutuda SİTEDE ÇİZİLEN renk duruyor. Kayıtlı değer
            boşsa `effectiveTint` koddaki karşılığına düşüyor — kutuya boş
            bir renk göstermek, yöneticiye ekranda gördüğünden başka bir
            şey söylemek olurdu. */}
        <Alan etiket="Sahne rengi">
          <Input
            type="color"
            className="h-10 px-1"
            defaultValue={tintHex(effectiveTint(slide.key, slide.tint))}
            disabled={!canWrite}
            onBlur={(e) => {
              const v = hexTint(e.target.value);
              if (v && v !== slide.tint) onYaz({ tint: v });
            }}
          />
        </Alan>
        <Alan etiket="Odak noktası (yatay % / dikey %)">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              max={100}
              defaultValue={slide.focal_x}
              disabled={!canWrite}
              aria-label="Yatay odak yüzdesi"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== slide.focal_x)
                  onYaz({ focal_x: v });
              }}
            />
            <Input
              type="number"
              min={0}
              max={100}
              defaultValue={slide.focal_y}
              disabled={!canWrite}
              aria-label="Dikey odak yüzdesi"
              onBlur={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v !== slide.focal_y)
                  onYaz({ focal_y: v });
              }}
            />
          </div>
        </Alan>
        <Alan etiket="Yayın başlangıcı">
          <Input
            type="datetime-local"
            defaultValue={yerelZaman(slide.publish_from)}
            disabled={!canWrite}
            onBlur={(e) => onYaz({ publish_from: utcDamga(e.target.value) })}
          />
        </Alan>
        <Alan etiket="Yayın bitişi">
          <Input
            type="datetime-local"
            defaultValue={yerelZaman(slide.publish_to)}
            disabled={!canWrite}
            onBlur={(e) => onYaz({ publish_to: utcDamga(e.target.value) })}
          />
        </Alan>
      </div>

      <HeroGorselAlani slide={slide} canWrite={canWrite} onYaz={onYaz} />

      <div className="mt-2">
        <Kutu
          etiket="Açık"
          isaretli={slide.enabled}
          disabled={!canWrite}
          onChange={(v) => onYaz({ enabled: v })}
        />
      </div>
    </li>
  );
}

/**
 * HERO GÖRSELİ — adres, kredi ve lisans (§13.2 son madde).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SATIRIN GERİ KALANI GİBİ "ODAKTAN ÇIKINCA KAYDET" DEĞİL
 *
 * Öteki alanlar tek tek yazılıyor; burada olamaz. `hero_slides_credit_check`
 * "adres varsa kredi ve lisans da var" diyor, yani adresi tek başına
 * gönderen ilk istek kısıta takılırdı — yönetici kredi kutusuna sıra
 * gelmeden hata alırdı. Üçü tek yamada gidiyor; "Görseli kaydet" düğmesi
 * bu yüzden var, üslup tercihi değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖNİZLEME SÜS DEĞİL
 *
 * Yüklenmeyen bir adres sitede SESSİZ: `HeroPhoto` hata durumunda kendini
 * gizleyip çizilen sahneyi bırakıyor ve krediyi basmıyor (gösterilmeyen
 * görseli kredilendirmek yanlış atıf olurdu). Yönetici "kaydettim ama
 * değişmedi" ile baş başa kalırdı. Buradaki küçük önizleme aynı adresi
 * aynı tarayıcıda, aynı CSP altında çekiyor: yüklenmiyorsa sebebi
 * kaydetmeden ÖNCE görünüyor.
 */
function HeroGorselAlani({
  slide,
  canWrite,
  onYaz,
}: {
  slide: HeroSlideRow;
  canWrite: boolean;
  onYaz: (patch: HeroSlidePatch) => void;
}) {
  const [adres, setAdres] = useState(slide.image_url ?? '');
  const [kredi, setKredi] = useState(slide.image_credit ?? '');
  const [lisans, setLisans] = useState(slide.image_licence ?? '');
  const [yuklenmedi, setYuklenmedi] = useState(false);

  const sorun = describeHeroImageProblem(adres);
  const eksikKunye = Boolean(adres.trim()) && (!kredi.trim() || !lisans.trim());
  const degisti =
    adres !== (slide.image_url ?? '') ||
    kredi !== (slide.image_credit ?? '') ||
    lisans !== (slide.image_licence ?? '');

  /* Önizleme normalleştirilmiş adresi çekiyor: yönetici Commons SAYFA
     adresini yapıştırdığında kutuda o duruyor ama kaydedilecek olan dosya
     adresi — önizleme kaydedileni göstermezse yalan söyler. */
  const onizleme = adres.trim() && !sorun ? normalizeHeroImageUrl(adres) : '';

  return (
    <div className="mt-2 border-t border-border pt-2">
      <div className="flex flex-wrap items-start gap-3">
        {onizleme && !yuklenmedi && (
          <img
            src={onizleme}
            alt=""
            className="h-16 w-24 shrink-0 rounded-card border border-border object-cover"
            onError={() => setYuklenmedi(true)}
          />
        )}

        <div className="grid min-w-[16rem] flex-1 gap-2">
          <Alan etiket="Görsel adresi">
            <Input
              value={adres}
              placeholder="https://commons.wikimedia.org/wiki/File:…"
              disabled={!canWrite}
              onChange={(e) => {
                setAdres(e.target.value);
                setYuklenmedi(false);
              }}
            />
          </Alan>

          <div className="grid gap-2 sm:grid-cols-2">
            {/* Künye alanları adres yokken KAPALI: görselsiz slaytta kredi
                girmek, olmayan bir şeye atıf yapmak olurdu. */}
            <Alan etiket="Kredi (kaynak ve yapımcı)">
              <Input
                value={kredi}
                maxLength={120}
                placeholder="NASA, ESA, Hubble — Yaratılış Sütunları"
                disabled={!canWrite || !adres.trim()}
                onChange={(e) => setKredi(e.target.value)}
              />
            </Alan>
            <Alan etiket="Lisans">
              <Input
                value={lisans}
                maxLength={60}
                list="hero-lisanslari"
                placeholder="CC BY 4.0"
                disabled={!canWrite || !adres.trim()}
                onChange={(e) => setLisans(e.target.value)}
              />
            </Alan>
          </div>
          {/* Sık kullanılan üç değer; alan yine serbest, çünkü lisans
              kaynağa göre değişiyor ve listeye sığmayan biri çıkabilir. */}
          <datalist id="hero-lisanslari">
            <option value="CC BY 4.0" />
            <option value="CC BY-SA 4.0" />
            <option value="Kamu malı" />
          </datalist>
        </div>
      </div>

      {sorun && (
        <Alert tone="warning" variant="text" className="mt-1">
          {sorun}
        </Alert>
      )}
      {!sorun && yuklenmedi && (
        <Alert tone="warning" variant="text" className="mt-1">
          Bu adres yüklenmedi. Kaydedilirse sitede görsel çıkmaz, slayt
          çizilen sahnesiyle kalır.
        </Alert>
      )}
      {eksikKunye && (
        <Alert tone="warning" variant="text" className="mt-1">
          Görsel varsa kredi ve lisans zorunlu — atıfsız gösterim lisans
          ihlali.
        </Alert>
      )}

      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!canWrite || !degisti || Boolean(sorun) || eksikKunye}
          onClick={() =>
            onYaz({
              image_url: adres.trim() || null,
              image_credit: kredi.trim(),
              image_licence: lisans.trim(),
            })
          }
        >
          Görseli kaydet
        </Button>
        {slide.image_url && (
          <Button
            size="sm"
            variant="ghost"
            disabled={!canWrite}
            aria-label={`${slide.title} slaydının görselini kaldır`}
            onClick={() => {
              setAdres('');
              setKredi('');
              setLisans('');
              /* Künye de gidiyor; üçünü birlikte `null` yapma işi veri
                 katmanında, çünkü kural çağırana değil veriye ait. */
              onYaz({ image_url: null });
            }}
          >
            Görseli kaldır
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Hava sağlayıcısı ────────────────────────────────────────────────── */

/**
 * HAVA SERVİSİ TERCİHİ (§3.4).
 *
 * Faz 3'te "sağlayıcı seçiminin admin ayarından değişmesi" maddesi
 * `site_settings` tablosu olmadığı için açıkta kalmıştı. Tablo Faz 10'da
 * geldi; bu bölüm o maddeyi kapatıyor.
 *
 * İKİ SEÇENEK VAR, ÜÇ DEĞİL — "yalnızca meteoblue" seçeneği bilerek
 * yok: vekil düştüğünde hiçbir ziyaretçi hava verisi göremezdi ve
 * düzeltmek için panele girmek gerekirdi. Gerekçenin tamamı
 * `siteConfig.ts` içinde.
 */
function WeatherProviderSection({
  canWrite,
  onChange,
}: {
  canWrite: boolean;
  onChange: () => void;
}) {
  const [deger, setDeger] = useState<WeatherProvider | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      const rows = await fetchAppSettings();
      const row = rows.find((r) => r.key === 'weather_provider');
      /* Satır hiç yoksa varsayılan: ayar henüz yazılmamış demek,
         bozuk değil. */
      setDeger(toWeatherProvider(row?.value));
    } catch (e) {
      setDeger(DEFAULT_WEATHER_PROVIDER);
      setHata(e instanceof Error ? e.message : 'Ayar okunamadı');
    }
  }, []);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  async function uygula(hedef: WeatherProvider) {
    setMesgul(true);
    setHata(null);
    try {
      await setAppSetting(
        'weather_provider',
        { saglayici: hedef },
        `Hava sağlayıcısı: ${weatherProviderLabels[hedef]}`
      );
      await yukle();
      onChange();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setMesgul(false);
    }
  }

  return (
    <Panel
      title="Hava servisi"
      status={deger ? weatherProviderLabels[deger] : 'okunuyor…'}
    >
      {hata && <Alert className="mb-3">{hata}</Alert>}

      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Open-Meteo <strong className="text-foreground">her koşulda</strong>{' '}
        çağrılır: seeing hesabının ihtiyaç duyduğu üst atmosfer rüzgârını
        yalnızca o veriyor. Buradaki seçim, meteoblue’nun bulut ve yer
        koşulları verisinin kullanılıp kullanılmayacağını belirliyor —
        meteoblue anahtarı kredili olduğu için bu aynı zamanda bir maliyet
        kararı.
      </p>

      <div className="space-y-1.5">
        {(Object.keys(weatherProviderLabels) as WeatherProvider[]).map((k) => (
          <label
            key={k}
            className="flex items-start gap-2 text-body-sm text-foreground"
          >
            <input
              type="radio"
              name="weather-provider"
              className="mt-1"
              checked={deger === k}
              disabled={!canWrite || mesgul || deger === null}
              onChange={() => void uygula(k)}
            />
            <span>{weatherProviderLabels[k]}</span>
          </label>
        ))}
      </div>

      <p className="mt-3 text-meta leading-relaxed text-faint">
        “Yalnızca meteoblue” seçeneği bilerek YOK: vekil düşerse hiçbir
        ziyaretçi hava verisi göremez ve düzeltmenin tek yolu bu panele
        girmek olurdu.
      </p>
    </Panel>
  );
}
