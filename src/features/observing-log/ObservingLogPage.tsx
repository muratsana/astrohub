import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { isSupabaseConfigured } from '@/services/supabase/client';
import {
  createLog,
  deleteLog,
  fetchMyLogs,
  updateLog,
} from './service';
import {
  CONDITION_LABELS,
  MAX_NOTE,
  describeDraftProblem,
  logTitle,
  type ObservationDraft,
  type ObservationLog,
} from './types';

/**
 * GÖZLEM GÜNLÜĞÜ (§14.6).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAYFA TAMAMEN ÖZEL — `noIndex`
 *
 * Liste kullanıcının KENDİ kayıtlarını gösteriyor, açık olanları da
 * dahil. Arama motoruna açmanın anlamı yok: oturumsuz gelen bir bot
 * hiçbir şey göremez, indekslenen şey giriş isteyen bir kabuk olurdu.
 * Açık kayıtların keşfedilebilir yüzeyi profil sayfası — orası
 * indekslenebilir ve bu sayfa oraya bağlanıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TEK FORM, HEM EKLEME HEM DÜZENLEME
 *
 * `duzenlenen` boşsa yeni kayıt, doluysa düzenleme. İki ayrı form
 * yazmak, aynı on alanı ve aynı doğrulamayı iki yerde yaşatmak demekti;
 * ikisinin zamanla ayrışması kaçınılmazdı.
 */
export function ObservingLogPage() {
  const { user, loading } = useAuth();
  const [logs, setLogs] = useState<ObservationLog[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [duzenlenen, setDuzenlenen] = useState<ObservationLog | null>(null);

  const yukle = useCallback(async () => {
    if (!user) return;
    setHata(null);
    try {
      setLogs(await fetchMyLogs(user.id));
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Günlük okunamadı');
    }
  }, [user]);

  useEffect(() => {
    void yukle();
  }, [yukle]);

  const header = (
    <PageHeader
      breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Gözlem Günlüğü' }]}
      title="Gözlem Günlüğü"
      description="Baktığın geceleri kaydet: tarih, yer, koşullar ve notun. Kayıtlar varsayılan olarak yalnızca sana görünür."
    />
  );

  /* ── Durum 1: Supabase kurulu değil ── */
  if (!isSupabaseConfigured) {
    return (
      <Shell header={header}>
        <EmptyState
          message="Gözlem günlüğü için veritabanı bağlantısı gerekiyor."
          hint="Bu derlemede dış servisler kapalı."
        />
      </Shell>
    );
  }

  /* ── Durum 2: oturum yok ── */
  if (loading) {
    return (
      <Shell header={header}>
        <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
      </Shell>
    );
  }
  if (!user) {
    return (
      <Shell header={header}>
        <EmptyState
          message="Günlüğün sana ait — görmek için giriş yapman gerekiyor."
          hint="Kayıtlar varsayılan olarak özeldir; sen açmadıkça kimse göremez."
          action={
            <Link to="/giris" className="text-primary hover:underline">
              Giriş yap
            </Link>
          }
        />
      </Shell>
    );
  }

  async function kaydet(draft: ObservationDraft) {
    if (!user) return;
    setMesgul(true);
    setHata(null);
    try {
      if (duzenlenen) await updateLog(duzenlenen.id, draft);
      else await createLog(user.id, draft);
      setDuzenlenen(null);
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setMesgul(false);
    }
  }

  async function sil(log: ObservationLog) {
    setMesgul(true);
    setHata(null);
    try {
      await deleteLog(log.id);
      if (duzenlenen?.id === log.id) setDuzenlenen(null);
      await yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Silinemedi');
    } finally {
      setMesgul(false);
    }
  }

  return (
    <Shell header={header}>
      {hata && (
        <Alert tone="danger" className="mb-4">
          {hata}
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <LogForm
          key={duzenlenen?.id ?? 'yeni'}
          mevcut={duzenlenen}
          mesgul={mesgul}
          onKaydet={(d) => void kaydet(d)}
          onVazgec={() => setDuzenlenen(null)}
        />

        <div>
          {logs === null ? (
            <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
          ) : logs.length === 0 ? (
            <EmptyState
              message="Henüz kayıt yok."
              hint="Soldaki formla ilk gecenizi ekleyin — hedef ve not girmeden, yalnızca tarihle de kaydedilebilir."
            />
          ) : (
            <ul className="space-y-2">
              {logs.map((log) => (
                <LogRow
                  key={log.id}
                  log={log}
                  mesgul={mesgul}
                  onDuzenle={() => setDuzenlenen(log)}
                  onSil={() => void sil(log)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Shell>
  );
}

function Shell({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Kendi günlüğü — indekslenecek bir şey yok (bkz. dosya başlığı). */}
      <PageMeta
        title="Gözlem Günlüğü"
        description="Gözlem gecelerini kaydet ve arşivle."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        {header}
        {children}
      </Container>
    </>
  );
}

/* ── Form ────────────────────────────────────────────────────────────── */

function LogForm({
  mevcut,
  mesgul,
  onKaydet,
  onVazgec,
}: {
  mevcut: ObservationLog | null;
  mesgul: boolean;
  onKaydet: (draft: ObservationDraft) => void;
  onVazgec: () => void;
}) {
  /* Bugünün yerel tarihi — `toISOString()` UTC'ye çevirip akşam saatlerinde
     bir gün ileri atıyordu. Gözlem günlüğü için bu tam da yanlış olacak
     yer: kayıtlar akşam giriliyor. */
  const bugun = yerelGun(new Date());

  const [draft, setDraft] = useState<ObservationDraft>(() =>
    mevcut
      ? {
          observedOn: mevcut.observedOn,
          locationText: mevcut.locationText ?? '',
          target: mevcut.target ?? '',
          seeing: mevcut.seeing,
          transparency: mevcut.transparency,
          equipment: mevcut.equipment ?? '',
          note: mevcut.note ?? '',
          isPublic: mevcut.isPublic,
        }
      : { observedOn: bugun, isPublic: false }
  );

  const sorun = describeDraftProblem(draft);

  const yaz = (patch: Partial<ObservationDraft>) =>
    setDraft((d) => ({ ...d, ...patch }));

  return (
    <Panel title={mevcut ? 'Kaydı düzenle' : 'Yeni gözlem'}>
      <div className="grid gap-3">
        <Field label="Gece" htmlFor="g-tarih">
          <Input
            id="g-tarih"
            type="date"
            max={bugun}
            value={draft.observedOn}
            onChange={(e) => yaz({ observedOn: e.target.value })}
          />
        </Field>

        <Field
          label="Hedef"
          htmlFor="g-hedef"
          hint="Katalog kodu ya da serbest ad. Boş bırakılabilir."
        >
          <Input
            id="g-hedef"
            value={draft.target ?? ''}
            placeholder="M31, Ay, ISS geçişi…"
            onChange={(e) => yaz({ target: e.target.value })}
          />
        </Field>

        <Field label="Yer" htmlFor="g-yer" hint="Şehir ya da saha adı.">
          <Input
            id="g-yer"
            value={draft.locationText ?? ''}
            placeholder="Kayseri, Erciyes eteği"
            onChange={(e) => yaz({ locationText: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Seeing" htmlFor="g-seeing">
            <KosulSecici
              id="g-seeing"
              value={draft.seeing ?? null}
              onChange={(v) => yaz({ seeing: v })}
            />
          </Field>
          <Field label="Şeffaflık" htmlFor="g-seffaf">
            <KosulSecici
              id="g-seffaf"
              value={draft.transparency ?? null}
              onChange={(v) => yaz({ transparency: v })}
            />
          </Field>
        </div>

        <Field label="Ekipman" htmlFor="g-ekipman">
          <Input
            id="g-ekipman"
            value={draft.equipment ?? ''}
            placeholder="8&quot; Dobson + 25mm"
            onChange={(e) => yaz({ equipment: e.target.value })}
          />
        </Field>

        <Field label="Not" htmlFor="g-not">
          <textarea
            id="g-not"
            rows={4}
            maxLength={MAX_NOTE}
            value={draft.note ?? ''}
            placeholder="Ne gördün, koşullar nasıldı?"
            onChange={(e) => yaz({ note: e.target.value })}
            className="w-full resize-y rounded-card border border-border bg-surface-2 px-3 py-2 text-meta leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
          />
        </Field>

        {/*
          GİZLİLİK KUTUSU FORMUN SONUNDA VE VARSAYILAN KAPALI.
          Kullanıcı kaydı yazarken herkese açık olduğunu sanmamalı;
          §14.6 "özel veya public" diyor, varsayılanı söylemiyor ve
          yanlış varsayılan geri alınamaz (fark edildiğinde kayıt zaten
          görünmüş olur).
        */}
        <label className="flex items-start gap-2 rounded-card border border-border bg-surface-1 px-3 py-2.5 text-body-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.isPublic === true}
            onChange={(e) => yaz({ isPublic: e.target.checked })}
            className="mt-0.5 size-4 rounded border-border"
          />
          <span>
            Profilimde herkese açık göster
            <span className="mt-0.5 block text-meta text-muted-foreground">
              Kapalıyken kayıt yalnızca sana görünür.
            </span>
          </span>
        </label>

        {sorun && (
          <Alert tone="warning" variant="text">
            {sorun}
          </Alert>
        )}

        <div className="flex gap-2">
          <Button
            disabled={mesgul || sorun !== null}
            onClick={() => onKaydet(draft)}
          >
            {mesgul ? 'Kaydediliyor…' : mevcut ? 'Güncelle' : 'Kaydet'}
          </Button>
          {mevcut && (
            <Button variant="secondary" disabled={mesgul} onClick={onVazgec}>
              Vazgeç
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

/** 1–5 koşul seçici; boş seçenek "girilmemiş" demek. */
function KosulSecici({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <Select
      id={id}
      value={value === null ? '' : String(value)}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
    >
      <option value="">—</option>
      {[1, 2, 3, 4, 5].map((n) => (
        <option key={n} value={n}>
          {n} · {CONDITION_LABELS[n]}
        </option>
      ))}
    </Select>
  );
}

/* ── Liste satırı ────────────────────────────────────────────────────── */

function LogRow({
  log,
  mesgul,
  onDuzenle,
  onSil,
}: {
  log: ObservationLog;
  mesgul: boolean;
  onDuzenle: () => void;
  onSil: () => void;
}) {
  return (
    <li className="rounded-card border border-border bg-surface-1 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-meta text-muted-foreground">
          {log.observedOn}
        </span>
        <span className="text-body-sm font-medium text-foreground">
          {logTitle(log)}
        </span>
        {log.isPublic ? (
          <Badge tone="cold">herkese açık</Badge>
        ) : (
          <Badge tone="muted">özel</Badge>
        )}

        <div className="ml-auto flex gap-1">
          <Button size="sm" variant="ghost" disabled={mesgul} onClick={onDuzenle}>
            Düzenle
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={mesgul}
            aria-label={`${logTitle(log)} kaydını sil`}
            onClick={onSil}
          >
            Sil
          </Button>
        </div>
      </div>

      {(log.locationText || log.seeing || log.transparency || log.equipment) && (
        <p className="mt-1 text-meta text-muted-foreground">
          {[
            log.locationText,
            log.seeing ? `seeing ${log.seeing}/5` : null,
            log.transparency ? `şeffaflık ${log.transparency}/5` : null,
            log.equipment,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {log.note && (
        <p className="mt-1.5 whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
          {log.note}
        </p>
      )}
    </li>
  );
}

/**
 * Yerel takvim günü (`YYYY-MM-DD`).
 *
 * `toISOString().slice(0,10)` KULLANILMIYOR: o UTC'ye çevirir ve
 * Türkiye'de akşam 21:00'den sonra ertesi günü verir. Gözlem günlüğü tam
 * olarak o saatlerde doldurulan bir şey — yani en çok kullanılacağı anda
 * yanlış tarihi önerirdi.
 */
function yerelGun(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
