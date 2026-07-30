import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { LogoMark } from '@/components/shell/LogoMark';
import { useAuth } from './AuthContext';
import { PageMeta } from '@/components/seo/PageMeta';

/**
 * Auth sayfaları için ortak yerleşim — bir terminal oturum açma ekranı.
 *
 * Kart yuvarlak köşeli bir "modal" değil, hairline çerçeveli bir panel.
 * Üstte plaka işareti ve başlık satırı, ortada form, altta geçiş bağlantısı.
 * Supabase yapılandırılmamışsa kurulum uyarısı formun üstünde durur.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  const { configured } = useAuth();

  return (
    <Container className="flex min-h-[72vh] items-center justify-center py-14">
      {/* Auth sayfaları indekslenmez (§16.2). */}
      <PageMeta title={title} description={subtitle} noIndex />

      <div className="w-full max-w-[380px]">
        <div className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center gap-3 border-b border-border px-5 py-4">
            <LogoMark className="h-8 w-8 shrink-0 text-primary" />
            <div className="min-w-0">
              <h1 className="text-[17px] text-foreground">{title}</h1>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </header>

          {!configured && (
            <div
              role="status"
              className="border-b border-warning/25 bg-warning/8 px-5 py-3 text-[11px] leading-relaxed text-warning"
            >
              Kimlik doğrulama henüz yapılandırılmadı. Formu deneyebilirsiniz;
              Supabase kurulumu tamamlandığında giriş/kayıt aktif olacak.
            </div>
          )}

          <div className="px-5 py-5">{children}</div>
        </div>

        <p className="mt-4 text-center text-[12px] text-muted-foreground">
          {footer}
        </p>

        <p className="mt-2 text-center">
          <Link
            to="/"
            className="text-[10px] tracking-[0.04em] text-faint transition-colors hover:text-foreground"
          >
            ← Ana sayfa
          </Link>
        </p>
      </div>
    </Container>
  );
}
