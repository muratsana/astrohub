import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Supabase yapılandırılmış mı? (UI'da kurulum uyarısı için) */
  configured: boolean;
  /**
   * `captchaToken` opsiyonel: Supabase tarafında CAPTCHA kapalıyken
   * gönderilmesi gerekmiyor ve zorunlu yapmak yerel geliştirmeyi
   * kilitlerdi. Açıkken token'sız istek zaten sunucuda reddediliyor.
   */
  signIn: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    captchaToken?: string
  ) => Promise<AuthResult>;
  /**
   * Google ile giriş — tarayıcıyı Google'a yönlendirir.
   *
   * CAPTCHA almıyor: doğrulamayı Google'ın kendi akışı yapıyor ve
   * yönlendirme öncesi bir widget çözdürmek kullanıcıyı iki kez
   * doğrulatmak olurdu.
   */
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Yönlendirmelerin döneceği adres.
 *
 * Yayında `VITE_APP_URL` (https://www.astrohub.com.tr) kullanılıyor;
 * tanımsızsa o anki köken. Sabit bir adres yazmak yerel geliştirmede
 * doğrulama bağlantılarını canlıya gönderirdi.
 */
function appUrl(): string {
  const configured = import.meta.env.VITE_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  return typeof window === 'undefined' ? '' : window.location.origin;
}

const NOT_CONFIGURED: AuthResult = {
  error:
    'Kimlik doğrulama henüz yapılandırılmadı. Supabase kurulumu tamamlandığında giriş aktif olacak.',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const clientPromise = getSupabase();
    if (!clientPromise) {
      setLoading(false);
      return;
    }

    let active = true;
    let unsubscribe: (() => void) | undefined;

    // SDK tembel yüklendiği için oturum kurulumu asenkron ilerler;
    // bu arada `loading` true kalır ve UI iskelet gösterir.
    void clientPromise.then(async (client) => {
      const { data } = await client.auth.getSession();
      if (!active) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      });

      // Etki bu noktaya gelmeden temizlendiyse aboneliği hemen kapat.
      if (!active) subscription.unsubscribe();
      else unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      configured: isSupabaseConfigured,

      async signIn(email, password, captchaToken) {
        const clientPromise = getSupabase();
        if (!clientPromise) return NOT_CONFIGURED;
        const client = await clientPromise;
        const { error } = await client.auth.signInWithPassword({
          email,
          password,
          ...(captchaToken ? { options: { captchaToken } } : {}),
        });
        return { error: error?.message ?? null };
      },

      async signUp(email, password, captchaToken) {
        const clientPromise = getSupabase();
        if (!clientPromise) return NOT_CONFIGURED;
        const client = await clientPromise;
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            /* Doğrulama e-postasındaki bağlantı yayındaki adrese
               dönmeli. `VITE_APP_URL` tanımlı değilse o anki köken
               kullanılıyor — yerel geliştirmede doğru davranış. */
            emailRedirectTo: `${appUrl()}/giris`,
            ...(captchaToken ? { captchaToken } : {}),
          },
        });
        return { error: error?.message ?? null };
      },

      async signInWithGoogle() {
        const clientPromise = getSupabase();
        if (!clientPromise) return NOT_CONFIGURED;
        const client = await clientPromise;
        const { error } = await client.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${appUrl()}/panel` },
        });
        return { error: error?.message ?? null };
      },

      async signOut() {
        const clientPromise = getSupabase();
        if (!clientPromise) return;
        const client = await clientPromise;
        await client.auth.signOut();
      },
    }),
    [user, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalıdır.');
  return ctx;
}
