import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/cn';
import { IcerikSekmeleri } from './IcerikSekmeleri';
import { UserControl } from './UserControl';
import { RecordsControl, AuditControl } from './RecordsControl';
import { CommentsControl } from './CommentsControl';
import { ForumCategories } from './ForumCategories';
import { FeaturedControl } from './FeaturedControl';
import { SiteControl } from './SiteControl';
import { BroadcastControl } from './BroadcastControl';
import { RadioControl } from './RadioControl';
import { TvControl } from './TvControl';
import { ReminderControl } from './ReminderControl';
import { CatalogControl } from './CatalogControl';
import { EquipmentDataControl } from './EquipmentDataControl';
import { SpecImportControl } from './SpecImportControl';
import { useRoles } from './useRoles';
import type { EntryKind } from '@/services/content/entries';
import { fetchDashboard, type DashboardStats } from './records';
import type { RecordKind } from './records';
import { formatAdminCount } from './dashboard';
import {
  AlertIcon,
  BellIcon,
  BookIcon,
  CalendarIcon,
  GridIcon,
  HomeIcon,
  ImageIcon,
  ListIcon,
  PlayIcon,
  RadioIcon,
  SparkleIcon,
  TagIcon,
  UsersIcon,
} from '@/components/ui/icons';

type AdminSectionId =
  | 'genel'
  | 'onay'
  | 'kullanicilar'
  | 'icerik'
  | 'moderasyon'
  | 'destek'
  | 'hata'
  | 'aktivite'
  | 'link'
  | 'eposta'
  | 'duyuru'
  | 'sayfa'
  | 'ayar';

const navGroups: readonly {
  title?: string;
  items: readonly {
    id: AdminSectionId;
    label: string;
    path: string;
    icon: typeof HomeIcon;
  }[];
}[] = [
  {
    items: [
      { id: 'genel', label: 'Genel Bakış', path: '/admin', icon: HomeIcon },
      {
        id: 'onay',
        label: 'Onay Kuyruğu',
        path: '/admin/onay-kuyrugu',
        icon: GridIcon,
      },
      {
        id: 'kullanicilar',
        label: 'Kullanıcılar',
        path: '/admin/kullanicilar',
        icon: UsersIcon,
      },
      { id: 'icerik', label: 'İçerik', path: '/admin/icerik', icon: BookIcon },
      {
        id: 'moderasyon',
        label: 'Moderasyon',
        path: '/admin/moderasyon',
        icon: AlertIcon,
      },
      { id: 'destek', label: 'Destek', path: '/admin/destek', icon: BellIcon },
    ],
  },
  {
    title: 'Sistem',
    items: [
      {
        id: 'hata',
        label: 'Hata Günlükleri',
        path: '/admin/hata-gunlukleri',
        icon: AlertIcon,
      },
      {
        id: 'aktivite',
        label: 'Aktivite',
        path: '/admin/aktivite',
        icon: ListIcon,
      },
      {
        id: 'link',
        label: 'Link Sağlığı',
        path: '/admin/link-sagligi',
        icon: TagIcon,
      },
      {
        id: 'eposta',
        label: 'E-posta Sağlığı',
        path: '/admin/e-posta-sagligi',
        icon: BellIcon,
      },
      {
        id: 'duyuru',
        label: 'Duyurular',
        path: '/admin/duyurular',
        icon: RadioIcon,
      },
      {
        id: 'sayfa',
        label: 'Sayfalar',
        path: '/admin/sayfalar',
        icon: ImageIcon,
      },
      { id: 'ayar', label: 'Ayarlar', path: '/admin/ayarlar', icon: GridIcon },
    ],
  },
];

const sections = navGroups.flatMap((group) => group.items);

const routeAliases: Record<string, AdminSectionId> = {
  '/admin/gallery': 'icerik',
  '/admin/news': 'icerik',
  '/admin/articles': 'icerik',
  '/admin/content': 'icerik',
  '/admin/events': 'icerik',
  '/admin/listings': 'icerik',
  '/admin/sites': 'icerik',
  '/admin/media': 'icerik',
  '/admin/forum': 'moderasyon',
  '/admin/moderation': 'moderasyon',
  '/admin/users': 'kullanicilar',
  '/admin/broadcast': 'duyuru',
  '/admin/radio': 'duyuru',
  '/admin/tv': 'duyuru',
  '/admin/notifications': 'eposta',
  '/admin/site-settings': 'ayar',
  '/admin/catalog': 'ayar',
  '/admin/audit': 'aktivite',
};

type StatTone = 'warning' | 'primary' | 'success' | 'cold';

const STATIC_STATS = [
  ['Açık şikayet', '—', 'Moderasyon bekliyor', 'warning'],
  ['Açık destek', '—', 'Yanıt bekleyen talep', 'primary'],
  ['Açık hata', '—', 'İstemci hata günlüğü', 'success'],
] as const satisfies readonly (readonly [string, string, string, StatTone])[];

function dashboardStats(data: DashboardStats | null) {
  return [
    [
      'Onay bekleyen',
      formatAdminCount(data?.moderasyonBekleyen),
      'Kuyruktaki içerikler',
      'warning',
    ],
    ...STATIC_STATS,
    [
      'Kullanıcı',
      formatAdminCount(data?.kullaniciToplam),
      'Toplam üye',
      'cold',
    ],
    [
      'İçerik',
      formatAdminCount(data?.icerikYayinda),
      'Yayındaki kayıt',
      'primary',
    ],
  ] as const satisfies readonly (readonly [
    string,
    string,
    string,
    StatTone,
  ])[];
}

const trendRows = [
  ['Yeni kullanıcı (30g)', '142', [8, 12, 9, 14, 18, 21, 20, 24]],
  ['Yeni etkinlik (30g)', '15', [1, 2, 1, 3, 3, 4, 2, 5]],
  ['Galeri yükleme (30g)', '86', [6, 8, 7, 11, 9, 15, 13, 17]],
  ['Mesaj (30g)', '430', [18, 24, 28, 32, 44, 51, 47, 62]],
] as const;

const contentRows = [
  ['Haftanın fotoğrafı', 'Yayın kuyruğu hazır', '06 görsel'],
  ['Etkinlikler', 'Tarih aralıkları kontrol edildi', '15 kayıt'],
  ['Forum', 'Başlık → konu akışı', '7 konu'],
  ['Araçlar', 'Katalog ve hesaplayıcılar', '8 araç'],
] as const;

const queueRows = [
  ['Fotoğraf inceleme', '3 yeni yükleme', 'Öncelik yüksek'],
  ['Topluluk başvurusu', '2 kayıt bekliyor', 'Belge kontrolü'],
  ['Etkinlik önerisi', '5 taslak', 'Tarih / konum kontrolü'],
  ['Kullanıcı bildirimi', '8 mesaj', 'Yanıt bekliyor'],
] as const;

const timeline = [
  ['09:10', 'Ana sayfa modülleri tarandı'],
  ['10:25', 'Etkinlik tarih formatı güncellendi'],
  ['13:40', 'Forum görünümü sadeleştirildi'],
  ['16:00', 'Canlı yayın otomasyonu kontrol edildi'],
] as const;

const healthRows = [
  ['Onay bekleyen fotoğraf', '3'],
  ['Onay bekleyen etkinlik', '5'],
  ['Açık şikayet', '6'],
  ['Bugünkü yeni kullanıcı', '24'],
  ['Son 7 gün yorum', '118'],
  ['Görseli olmayan haber', '0'],
] as const;

const topClicks = [
  ['Etkinlik detayı', 'Ethem Hoca ile Gökyüzü Gözlem Şenliği', '126'],
  ['Galeri', 'Haftanın fotoğrafı arşivi', '94'],
  ['Araç', 'Gökyüzü Kataloğu', '88'],
  ['Forum', 'Ekipmanlar', '52'],
] as const;

export function AdminPage() {
  const { user, configured, loading } = useAuth();
  const roles = useRoles();
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const active = useActiveSection(location.pathname);
  const contentKind = getContentKind(search.get('kind'));
  const recordKind = getRecordKind(location.pathname, search.get('record'));
  const targetSlug = search.get('slug') ?? undefined;
  const ready = configured && roles.status !== 'unconfigured';

  return (
    <>
      <PageMeta
        title="AstroHub Admin"
        description="AstroHub yönetim paneli."
        noIndex
      />
      <Container className="max-w-admin py-6 sm:py-8">
        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="rounded-card border border-border-strong bg-surface-1/90 p-3 shadow-overlay lg:sticky lg:top-20 lg:self-start">
            <div className="border-b border-border px-2 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-card border border-primary/45 bg-primary/10 text-primary">
                  <SparkleIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-display text-caption font-bold tracking-[0.16em] text-foreground">
                    ASTROHUB
                  </p>
                  <p className="text-meta text-faint">Admin Console</p>
                </div>
              </div>
              <Badge
                tone={roles.isAdmin ? 'primary' : 'warning'}
                className="mt-3"
              >
                {roles.isAdmin ? 'Yönetici' : 'Yetki kontrollü'}
              </Badge>
            </div>

            <nav aria-label="Yönetim bölümleri" className="mt-4 space-y-5">
              {navGroups.map((group, groupIndex) => (
                <div key={group.title ?? groupIndex}>
                  {group.title ? (
                    <p className="mb-2 px-3 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-faint">
                      {group.title}
                    </p>
                  ) : null}
                  <ul className="grid gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const selected = active === item.id;
                      return (
                        <li key={item.id}>
                          <Link
                            to={item.path}
                            aria-current={selected ? 'page' : undefined}
                            className={cn(
                              'flex items-center gap-3 rounded-card px-3 py-2 text-body-sm font-medium transition-colors',
                              selected
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                            )}
                          >
                            <Icon className="h-[18px] w-[18px] shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 space-y-4">
            <header className="rounded-card border border-border-strong bg-[radial-gradient(circle_at_top_right,rgba(255,160,38,0.18),transparent_34%),linear-gradient(135deg,var(--surface-1),var(--background))] p-5 shadow-overlay">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="label text-primary">Yönetim Paneli</p>
                  <h1 className="type-page mt-2 max-w-3xl font-display font-bold text-foreground">
                    Platformun anlık nabzı
                  </h1>
                  <p className="mt-3 max-w-2xl text-body-sm leading-relaxed text-muted-foreground">
                    StageHub admin düzeninden uyarlanan kabuk; kullanıcı,
                    içerik, moderasyon, yayın ve sistem yüzeyleri mevcut
                    AstroHub kontrollerine bağlıdır.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" disabled>
                    Komut paleti ⌘K
                  </Button>
                  <Button type="button" size="sm" disabled>
                    Rapor al
                  </Button>
                </div>
              </div>
            </header>

            {!ready ? (
              <EmptyState
                message="Veritabanı bağlantısı yapılandırılmamış"
                hint="Yönetim paneli Supabase yapılandırmasıyla çalışır."
              />
            ) : loading || roles.status === 'loading' ? (
              <p
                className="py-10 text-center text-meta text-muted-foreground"
                role="status"
              >
                Yetkiler kontrol ediliyor…
              </p>
            ) : !user ? (
              <EmptyState
                message="Bu sayfa için giriş gerekli"
                hint="Yönetim paneli yalnızca yetkili hesaplara açıktır."
                action={
                  <ButtonLink to="/giris" size="sm">
                    Giriş Yap
                  </ButtonLink>
                }
              />
            ) : !roles.canAccessAdmin ? (
              <EmptyState
                message="Bu hesapta yönetim yetkisi yok"
                hint="Yönetim paneline admin ve moderatör rolleri erişebilir."
                action={
                  <ButtonLink to="/panel" size="sm" variant="secondary">
                    Üye Paneli
                  </ButtonLink>
                }
              />
            ) : active === 'genel' ? (
              <Dashboard />
            ) : (
              <AdminSection
                active={active}
                isAdmin={roles.isAdmin}
                contentKind={contentKind}
                recordKind={recordKind}
                targetSlug={targetSlug}
              />
            )}
          </main>
        </div>
      </Container>
    </>
  );
}

function AdminSection({
  active,
  isAdmin,
  contentKind,
  recordKind,
  targetSlug,
}: {
  active: AdminSectionId;
  isAdmin: boolean;
  contentKind: EntryKind;
  recordKind?: RecordKind;
  targetSlug?: string;
}) {
  if (active === 'onay' || active === 'moderasyon') {
    return (
      <div className="space-y-4">
        <RecordsControl kinds={['photo', 'listing', 'event', 'site']} />
        <CommentsControl />
      </div>
    );
  }

  if (active === 'kullanicilar') {
    return isAdmin ? (
      <div className="space-y-4">
        <UserControl />
        <AuditControl />
      </div>
    ) : (
      <EmptyState
        message="Kullanıcı yönetimi yalnızca yöneticilere açık"
        hint="Moderatör rolüyle içerik ve moderasyon bölümleri kullanılabilir."
      />
    );
  }

  if (active === 'icerik') {
    return (
      <IcerikSekmeleri
        canWrite={isAdmin}
        contentKind={contentKind}
        recordKind={recordKind}
        targetSlug={targetSlug}
      />
    );
  }

  if (active === 'destek' || active === 'eposta') {
    return <ReminderControl canWrite={isAdmin} />;
  }

  if (active === 'duyuru') {
    return (
      <div className="space-y-4">
        <BroadcastControl />
        <div className="grid gap-4 xl:grid-cols-2">
          <RadioControl canWrite={isAdmin} />
          <TvControl canWrite={isAdmin} />
        </div>
      </div>
    );
  }

  if (active === 'sayfa') {
    return (
      <div className="space-y-4">
        <FeaturedControl canWrite={isAdmin} />
        <SiteControl canWrite={isAdmin} />
      </div>
    );
  }

  if (active === 'ayar' || active === 'link') {
    return (
      <div className="space-y-4">
        <SiteControl canWrite={isAdmin} />
        <CatalogControl canWrite={isAdmin} />
        <EquipmentDataControl canWrite={isAdmin} />
        <SpecImportControl canWrite={isAdmin} />
      </div>
    );
  }

  if (active === 'hata' || active === 'aktivite') {
    return <AuditControl />;
  }

  return (
    <div className="space-y-4">
      <ForumCategories canWrite={isAdmin} />
      <RecordsControl kinds={['thread']} title="Forum konuları" />
      <CommentsControl kinds={['forumPost']} />
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetchDashboard()
      .then((nextData) => {
        if (!alive) return;
        setData(nextData);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setData(null);
        setError(
          err instanceof Error ? err.message : 'Dashboard verisi alınamadı'
        );
      });

    return () => {
      alive = false;
    };
  }, []);

  const stats = dashboardStats(data);

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map(([label, value, hint, tone]) => (
          <div
            key={label}
            className={cn(
              'rounded-card border bg-surface-1 p-4 transition-transform hover:-translate-y-0.5',
              tone === 'warning'
                ? 'border-warning/35 bg-warning/10'
                : 'border-border'
            )}
          >
            <p className="label">{label}</p>
            <p
              className={cn(
                'tabular mt-2 font-display text-2xl font-bold leading-none',
                tone === 'success' && 'text-success',
                tone === 'primary' && 'text-primary',
                tone === 'cold' && 'text-cold',
                tone === 'warning' && 'text-warning'
              )}
            >
              {value}
            </p>
            <p className="mt-2 text-meta text-faint">{hint}</p>
          </div>
        ))}
      </section>
      {error ? (
        <p className="text-meta text-warning" role="status">
          Canlı dashboard verisi alınamadı: {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {trendRows.map(([label, value, values]) => (
          <article
            key={label}
            className="rounded-card border border-border bg-surface-1 p-4 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-meta text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold leading-none text-foreground">
                  {value}
                </p>
              </div>
              <Sparkline values={values} />
            </div>
            <p className="mt-3 text-meta text-success">
              +12% son 7 gün vs önceki 7
            </p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <section className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="label text-foreground">İçerik Akışı</h2>
              <p className="mt-1 text-meta text-faint">
                Yayın, vitrin ve katalog yüzeyleri
              </p>
            </div>
            <Badge tone="primary">4 modül</Badge>
          </header>
          <div className="grid gap-px bg-border md:grid-cols-2">
            {contentRows.map(([title, text, meta], index) => (
              <article
                key={title}
                className="bg-surface-1 p-4 transition-colors hover:bg-surface-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <IconTile index={index} />
                  <Badge tone={index === 0 ? 'warning' : 'muted'}>{meta}</Badge>
                </div>
                <h3 className="mt-4 text-body-sm font-semibold text-foreground">
                  {title}
                </h3>
                <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="label text-foreground">İş Kuyruğu</h2>
              <p className="mt-1 text-meta text-faint">Özet iş listesi</p>
            </div>
            <Badge tone="warning">18 açık</Badge>
          </header>
          <ul className="divide-y divide-border">
            {queueRows.map(([title, text, meta]) => (
              <li key={title} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-body-sm font-semibold text-foreground">
                      {title}
                    </p>
                    <p className="mt-1 text-meta text-muted-foreground">{text}</p>
                  </div>
                  <span className="tabular text-meta text-primary">{meta}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-card border border-border bg-surface-1 xl:col-span-2">
          <header className="border-b border-border px-4 py-3">
            <h2 className="label text-foreground">Sistem Sağlığı</h2>
          </header>
          <div className="grid gap-px bg-border sm:grid-cols-2">
            {healthRows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 bg-surface-1 px-4 py-3"
              >
                <span className="text-body-sm text-muted-foreground">{label}</span>
                <span className="tabular text-body-sm font-semibold text-foreground">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card border border-border bg-surface-1">
          <header className="border-b border-border px-4 py-3">
            <h2 className="label text-foreground">Son Hareketler</h2>
          </header>
          <ol className="divide-y divide-border">
            {timeline.map(([time, text]) => (
              <li key={`${time}-${text}`} className="flex gap-3 px-4 py-3">
                <span className="tabular text-meta text-primary">{time}</span>
                <span className="text-meta leading-relaxed text-muted-foreground">
                  {text}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <SparkleIcon className="h-4 w-4 text-primary" />
            <h2 className="label text-foreground">
              Son 7 günün en çok tıklananları
            </h2>
          </header>
          <ul className="divide-y divide-border">
            {topClicks.map(([kind, title, count]) => (
              <li
                key={`${kind}-${title}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block text-body-sm font-medium text-foreground">
                    {kind}
                  </span>
                  <span className="block truncate text-meta text-muted-foreground">
                    {title}
                  </span>
                </span>
                <span className="tabular text-body-sm font-semibold text-foreground">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-card border border-border bg-surface-1">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <PlayIcon className="h-4 w-4 text-primary" />
            <h2 className="label text-foreground">Zamanlanmış işler</h2>
          </header>
          <ul className="divide-y divide-border">
            {[
              ['nightly-content-sync', '02:15 · aktif', 'succeeded'],
              ['event-reminder-digest', '09:00 · aktif', 'succeeded'],
              ['broken-link-check', '12:00 · aktif', 'bilgi yok'],
              ['catalog-refresh', 'haftalık · aktif', 'succeeded'],
            ].map(([job, schedule, status]) => (
              <li
                key={job}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-body-sm font-medium text-foreground">
                    {job}
                  </span>
                  <span className="block text-meta text-muted-foreground">
                    {schedule}
                  </span>
                </span>
                <Badge tone={status === 'succeeded' ? 'success' : 'muted'}>
                  {status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

function useActiveSection(pathname: string): AdminSectionId {
  const normalized = pathname.replace(/\/+$/, '') || '/admin';
  const exact = sections.find((item) => item.path === normalized);
  return exact?.id ?? routeAliases[normalized] ?? 'genel';
}

function getContentKind(value: string | null): EntryKind {
  if (value === 'yazi' || value === 'sozluk' || value === 'sss') return value;
  return 'haber';
}

function getRecordKind(
  pathname: string,
  value: string | null
): RecordKind | undefined {
  if (
    value === 'photo' ||
    value === 'listing' ||
    value === 'event' ||
    value === 'site'
  ) {
    return value;
  }
  const normalized = pathname.replace(/\/+$/, '');
  if (normalized === '/admin/events') return 'event';
  if (normalized === '/admin/listings') return 'listing';
  if (normalized === '/admin/sites') return 'site';
  return undefined;
}

function IconTile({ index }: { index: number }) {
  const icons = [ImageIcon, CalendarIcon, ListIcon, TagIcon] as const;
  const Icon = icons[index] ?? ImageIcon;
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-card border border-border-strong bg-background text-muted-foreground">
      <Icon className="h-5 w-5" />
    </span>
  );
}

function Sparkline({ values }: { values: readonly number[] }) {
  const width = 112;
  const height = 34;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const step = width / Math.max(1, values.length - 1);
  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });
  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`)
    .join(' ');
  const last = points[points.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible text-primary"
      aria-hidden
    >
      <path
        d={`${line} L${width},${height} L0,${height} Z`}
        fill="currentColor"
        opacity="0.12"
      />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill="currentColor" />
    </svg>
  );
}
