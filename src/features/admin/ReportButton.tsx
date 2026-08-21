import { useState } from 'react';
import { Field } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { reasonLabels, type ModerationReason, type ModerationTarget } from './moderation';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/Alert';

/**
 * İÇERİK BİLDİRME (§13).
 *
 * Moderasyon kuyruğunun diğer ucu: kuyruk bu düğmeyle dolar. Kayıt doğrudan
 * `moderation_queue` tablosuna yazılır; RLS yalnızca `reported_by = auth.uid()`
 * ve `status = 'pending'` olan satırı kabul eder — yani bir kullanıcı başkası
 * adına rapor açamaz, açtığı raporu "onaylanmış" olarak işaretleyemez.
 *
 * GÖNDERİM SONRASI KUYRUK GÖRÜNMEZ. Raporlayan kendi kaydını okuyamaz
 * (politika bunu da engelliyor) çünkü kuyruğu izleyebilmek, hedef kullanıcının
 * kimin şikâyet ettiğini çıkarmasına kapı açar. Arayüz bu yüzden "iletildi"
 * der ve orada durur — sahte bir durum takibi göstermez.
 */
/** Şikâyet açıklamasının en az uzunluğu — gerekçesi bileşen içinde. */
export const MIN_ACIKLAMA = 120;

export function ReportButton({
  targetType,
  targetId,
  targetPath,
  prefillNote,
  compact = false,
  className,
}: {
  targetType: ModerationTarget;
  targetId: string;
  /** Moderatörün içeriğe gitmesi için hazır yol. */
  targetPath: string;
  /**
   * Not alanının başlangıç metni.
   *
   * ÖZEL MESAJ RAPORLAMASI İÇİN VAR ve tek kullanım yeri orası. Moderatör
   * `messages` tablosunu okuyamıyor (0047: iki kişinin bütün yazışma
   * geçmişini tek bir cümle için açmak orantısız olurdu), bu yüzden
   * şikâyet edilen metni RAPORLAYAN taşıyor. Kullanıcı gönderilecek
   * metni ekranda görüyor ve silebiliyor — arkasından bir şey
   * taşınmıyor.
   */
  prefillNote?: string;
  /** Satır içi kullanım: düğme metin gibi görünür, kutuya sığar. */
  compact?: boolean;
  className?: string;
}) {
  const { user, configured } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ModerationReason>('spam');
  const [note, setNote] = useState(prefillNote ?? '');
  /*
   * AÇIKLAMA ARTIK ZORUNLU.
   *
   * İsteğe bağlıydı ve boş bırakılıyordu: moderatörün elinde yalnızca
   * "telif ihlali" gibi bir etiket kalıyor, kararı verebilmek için
   * içeriği kendi başına yorumlamak zorunda kalıyordu. Bir tıkla
   * gönderilebilen şikâyet, kötüye kullanımı da ucuzlatıyor.
   *
   * Eşik 120 karakter: "bu fotoğraf çalıntı" cümlesi 20 karakter ve
   * hiçbir şey anlatmıyor; 120 karakter, hangi kuralın nerede
   * çiğnendiğini yazmaya yetecek en kısa metin. Üst sınır 2000'de
   * kalıyor.
   */
  const aciklamaUzunluk = note.trim().length;
  const aciklamaYeterli = aciklamaUzunluk >= MIN_ACIKLAMA;
  const eksikKarakter = Math.max(0, MIN_ACIKLAMA - aciklamaUzunluk);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!user) return;
    setState('sending');
    setError(null);

    try {
      /*
       * TEMİZLENMİŞ METİN ÖLÇÜLÜYOR, ham girdi değil.
       *
       * `sanitizeText` etiketleri ve görünmez karakterleri atıyor; 120
       * karakterlik bir `<b>` yığını istemcide geçip sunucuda kısıta
       * takılırdı. Ölçüyü kaydedilecek metin üzerinden almak, iki
       * tarafın aynı şeyi saymasını sağlıyor.
       */
      const temiz = sanitizeText(note, { multiline: true, maxLength: 2000 });
      if (temiz.trim().length < MIN_ACIKLAMA) {
        throw new Error(
          `Açıklama en az ${MIN_ACIKLAMA} karakter olmalı — moderatörün kararı buna dayanıyor.`
        );
      }

      const clientPromise = getSupabase();
      if (!clientPromise) throw new Error('Veritabanı bağlantısı yok');
      const client = await clientPromise;

      const { error: insertError } = await client.from('moderation_queue').insert({
        target_type: targetType,
        target_id: targetId,
        target_path: targetPath,
        reason,
        // Serbest metin doğrudan moderatöre gidiyor; etiket ve görünmez
        // karakterler burada temizlenir (§15.4).
        note: temiz,
        reported_by: user.id,
        status: 'pending',
      });

      if (insertError) throw new Error(insertError.message);
      setState('sent');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Bildirim gönderilemedi');
    }
  }

  if (state === 'sent') {
    return (
      <p className={cn('text-meta text-success', className)} role="status">
        Bildiriminiz moderasyon kuyruğuna iletildi.
      </p>
    );
  }

  const trigger = compact ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'transition-colors hover:text-danger',
        !open && className
      )}
    >
      Bildir
    </button>
  ) : (
    <Button
      size="sm"
      variant="ghost"
      className={!open ? className : undefined}
      onClick={() => setOpen(true)}
    >
      Bildir
    </Button>
  );

  if (!open) {
    /* Satır içi biçim: mesaj balonunun altındaki damga şeridine sığması
       gerekiyor ve orada bir düğme kutusu görsel olarak fazla ağır. */
    return trigger;
  }

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {trigger}
      <div
        className={cn(
          'absolute right-0 top-full z-[var(--z-popover)] mt-2 rounded-card border border-border bg-surface-1 p-3 text-left shadow-overlay',
          /*
            Form butonun yerine akışa girerse fotoğraf detayındaki başlık
            kolonu birkaç kelimelik genişliğe sıkışıyor. Panel absolute:
            buton yerinde kalır, form layout hesabına dahil olmaz.
          */
          compact ? 'w-72' : 'w-[min(46rem,calc(100vw-2rem))]'
        )}
      >
        <h3 className="label mb-2 text-foreground">İçeriği bildir</h3>

        {!configured || !user ? (
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            Bildirim göndermek için giriş yapmanız gerekir. Kayıtların hesapla
            ilişkilendirilmesi, kötüye kullanımı önlemenin tek pratik yolu.
          </p>
        ) : (
          <>
            {/*
              ETİKETLER `Field` İLE.

              Elle yazılan `<label className="label block">` etiketi kutuya
              SIFIR mesafede bırakıyordu — `.label` sınıfının alt boşluğu
              yok — ve etiket, altındaki kutunun kenarına biniyordu.
              Boşluğu buraya elle eklemek aynı hatayı üçüncü bir yerde
              tekrar etmek olurdu; `Field` bu aralığı uygulamanın her
              yerinde zaten doğru veriyor.
            */}
            <div className="mb-3 grid gap-3">
              <Field label="Gerekçe" htmlFor="report-reason">
                <Select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ModerationReason)}
                  className="h-9 text-meta"
                >
                  {Object.entries(reasonLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Açıklama"
                htmlFor="report-note"
                hint={`Ne olduğunu somut yazın — en az ${MIN_ACIKLAMA} karakter.`}
                error={
                  note.trim().length > 0 && !aciklamaYeterli
                    ? `${eksikKarakter} karakter daha gerekiyor.`
                    : undefined
                }
              >
                <textarea
                  id="report-note"
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={2000}
                  aria-describedby="report-note-sayac"
                  placeholder="Hangi kural çiğnendi, nerede? Örnek: telif ihlalinde özgün eserin adresi."
                  className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
                />
              </Field>

              {/* Sayaç ayrı satırda ve canlı: kullanıcı düğmenin neden
                  kapalı olduğunu aramamalı. */}
              <p
                id="report-note-sayac"
                className={cn(
                  'tabular text-meta',
                  aciklamaYeterli ? 'text-success' : 'text-faint'
                )}
              >
                {note.trim().length} / {MIN_ACIKLAMA} karakter
              </p>
            </div>

            {error && (
              <Alert variant="text" className="mb-2">
                {error}
              </Alert>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Vazgeç
          </Button>
          {configured && user && (
            <Button
              size="sm"
              disabled={state === 'sending' || !aciklamaYeterli}
              onClick={() => void submit()}
            >
              {state === 'sending' ? 'Gönderiliyor…' : 'Gönder'}
            </Button>
          )}
        </div>

        <p className="mt-2 text-meta leading-snug text-faint">
          Bildiriminizin durumu size ayrıca gösterilmez: kuyruğu izleyebilmek,
          bildirilen kullanıcının kimin şikâyet ettiğini çıkarmasına kapı açar.
        </p>
      </div>
    </span>
  );
}
