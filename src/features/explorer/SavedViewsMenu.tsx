import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import {
  describeViewProblem,
  normalizeQuery,
  useSavedViews,
  viewSearch,
} from './savedViews';
import { cn } from '@/lib/cn';

/**
 * KAYDEDİLMİŞ GÖRÜNÜMLER — liste sayfalarının ortak kontrolü (Faz 4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * VARSAYILAN GÖRÜNÜM AÇIK BİR BAĞLANTIYI EZMİYOR
 *
 * "Kullanıcı varsayılan görünümü" maddesinin en kolay yanlış uygulaması
 * şu olurdu: sayfa açılır açılmaz varsayılanı uygula. Sonuç, birinin
 * paylaştığı `?ara=m31` bağlantısını açan kullanıcının kendi
 * varsayılanına ışınlanması olurdu — bağlantı çalışmaz, sebebi de
 * görünmezdi.
 *
 * Kural: varsayılan YALNIZCA adres çubuğu boşken uygulanıyor. Açık bir
 * sorgu her zaman kazanır. `?sehir=` ile aynı hiyerarşi: ADRES → KİŞİSEL
 * TERCİH → VARSAYILAN.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BİR KEZ — `useRef` KİLİDİ
 *
 * Görünüm listesi asenkron geliyor ve effect birden çok kez çalışıyor.
 * Kilit olmasaydı, varsayılanı uyguladıktan sonra filtreyi temizleyen
 * kullanıcı adres boşaldığı anda varsayılana GERİ ATILIRDI — kendi
 * eylemini geri alan bir sayfa.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OTURUM YOKSA KONTROL YOK
 *
 * `ready` false ise (oturum yok ya da liste okunmadı) bileşen `null`
 * dönüyor. Kişisel facet'lerle aynı kural: çalışmayan bir kontrol,
 * olmayan kontrolden kötü.
 */
export function SavedViewsMenu({ module }: { module: string }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { views, ready, busy, error, save, remove, makeDefault } =
    useSavedViews(module);

  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState('');
  const varsayilanUygulandi = useRef(false);

  useEffect(() => {
    if (varsayilanUygulandi.current || !ready) return;

    /* Adres çubuğunda bir sorgu varsa varsayılan HİÇ devreye girmiyor
       (başlıktaki gerekçe). Kilidi yine de kapatıyoruz: kullanıcı
       sonradan filtreyi temizlediğinde geri atılmasın. */
    varsayilanUygulandi.current = true;
    if (normalizeQuery(search) !== '') return;

    const varsayilan = views.find((v) => v.isDefault);
    if (varsayilan && varsayilan.query) {
      navigate(`${pathname}${viewSearch(varsayilan)}`, { replace: true });
    }
  }, [ready, views, search, pathname, navigate]);

  if (!ready) return null;

  const mevcut = normalizeQuery(search);
  const sorun = describeViewProblem(ad, mevcut, views);
  /* Aynı sorguyu ikinci kez kaydetmek anlamsız: kullanıcı zaten o
     görünümün içinde. */
  const zatenKayitli = views.some((v) => v.isMine && v.query === mevcut);

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={acik}
        onClick={() => setAcik((a) => !a)}
      >
        Görünümler{views.length > 0 ? ` (${views.length})` : ''}
      </Button>

      {acik && (
        /* GÖLGE YOK — yüzey ayrımı ÇİZGİYLE. Tasarım sistemi
           yükselti gölgesini yasaklıyor (`designSystem.test.ts`) ve
           gerekçe koyu temada somut: gölge, koyu zeminde ayrım
           üretmiyor, yalnızca bulanık bir leke bırakıyor. Katman
           farkını `border-border-strong` ve daha açık yüzey veriyor. */
        <div className="absolute right-0 z-30 mt-1 w-72 rounded-lg border border-border-strong bg-surface-2 p-3">
          {error && <Alert className="mb-2">{error}</Alert>}

          {views.length === 0 ? (
            <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
              Kayıtlı görünümünüz yok. Filtreleri kurduktan sonra buradan
              adlandırıp saklayabilirsiniz.
            </p>
          ) : (
            <ul className="mb-3 space-y-1.5">
              {views.map((v) => (
                <li key={v.id} className="border-b border-border/60 pb-1.5 last:border-0">
                  <div className="flex items-center gap-1.5">
                    <button
                      className="min-w-0 flex-1 truncate text-left text-body-sm text-foreground hover:text-primary"
                      onClick={() => {
                        navigate(`${pathname}${viewSearch(v)}`);
                        setAcik(false);
                      }}
                    >
                      {v.name}
                    </button>
                    {v.isDefault && <Badge tone="primary">Varsayılan</Badge>}
                    {v.isShared && <Badge tone="cold">Paylaşılan</Badge>}
                  </div>

                  {/* Paylaşılan görünüm BAŞKASININ; kullanıcı onu
                      silemez ve varsayılan yapabilir ama sahibi
                      değildir. Düğmeler sahipliğe göre çiziliyor. */}
                  {v.isMine && (
                    <div className="mt-1 flex gap-1">
                      {!v.isDefault && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void makeDefault(v.id)}
                        >
                          Varsayılan yap
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => void remove(v.id)}
                      >
                        Sil
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border pt-2">
            <label htmlFor={`view-name-${module}`} className="label mb-1 block">
              Bu görünümü kaydet
            </label>
            <div className="flex gap-1.5">
              <Input
                id={`view-name-${module}`}
                value={ad}
                placeholder="Görünüm adı"
                onChange={(e) => setAd(e.target.value)}
              />
              <Button
                size="sm"
                disabled={busy || Boolean(sorun) || zatenKayitli}
                onClick={() =>
                  void save(ad, search).then(() => {
                    setAd('');
                    setAcik(false);
                  })
                }
              >
                Kaydet
              </Button>
            </div>

            <p
              className={cn(
                'mt-1.5 text-meta leading-relaxed',
                sorun ? 'text-warning' : 'text-faint'
              )}
            >
              {sorun ??
                (zatenKayitli
                  ? 'Bu filtre bileşimi zaten kayıtlı.'
                  : mevcut === ''
                    ? 'Şu an hiç filtre yok; boş bir görünüm kaydedilir.'
                    : `Kaydedilecek: ?${mevcut}`)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
