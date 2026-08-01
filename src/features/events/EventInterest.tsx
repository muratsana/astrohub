import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { getSupabase } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { sanitizeText } from '@/lib/sanitize';
import {
  useEventInterest,
  useReminderDefault,
  useReminders,
  type InterestLevel,
} from '@/services/content/eventInterest';
import {
  buildIcs,
  icsFileName,
  reminderAvailability,
  reminderLabels,
  type ReminderKind,
} from './reminders';
import type { AstroEvent } from './types';

/**
 * ETKİNLİK İLGİSİ, HATIRLATMA VE TAKVİM (§9).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * TEK KONTROL, ÜÇ DURUM
 *
 * Belge "takip et / takibi bırak" ve "katılacağım / ilgileniyorum
 * ayrımı" istiyor. Bunları iki ayrı düğmeye bölmek dört anlamsız
 * bileşim üretirdi ("takip etmiyorum ama katılacağım" gibi). Tek bir
 * üç durumlu kontrol var: İlgileniyorum · Katılacağım · Vazgeç.
 *
 * "Katılacağım" kontenjan tüketiyor, "İlgileniyorum" tüketmiyor —
 * fark kullanıcıya da yazılı olarak söyleniyor, çünkü kontenjanı dolu
 * bir etkinlikte hangisinin neden reddedildiğini anlamak gerekiyor.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * HATIRLATMA BÖLÜMÜ İLGİDEN SONRA GELİYOR
 *
 * Hatırlatma kuran kişi veritabanında zaten takipçi oluyor
 * (`app.reminders_before_write`). Sırayı tersine çevirip hatırlatmayı
 * önce göstermek, kullanıcıyı farkında olmadan takipçi yapardı.
 * Önce "bu etkinlikle ilgileniyorum" denir, sonra ne zaman hatırlatılacağı
 * seçilir.
 * ═══════════════════════════════════════════════════════════════════════
 */
export function EventInterest({ event }: { event: AstroEvent }) {
  const { user } = useAuth();
  const interest = useEventInterest(event.id);
  const reminders = useReminders(event.id);

  return (
    <div className="mt-4 space-y-3">
      <CalendarButton event={event} />

      {event.id && !user && (
        <div className="rounded-card border border-border bg-surface-1 px-3 py-2.5">
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            Etkinliği takip etmek ve hatırlatma kurmak için{' '}
            <Link to="/giris" className="text-primary hover:underline">
              giriş yapın
            </Link>
            . Katılımınız yalnızca sizinle ve düzenleyiciyle paylaşılır.
          </p>
        </div>
      )}

      {interest.usable && (
        <div className="rounded-card border border-border bg-surface-1 p-3">
          <p className="label mb-2">Katılım</p>

          <InterestButtons
            level={interest.level}
            busy={interest.busy || interest.loading}
            onSelect={(next) => void interest.setLevel(next)}
          />

          {interest.error && (
            <Alert variant="text" className="mt-2">
              {interest.error}
            </Alert>
          )}

          <p className="mt-2 text-meta leading-snug text-faint">
            {interest.level === 'katilacagim'
              ? 'Kaydınız düzenleyiciye iletildi ve kontenjandan bir yer ayrıldı.'
              : interest.level === 'ilgileniyorum'
                ? 'Kontenjandan yer ayrılmadı; değişiklik ve iptal bildirimlerini alacaksınız.'
                : 'İlgileniyorum kontenjan tüketmez, Katılacağım bir yer ayırır.'}
          </p>

          {interest.level === 'katilacagim' && (
            <OrganizerNote eventId={event.id} />
          )}
        </div>
      )}

      {interest.usable && interest.level !== 'yok' && (
        <ReminderPanel event={event} state={reminders} />
      )}
    </div>
  );
}

const levelOptions: { value: InterestLevel; label: string }[] = [
  { value: 'ilgileniyorum', label: 'İlgileniyorum' },
  { value: 'katilacagim', label: 'Katılacağım' },
];

function InterestButtons({
  level,
  busy,
  onSelect,
}: {
  level: InterestLevel;
  busy: boolean;
  onSelect: (next: InterestLevel) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {levelOptions.map((option) => {
        const active = level === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? 'primary' : 'secondary'}
            disabled={busy}
            /* Seçili olan basılınca vazgeçiliyor: ayrı bir "Vazgeç"
               düğmesi, hiçbir şey seçili değilken de duracak ve neyi
               iptal ettiği belirsiz kalacaktı. */
            onClick={() => onSelect(active ? 'yok' : option.value)}
            aria-pressed={active}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * TAKVİME EKLE — hesap gerektirmiyor.
 *
 * Dosya tarayıcıda üretiliyor; sunucuya gitmiyor, kullanıcının hangi
 * etkinliği takvimine eklediği kimseye kaydedilmiyor. Tohum etkinliklerde
 * de çalışıyor: takvim kaydı veritabanı satırına değil, gösterilen
 * bilgiye bağlı.
 */
function CalendarButton({ event }: { event: AstroEvent }) {
  const download = useCallback(() => {
    const text = buildIcs(event, {
      url:
        typeof window === 'undefined'
          ? undefined
          : `${window.location.origin}/etkinlik/${event.slug}`,
    });

    /* `createObjectURL` olmayan ortamda (eski tarayıcı, test) sessizce
       çıkılıyor — hata basmak kullanıcıya yardımcı olmazdı. */
    if (typeof URL === 'undefined' || !URL.createObjectURL) return;

    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = icsFileName(event);
    anchor.click();
    URL.revokeObjectURL(href);
  }, [event]);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="w-full"
      onClick={download}
    >
      Takvime ekle (.ics)
    </Button>
  );
}

/**
 * Düzenleyiciye not. `event_registrations.note` alanı; yalnızca kayıtlıyken
 * anlamlı, bu yüzden "Katılacağım" seçilene kadar gösterilmiyor.
 */
function OrganizerNote({ eventId }: { eventId: string | undefined }) {
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!eventId || !user) return;
    let active = true;
    void (async () => {
      try {
        const promise = getSupabase();
        if (!promise) return;
        const supabase = await promise;
        const { data } = await supabase
          .from('event_registrations')
          .select('note')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (!active || !data) return;
        const value = (data as { note: string | null }).note ?? '';
        setNote(value);
        setSaved(value);
      } catch {
        /* Not okunamadıysa boş kutu gösteriliyor; yazıp kaydetmek
           mevcut değeri değiştirir, veri kaybı olmaz. */
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId, user]);

  const save = useCallback(async () => {
    if (!eventId || !user) return;
    setBusy(true);
    try {
      const promise = getSupabase();
      if (!promise) return;
      const supabase = await promise;
      const clean = sanitizeText(note, { maxLength: 500 });
      await supabase
        .from('event_registrations')
        .update({ note: clean })
        .eq('event_id', eventId)
        .eq('user_id', user.id);
      setSaved(clean);
    } finally {
      setBusy(false);
    }
  }, [eventId, user, note]);

  return (
    <div className="mt-3 border-t border-border pt-3">
      <label
        htmlFor="etkinlik-notu"
        className="label mb-1.5 block text-muted-foreground"
      >
        Düzenleyiciye not
      </label>
      <textarea
        id="etkinlik-notu"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="İsteğe bağlı: kaç kişi geliyorsunuz, teleskop getiriyor musunuz?"
        className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
      />
      {note !== saved && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? 'Kaydediliyor…' : 'Notu kaydet'}
        </Button>
      )}
    </div>
  );
}

/**
 * HATIRLATMA YÖNETİMİ.
 *
 * SEÇİLEMEYECEK SEÇENEK GÖSTERİLMİYOR (§9 "geçmişe hatırlatma kurmayı
 * engelleme"). Yarın olan bir etkinlikte "1 hafta önce" seçeneği pasif
 * ve sebebi yazılı; tıklanabilir bırakıp sunucudan hata aldırmak,
 * kullanıcıyı boşuna gezdirmek olurdu. Kural yine de sunucuda: sayfa
 * açık kalırsa istemcinin "şimdi"si bayatlar.
 */
function ReminderPanel({
  event,
  state,
}: {
  event: AstroEvent;
  state: ReturnType<typeof useReminders>;
}) {
  const suggested = useReminderDefault();
  const [kind, setKind] = useState<ReminderKind>(suggested);
  const [customAt, setCustomAt] = useState('');

  /* Önerilen değer sunucudan sonra gelebiliyor; kullanıcı henüz
     dokunmadıysa ön seçim ona hizalanıyor. */
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setKind(suggested);
  }, [suggested, touched]);

  const kinds: ReminderKind[] = ['hafta', 'gun', 'etkinlik_gunu', 'ozel'];
  const existing = new Set(
    state.reminders
      .filter((r) => r.kind !== 'ozel')
      .map((r) => r.kind as string)
  );

  const availability = reminderAvailability(
    event.startsAt,
    kind,
    kind === 'ozel' && customAt ? new Date(customAt) : null
  );

  const alreadySet = kind !== 'ozel' && existing.has(kind);
  const canAdd = availability.ok && !alreadySet && !state.busy;

  return (
    <div className="rounded-card border border-border bg-surface-1 p-3">
      <p className="label mb-2">Hatırlatma</p>

      {state.reminders.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {state.reminders.map((reminder) => (
            <li
              key={reminder.id}
              className="flex items-center justify-between gap-2 text-body-sm"
            >
              <span className="min-w-0">
                <span className="text-foreground">
                  {reminderLabels[reminder.kind]}
                </span>
                <span className="tabular block text-meta text-faint">
                  {new Date(reminder.dueAt).toLocaleString('tr-TR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                  {reminder.sentAt ? ' · gönderildi' : ''}
                </span>
              </span>
              {/* Gönderilmiş hatırlatma silinmiyor: olmuş bir olayın
                  kaydı, geleceğe ait bir söz değil. */}
              {!reminder.sentAt && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={state.busy}
                  onClick={() => void state.remove(reminder.id)}
                  aria-label={`${reminderLabels[reminder.kind]} hatırlatmasını kaldır`}
                >
                  Kaldır
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <label htmlFor="hatirlatma-turu" className="sr-only">
          Hatırlatma zamanı
        </label>
        <select
          id="hatirlatma-turu"
          value={kind}
          onChange={(e) => {
            setTouched(true);
            setKind(e.target.value as ReminderKind);
          }}
          className="w-full rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm text-foreground outline-none focus:border-primary"
        >
          {kinds.map((option) => {
            const optionState = reminderAvailability(
              event.startsAt,
              option,
              null
            );
            /* `ozel` için an henüz seçilmedi; listede her zaman duruyor. */
            const disabled = option !== 'ozel' && !optionState.ok;
            return (
              <option key={option} value={option} disabled={disabled}>
                {reminderLabels[option]}
                {disabled && !optionState.ok ? ` — ${optionState.reason}` : ''}
              </option>
            );
          })}
        </select>

        {kind === 'ozel' && (
          <>
            <label htmlFor="hatirlatma-zamani" className="sr-only">
              Hatırlatma tarihi ve saati
            </label>
            <input
              id="hatirlatma-zamani"
              type="datetime-local"
              value={customAt}
              onChange={(e) => setCustomAt(e.target.value)}
              className="w-full rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm text-foreground outline-none focus:border-primary"
            />
          </>
        )}

        {!availability.ok && (kind !== 'ozel' || customAt) && (
          <p className="text-meta leading-snug text-warning">
            {availability.reason}
          </p>
        )}

        {alreadySet && (
          <p className="text-meta leading-snug text-faint">
            Bu hatırlatma zaten kurulu.
          </p>
        )}

        {state.error && <Alert variant="text">{state.error}</Alert>}

        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={!canAdd}
          onClick={() => {
            void state
              .add(kind, kind === 'ozel' ? new Date(customAt).toISOString() : undefined)
              .then((ok) => {
                if (ok && kind === 'ozel') setCustomAt('');
              });
          }}
        >
          {state.busy ? 'Kuruluyor…' : 'Hatırlatma kur'}
        </Button>

        <p className="text-meta leading-snug text-faint">
          Hatırlatmalar site içi bildirim olarak geliyor. Etkinliğin saati
          değişirse yeniden hesaplanıyor; iptal edilirse gönderilmiyor.
        </p>
      </div>
    </div>
  );
}
