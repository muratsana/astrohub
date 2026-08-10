import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import {
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { useViewMode, type ViewMode } from '@/components/ui/useViewMode';
import { PinIcon, LockIcon, ChatIcon } from '@/components/ui/icons';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useForumThreads } from '@/services/content/forum';
import { useExplorer } from '@/features/explorer/useExplorer';
import { forumSpec } from './forumSpec';
import {
  forumCategories,
  forumCategoryOrder,
  forumLabelOrder,
  forumLabels,
  relativeTime,
  type ForumThread,
} from './types';
import { LabelChip } from './LabelChip';
import { cn } from '@/lib/cn';

/**
 * FORUM ANA SAYFASI.
 *
 * Klasik forum "kategori tablosu + konu listesi" yerine tek bir konu akışı
 * ve üstte kategori filtresi tercih edildi. Sebep: kategori tablosu, içeriği
 * bir tık geriye iter ve boş kategoriler forumu ölü gösterir. Akış hep
 * doludur; kategori bir filtredir, bir kapı değil.
 *
 * YOĞUNLUK TERCİHİ SAKLANIYOR. Konu taramak ve konu okumak farklı işler:
 * biri başlık listesi ister, diğeri her satırda ne konuşulduğunu. Tercihi
 * her ziyarette yeniden yaptırmak, iki kullanımdan birini hep cezalandırır.
 */
export function ForumPage() {
  const threadCatalog = useForumThreads();
  const threads = threadCatalog.items;

  /*
   * ORTAK DATA EXPLORER (Faz 4).
   *
   * SABİTLENMİŞ KONULAR KORUNDU: `forumSpec` her sıralamayı sabitleme
   * kontrolüyle sarıyor. Genel motor bunu bilmiyor — naif bir taşıma
   * duyuru ve kural konularını listenin ortasına gömerdi ve yeni gelen
   * kullanıcı forumun kurallarını hiç görmezdi.
   */
  const ex = useExplorer(threads, forumSpec);

  /*
   * GÖRÜNÜM TERCİHİ (FAZ 11).
   *
   * Konu TARAMAK ve konu OKUMAK farklı işler: biri kısa başlık listesi
   * ister, diğeri her satırda ne konuşulduğunu. Tek düzen seçmek
   * kullanımlardan birini hep cezalandırıyordu — forum tek düzendeydi ve
   * o düzen tarayanın işine yarıyordu, okuyanın değil.
   *
   * Tercih `useViewMode` ile saklanıyor: oturum açıksa hesapta, değilse
   * yerelde. Her ziyarette yeniden seçtirmek, tercihi tercih olmaktan
   * çıkarır.
   */
  const [view, setView] = useViewMode('forum', 'list');
  const result = ex.items;
  const category = ex.query.facets.kategori?.[0] ?? 'hepsi';
  const rozetler = ex.query.facets.rozet ?? [];
  const cozulmemis = (ex.query.facets.cozulmemis ?? []).includes('evet');
  const searching = ex.searchInput.trim().length > 0;
  /*
    HERHANGİ BİR SÜZGEÇ AÇIKSA KONU LİSTESİ, KATEGORİ IZGARASI DEĞİL.

    Kapı önce yalnızca kategori ve aramaya bakıyordu. Rozet ve
    "çözülmemiş" süzgeçleri eklenince şu çıkardı: kullanıcı "Soru"
    rozetine basıyor, sayfa hâlâ kategori ızgarasını gösteriyor ve
    süzgeç hiçbir şey yapmamış gibi görünüyor. Süzgeç varsa sonucu
    göstermek zorundayız.
  */
  const showThreads =
    view === 'list' ||
    category !== 'hepsi' ||
    searching ||
    rozetler.length > 0 ||
    cozulmemis;
  const sections = forumCategoryOrder
    .map((id) => ({
      id,
      threads: result.filter((thread) => thread.category === id),
    }))
    .filter((section) => category === 'hepsi' || section.id === category);

  const tekSec = (param: string, next: string) => {
    const mevcut = ex.query.facets[param]?.[0];
    if (mevcut) ex.toggleFacet(param, mevcut);
    if (next !== 'hepsi' && next !== mevcut) ex.toggleFacet(param, next);
  };
  const setCategory = (next: string) => tekSec('kategori', next);

  return (
    <>
      <PageMeta
        title="Forum"
        description="Astrofotoğraf ve gözlem forumu: ekipmanlar, yazılımlar, görüntü işleme, etkinlikler, topluluklar, bilimsel çalışmalar, radyo astronomi ve astro kampçılık."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Forum', path: '/forum' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Forum"
          description="Soru sor, gözlem raporu paylaş, kurulum tartış. Ekipmanını ve koşullarını yazarsan daha hızlı yanıt alırsın."
          actions={
            <ButtonLink to="/forum/yeni" size="sm">
              Yeni Konu
            </ButtonLink>
          }
        />

        <ModuleToolbar
          columns={4}
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{ current: ex.total, total: threads.length, noun: 'konu' }}
          view={{ mode: view, onChange: setView }}
          sort={{
            id: 'forum-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: forumSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
        >
          <FilterCell
            label="Ara"
            htmlFor="forum-search"
            active={ex.searchInput.trim().length > 0}
            className="min-w-[20rem] flex-[2_1_20rem]"
          >
            <Input
              id="forum-search"
              type="search"
              placeholder="Konu veya kullanıcı"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell
            label="Kategori"
            htmlFor="forum-category"
            active={category !== 'hepsi'}
          >
            <Select
              id="forum-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm kategoriler</option>
              {forumCategoryOrder.map((id) => (
                <option key={id} value={id}>
                  {forumCategories[id].name}
                </option>
              ))}
            </Select>
          </FilterCell>
          {/*
            ROZET SÜZGECİ TEK SEÇİM DEĞİL: bir konu birden çok rozet
            taşıyabiliyor ve "soru VE çözülmemiş" gerçek bir arama.
            `Select` bunu ifade edemezdi; faset motoru zaten çoklu seçimi
            destekliyor ve seçim adres çubuğuna yazılıyor.
          */}
          <FilterCell label="Rozet" active={rozetler.length > 0}>
            <div className="flex flex-wrap items-center gap-1">
              {forumLabelOrder.map((id) => {
                const secili = rozetler.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={secili}
                    title={forumLabels[id].description}
                    onClick={() => ex.toggleFacet('rozet', id)}
                    className={cn(
                      'rounded-card border px-2 py-1 text-meta font-medium transition-colors',
                      secili
                        ? 'border-primary bg-primary/12 text-primary'
                        : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                    )}
                  >
                    {forumLabels[id].name}
                  </button>
                );
              })}
            </div>
          </FilterCell>
          <FilterCell label="Durum" active={cozulmemis}>
            <FilterToggle
              id="forum-unsolved"
              label="Yalnızca çözülmemiş"
              checked={cozulmemis}
              onChange={() => ex.toggleFacet('cozulmemis', 'evet')}
            />
          </FilterCell>
        </ModuleToolbar>

        <CatalogSourceNote selection={threadCatalog} />

        {!showThreads ? (
          <ForumCategoryGrid threads={threads} />
        ) : result.length === 0 ? (
          <EmptyState
            message="Eşleşen konu yok"
            hint="Farklı bir kategori seçmeyi ya da aramayı kısaltmayı deneyin."
            action={
              <ButtonLink to="/forum/yeni" size="sm" variant="secondary">
                Konuyu Sen Aç
              </ButtonLink>
            }
          />
        ) : (
          <div className="space-y-4">
            {sections.map(({ id, threads: sectionThreads }) => {
              const info = forumCategories[id];
              return (
                <section
                  key={id}
                  aria-labelledby={`forum-category-${id}`}
                  className="rounded-card border border-border bg-surface-1"
                >
                  <header className="flex items-start justify-between gap-3 border-b border-border px-3 py-2.5">
                    <div className="min-w-0">
                      <h2
                        id={`forum-category-${id}`}
                        className="text-caption font-semibold text-foreground"
                      >
                        {info.name}
                      </h2>
                      <p className="mt-0.5 text-meta leading-snug text-muted-foreground">
                        {info.description}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-card border px-2 py-1 text-meta font-medium tabular',
                        info.className
                      )}
                    >
                      {sectionThreads.length} konu
                    </span>
                  </header>

                  {sectionThreads.length === 0 ? (
                    <p className="px-3 py-3 text-body-sm text-faint">
                      Bu başlıkta henüz konu yok.
                    </p>
                  ) : (
                    <ul>
                      {sectionThreads.map((thread) => (
                        <li
                          key={thread.id}
                          className="border-b border-border last:border-0"
                        >
                          <ThreadRow thread={thread} view={view} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}

function ForumCategoryGrid({ threads }: { threads: ForumThread[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {forumCategoryOrder.map((id) => {
        const info = forumCategories[id];
        const categoryThreads = threads.filter(
          (thread) => thread.category === id
        );
        const latest = categoryThreads[0];

        return (
          <Link
            key={id}
            to={`/forum?kategori=${id}`}
            className="group flex min-h-44 flex-col rounded-card border border-border bg-surface-1 p-4 transition-colors hover:border-primary/60 hover:bg-surface-2"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-caption font-semibold text-foreground group-hover:text-primary">
                {info.name}
              </h2>
              <span className="tabular text-meta text-muted-foreground">
                {categoryThreads.length} konu
              </span>
            </div>
            <p className="mt-2 line-clamp-3 text-body-sm leading-relaxed text-muted-foreground">
              {info.description}
            </p>
            {latest ? (
              <p className="mt-auto pt-4 text-meta leading-snug text-faint">
                Son konu:{' '}
                <span className="text-muted-foreground">{latest.title}</span>
              </p>
            ) : (
              <p className="mt-auto pt-4 text-meta text-faint">
                İlk konuyu açmak için girin.
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}

function ThreadRow({ thread, view }: { thread: ForumThread; view: ViewMode }) {
  const info = forumCategories[thread.category];

  return (
    <Link
      to={`/forum/${thread.slug}`}
      className="group flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-surface-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {thread.pinned && (
            <PinIcon
              className="h-3 w-3 shrink-0 text-primary"
              aria-label="Sabitlenmiş konu"
            />
          )}
          {thread.locked && (
            <LockIcon
              className="h-3 w-3 shrink-0 text-faint"
              aria-label="Kilitli konu"
            />
          )}
          <h2 className="text-body-sm font-medium leading-snug text-foreground group-hover:text-primary">
            {thread.title}
          </h2>
          {/* Listede yalnızca kısa bir işaret var, gerekçenin tamamı
              değil: satır bir gezinme öğesi, kararın metni konunun
              içinde okunuyor. Konu listeden düşmüyor — açılış mesajı
              kaldırılsa da yanıtlar sürüyor olabilir. */}
          {thread.removalReason && (
            <span className="shrink-0 rounded-card border border-dashed border-border-strong px-1.5 py-0.5 text-meta text-faint">
              Kaldırıldı
            </span>
          )}
          {/* Rozetler başlığın YANINDA, altındaki künye satırında değil:
              "soru mu, rehber mi" bilgisi başlığı okurken işe yarıyor,
              bir satır sonra değil. Konu rozetsizse hiçbir şey çizilmiyor
              — boş bir yer tutucu satırı seyreltirdi. */}
          {(thread.labels ?? []).map((id) => (
            <LabelChip key={id} id={id} />
          ))}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-meta text-muted-foreground">{info.name}</span>
          <span className="tabular text-meta text-muted-foreground">
            @{thread.author.username}
          </span>
          <span aria-hidden className="text-meta text-faint">
            ·
          </span>
          <span className="tabular text-meta text-faint">
            {relativeTime(thread.lastActivityAt)}
          </span>
        </div>

        {/* KART GÖRÜNÜMÜ: konunun ilk satırları. Kaldırılmış gönderide
            `body` boş (metin `removed_content` arşivine taşındı) — orada
            özet çizmiyoruz; boş bir kutu göstermek, hiç göstermemekten
            kötü. */}
        {view === 'grid' && thread.body && (
          <p className="mt-1.5 line-clamp-2 text-meta leading-relaxed text-muted-foreground">
            {thread.body}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <span className="tabular inline-flex items-center gap-1 text-meta text-cold">
          <ChatIcon className="h-3 w-3" />
          {thread.replyCount}
        </span>
        <span className="tabular text-meta text-faint">
          {thread.viewCount.toLocaleString('tr-TR')}
        </span>
      </div>
    </Link>
  );
}
