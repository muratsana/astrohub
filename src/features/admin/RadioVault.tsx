import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { formatTrackTime } from '@/features/radio/types';
import {
  RADIO_MAX_BYTES,
  uploadRadioTrack,
  validateAudioFile,
} from './broadcastAdmin';
import { cn } from '@/lib/cn';

/**
 * RADYO KASASI — sürükle bırak MP3 yükleme.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN GEREKLİ
 *
 * Panel şimdiye kadar yalnızca "bucket içindeki yolu yaz" diyordu: editör
 * önce Supabase paneline girip dosyayı elle yüklüyor, sonra yolu buraya
 * kopyalıyordu. İki ekran, iki adım ve arada yazım hatası yapılabilecek
 * bir alan — yol yanlış yazıldığında hata ancak dinleyici oynat'a
 * bastığında 404 olarak ortaya çıkıyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SÜRÜKLE BIRAK TEK YOL DEĞİL
 *
 * Kutu aynı zamanda bir DÜĞME ve gizli bir dosya girişini tetikliyor.
 * Yalnızca sürükleme desteklemek, klavyeyle gezinen ve dokunmatik
 * kullanan herkesi dışarıda bırakırdı — sürükleme dokunmatik ekranda
 * güvenilir çalışmıyor ve klavyeyle hiç yapılamıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÇOKLU DOSYA SIRAYLA YÜKLENİYOR, PARALEL DEĞİL
 *
 * Beş dosyayı birden göndermek 100 MB'lık eşzamanlı bir yükleme demek ve
 * saha koşullarındaki bir bağlantıda hepsi birden düşer. Sırayla giden
 * yüklemede düşen dosya tek başına düşüyor, öncekiler kasada kalıyor ve
 * rapor hangisinin geçtiğini tek tek söylüyor.
 */

interface Sonuc {
  ad: string;
  durum: 'yuklendi' | 'hata';
  mesaj: string;
}

export function RadioVault({ onUploaded }: { onUploaded: () => void }) {
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [siradaki, setSiradaki] = useState<string | null>(null);
  const [rapor, setRapor] = useState<Sonuc[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const isle = useCallback(
    async (files: FileList | File[]) => {
      const liste = Array.from(files);
      if (liste.length === 0) return;

      setBusy(true);
      setRapor([]);
      const sonuclar: Sonuc[] = [];

      for (const file of liste) {
        setSiradaki(file.name);
        const sorun = validateAudioFile(file);
        if (sorun) {
          sonuclar.push({ ad: file.name, durum: 'hata', mesaj: sorun });
          continue;
        }

        try {
          const { durationSec } = await uploadRadioTrack(file);
          sonuclar.push({
            ad: file.name,
            durum: 'yuklendi',
            mesaj: durationSec
              ? `kasaya alındı · ${formatTrackTime(durationSec)}`
              : 'kasaya alındı',
          });
        } catch (e) {
          sonuclar.push({
            ad: file.name,
            durum: 'hata',
            mesaj: e instanceof Error ? e.message : 'Yüklenemedi',
          });
        }
      }

      setSiradaki(null);
      setRapor(sonuclar);
      setBusy(false);
      /* Liste her durumda tazeleniyor: bazıları geçtiyse panel onları
         göstermeli, hiçbiri geçmediyse tazeleme zararsız. */
      onUploaded();
    },
    [onUploaded]
  );

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!busy) void isle(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-card border-2 border-dashed p-6 text-center transition-colors',
          over
            ? 'border-primary bg-primary/5'
            : 'border-border bg-surface-1 hover:border-border-strong'
        )}
      >
        <p className="text-body-sm font-medium text-foreground">
          {busy ? 'Kasaya alınıyor…' : 'MP3 dosyalarını buraya sürükle'}
        </p>
        <p className="mt-1 text-meta text-muted-foreground">
          MP3, OGG ya da AAC · dosya başına en fazla{' '}
          {Math.round(RADIO_MAX_BYTES / 1024 / 1024)} MB
        </p>

        {/*
          Gizli giriş + görünür düğme. `<input type="file">` doğrudan
          biçimlendirilemiyor; etiketle sarmak yerine düğmeden
          tetikleniyor ki odak halkası ve boyut diğer düğmelerle aynı
          kalsın.
        */}
        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/mp3,audio/ogg,audio/aac,.mp3,.ogg,.aac,.m4a"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void isle(e.target.files);
            /* Aynı dosya ikinci kez seçilebilsin: değer sıfırlanmazsa
               `change` olayı tetiklenmiyor. */
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Dosya seç
        </Button>

        {siradaki && (
          <p
            aria-live="polite"
            className="mt-3 truncate text-meta text-muted-foreground"
          >
            {siradaki}
          </p>
        )}
      </div>

      {rapor.length > 0 && (
        <ul className="space-y-1" aria-live="polite">
          {rapor.map((r) => (
            <li
              key={r.ad}
              className={cn(
                'flex flex-wrap items-baseline gap-x-2 rounded-card border px-3 py-2 text-meta',
                r.durum === 'yuklendi'
                  ? 'border-cold/30 bg-cold/8 text-cold'
                  : 'border-warm/30 bg-warm/8 text-warm'
              )}
            >
              <span className="font-medium">{r.ad}</span>
              <span className="opacity-80">— {r.mesaj}</span>
            </li>
          ))}
        </ul>
      )}

      {/*
        YÜKLENEN PARÇA YAYINA GİRMİYOR. Bunu söylemek şart: editör dosyayı
        sürükledikten sonra listede gördüğünde yayında sanır ve yayına
        alma adımını atlar — sonuç, radyoda hiç görünmeyen bir parça.
      */}
      <p className="text-meta text-faint">
        Yüklenen parçalar <strong>taslak</strong> olarak eklenir; aşağıdaki
        listeden yayına almadan dinleyiciye ulaşmaz.
      </p>
    </div>
  );
}
