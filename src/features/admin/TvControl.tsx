import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { getSupabase } from '@/services/supabase/client';

/**
 * TV KONTROL MERKEZİ (§11.3).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * SIR EKRANA HİÇ GELMİYOR — MASKELENMİYOR DA
 *
 * §11.3 "secret değerlerini göstermeden bağlantı durumu" istiyor. Bu
 * ekran jetonu okumuyor bile: `youtube_connection_status()` fonksiyonu
 * jeton alanlarına dokunmadan "bağlı mı, hangi kanala, süresi geçmiş
 * mi" cevabını veriyor.
 *
 * Jetonu maskeleyip göstermek (`ya29.••••4f2a`) yaygın bir çözüm ve
 * yanlış: maskelenmiş değer yine sunucudan tarayıcıya gönderilmiş
 * demektir ve maskeyi kaldıran şey bir `curl` çağrısıdır.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * KANAL BAĞLI DEĞİLKEN SAHTE İÇERİK YOK (§11.2 son madde)
 *
 * Bağlantı yokken bu ekran boş bir video listesi ve "bağlantı bekleniyor"
 * diyor — örnek video, yer tutucu satır ya da "yakında" ibaresi
 * yazmıyor. Radyodaki "sahte canlı" yasağının TV karşılığı.
 *
 * Aynı sebeple SENKRONİZASYON DÜĞMESİ bağlantı yokken hiç görünmüyor:
 * basılınca "bağlı değil" diyecek bir düğme, çalışmayan bir kontroldür.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

interface ConnectionStatus {
  connected: boolean;
  channelId: string | null;
  channelTitle: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  tokenValid: boolean;
}

interface QuotaRow {
  quotaDate: string;
  unitsUsed: number;
  calls: number;
}

interface VideoRow {
  id: string;
  youtubeId: string;
  title: string;
  source: string;
  published: boolean;
  featured: boolean;
  publishedAt: string | null;
}

export function TvControl({ canWrite }: { canWrite: boolean }) {
  return (
    <div className="space-y-4">
      <ConnectionSection canWrite={canWrite} />
      <VideoSection canWrite={canWrite} />
    </div>
  );
}

function ConnectionSection({ canWrite }: { canWrite: boolean }) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [quota, setQuota] = useState<QuotaRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const supabase = await client();
      /* Okuma hatası "bağlı değil" diye sunulmaz — gerekçe
         `RadioControl` içindeki aynı düzeltmede yazılı. */
      const { data, error: statusError } = await supabase.rpc(
        'youtube_connection_status'
      );
      if (statusError) throw new Error(statusError.message);
      const row = (data as Record<string, unknown>[] | null)?.[0];

      setStatus(
        row
          ? {
              connected: row.connected === true,
              channelId: (row.channel_id as string | null) ?? null,
              channelTitle: (row.channel_title as string | null) ?? null,
              connectedAt: (row.connected_at as string | null) ?? null,
              lastSyncAt: (row.last_sync_at as string | null) ?? null,
              lastError: (row.last_error as string | null) ?? null,
              tokenValid: row.token_valid === true,
            }
          : null
      );

      const bugun = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Los_Angeles',
      });
      const { data: k, error: quotaError } = await supabase
        .from('youtube_quota_log')
        .select('quota_date, units_used, calls')
        .eq('quota_date', bugun)
        .maybeSingle();
      if (quotaError) throw new Error(quotaError.message);

      setQuota(
        k
          ? {
              quotaDate: (k as Record<string, unknown>).quota_date as string,
              unitsUsed: (k as Record<string, unknown>).units_used as number,
              calls: (k as Record<string, unknown>).calls as number,
            }
          : null
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Okunamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Panel title="YouTube bağlantısı" bodyClassName="p-4">
        <p className="text-body-sm text-muted-foreground">Okunuyor…</p>
      </Panel>
    );
  }

  const bagli = status?.connected === true;

  return (
    <Panel
      title="YouTube bağlantısı"
      status={bagli ? 'bağlı' : 'bağlı değil'}
      bodyClassName="p-4"
    >
      {error && (
        <Alert variant="text" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {bagli ? (
          <>
            <span className="text-body text-foreground">
              {status?.channelTitle ?? status?.channelId}
            </span>
            <Badge tone="success">Bağlı</Badge>
            {/* Jetonun KENDİSİ değil, geçerli olup olmadığı. */}
            {!status?.tokenValid && (
              <Badge tone="warning">Jeton yenilenecek</Badge>
            )}
          </>
        ) : (
          <Badge>Kanal bağlantısı bekleniyor</Badge>
        )}
      </div>

      {!bagli && (
        <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
          YouTube kanalı henüz bağlanmadı. Bağlantı kurulana kadar TV
          sayfasında video arşivi görünmüyor — örnek içerik gösterilmiyor,
          çünkü olmayan bir arşivi doluymuş gibi göstermek yanlış bilgi
          olurdu.
        </p>
      )}

      {status?.lastError && (
        <p className="mb-3 break-words text-meta text-danger">
          {status.lastError}
        </p>
      )}

      <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Bilgi
          baslik="Son eşitleme"
          deger={
            status?.lastSyncAt
              ? new Date(status.lastSyncAt).toLocaleString('tr-TR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : 'hiç'
          }
        />
        {/* Kota günü PASİFİK saatinde — YouTube orada sıfırlıyor. */}
        <Bilgi
          baslik="Bugünkü kota"
          deger={quota ? `${quota.unitsUsed} / 10.000` : '0 / 10.000'}
        />
        <Bilgi baslik="Çağrı" deger={quota?.calls ?? 0} />
      </dl>

      {canWrite && (
        <p className="text-meta leading-snug text-faint">
          Kanal bağlama ve ayırma sunucu tarafı fonksiyondan yapılıyor
          (<code className="rounded bg-surface-2 px-1">youtube</code> edge
          fonksiyonu). Gizli anahtar ve yenileme jetonu bu ekrana hiç
          gelmiyor; maskelenmiş bir değer bile gönderilmiyor.
        </p>
      )}
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
 * VİDEO ARŞİVİ.
 *
 * `source` rozeti gösteriliyor çünkü ikisi farklı davranıyor:
 * senkronizasyon `youtube` satırlarını güncelliyor, `manual` satırlara
 * dokunmuyor. Bu ayrım editöre görünür olmalı — yoksa elle düzelttiği
 * bir başlığın neden korunduğunu (ya da korunmadığını) bilemez.
 */
function VideoSection({ canWrite }: { canWrite: boolean }) {
  const [rows, setRows] = useState<VideoRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const supabase = await client();
      const { data, error: readError } = await supabase
        .from('tv_videos')
        .select('id, youtube_id, title, source, published, featured, published_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (readError) throw new Error(readError.message);

      setRows(
        ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          id: r.id as string,
          youtubeId: r.youtube_id as string,
          title: r.title as string,
          source: r.source as string,
          published: r.published === true,
          featured: r.featured === true,
          publishedAt: (r.published_at as string | null) ?? null,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Videolar okunamadı');
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePublished = useCallback(
    async (row: VideoRow) => {
      setBusy(row.id);
      try {
        const supabase = await client();
        const { data, error: writeError } = await supabase
          .from('tv_videos')
          .update({ published: !row.published })
          .eq('id', row.id)
          .select('id');
        if (writeError) throw new Error(writeError.message);
        if (!data?.length)
          throw new Error('Video güncellenemedi: kayıt bulunamadı ya da yetkiniz yok.');
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Değiştirilemedi');
      } finally {
        setBusy(null);
      }
    },
    [load]
  );

  return (
    <Panel
      title="Video arşivi"
      status={rows ? `${rows.length} video` : 'okunuyor…'}
      bodyClassName="p-4"
    >
      {error && (
        <Alert variant="text" className="mb-3">
          {error}
        </Alert>
      )}

      {rows === null && (
        <p className="text-body-sm text-muted-foreground">Okunuyor…</p>
      )}

      {rows !== null && rows.length === 0 && (
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          Arşivde video yok. Kanal bağlandığında senkronizasyon buraya
          yazacak; o zamana kadar liste boş kalıyor.
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
                  <Badge tone={row.source === 'youtube' ? 'cold' : 'muted'}>
                    {row.source === 'youtube' ? 'senkron' : 'elle'}
                  </Badge>
                </div>
                <p className="tabular text-meta text-faint">
                  {row.youtubeId}
                  {row.publishedAt &&
                    ` · ${new Date(row.publishedAt).toLocaleDateString('tr-TR')}`}
                </p>
              </div>

              {canWrite && (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busy === row.id}
                  onClick={() => void togglePublished(row)}
                >
                  {row.published ? 'Yayından kaldır' : 'Yayımla'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-meta leading-snug text-faint">
        Senkronizasyon yalnızca <strong>senkron</strong> kaynaklı satırları
        günceller. Elle eklenmiş bir kaydın başlığını düzeltirseniz
        senkronizasyon onu geri getirmez.
      </p>
    </Panel>
  );
}
