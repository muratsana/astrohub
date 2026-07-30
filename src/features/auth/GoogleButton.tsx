import { useState } from 'react';
import { useAuth } from './AuthContext';

/**
 * GOOGLE İLE GİRİŞ.
 *
 * Ayrı bir bileşen çünkü hem giriş hem kayıt ekranında aynı düğme
 * duruyor ve ikisinde de aynı şeyi yapıyor: Google hesabı varsa
 * oturum açılır, yoksa aynı akış hesabı oluşturur. "Giriş" ve "Kayıt"
 * ayrımı OAuth'ta yok — düğmenin metni bu yüzden nötr.
 *
 * MARKA KURALLARI: Google, kendi düğmesinde logosunun bozulmamasını ve
 * metnin belirli kalıplardan biri olmasını istiyor ("Google ile devam
 * et" kabul edilen kalıplardan). Logo satır içi SVG — dış kaynaktan
 * görsel çekmek hem CSP hem gizlilik açısından gereksiz bir bağımlılık.
 *
 * Supabase yapılandırılmamışsa düğme hiç çizilmiyor: çalışmayacak bir
 * girişi göstermek, kullanıcıyı boşuna tıklatır.
 */
export function GoogleButton({ label = 'Google ile devam et' }: { label?: string }) {
  const { signInWithGoogle, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) return null;

  async function start() {
    setBusy(true);
    setError(null);
    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError);
      setBusy(false);
    }
    /* Başarılıysa tarayıcı Google'a gidiyor; `busy` sıfırlanmıyor çünkü
       bu sayfa artık terk ediliyor. */
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-card border border-border bg-surface-1 px-4 text-[13px] font-medium text-foreground transition-colors hover:border-border-strong disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? 'Google’a yönlendiriliyor…' : label}
      </button>

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Google "G" işareti — resmi dört renkli biçim. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/** "veya" ayıracı — iki giriş yolu arasında. */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="label">veya</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}
