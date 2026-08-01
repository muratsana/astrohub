import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { CONSENT_VERSION } from './consent';
import { authRedirect } from './redirect';
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
  /** `consentAccepted`: kayıt formundaki iki onay kutusu da işaretlendi mi. */
  signUp: (
    email: string,
    password: string,
    captchaToken?: string,
    consentAccepted?: boolean
  ) => Promise<AuthResult>;
  /**
   * Google ile giriş — tarayıcıyı Google'a yönlendirir.
   *
   * CAPTCHA almıyor: doğrulamayı Google'ın kendi akışı yapıyor ve
   * yönlendirme öncesi bir widget çözdürmek kullanıcıyı iki kez
   * doğrulatmak olurdu.
   */
  signInWithGoogle: () => Promise<AuthResult>;
  /** Yalnızca bu cihazdaki oturumu kapatır; diğer cihazlar açık kalır. */
  signOut: () => Promise<void>;
  /**
   * Kullanıcının TÜM cihazlardaki oturumlarını iptal eder.
   *
   * Neden ayrı bir işlem: normal çıkış yalnızca bu tarayıcıdaki
   * yenileme jetonunu düşürür. Telefonunu kaybeden ya da ortak
   * bilgisayarda oturumunu açık bıraktığını fark eden kullanıcının,
   * o cihaza fiziksel erişimi olmadan oturumu sonlandırabilmesi
   * gerekiyor — şifre değiştirmek tek başına bunu yapmıyor.
   */
  signOutEverywhere: () => Promise<AuthResult>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

      async signUp(email, password, captchaToken, consentAccepted = false) {
        const clientPromise = getSupabase();
        if (!clientPromise) return NOT_CONFIGURED;
        const client = await clientPromise;
        const { error } = await client.auth.signUp({
          email,
          password,
          options: {
            /*
             * Onay burada YALNIZCA BİR BAYRAK olarak gidiyor, zaman
             * damgası olarak değil: tarihi istemcinin göndermesi, ispat
             * değeri olan bir alanı istemcinin saatine bağlamak olurdu.
             * `app.handle_new_user` bayrağı görüp `now()` yazıyor.
             */
            data: {
              consent_accepted: consentAccepted,
              consent_version: CONSENT_VERSION,
            },
            /* Doğrulama e-postasındaki bağlantı yayındaki adrese dönmeli.
               Tanınmayan bir kökende adres üretilmiyor; o durumda Supabase
               kendi Site URL'ini kullanır (bkz. `authRedirect`). */
            emailRedirectTo: authRedirect('/giris'),
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
          options: { redirectTo: authRedirect('/panel') },
        });
        return { error: error?.message ?? null };
      },

      async signOut() {
        const clientPromise = getSupabase();
        if (!clientPromise) return;
        const client = await clientPromise;
        await client.auth.signOut();
      },

      async signOutEverywhere() {
        const clientPromise = getSupabase();
        if (!clientPromise) return NOT_CONFIGURED;
        const client = await clientPromise;
        /*
         * `scope: 'global'` kullanıcının bütün yenileme jetonlarını
         * sunucuda geçersiz kılıyor. Diğer cihazlardaki erişim jetonu
         * süresi dolana kadar (varsayılan 1 saat) çalışmaya devam eder;
         * bu Supabase'in JWT tasarımının sonucu, burada kapatılamıyor.
         * Kullanıcıya bunu söylemek arayüzün işi — sessizce "hepsi
         * kapandı" demek yanlış olurdu.
         */
        const { error } = await client.auth.signOut({ scope: 'global' });
        return { error: error?.message ?? null };
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
