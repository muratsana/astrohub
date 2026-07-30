import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  CAPTCHA_PROVIDER as PROVIDER,
  CAPTCHA_SITE_KEY as SITE_KEY,
} from './captchaConfig';

/**
 * GÜVENLİK DOĞRULAMASI (CAPTCHA).
 *
 * Supabase Auth'ta CAPTCHA açıldığında sunucu her giriş/kayıt isteğinde
 * bir token bekliyor; token yoksa istek reddediliyor. Widget'ı istemci
 * çiziyor, doğrulamayı Supabase yapıyor — gizli anahtar hiç tarayıcıya
 * inmiyor.
 *
 * SİTE ANAHTARI YOKSA BİLEŞEN HİÇ ÇİZİLMİYOR ve `captchaEnabled` false
 * kalıyor. Geliştirme ortamında ve tek dosya önizlemede formlar eskisi
 * gibi çalışıyor: yapılandırılmamış bir güvenlik katmanı yüzünden giriş
 * ekranının kilitlenmesi, korumanın kendisinden büyük bir sorun olurdu.
 *
 * İKİ SAĞLAYICI destekleniyor çünkü Supabase ikisini de kabul ediyor ve
 * seçim hesap düzeyinde bir tercih:
 *   turnstile  Cloudflare — çerezsiz, KVKK tarafında daha rahat
 *   hcaptcha   alternatif
 *
 * SESSİZ BAŞARISIZLIK YOK: script yüklenemezse (reklam engelleyici,
 * kısıtlı ağ) kullanıcı boş bir kutuya bakıp "düğme neden çalışmıyor"
 * diye düşünmesin diye sebebi yazılıyor.
 */

export interface CaptchaHandle {
  /** Widget'ı sıfırlar; kullanıcı yeniden çözene kadar token boş kalır. */
  reset: () => void;
}

function loadScript(src: string): void {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const Captcha = forwardRef<
  CaptchaHandle,
  { onToken: (token: string) => void }
>(function Captcha({ onToken }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const rendered = useRef(false);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        const w = window as any;
        const api = PROVIDER === 'hcaptcha' ? w.hcaptcha : w.turnstile;
        if (api && widgetId.current !== null) {
          try {
            api.reset(widgetId.current);
          } catch {
            /* Widget kaldırılmış olabilir; token yine de sıfırlanıyor. */
          }
        }
        onToken('');
      },
    }),
    [onToken]
  );

  useEffect(() => {
    if (!SITE_KEY) return;

    const provider = PROVIDER === 'hcaptcha' ? 'hcaptcha' : 'turnstile';
    loadScript(
      provider === 'hcaptcha'
        ? 'https://js.hcaptcha.com/1/api.js?render=explicit'
        : 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    );

    /*
     * Script yüklenmesini beklemek için yoklama: her iki sağlayıcı da
     * `onload` geri çağrısını global bir fonksiyon adıyla istiyor ve o
     * yol iki widget aynı sayfadaysa çakışıyor. 150 ms × 80 ≈ 12 saniye
     * sonra pes ediliyor — daha uzun beklemek kullanıcıyı boş kutuya
     * bakarken bırakır.
     */
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const w = window as any;
      const api = provider === 'hcaptcha' ? w.hcaptcha : w.turnstile;

      if (
        api &&
        typeof api.render === 'function' &&
        containerRef.current &&
        !rendered.current
      ) {
        rendered.current = true;
        window.clearInterval(timer);
        try {
          containerRef.current.innerHTML = '';
          widgetId.current = api.render(containerRef.current, {
            sitekey: SITE_KEY,
            theme: 'dark',
            callback: (token: string) => onToken(token),
            'expired-callback': () => onToken(''),
            'error-callback': () => onToken(''),
          });
        } catch {
          setFailed(true);
        }
      } else if (tries > 80) {
        window.clearInterval(timer);
        setFailed(true);
      }
    }, 150);

    return () => window.clearInterval(timer);
  }, [onToken]);

  if (!SITE_KEY) return null;

  return (
    <div className="space-y-1">
      <div ref={containerRef} className="min-h-[65px]" />
      {failed && (
        <p className="text-body-sm leading-relaxed text-danger">
          Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyin; sorun sürerse
          reklam/izleyici engelleyicisini bu site için kapatın.
        </p>
      )}
    </div>
  );
});
/* eslint-enable @typescript-eslint/no-explicit-any */
