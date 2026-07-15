import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import {
  formatQuotaLabel,
  MAX_ACTIVE_PHOTOS,
} from '@/domain/membership/quota';

/**
 * Üye paneli (§7.16). Kamuya açık sayfalardan farklı olarak daha işlevsel
 * bir yerleşime izin verilir (§6.6). Gerçek veriler hesap sistemi
 * bağlandığında dolacak; kota göstergesi domain kurallarından beslenir.
 */
export function PanelPage() {
  const { user, configured } = useAuth();

  // Hesap bağlanana kadar demo değerleri
  const activePhotos = 0;

  const menu: { label: string; to: string; note?: string }[] = [
    { label: 'Fotoğraflarım', to: '/panel', note: formatQuotaLabel(activePhotos) },
    { label: 'Fotoğraf Yükle', to: '/fotograflar/yukle' },
    { label: "Setup'larım", to: '/panel', note: 'Yakında' },
    { label: 'Planlarım', to: '/planlayici', note: 'Yakında' },
    { label: 'Etkinliklerim', to: '/etkinlikler' },
    { label: 'Kayıtlı Noktalar', to: '/harita/gozlem-noktalari' },
    { label: 'İlanlarım', to: '/ikinci-el', note: 'Yakında' },
    { label: 'Üyelik ve Ödeme', to: '/panel', note: 'Yakında' },
  ];

  return (
    <Container className="py-10 sm:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Üye Paneli
          </h1>
          <p className="mt-2 text-muted-foreground">
            {user
              ? `Hoş geldin, ${user.email}`
              : 'Hesap sistemi devreye alındığında burada içeriklerini yöneteceksin.'}
          </p>
        </div>
        {!user && (
          <ButtonLink to="/kayit" size="sm">
            Üye Ol
          </ButtonLink>
        )}
      </header>

      {!configured && (
        <p className="mb-8 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs text-warning">
          Hesap altyapısı (Supabase) henüz bağlanmadı — panel önizleme modunda.
        </p>
      )}

      {/* Genel bakış kartları */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface-1 p-5">
          <p className="text-xs text-muted-foreground">Fotoğraf kotası</p>
          <p className="tabular mt-1 text-2xl font-bold text-foreground">
            {formatQuotaLabel(activePhotos)}
          </p>
          <div
            role="progressbar"
            aria-valuenow={activePhotos}
            aria-valuemin={0}
            aria-valuemax={MAX_ACTIVE_PHOTOS}
            aria-label="Fotoğraf kotası kullanımı"
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(activePhotos / MAX_ACTIVE_PHOTOS) * 100}%` }}
            />
          </div>
        </div>
        <div className="rounded-card border border-border bg-surface-1 p-5">
          <p className="text-xs text-muted-foreground">Üyelik durumu</p>
          <p className="mt-1 text-2xl font-bold text-foreground">—</p>
          <Badge className="mt-3">Üyelik sistemi yakında</Badge>
        </div>
        <div className="rounded-card border border-border bg-surface-1 p-5">
          <p className="text-xs text-muted-foreground">Toplam entegrasyon</p>
          <p className="tabular mt-1 text-2xl font-bold text-foreground">0 sa</p>
          <p className="mt-3 text-xs text-muted-foreground/70">
            Yayımlanan fotoğraflarından hesaplanır
          </p>
        </div>
      </div>

      {/* Menü */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {menu.map((item) => (
          <li key={item.label}>
            <Link
              to={item.to}
              className="flex h-full items-center justify-between gap-2 rounded-card border border-border bg-surface-1 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-white/20 hover:bg-surface-2"
            >
              {item.label}
              {item.note && (
                <span className="tabular text-xs text-muted-foreground">
                  {item.note}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
