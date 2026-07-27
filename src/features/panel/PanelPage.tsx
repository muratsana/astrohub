import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { useAuth } from '@/features/auth/AuthContext';
import {
  formatQuotaLabel,
  MAX_ACTIVE_PHOTOS,
  MAX_DRAFT_PHOTOS,
} from '@/domain/membership/quota';
import { PageMeta } from '@/components/seo/PageMeta';

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
    {
      label: 'Fotoğraflarım',
      to: '/panel',
      note: formatQuotaLabel(activePhotos),
    },
    { label: 'Fotoğraf Yükle', to: '/galeri/yukle' },
    { label: "Setup'larım", to: '/panel', note: 'Yakında' },
    { label: 'Planlarım', to: '/planlayici', note: 'Yakında' },
    { label: 'Etkinliklerim', to: '/etkinlikler' },
    { label: 'Kayıtlı Noktalar', to: '/saha' },
    { label: 'İlanlarım', to: '/ilanlar', note: 'Yakında' },
    { label: 'Üyelik ve Ödeme', to: '/panel', note: 'Yakında' },
  ];

  return (
    <>
      <PageMeta
        title="Üye Paneli"
        description="Fotoğraflarınız, kotanız, setuplarınız ve üyelik durumunuz."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Üye Paneli"
          description={
            user
              ? `Hoş geldin, ${user.email}`
              : 'Hesap sistemi devreye alındığında burada içeriklerini yöneteceksin.'
          }
          actions={
            !user && (
              <ButtonLink to="/kayit" size="sm">
                Üye Ol
              </ButtonLink>
            )
          }
        />

        {!configured && (
          <p className="mb-4 rounded-card border border-warning/35 bg-surface-1 px-3 py-2.5 text-[11.5px] leading-relaxed text-warning">
            Hesap altyapısı (Supabase) henüz bağlanmadı — panel önizleme
            modunda. Buradaki sayılar gerçek değil, kural örnekleridir.
          </p>
        )}

        {/* Genel bakış — ölçüm kutuları sitenin geri kalanıyla aynı dilde */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout
            label="Fotoğraf kotası"
            value={formatQuotaLabel(activePhotos)}
            hint={`${MAX_ACTIVE_PHOTOS - activePhotos} hak kaldı`}
          />
          <Readout
            label="Taslak"
            value={`0 / ${MAX_DRAFT_PHOTOS}`}
            hint="yayımlanmamış kayıt"
            tone="cold"
          />
          <Readout
            label="Üyelik"
            value="—"
            hint="üyelik sistemi yakında"
            tone="muted"
          />
          <Readout
            label="Toplam entegrasyon"
            value="0"
            unit="sa"
            hint="yayımlanan kayıtlardan"
            tone="plain"
          />
        </div>

        <Panel title="Kota kullanımı" className="mb-4">
          <div
            role="progressbar"
            aria-valuenow={activePhotos}
            aria-valuemin={0}
            aria-valuemax={MAX_ACTIVE_PHOTOS}
            aria-label="Fotoğraf kotası kullanımı"
            className="h-1.5 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(activePhotos / MAX_ACTIVE_PHOTOS) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Aynı fotoğrafın işleme sürümleri kotada ayrı kayıt sayılmaz; bir
            fotoğraf kaç sürüme sahip olursa olsun tek hak tüketir (§4.2).
          </p>
        </Panel>

        {/* Menü */}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {menu.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                className="flex h-full items-center justify-between gap-2 rounded-card border border-border bg-surface-1 px-4 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-2"
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
    </>
  );
}
