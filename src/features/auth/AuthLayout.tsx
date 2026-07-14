import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { useAuth } from './AuthContext';

/** Ortalanmış auth kartı + kurulum uyarısı (Supabase yapılandırılmamışsa). */
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
    <Container className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface-1 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>

          {!configured && (
            <div
              role="status"
              className="mt-5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning"
            >
              Kimlik doğrulama henüz yapılandırılmadı. Formu deneyebilirsiniz;
              Supabase kurulumu tamamlandığında giriş/kayıt aktif olacak.
            </div>
          )}

          <div className="mt-6">{children}</div>
        </div>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {footer}
        </p>

        <p className="mt-2 text-center text-xs text-muted-foreground/70">
          <Link to="/" className="hover:text-foreground">
            ← Ana sayfaya dön
          </Link>
        </p>
      </div>
    </Container>
  );
}
