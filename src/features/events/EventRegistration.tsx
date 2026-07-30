import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { sanitizeText } from '@/lib/sanitize';
import type { AstroEvent } from './types';

/**
 * ETKİNLİK KAYDI.
 *
 * `event_registrations` tablosu ve RLS'i başından beri vardı; kaydolma
 * düğmesi hiç yazılmamıştı. Etkinlik sayfası "kayıt gerekiyor" diyip
 * kaydolacak bir yer göstermiyordu.
 *
 * KAYIT LİSTESİ HERKESE AÇIK DEĞİL. RLS yalnızca kişinin kendi kaydını
 * ve düzenleyicinin katılımcılarını gösteriyor; bu yüzden burada
 * "kaç kişi kayıtlı" sayısı yok. Gösteremeyeceğimiz bir sayı için
 * yer ayırmak, boş bir vaat olurdu.
 *
 * NOT ALANI opsiyonel: düzenleyiciye "iki kişi geliyoruz" ya da
 * "teleskop getiriyorum" demenin yolu. Sahada gerçekten kullanılan bilgi.
 */
export function EventRegistration({ event }: { event: AstroEvent }) {
  const { user } = useAuth();
  const [registered, setRegistered] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventId = event.id;
  const usable = Boolean(eventId && user && isSupabaseConfigured);

  useEffect(() => {
    if (!usable || !eventId || !user) {
      setRegistered(false);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const promise = getSupabase();
        if (!promise) return;
        const supabase = await promise;
        const { data } = await supabase
          .from('event_registrations')
          .select('event_id, note')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!active) return;
        setRegistered(Boolean(data));
        if (data) setNote((data as { note: string | null }).note ?? '');
      } catch {
        /* Durum okunamadıysa "kayıtlı değil" varsayılıyor; kullanıcı
           kaydolmayı denerse tekrar kaydı veritabanı reddediyor. */
      }
    })();

    return () => {
      active = false;
    };
  }, [usable, eventId, user]);

  const submit = useCallback(async () => {
    if (!eventId || !user) return;
    setBusy(true);
    setError(null);
    try {
      const promise = getSupabase();
      if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
      const supabase = await promise;

      const { error: writeError } = registered
        ? await supabase
            .from('event_registrations')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', user.id)
        : await supabase.from('event_registrations').upsert(
            {
              event_id: eventId,
              user_id: user.id,
              note: sanitizeText(note, { maxLength: 500 }),
            },
            { onConflict: 'event_id,user_id' }
          );

      if (writeError) throw new Error(writeError.message);
      setRegistered(!registered);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt işlemi başarısız');
    } finally {
      setBusy(false);
    }
  }, [eventId, user, registered, note]);

  if (!eventId) {
    /* Tohum kayıt: etkinlik henüz veritabanında değil. Düğme göstermek,
       çalışmayan bir vaat olurdu. */
    return null;
  }

  if (!user) {
    return (
      <div className="mt-4 rounded-card border border-border bg-surface-1 px-3 py-2.5">
        <p className="text-[11.5px] leading-relaxed text-muted-foreground">
          Bu etkinliğe kaydolmak için{' '}
          <Link to="/giris" className="text-primary hover:underline">
            giriş yapın
          </Link>
          . Kaydınız yalnızca sizinle ve düzenleyiciyle paylaşılır.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-card border border-border bg-surface-1 p-3">
      <p className="label mb-1.5">Katılım</p>

      {!registered && (
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-label="Düzenleyiciye not"
          placeholder="Düzenleyiciye not (isteğe bağlı): kaç kişi geliyorsunuz, teleskop getiriyor musunuz?"
          className="mb-2 w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-[11.5px] leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
        />
      )}

      {error && (
        <p role="alert" className="mb-2 text-[11.5px] text-danger">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] leading-snug text-faint">
          {registered
            ? 'Kaydınız düzenleyiciye iletildi.'
            : 'Kaydınız yalnızca sizinle ve düzenleyiciyle paylaşılır.'}
        </p>
        <Button
          size="sm"
          variant={registered ? 'secondary' : 'primary'}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy
            ? 'Kaydediliyor…'
            : registered
              ? 'Kaydı iptal et'
              : 'Kaydol'}
        </Button>
      </div>
    </div>
  );
}
