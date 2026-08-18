import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  fetchUnsolvedPhotos,
  requestBulkSolve,
  type CozulmemisFotograf,
  type TopluSonuc,
} from './plateSolveAdmin';

/**
 * ALAN ÇÖZÜMÜ KUYRUĞU — yönetim tarafı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BU EKRAN VAR
 *
 * Plate solve boru hattının tamamı kuruluydu ve sağlıklıydı: gönderim
 * fonksiyonu dağıtık, yoklayıcı beş dakikada bir koşuyor (canlıda 5.000
 * başarılı koşu), vault sırları tanımlı. Ama tek bir fotoğraf bile
 * çözülmemişti çünkü `ASTROMETRY_API_KEY` tanımlı değil — ve bunu
 * hiçbir ekran SÖYLEMİYORDU. Yükleme akışı hatayı bilerek yutuyor
 * (çözüm bir ek, yüklemeyi düşürmemeli), dolayısıyla sessizlik ta
 * buraya kadar geliyordu.
 *
 * Bu panel sessizliği bozuyor: kaç fotoğrafın çözülmediğini söylüyor ve
 * denemenin sonucunu — anahtar yoksa onu da — ekrana yazıyor.
 */
export function PlateSolveControl() {
  const [liste, setListe] = useState<CozulmemisFotograf[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(false);
  const [ilerleme, setIlerleme] = useState<{ n: number; toplam: number } | null>(
    null
  );
  const [sonuc, setSonuc] = useState<TopluSonuc | null>(null);

  const yukle = useCallback(() => {
    setHata(null);
    fetchUnsolvedPhotos()
      .then(setListe)
      .catch((e: unknown) => {
        setListe([]);
        setHata(e instanceof Error ? e.message : 'Liste okunamadı.');
      });
  }, []);

  useEffect(yukle, [yukle]);

  async function topluGonder() {
    if (!liste || liste.length === 0) return;
    setCalisiyor(true);
    setHata(null);
    setSonuc(null);
    try {
      const r = await requestBulkSolve(
        liste.map((f) => f.id),
        (n, toplam) => setIlerleme({ n, toplam })
      );
      setSonuc(r);
      yukle();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Gönderilemedi.');
    } finally {
      setCalisiyor(false);
      setIlerleme(null);
    }
  }

  const sayi = liste?.length ?? 0;

  return (
    <Panel
      title="Alan çözümü (plate solve)"
      status={liste ? `${sayi} çözülmemiş` : 'okunuyor…'}
      className="mb-4"
    >
      {hata && <Alert className="mb-3">{hata}</Alert>}

      <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
        Yüklenen her fotoğraf için çözüm kendiliğinden isteniyor. Aşağıdaki
        liste, çözülmemiş ya da çözülememiş kayıtları gösteriyor — anahtar
        sonradan tanımlandıysa ya da servis o an bulamadıysa buradan
        yeniden kuyruğa alabilirsiniz.
      </p>

      {sonuc && (
        <div className="mb-3 rounded-card border border-border bg-surface-2 p-3">
          <p className="text-body-sm text-foreground">
            {sonuc.kuyruga_alinan} kuyruğa alındı · {sonuc.atlanan} atlandı ·{' '}
            {sonuc.hatali} hata
          </p>
          {sonuc.ilkHata && (
            /*
              SEBEP YAZILIYOR. "0 kuyruğa alındı, 6 atlandı" diyen ama
              nedenini söylemeyen bir sonuç, yöneticiyi kenar fonksiyonu
              günlüklerine gönderirdi. En sık sebep anahtarın tanımsız
              olması ve fonksiyon bunu açıklama olarak zaten döndürüyor.
            */
            <p className="mt-1 text-meta leading-relaxed text-warning">
              {sonuc.ilkHata}
            </p>
          )}
          {sonuc.kuyruga_alinan > 0 && (
            <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
              Sonuçlar beş dakikada bir yoklanıyor; çözülen kayıtlar
              fotoğraf sayfasında ve galeride kendiliğinden görünür.
            </p>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={calisiyor || sayi === 0}
          onClick={() => void topluGonder()}
        >
          {calisiyor
            ? `Gönderiliyor… ${ilerleme?.n ?? 0}/${ilerleme?.toplam ?? sayi}`
            : `${sayi} fotoğrafı kuyruğa al`}
        </Button>
        <Button size="sm" variant="ghost" disabled={calisiyor} onClick={yukle}>
          Yenile
        </Button>
      </div>

      {liste && liste.length === 0 && !hata && (
        <p className="text-meta text-muted-foreground">
          Çözülmemiş fotoğraf yok — hepsi çözüldü ya da kuyrukta.
        </p>
      )}

      {liste && liste.length > 0 && (
        <ul>
          {liste.slice(0, 25).map((f) => (
            <li
              key={f.id}
              className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-0"
            >
              <a
                href={`/fotograf/${f.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-caption text-foreground hover:text-primary"
              >
                {f.title || f.slug}
              </a>
              <Badge tone={f.solve_status === 'basarisiz' ? 'danger' : 'muted'}>
                {f.solve_status === 'basarisiz' ? 'çözülemedi' : 'hiç denenmedi'}
              </Badge>
            </li>
          ))}
          {liste.length > 25 && (
            <li className="py-2 text-meta text-faint">
              …ve {liste.length - 25} kayıt daha. Düğme hepsini gönderiyor.
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}
