import { useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { Panel } from '@/components/ui/Panel';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { relativeTime } from '@/lib/relativeTime';
import { cn } from '@/lib/cn';
import {
  archiveNotification,
  deleteNotification,
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
  useUnreadCount,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationItem,
  type NotificationView,
} from '@/services/content/notifications';
import { NotificationPreferences } from './NotificationPreferences';

/**
 * BİLDİRİM MERKEZİ.
 *
 * §8.13'ün karşılığı. Üç şey aynı sayfada: gelen kutusu, arşiv ve
 * tercihler. Tercihleri ayrı bir sayfaya koymak, "bu bildirimi neden
 * aldım" sorusunu soran kullanıcıyı gezinmeye zorlamak olurdu — cevabın
 * yeri, sorunun sorulduğu yer.
 *
 * KATEGORİ SEKMELERİ SUNUCUDAN SÜZÜYOR. Elli satır indirip beşini
 * göstermek, "daha fazla" sayacını da yanlış yapardı.
 */

/**
 * Sekmeler SİCİLDEN türüyor, elle yazılmıyor.
 *
 * Burada daha önce altı elemanlı sabit bir dizi vardı ve kategori kümesi
 * beşten ona çıktığında güncellenmedi: mesaj, galeri, forum ve moderasyon
 * bildirimleri hiçbir sekmeye düşmüyor, yalnızca "Tümü" altında
 * görünüyorlardı. Sekmeleri gezen kullanıcı, mesaj bildirimlerinin
 * kaybolduğu sonucuna varırdı. Liste artık tercih ekranıyla aynı kaynaktan
 * besleniyor; ikisinin ayrı ayrı unutulması mümkün değil.
 *
 * `sistem` sekmesi VAR ama tercih ekranında kutusu YOK — sicil bu ayrımı
 * `toggleable` ile taşıyor. Kapatılamayan bildirim de okunuyor; süzmek
 * ile susturmak farklı iki şey.
 */
const CATEGORY_TABS: { key: NotificationCategory | 'tumu'; label: string }[] = [
  { key: 'tumu', label: 'Tümü' },
  ...NOTIFICATION_CATEGORIES.map(({ key, label }) => ({ key, label })),
];

/**
 * Tek bildirim satırı.
 *
 * BAĞLANTISI OLMAYAN BİLDİRİM DÜZ SATIR. Kaynağı silinmiş ya da hiç
 * gidilecek yeri olmayan bir bildirimi tıklanabilir göstermek,
 * kullanıcıyı "bulunamadı" sayfasına yollamaktı. Metin satırda
 * donduruluyor (0042), yani kayıt silinse bile bildirim OKUNUR kalıyor —
 * yalnızca gidilecek yeri kalmıyor.
 */
function NotificationRow({
  item,
  onRead,
  onArchive,
  onDelete,
}: {
  item: NotificationItem;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const unread = !item.readAt;

  const content = (
    <>
      {/*
        Okunmamış işareti nokta, kalın yazı değil: bir listede kalın ve
        normal satırların karışması okumayı zorlaştırıyor. Nokta durumu
        söylüyor, tipografi sabit kalıyor.
      */}
      <span
        aria-hidden
        className={cn(
          'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
          unread ? 'bg-primary' : 'bg-transparent'
        )}
      />
      <span className="min-w-0">
        <span
          className={cn(
            'block text-caption leading-snug',
            item.url
              ? 'text-foreground group-hover:text-primary'
              : 'text-foreground'
          )}
        >
          {item.title}
        </span>
        {item.body && (
          <span className="mt-0.5 block truncate text-meta text-muted-foreground">
            {item.body}
          </span>
        )}
        <span className="mt-1 block text-meta text-faint">
          {relativeTime(item.createdAt)}
          {unread && <span className="sr-only"> · okunmadı</span>}
        </span>
      </span>
    </>
  );

  /* Sarmalayıcı tek katman: bağlantı ve düz satır AYNI yerleşimi
     paylaşıyor, yalnızca eleman türü değişiyor. İçeriği ayrıca bir
     `span`e sarmak, aynı flex kutusunu iki kez kurmak olurdu. */
  const shared = 'flex min-w-0 flex-1 items-start gap-2.5';

  return (
    <li className="border-b border-border last:border-0">
      <div className="flex items-start justify-between gap-3 py-2.5">
        {item.url ? (
          <Link
            to={item.url}
            onClick={() => unread && onRead(item.id)}
            className={`group ${shared}`}
          >
            {content}
          </Link>
        ) : (
          <div className={shared}>{content}</div>
        )}

        <span className="flex shrink-0 items-center gap-1">
          {unread && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRead(item.id)}
            >
              Okundu
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              item.archivedAt ? onDelete(item.id) : onArchive(item.id)
            }
          >
            {item.archivedAt ? 'Sil' : 'Arşivle'}
          </Button>
        </span>
      </div>
    </li>
  );
}

export function NotificationsPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const [view, setView] = useState<NotificationView>('gelen');
  const [category, setCategory] = useState<NotificationCategory | 'tumu'>('tumu');
  const [actionError, setActionError] = useState<string | null>(null);

  const { items, loading, error, refresh } = useNotifications(view, category);
  const { count, refresh: refreshCount } = useUnreadCount();

  /* Her yazma işleminden sonra hem liste hem rozet tazeleniyor: ikisi ayrı
     sorgudan besleniyor ve yalnızca birini yenilemek, rozeti listeyle
     çelişen bir sayıda bırakırdı. */
  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
      refresh();
      refreshCount();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'İşlem tamamlanamadı');
    }
  }

  return (
    <>
      <PageMeta
        title="Bildirimler"
        description="Takip, yorum, etkinlik ve sistem bildirimlerin."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Bildirimler"
          description="Sana ne olduğunu buradan takip edersin; hangi kategorileri alacağını aşağıdan seçersin."
          meta={count > 0 ? `${count} okunmamış` : undefined}
          actions={
            user && count > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void run(markAllNotificationsRead)}
              >
                Tümünü okundu işaretle
              </Button>
            ) : undefined
          }
        />

        {/*
          OTURUMSUZ HÂL BİR HATA DEĞİL, BİR YÖNLENDİRME. Bildirimler
          kişiye ait; ziyaretçiye boş liste göstermek "bildirimin yok"
          demek olurdu, oysa doğru cümle "kim olduğunu bilmiyoruz".
        */}
        {!authLoading && !user && (
          <EmptyState
            message="Bildirimleri görmek için giriş yapmalısın."
            hint="Takip, yorum ve etkinlik bildirimleri hesabına bağlıdır."
            action={
              <ButtonLink to="/giris" size="sm">
                Giriş yap
              </ButtonLink>
            }
          />
        )}

        {!configured && user && (
          <Alert tone="warning" className="mb-4">
            Hesap altyapısı bağlanmadan bildirimler okunamaz.
          </Alert>
        )}

        {user && configured && (
          <>
            {/* Gelen / arşiv — iki durum, sekme değil segment. */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Bildirim görünümü"
                className="flex overflow-hidden rounded-card border border-border"
              >
                {(
                  [
                    ['gelen', 'Gelen'],
                    ['arsiv', 'Arşiv'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => setView(key)}
                    className={cn(
                      'h-8 px-3.5 text-meta font-medium tracking-[0.03em] transition-colors',
                      view === key
                        ? 'bg-surface-2 text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div
              role="tablist"
              aria-label="Bildirim kategorisi"
              className="mb-4 flex flex-wrap gap-1.5"
            >
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={category === tab.key}
                  onClick={() => setCategory(tab.key)}
                  className={cn(
                    'h-8 rounded-card border px-3 text-meta tracking-[0.03em] transition-colors',
                    category === tab.key
                      ? 'border-primary text-primary'
                      : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {actionError && (
              <Alert tone="danger" className="mb-3">
                {actionError}
              </Alert>
            )}

            <Panel className="mb-6" bodyClassName="px-4 py-1">
              {loading && items.length === 0 ? (
                <p className="py-10 text-center text-meta text-muted-foreground">
                  Bildirimler okunuyor…
                </p>
              ) : error ? (
                <div className="py-10 text-center">
                  <p className="text-body-sm text-danger">{error}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={refresh}
                  >
                    Yeniden dene
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <p className="py-10 text-center text-meta leading-relaxed text-muted-foreground">
                  {view === 'arsiv'
                    ? 'Arşivde bildirim yok.'
                    : category === 'tumu'
                      ? 'Henüz bildirimin yok. Biri fotoğrafına yorum yaptığında ya da seni takip ettiğinde burada görünür.'
                      : 'Bu kategoride bildirimin yok.'}
                </p>
              ) : (
                <ul>
                  {items.map((item) => (
                    <NotificationRow
                      key={item.id}
                      item={item}
                      onRead={(id) => void run(() => markNotificationRead(id))}
                      onArchive={(id) => void run(() => archiveNotification(id))}
                      onDelete={(id) => void run(() => deleteNotification(id))}
                    />
                  ))}
                </ul>
              )}
            </Panel>

            <NotificationPreferences />
          </>
        )}
      </Container>
    </>
  );
}
