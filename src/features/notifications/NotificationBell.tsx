import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { BellIcon } from '@/components/ui/icons';
import { useAuth } from '@/features/auth/AuthContext';
import { relativeTime } from '@/lib/relativeTime';
import { cn } from '@/lib/cn';
import {
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
  useUnreadCount,
} from '@/services/content/notifications';

/**
 * ÜST ÇUBUK BİLDİRİM ZİLİ VE MERKEZİ.
 *
 * OTURUM YOKKEN HİÇ ÇİZİLMİYOR. Ziyaretçiye bildirim ikonu göstermek,
 * arkasında hiçbir zaman içerik olmayacak bir düğme koymak olurdu.
 *
 * MERKEZ İKONDAN AÇILIYOR (§8.1), AMA SAYFAYI ÖLDÜRMÜYOR. Panel son beş
 * bildirimi ve iki eylemi taşıyor: hızlı bakış için yeterli, kategori
 * sekmeleri ve arşiv için değil. O ikisi `/bildirimler` sayfasında
 * duruyor ve panelin altındaki bağlantı oraya götürüyor. Panelin içine
 * altı sekme ve arşiv sıkıştırmak, 320px genişliğinde bir kutuda
 * kullanılamaz bir ekran üretirdi.
 *
 * ROZET SAYIYI TAŞIYOR, YALNIZCA NOKTA DEĞİL. "Bildirimin var" ile
 * "on yedi bildirimin var" arasında kullanıcı için gerçek bir fark var:
 * ilki açmayı erteletir, ikincisi açtırır. Üst sınır `99+` (§8.1).
 *
 * DOKUNMA HEDEFİ 32px — `check-a11y`nin 44px kuralının altında ve bu
 * bilinçli. O kural WCAG 2.5.5 (AAA) ve parmakla basmayı düşünerek
 * kondu; denetim de telefonda (390px) ölçüyor. Zil `sm` altında hiç
 * çizilmiyor, yani yalnızca farenin olduğu genişliklerde görünüyor.
 * Orada geçerli ölçüt 2.5.8 (AA, 24px) ve 32px onu rahatça geçiyor.
 * 44px yapmak, yanındaki TV/radyo düğmeleriyle (32px) hizayı bozardı.
 */
export function NotificationBell() {
  const { user, loading } = useAuth();
  const { count, refresh: refreshCount } = useUnreadCount();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /*
   * PANEL AÇILANA KADAR SORGU YOK. `limit: 0` hiçbir satır çekmiyor;
   * kanca yine de çağrılıyor çünkü kancaların koşullu çağrılması yasak.
   * Zil her sayfada duruyor — kapalı bir panelin içeriğini her gezinmede
   * indirmek, hiç açılmayacak bir liste için istek harcamak olurdu.
   */
  const { items } = useNotifications('gelen', 'tumu', open ? 5 : 0);

  /* Dışarı tıklama ve Escape — `LocationPicker` ile aynı desen. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      /* Odak tetikleyiciye dönüyor: Escape'ten sonra odağın sayfa başına
         düşmesi, klavye kullanıcısını bulunduğu yerden koparırdı. */
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  /* `loading` sırasında da çizilmiyor: önce zil gösterip sonra kaldırmak,
     üst çubukta göze çarpan bir sıçrama olurdu (Topbar'daki hesap
     düğmesiyle aynı gerekçe). */
  if (loading || !user) return null;

  const label = count > 0 ? `Bildirimler — ${count} okunmamış` : 'Bildirimler';

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={label}
        className={cn(
          'relative inline-flex h-8 w-8 items-center justify-center rounded-card border transition-colors',
          open
            ? 'border-primary text-primary'
            : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
        )}
      >
        <BellIcon className="h-4 w-4" />
        {count > 0 && (
          <span
            /* Rozet `aria-hidden`: sayı zaten erişilebilir adın içinde.
               İkisini birden okutmak ekran okuyucuda "Bildirimler 3
               okunmamış 3" gibi bir tekrar üretiyordu. */
            aria-hidden
            className="absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-meta font-medium leading-none text-primary-foreground tabular-nums"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Bildirim merkezi"
          className="absolute right-0 top-full z-[var(--z-popover)] mt-1 w-80 overflow-hidden rounded-card border border-border-strong bg-surface-1 shadow-overlay"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="label text-foreground">Bildirimler</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() =>
                  void markAllNotificationsRead().then(refreshCount)
                }
                className="text-meta text-muted-foreground transition-colors hover:text-foreground"
              >
                Tümünü okundu yap
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-meta leading-relaxed text-muted-foreground">
              Yeni bildirimin yok.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((item) => {
                const unread = !item.readAt;
                const body = (
                  <>
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                        unread ? 'bg-primary' : 'bg-transparent'
                      )}
                    />
                    <span className="min-w-0">
                      <span className="block text-meta leading-snug text-foreground">
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-meta text-faint">
                        {relativeTime(item.createdAt)}
                      </span>
                    </span>
                  </>
                );
                const shared =
                  'flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2';

                return (
                  <li key={item.id} className="border-b border-border last:border-0">
                    {/* Yolu olmayan bildirim bağlantı değil — kaynağı
                        silinmiş satırı tıklanabilir çizmek, kullanıcıyı
                        "bulunamadı" sayfasına yollamaktı. */}
                    {item.url ? (
                      <Link
                        to={item.url}
                        onClick={() => {
                          setOpen(false);
                          if (unread) {
                            void markNotificationRead(item.id).then(refreshCount);
                          }
                        }}
                        className={shared}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div className={shared}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Link
            to="/bildirimler"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-3 py-2 text-center text-meta text-muted-foreground transition-colors hover:text-primary"
          >
            Tüm bildirimler ve tercihler
          </Link>
        </div>
      )}
    </div>
  );
}
