import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import type { ReminderKind } from '@/features/events/reminders';

/**
 * ETKİNLİK İLGİSİ VE HATIRLATMALAR — istemci tarafı (§9).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * İKİ TABLO, TEK KANCA
 *
 * "İlgileniyorum" `event_follows`, "Katılacağım" ayrıca
 * `event_registrations`. Arayüzün bunu bilmesi gerekmiyor: `setLevel`
 * tek bir RPC çağırıyor (`set_event_interest`) ve iki tabloyu sunucu
 * birlikte yönetiyor. İstemciye iki ayrı yazma yaptırsaydık, ikincisi
 * düştüğünde kullanıcı yarı kayıtlı kalırdı.
 * ═══════════════════════════════════════════════════════════════════════
 */

export type InterestLevel = 'yok' | 'ilgileniyorum' | 'katilacagim';

export interface ReminderRow {
  id: string;
  kind: ReminderKind;
  customAt: string | null;
  dueAt: string;
  sentAt: string | null;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface EventInterestState {
  level: InterestLevel;
  /** Oturum yok, Supabase yok ya da tohum etkinlik — kontrol gizleniyor. */
  usable: boolean;
  loading: boolean;
  busy: boolean;
  error: string | null;
  setLevel: (next: InterestLevel) => Promise<void>;
}

/**
 * İLGİ DÜZEYİ İYİMSER GÜNCELLENMİYOR.
 *
 * Takipte (`social.ts`) iyimserlik yapılıyor çünkü kaybolan şey bir bit.
 * Burada "Katılacağım" kontenjan tüketiyor: dolu bir etkinlikte sunucu
 * reddedebilir ve ekranda "katılıyorsun" yazarken gerçekte kaydın olmaması,
 * kullanıcının yola çıkmasına sebep olabilecek bir yanlış.
 */
export function useEventInterest(
  eventId: string | undefined
): EventInterestState {
  const { user } = useAuth();
  const [level, setLevelState] = useState<InterestLevel>('yok');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usable = Boolean(eventId && user && isSupabaseConfigured);

  useEffect(() => {
    if (!usable || !eventId || !user) {
      setLevelState('yok');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await client();
        /* İki okuma paralel: biri diğerini beklemiyor. */
        const [follow, registration] = await Promise.all([
          supabase
            .from('event_follows')
            .select('event_id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('event_registrations')
            .select('event_id')
            .eq('event_id', eventId)
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (!active) return;
        setLevelState(
          registration.data
            ? 'katilacagim'
            : follow.data
              ? 'ilgileniyorum'
              : 'yok'
        );
      } catch {
        /* Okunamadıysa "yok" varsayılıyor; kullanıcı tıklarsa sunucu
           tekrar kaydı `on conflict do nothing` ile zaten yutuyor. */
        if (active) setLevelState('yok');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [usable, eventId, user]);

  const setLevel = useCallback(
    async (next: InterestLevel) => {
      if (!eventId) return;
      setBusy(true);
      setError(null);
      try {
        const supabase = await client();
        const { data, error: rpcError } = await supabase.rpc(
          'set_event_interest',
          { target_event: eventId, level: next }
        );
        if (rpcError) throw new Error(rpcError.message);
        /* Sunucunun döndürdüğü düzey yazılıyor, istediğimiz değil. */
        setLevelState((data as InterestLevel) ?? next);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı');
      } finally {
        setBusy(false);
      }
    },
    [eventId]
  );

  return { level, usable, loading, busy, error, setLevel };
}

export interface RemindersState {
  reminders: ReminderRow[];
  loading: boolean;
  busy: boolean;
  error: string | null;
  add: (kind: ReminderKind, customAt?: string) => Promise<boolean>;
  remove: (id: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Kullanıcının bu etkinlik için kurduğu hatırlatmalar.
 *
 * GÖNDERİLMİŞLER DE LİSTELENİYOR. Yalnızca bekleyenleri göstermek,
 * "hatırlatmam çalıştı mı" sorusuna cevap vermezdi; gönderilmiş satır
 * bildirim merkezine düşen kaydın karşılığı ve silinemiyor (olmuş bir
 * olayın kaydı).
 */
export function useReminders(eventId: string | undefined): RemindersState {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const usable = Boolean(eventId && user && isSupabaseConfigured);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!usable || !eventId) {
      setReminders([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('reminders')
          .select('id, offset_kind, custom_at, due_at, sent_at')
          .eq('event_id', eventId)
          .order('due_at', { ascending: true });

        if (!active) return;
        setReminders(
          (data ?? []).map((row) => {
            const r = row as {
              id: string;
              offset_kind: ReminderKind;
              custom_at: string | null;
              due_at: string;
              sent_at: string | null;
            };
            return {
              id: r.id,
              kind: r.offset_kind,
              customAt: r.custom_at,
              dueAt: r.due_at,
              sentAt: r.sent_at,
            };
          })
        );
      } catch {
        if (active) setReminders([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [usable, eventId, tick]);

  const add = useCallback(
    async (kind: ReminderKind, customAt?: string) => {
      if (!eventId || !user) return false;
      setBusy(true);
      setError(null);
      try {
        const supabase = await client();
        /* `due_at` gönderilmiyor: onu `app.reminders_before_write` niyetten
           türetiyor. İstemcinin hesapladığı bir anı yazsaydık, etkinlik
           saati kayınca yeniden hesaplanacak olan değer istemcinin eski
           varsayımını taşırdı. */
        const { error: writeError } = await supabase.from('reminders').insert({
          user_id: user.id,
          event_id: eventId,
          offset_kind: kind,
          custom_at: kind === 'ozel' ? customAt : null,
        });
        if (writeError) throw new Error(writeError.message);
        refresh();
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hatırlatma kurulamadı');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [eventId, user, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      setBusy(true);
      setError(null);
      try {
        const supabase = await client();
        const { error: delError } = await supabase
          .from('reminders')
          .delete()
          .eq('id', id);
        if (delError) throw new Error(delError.message);
        setReminders((list) => list.filter((r) => r.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Hatırlatma silinemedi');
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return { reminders, loading, busy, error, add, remove, refresh };
}

export interface EventChangeRow {
  id: string;
  changedAt: string;
  changes: Record<string, { eski: string | null; yeni: string | null }>;
}

/**
 * Etkinlik değişiklik geçmişi (§9).
 *
 * OTURUM GEREKTİRMİYOR. `event_changes` politikası yayımlanmış
 * etkinliklerin geçmişini herkese açıyor: "bu etkinliğin tarihi iki kez
 * değişti" bilgisi, gitmeye karar verirken bakılan bir şey ve yalnızca
 * üye olana göstermek onu yönetim aracına indirgerdi.
 */
export function useEventChanges(eventId: string | undefined): {
  changes: EventChangeRow[];
  loading: boolean;
} {
  const [changes, setChanges] = useState<EventChangeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || !isSupabaseConfigured) {
      setChanges([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('event_changes')
          .select('id, changed_at, changes')
          .eq('event_id', eventId)
          .order('changed_at', { ascending: false })
          .limit(20);

        if (!active) return;
        setChanges(
          (data ?? []).map((row) => {
            const r = row as {
              id: string;
              changed_at: string;
              changes: EventChangeRow['changes'];
            };
            return { id: r.id, changedAt: r.changed_at, changes: r.changes };
          })
        );
      } catch {
        if (active) setChanges([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [eventId]);

  return { changes, loading };
}

/**
 * Yöneticinin belirlediği varsayılan hatırlatma (`app_settings`).
 *
 * ÖNERİ, KURULUM DEĞİL. Dönen değer arayüzde yalnızca ÖN SEÇİLİ
 * gösteriliyor; takip eden herkese kendiliğinden hatırlatma açmak,
 * kimsenin istemediği bildirimi varsayılan yapardı (0050).
 */
export function useReminderDefault(): ReminderKind {
  const [kind, setKind] = useState<ReminderKind>('gun');

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    void (async () => {
      try {
        const supabase = await client();
        const { data } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'reminder_defaults')
          .maybeSingle();

        if (!active || !data) return;
        const value = (data as { value: { onerilen?: string } }).value;
        if (
          value?.onerilen &&
          ['hafta', 'gun', 'etkinlik_gunu', 'ozel'].includes(value.onerilen)
        ) {
          setKind(value.onerilen as ReminderKind);
        }
      } catch {
        /* Ayar okunamadıysa "1 gün önce" kalıyor — migration'daki değerle
           aynı, yani kullanıcı farkı görmüyor. */
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return kind;
}
