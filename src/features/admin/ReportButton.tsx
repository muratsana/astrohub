import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { reasonLabels, type ModerationReason, type ModerationTarget } from './moderation';
import { cn } from '@/lib/cn';

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
export function ReportButton({
  targetType,
  targetId,
  targetPath,
  className,
}: {
  targetType: ModerationTarget;
  targetId: string;
  /** Moderatörün içeriğe gitmesi için hazır yol. */
  targetPath: string;
  className?: string;
}) {
  const { user, configured } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ModerationReason>('spam');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!user) return;
    setState('sending');
    setError(null);

    try {
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
        note: sanitizeText(note, { multiline: true, maxLength: 2000 }),
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
      <p className={cn('text-[11px] text-success', className)} role="status">
        Bildiriminiz moderasyon kuyruğuna iletildi.
      </p>
    );
  }

  if (!open) {
    return (
      <Button
        size="sm"
        variant="ghost"
        className={className}
        onClick={() => setOpen(true)}
      >
        Bildir
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface-1 p-3',
        className
      )}
    >
      <h3 className="label mb-2 text-foreground">İçeriği bildir</h3>

      {!configured || !user ? (
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Bildirim göndermek için giriş yapmanız gerekir. Kayıtların hesapla
          ilişkilendirilmesi, kötüye kullanımı önlemenin tek pratik yolu.
        </p>
      ) : (
        <>
          <label htmlFor="report-reason" className="label block">
            Gerekçe
          </label>
          <Select
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value as ModerationReason)}
            className="mb-2 h-8 text-[12px]"
          >
            {Object.entries(reasonLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <label htmlFor="report-note" className="label block">
            Açıklama (isteğe bağlı)
          </label>
          <textarea
            id="report-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder="Moderatörün hızlı karar verebilmesi için somut yazın."
            className="mb-2 w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-[12px] leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
          />

          {error && (
            <p className="mb-2 text-[11px] text-danger" role="alert">
              {error}
            </p>
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
            disabled={state === 'sending'}
            onClick={() => void submit()}
          >
            {state === 'sending' ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        )}
      </div>

      <p className="mt-2 text-[10px] leading-snug text-faint">
        Bildiriminizin durumu size ayrıca gösterilmez: kuyruğu izleyebilmek,
        bildirilen kullanıcının kimin şikâyet ettiğini çıkarmasına kapı açar.
      </p>
    </div>
  );
}
