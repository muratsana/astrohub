import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { startDirectConversation } from '@/services/content/messages';

/**
 * "MESAJ GÖNDER" — sohbeti açıp konuşmaya götürür.
 *
 * SOHBET BURADA AÇILIYOR, MESAJLAR SAYFASINDA DEĞİL. Kullanıcıyı önce boş
 * bir gelen kutusuna, oradan "yeni sohbet" akışına sokmak, tek bir niyeti
 * (şu kişiye yazacağım) üç adıma bölerdi.
 *
 * AYNI KİŞİYE İKİNCİ SOHBET AÇILMIYOR: `start_direct_conversation` var
 * olanı döndürüyor (0043 `direct_key`). Bu yüzden düğmeye ikinci kez
 * basmak yeni bir konuşma değil, aynı konuşmayı açıyor.
 */
export function MessageButton({
  targetUserId,
  label = 'Mesaj gönder',
  className,
}: {
  /** Yazılacak kişi. Tanımsızsa düğme çizilmiyor. */
  targetUserId: string | undefined;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Kendine mesaj göndermek anlamsız; sunucu da reddediyor. Düğmeyi
     göstermemek, reddedilecek bir eylemi teklif etmemek demek. */
  if (!targetUserId || (user && user.id === targetUserId)) return null;

  /*
   * OTURUMSUZ ZİYARETÇİYE DÜĞME YERİNE YÖNLENDİRME. Basıp "giriş
   * yapmalısınız" hatası almak yerine, ne yapması gerektiğini baştan
   * söylüyoruz.
   */
  if (!user) {
    return (
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className={className}
        onClick={() => navigate('/giris')}
      >
        Mesaj için giriş yap
      </Button>
    );
  }

  return (
    <div className={className}>
      <Button
        type="button"
        size="sm"
        className="w-full"
        disabled={busy}
        onClick={() =>
          void (async () => {
            setBusy(true);
            setError(null);
            try {
              const id = await startDirectConversation(targetUserId);
              void navigate(`/mesajlar/${id}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Sohbet açılamadı');
            } finally {
              setBusy(false);
            }
          })()
        }
      >
        {busy ? 'Açılıyor…' : label}
      </Button>
      {error && (
        <Alert variant="text" className="mt-2">
          {error}
        </Alert>
      )}
    </div>
  );
}
