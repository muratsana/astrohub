import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { getSupabase } from '@/services/supabase/client';
import { weekdayName } from '@/features/radio/schedule';

/**
 * RADYO KONTROL MERKEZİ (§10.5).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * BURASI AZURACAST'İN YERİNE GEÇMİYOR
 *
 * §10.5 "normal işletme için AzuraCast paneline gitmek zorunlu olmamalı"
 * diyor — "AzuraCast paneli hiç kullanılmasın" demiyor. Aradaki fark
 * bu bileşenin sınırını çiziyor:
 *
 *   Burada  → AstroHub'a ait olan: program takvimi, yayıncı künyesi,
 *             podcast, canlı yayın duyurusu, bağlantı durumu.
 *   Orada   → Yayın sunucusuna ait olan: playlist rotasyonu, mount
 *             ayarları, bitrate, ses dosyası yükleme.
 *
 * İkinciyi buraya kopyalamak, aynı ayarın iki yerde durması demekti ve
 * ikisi ayrıştığında hangisinin geçerli olduğu belirsiz kalırdı. Yayın
 * sunucusunun ayarı yayın sunucusunda durur.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SIR GÖSTERİLMİYOR, BAĞLANTI DURUMU GÖSTERİLİYOR
 *
 * §10.5 "secret değerlerini göstermeden bağlantı durumu" istiyor. Bu
 * ekran API anahtarını okumuyor bile: adaptöre soruyor, adaptör
 * "bağlandım / bağlanamadım" diyor. Anahtarı ekranda maskelemek
 * (`sk-••••1234`) yaygın bir çözüm ve yanlış: maskelenmiş değer yine
 * sunucudan tarayıcıya gönderilmiş demektir.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

interface StationRow {
  id: string;
  slug: string;
  name: string;
  streamUrl: string | null;
  enabled: boolean;
  isDefault: boolean;
  offlineNote: string | null;
}

interface HealthRow {
  checkedAt: string;
  isLive: boolean;
  listeners: number | null;
  nowPlaying: string | null;
  latencyMs: number | null;
  error: string | null;
}

interface ProgramRow {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  featured: boolean;
  slots: { weekday: number | null; localTime: string | null; airsAt: string | null }[];
}

export function RadioControl({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="space-y-4">
      <StationSection canWrite={canWrite} />
      <ProgramSection canWrite={canWrite} />
    </div>
  );
}

/**
 * İSTASYON VE BAĞLANTI DURUMU.
 *
 * Sağlık kaydı yoksa "kurulmamış" yazıyor, "çevrimdışı" değil. İkisi
 * farklı: çevrimdışı, kurulu bir yayının düştüğü anlamına gelir ve
 * yöneticiyi olmayan bir arızayı aramaya gönderirdi.
 */
function StationSection({ canWrite }: { canWrite: boolean }) {
  const [station, setStation] = useState<StationRow | null>(null);
  const [health, setHealth] = useState<HealthRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const supabase = await client();
      /*
       * OKUMA HATASI "KURULMAMIŞ" DİYE SUNULMAZ.
       *
       * `error` okunmadığında başarısız bir sorgu `data`yı `undefined`
       * bırakıyor ve aşağıdaki dal ekrana "Henüz istasyon tanımlı değil,
       * AzuraCast kurun" yazıyordu. Yönetici için bu iki durum
       * ayırt edilemez hâle geliyordu: gerçekten kurulmamış bir yayın
       * ile okunamayan bir kayıt aynı ekranı veriyordu.
       */
      const { data, error: readError } = await supabase
        .from('radio_stations')
        .select('id, slug, name, stream_url, enabled, is_default, offline_note')
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (readError) throw new Error(readError.message);

      if (!data) {
        setStation(null);
        setHealth(null);
        return;
      }

      const row = data as Record<string, unknown>;
      setStation({
        id: row.id as string,
        slug: row.slug as string,
        name: row.name as string,
        streamUrl: (row.stream_url as string | null) ?? null,
        enabled: row.enabled === true,
        isDefault: row.is_default === true,
        offlineNote: (row.offline_note as string | null) ?? null,
      });

      const { data: h, error: healthError } = await supabase
        .from('radio_stream_health')
        .select('checked_at, is_live, listeners, now_playing, latency_ms, error')
        .eq('station_id', row.id as string)
        .order('checked_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (healthError) throw new Error(healthError.message);

      if (h) {
        const hr = h as Record<string, unknown>;
        setHealth({
          checkedAt: hr.checked_at as string,
          isLive: hr.is_live === true,
          listeners: (hr.listeners as number | null) ?? null,
          nowPlaying: (hr.now_playing as string | null) ?? null,
          latencyMs: (hr.latency_ms as number | null) ?? null,
          error: (hr.error as string | null) ?? null,
        });
      } else {
        setHealth(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okunamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleEnabled = useCallback(async () => {
    if (!station) return;
    setBusy(true);
    try {
      const supabase = await client();
      /*
       * DÖNEN SATIR SAYILIYOR. PostgREST 0 satır etkilendiğinde hata
       * döndürmüyor; `.select()` olmadan RLS reddettiğinde bu düğme
       * "değişti" gibi davranıp hiçbir şey yazmıyordu.
       */
      const { data, error: writeError } = await supabase
        .from('radio_stations')
        .update({ enabled: !station.enabled })
        .eq('id', station.id)
        .select('id');
      if (writeError) throw new Error(writeError.message);
      if (!data?.length)
        throw new Error('İstasyon güncellenemedi: kayıt bulunamadı ya da yetkiniz yok.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Değiştirilemedi');
    } finally {
      setBusy(false);
    }
  }, [station, load]);

  /*
   * İSTASYON OLUŞTURMA/DÜZENLEME.
   *
   * ── Neden sonradan eklendi ──────────────────────────────────────────
   *
   * Kod tabanında `radio_stations` tablosuna yazan TEK yer aç/kapat
   * düğmesiydi; `insert` hiçbir yerde yoktu, tohum da yoktu. Yani satır
   * yalnızca Supabase Studio'dan elle girilebiliyordu ve silindiğinde
   * panelden geri konulamıyordu — "kurulmamış" ekranı çıkmaz bir sokaktı.
   *
   * ── AzuraCast kurulmadan da kaydedilebiliyor ────────────────────────
   *
   * Eski metin "yayın sunucusu kurulmadan bu satır bir işe yaramaz"
   * diyordu ve bu yarı doğru: yayın akışı olmadan `stream_url` boş
   * kalır, ama istasyon adı, açıklaması ve çevrimdışı notu SİTEDE
   * görünüyor. Kayıt önce açılıp adres sonra doldurulabilsin diye
   * `stream_url` isteğe bağlı.
   */
  const [form, setForm] = useState<{
    slug: string;
    name: string;
    streamUrl: string;
    offlineNote: string;
  } | null>(null);

  const formAc = useCallback(() => {
    setForm({
      slug: station?.slug ?? 'astrohub-radyo',
      name: station?.name ?? 'Astrohub Radyo',
      streamUrl: station?.streamUrl ?? '',
      offlineNote: station?.offlineNote ?? '',
    });
    setError(null);
  }, [station]);

  const formKaydet = useCallback(async () => {
    if (!form) return;
    const slug = form.slug.trim();
    const name = form.name.trim();
    const streamUrl = form.streamUrl.trim();

    /* Kısıtların aynısı veritabanında da var (`0051:46,58`); buradaki
       kapı yöneticiye ham kısıt adı yerine ne yapması gerektiğini
       söylüyor. */
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
      setError('Adres eki yalnızca küçük harf, rakam ve tire içerebilir (3-60 karakter).');
      return;
    }
    if (name.length < 2) {
      setError('İstasyon adı gerekli.');
      return;
    }
    if (streamUrl && !streamUrl.startsWith('https://')) {
      setError('Yayın adresi https:// ile başlamalı — http adres tarayıcıda sessizce engellenir.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = await client();
      const satir = {
        slug,
        name,
        stream_url: streamUrl || null,
        offline_note: form.offlineNote.trim() || null,
      };

      const { data, error: writeError } = station
        ? await supabase
            .from('radio_stations')
            .update(satir)
            .eq('id', station.id)
            .select('id')
        : await supabase
            .from('radio_stations')
            .insert({ ...satir, enabled: false, is_default: true })
            .select('id');

      if (writeError) throw new Error(writeError.message);
      if (!data?.length)
        throw new Error('İstasyon kaydedilemedi: yetkiniz olmayabilir.');

      setForm(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İstasyon kaydedilemedi');
    } finally {
      setBusy(false);
    }
  }, [form, station, load]);

  function formAlanlari() {
    if (!form) return null;
    return (
      <div className="mt-3 space-y-3 rounded-card border border-border p-3">
        <Field label="İstasyon adı" htmlFor="radyo-ad">
          <Input
            id="radyo-ad"
            value={form.name}
            disabled={busy}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <Field
          label="Adres eki"
          htmlFor="radyo-slug"
          hint={station ? 'Değiştirmek eski bağlantıları kırar.' : undefined}
        >
          <Input
            id="radyo-slug"
            value={form.slug}
            disabled={busy}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </Field>
        <Field
          label="Yayın adresi"
          htmlFor="radyo-akis"
          hint="https:// ile başlamalı. Yayın sunucusu henüz kurulmadıysa boş bırakın."
        >
          <Input
            id="radyo-akis"
            value={form.streamUrl}
            disabled={busy}
            placeholder="https://yayin.astrohub.com.tr/radio.mp3"
            onChange={(e) => setForm({ ...form, streamUrl: e.target.value })}
          />
        </Field>
        <Field
          label="Çevrimdışı notu"
          htmlFor="radyo-not"
          hint="Yayın kapalıyken dinleyiciye gösterilir."
        >
          <Input
            id="radyo-not"
            value={form.offlineNote}
            disabled={busy}
            onChange={(e) => setForm({ ...form, offlineNote: e.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void formKaydet()}>
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setForm(null)}
          >
            Vazgeç
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <Panel title="İstasyon" bodyClassName="p-4">
        <p className="text-body-sm text-muted-foreground">Okunuyor…</p>
      </Panel>
    );
  }

  /*
   * İSTASYON SATIRI YOKSA KURULUM ADIMI GÖSTERİLİYOR.
   *
   * Eskiden bu ekran çıkmaz bir sokaktı: kodda `insert` yolu hiç yoktu,
   * dolayısıyla satır ancak Supabase Studio'dan elle girilebiliyordu ve
   * silindiğinde panelden geri konulamıyordu. Artık "İstasyon tanımla"
   * düğmesi var; AzuraCast kurulumu hâlâ ayrı bir iş ve metin bunu
   * söylemeye devam ediyor.
   */
  if (!station) {
    return (
      <Panel title="İstasyon" status="kurulmamış" bodyClassName="p-4">
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          Henüz istasyon tanımlı değil. Yayın sunucusu (AzuraCast) kurulmadan
          istasyon satırı bir işe yaramaz — kurulum adımları depodaki{' '}
          <code className="rounded bg-surface-2 px-1">deploy/radyo/README.md</code>{' '}
          dosyasında.
        </p>
        <p className="mt-2 text-meta leading-snug text-faint">
          Kurulum tamamlanana kadar site radyoyu çevrimdışı gösteriyor ve
          bu doğru davranış.
        </p>

        {error && (
          <Alert variant="text" className="mt-3">
            {error}
          </Alert>
        )}

        {form ? (
          formAlanlari()
        ) : (
          <Button
            type="button"
            size="sm"
            className="mt-3"
            disabled={busy}
            onClick={formAc}
          >
            İstasyon tanımla
          </Button>
        )}
      </Panel>
    );
  }

  const yoklamaYasi = health
    ? Math.round((Date.now() - new Date(health.checkedAt).getTime()) / 60_000)
    : null;
  /* Üç dakika kuralı `app.station_is_live` ile aynı — iki yerde ayrı
     eşik olsaydı panel "canlı" derken site "çevrimdışı" derdi. */
  const canli = health?.isLive === true && (yoklamaYasi ?? 99) < 3;

  return (
    <Panel
      title="İstasyon"
      status={station.enabled ? 'açık' : 'kapalı'}
      bodyClassName="p-4"
    >
      {error && (
        <Alert variant="text" className="mb-3">
          {error}
        </Alert>
      )}

      {form && formAlanlari()}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-body text-foreground">{station.name}</span>
        {!form && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={formAc}
          >
            Düzenle
          </Button>
        )}
        {canli ? (
          <Badge tone="success">Canlı</Badge>
        ) : health ? (
          <Badge tone="warning">Çevrimdışı</Badge>
        ) : (
          <Badge>Yoklama yok</Badge>
        )}
        {station.isDefault && <Badge tone="primary">Varsayılan</Badge>}
      </div>

      <dl className="mb-3 grid gap-2 sm:grid-cols-3">
        <Bilgi baslik="Dinleyici" deger={health?.listeners ?? '—'} />
        <Bilgi baslik="Yanıt" deger={health?.latencyMs ? `${health.latencyMs} ms` : '—'} />
        <Bilgi
          baslik="Son yoklama"
          deger={yoklamaYasi === null ? 'hiç' : `${yoklamaYasi} dk önce`}
        />
      </dl>

      {health?.nowPlaying && (
        <p className="mb-2 text-body-sm text-foreground">
          <span className="text-muted-foreground">Çalan:</span> {health.nowPlaying}
        </p>
      )}

      {health?.error && (
        <p className="mb-3 break-words text-meta text-danger">{health.error}</p>
      )}

      {!health && (
        <p className="mb-3 text-meta leading-snug text-faint">
          Sağlık yoklaması hiç çalışmamış. Yoklama olmadan site istasyonu
          çevrimdışı gösterir — kurulum listesinin 11. adımı.
        </p>
      )}

      {canWrite && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => void toggleEnabled()}
        >
          {station.enabled ? 'İstasyonu kapat' : 'İstasyonu aç'}
        </Button>
      )}

      <p className="mt-2 text-meta leading-snug text-faint">
        Playlist rotasyonu, mount ve bitrate ayarları AzuraCast panelinde —
        aynı ayarın iki yerde durması, ikisi ayrıştığında hangisinin
        geçerli olduğunu belirsiz bırakırdı.
      </p>
    </Panel>
  );
}

function Bilgi({ baslik, deger }: { baslik: string; deger: string | number }) {
  return (
    <div className="rounded-card border border-border bg-surface-2 px-3 py-2">
      <dt className="text-meta text-muted-foreground">{baslik}</dt>
      <dd className="tabular text-body font-medium text-foreground">{deger}</dd>
    </div>
  );
}

/**
 * PROGRAMLAR VE CANLI YAYIN DUYURUSU.
 *
 * Duyuru düğmesi yalnızca YAYIMLANMIŞ programda görünüyor: taslak bir
 * programın canlı bildirimi, tıklanınca 404 veren bir bildirim olurdu.
 * Sunucu da reddediyor (`app.announce_program_live`), ama basılınca
 * hata veren bir düğme bırakmak arayüzün işi değil.
 */
function ProgramSection({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<ProgramRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = await client();
      /* TAKİPÇİ SAYISI OKUNMUYOR ve gösterilmiyor. `program_follows`
         politikası yalnızca kendi satırını veriyor (0051), yani buradan
         okunacak sayı yöneticinin KENDİ takiplerini gösterirdi —
         "3 takipçi" yazan ama gerçekte 300 takipçisi olan bir satır,
         hiç sayı göstermemekten kötü. Gerçek sayı gerekirse `is_admin`
         kapılı bir RPC ile gelir; o zamana kadar yok. */
      const [programRes, slotRes] = await Promise.all([
        supabase
          .from('radio_programs')
          .select('id, slug, title, published, featured')
          .order('title'),
        supabase.from('program_slots').select('program_id, weekday, local_time, airs_at'),
      ]);

      const slotsBy = new Map<string, ProgramRow['slots']>();
      for (const r of (slotRes.data ?? []) as Record<string, unknown>[]) {
        const key = r.program_id as string;
        const list = slotsBy.get(key) ?? [];
        list.push({
          weekday: (r.weekday as number | null) ?? null,
          localTime: (r.local_time as string | null) ?? null,
          airsAt: (r.airs_at as string | null) ?? null,
        });
        slotsBy.set(key, list);
      }

      setRows(
        ((programRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          slug: r.slug as string,
          title: r.title as string,
          published: r.published === true,
          featured: r.featured === true,
          slots: slotsBy.get(r.id as string) ?? [],
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Programlar okunamadı');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const announce = useCallback(
    async (id: string) => {
      setBusy(id);
      setNotice(null);
      setError(null);
      try {
        const supabase = await client();
        const { data, error: rpcError } = await supabase.rpc(
          'announce_program_live',
          { target_program: id }
        );
        if (rpcError) throw new Error(rpcError.message);
        setNotice(`${Number(data ?? 0)} takipçiye bildirim gönderildi.`);
        setConfirming(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Duyuru gönderilemedi');
      } finally {
        setBusy(null);
      }
    },
    []
  );

  return (
    <Panel
      title="Programlar"
      status={rows ? `${rows.length} program` : 'okunuyor…'}
      bodyClassName="p-4"
    >
      {error && (
        <Alert variant="text" className="mb-3">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="text" className="mb-3">
          {notice}
        </Alert>
      )}

      {rows === null && (
        <p className="text-body-sm text-muted-foreground">Okunuyor…</p>
      )}

      {rows !== null && rows.length === 0 && (
        <p className="text-body-sm text-muted-foreground">
          Henüz program tanımlı değil.
        </p>
      )}

      {rows !== null && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-card border border-border bg-surface-2 p-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-body-sm text-foreground">{row.title}</span>
                  {!row.published && <Badge tone="warning">Taslak</Badge>}
                  {row.featured && <Badge tone="primary">Öne çıkan</Badge>}
                </div>
                <p className="text-meta text-faint">
                  {row.slots.length === 0
                    ? 'Yayın saati yok'
                    : row.slots
                        .map((s) =>
                          s.weekday
                            ? `${weekdayName(s.weekday)} ${s.localTime?.slice(0, 5) ?? ''}`
                            : s.airsAt
                              ? new Date(s.airsAt).toLocaleString('tr-TR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })
                              : ''
                        )
                        .filter(Boolean)
                        .join(' · ')}
                </p>
              </div>

              {canWrite && row.published && (
                confirming === row.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-meta text-warning">
                      Takipçilere bildirim gidecek.
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={busy === row.id}
                      onClick={() => void announce(row.id)}
                    >
                      {busy === row.id ? 'Gönderiliyor…' : 'Gönder'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirming(null)}
                    >
                      Vazgeç
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfirming(row.id)}
                  >
                    Canlı duyurusu
                  </Button>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-meta leading-snug text-faint">
        Canlı duyurusu yalnızca yayımlanmış programda gönderilebilir ve her
        gönderim denetim kaydına işlenir. Bildirim, takip eden ve bildirim
        isteyen kullanıcılara gider.
      </p>
    </Panel>
  );
}
