import { contentStatusLabels } from '@/domain/content/status';
import { useEffect, useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { newsCategoryLabels, sortedNews } from '@/features/news/data';
import { articleCategoryLabels, articles } from '@/features/articles/data';
import {
  glossaryCategoryLabels,
  glossaryTerms,
} from '@/features/knowledge/glossary';
import { faqCategoryLabels, faqItems } from '@/features/knowledge/faq';
import {
  EMPTY_DRAFT,
  deleteEntry,
  draftFromEntry,
  saveEntry,
  setEntryStatus,
  approveEntry,
  rejectEntry,
  slugFromTitle,
  useEntries,
  validateEntry,
  type ContentEntry,
  type EntryDraft,
  type EntryKind,
} from '@/services/content/entries';
import { cn } from '@/lib/cn';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import {
  blocksToText,
  paragraphsToBlocks,
} from '@/domain/content/blocks';
import { importContentFile } from './contentImport';
import { RichContentEditor } from './RichContentEditor';

/**
 * İÇERİK YÖNETİMİ — haber ve yazıları panelden yazma.
 *
 * NEDEN VAR: haber ve yazı gövdeleri uygulamanın içindeki veri
 * dosyalarındaydı. Yeni bir haber yayımlamak kod değiştirip yeniden
 * yayına almak demekti; yani siteyi yönetmek için geliştirici
 * gerekiyordu. Bir içerik sitesinde bu, ürünün kendisinin eksik olması.
 *
 * TASLAK VARSAYILAN. Yeni kayıt "taslak" olarak açılıyor ve yayına
 * almak ayrı bir tıklama. Yanlışlıkla yarım bir yazının canlıya
 * düşmesi, düzeltilmesi en pahalı hatalardan biri.
 *
 * SİLME ONAY İSTİYOR ve geri alınamayacağını yazıyor — tek tıkla
 * silinebilen bir içerik, er geç silinir.
 */
/* Ortak durum kümesinin rozet renkleri (FAZ 3/4). */
function durumTonu(
  durum: string
): 'success' | 'warning' | 'danger' | 'muted' | 'primary' {
  if (durum === 'yayinda') return 'success';
  if (durum === 'incelemede') return 'primary';
  if (durum === 'taslak') return 'warning';
  if (durum === 'reddedildi') return 'danger';
  return 'muted';
}

const SEED_ID_PREFIX = 'seed:';

function isSeedEntry(entry: ContentEntry | null): boolean {
  return !!entry?.id.startsWith(SEED_ID_PREFIX);
}

function seedEntries(kind: EntryKind): ContentEntry[] {
  if (kind === 'haber') {
    return sortedNews().map((item) => ({
      id: `${SEED_ID_PREFIX}haber:${item.slug}`,
      kind: 'haber',
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      body: item.body,
      bodyBlocks: item.bodyBlocks ?? paragraphsToBlocks(item.body),
      category: item.category,
      publishedAt: item.publishedAt,
      status: 'yayinda',
      author: null,
      duration: null,
      level: null,
      tint: item.tint,
      image: item.image ?? null,
      source: item.source.url
        ? { name: item.source.name, url: item.source.url }
        : null,
      submittedBy: null,
      rejectionReason: null,
      reviewedAt: null,
    }));
  }

  if (kind === 'yazi') {
    return articles.map((item) => ({
      id: `${SEED_ID_PREFIX}yazi:${item.slug}`,
      kind: 'yazi',
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      body: item.body,
      bodyBlocks: item.bodyBlocks ?? paragraphsToBlocks(item.body),
      category: item.category,
      publishedAt: item.publishedAt,
      status: 'yayinda',
      author: item.author,
      duration: item.duration,
      level: item.level,
      tint: item.tint,
      image: item.image ?? null,
      source: null,
      submittedBy: null,
      rejectionReason: null,
      reviewedAt: null,
    }));
  }

  if (kind === 'sozluk') {
    return glossaryTerms.map((item) => ({
      id: `${SEED_ID_PREFIX}sozluk:${item.slug}`,
      kind: 'sozluk',
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      body: item.body,
      bodyBlocks: paragraphsToBlocks(item.body),
      category: item.category,
      publishedAt: '2026-08-01',
      status: 'yayinda',
      author: 'Astrohub',
      duration: null,
      level: null,
      tint: null,
      image: null,
      source: null,
      submittedBy: null,
      rejectionReason: null,
      reviewedAt: null,
    }));
  }

  if (kind === 'sss') {
    return faqItems.map((item) => ({
      id: `${SEED_ID_PREFIX}sss:${item.slug}`,
      kind: 'sss',
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      body: item.body,
      bodyBlocks: paragraphsToBlocks(item.body),
      category: item.category,
      publishedAt: '2026-08-01',
      status: 'yayinda',
      author: 'Astrohub',
      duration: null,
      level: null,
      tint: null,
      image: null,
      source: null,
      submittedBy: null,
      rejectionReason: null,
      reviewedAt: null,
    }));
  }

  return [];
}

function mergeAdminEntries(
  kind: EntryKind,
  dbEntries: ContentEntry[]
): ContentEntry[] {
  const dbSlugs = new Set(dbEntries.map((entry) => entry.slug));
  return [
    ...dbEntries,
    ...seedEntries(kind).filter((entry) => !dbSlugs.has(entry.slug)),
  ].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function categoryLabels(kind: EntryKind): Record<string, string> {
  if (kind === 'haber') return newsCategoryLabels;
  if (kind === 'yazi') return articleCategoryLabels;
  if (kind === 'sozluk') return glossaryCategoryLabels;
  return faqCategoryLabels;
}

const ENTRY_KIND_LABELS: Record<EntryKind, string> = {
  haber: 'Haberler',
  yazi: 'Yazılar',
  sozluk: 'Sözlük',
  sss: 'SSS',
};

export function ContentControl({
  canWrite,
  initialKind = 'haber',
  initialSlug,
}: {
  canWrite: boolean;
  initialKind?: EntryKind;
  initialSlug?: string | null;
}) {
  return (
    <Panel title={`${ENTRY_KIND_LABELS[initialKind]} yönetimi`}>
      <KindEditor
        kind={initialKind}
        canWrite={canWrite}
        initialSlug={initialSlug}
      />
    </Panel>
  );
}

function KindEditor({
  kind,
  canWrite,
  initialSlug,
}: {
  kind: EntryKind;
  canWrite: boolean;
  initialSlug?: string | null;
}) {
  const { entries, loading, error, refresh } = useEntries(kind, {
    includeDrafts: true,
  });
  const visibleEntries = useMemo(
    () => mergeAdminEntries(kind, entries),
    [entries, kind]
  );

  const [editing, setEditing] = useState<ContentEntry | null>(null);
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  /* Ret gerekçesi formu — hangi kayıt için açık olduğu ve metni. */
  const [reddedilen, setReddedilen] = useState<string | null>(null);
  const [redGerekce, setRedGerekce] = useState('');
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [openedSlug, setOpenedSlug] = useState<string | null>(null);

  const categories = categoryLabels(kind);

  function startNew() {
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT, kind, category: Object.keys(categories)[0] });
    setMessage(null);
    setImportWarnings([]);
  }

  function startEdit(entry: ContentEntry) {
    setEditing(entry);
    setDraft(draftFromEntry(entry));
    setMessage(null);
    setImportWarnings([]);
  }

  useEffect(() => {
    setOpenedSlug(null);
  }, [kind, initialSlug]);

  useEffect(() => {
    if (!initialSlug || loading || openedSlug === initialSlug) return;
    const entry = visibleEntries.find((item) => item.slug === initialSlug);
    if (entry) {
      setEditing(entry);
      setDraft(draftFromEntry(entry));
      setMessage(null);
    } else {
      setMessage(
        'Bu adres panel kaydı olarak bulunamadı. Tohum içerikse aynı slug ile yeni kayıt açıp üzerine yazabilirsiniz.'
      );
    }
    setOpenedSlug(initialSlug);
  }, [initialSlug, loading, openedSlug, visibleEntries]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      await saveEntry(draft, isSeedEntry(editing) ? undefined : editing?.id);
      refresh();
      setDraft(null);
      setEditing(null);
      setMessage(
        isSeedEntry(editing)
          ? 'Tohum içerik veritabanına alındı ve artık panelden yönetilecek.'
          : 'Kaydedildi.'
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * ONAY AKIŞI (FAZ 4).
   *
   * Eskiden tek düğme vardı ve iki durum arasında gidip geliyordu
   * (yayinda ↔ taslak). Ortak durum kümesi sekiz değer taşıyor ve
   * `incelemede` gelen bir katkının iki ayrı cevabı var: onay ve ret.
   * Ret gerekçesiz olamıyor, bu yüzden ayrı bir form açıyor.
   */
  async function durumUygula(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      refresh();
      setRedGerekce('');
      setReddedilen(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Durum değiştirilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteEntry(id);
      refresh();
      setConfirmDelete(null);
      if (editing?.id === id) {
        setEditing(null);
        setDraft(null);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Silinemedi.');
    } finally {
      setBusy(false);
    }
  }

  const problem = draft ? validateEntry(draft) : null;

  if (!draft) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="label text-foreground">{ENTRY_KIND_LABELS[kind]}</p>
            <p className="text-meta text-muted-foreground">
              {visibleEntries.length} kayıt{loading ? ' · yükleniyor' : ''} ·
              içerik seçip düzenle butonuyla tam sayfa editöre geçin
            </p>
          </div>
          <Button size="sm" onClick={startNew} disabled={!canWrite}>
            Yeni
          </Button>
        </div>

        {error && (
          <p className="mb-2 rounded-card border border-danger/45 bg-surface-2 px-2 py-1.5 text-meta text-danger">
            {error}
          </p>
        )}

        {visibleEntries.length === 0 && !loading ? (
          <p className="rounded-card border border-border bg-surface-2 px-2.5 py-3 text-center text-meta text-muted-foreground">
            Henüz kayıt yok. "Yeni" ile ilk içeriği oluşturun.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-card border border-border bg-surface-1">
            {visibleEntries.map((entry) => (
              <li key={entry.id}>
                <div
                  className={cn(
                    'grid gap-3 px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto]',
                    editing?.id === entry.id
                      ? 'bg-surface-2'
                      : 'bg-surface-1 hover:bg-surface-2/60'
                  )}
                >
                  <div className="min-w-0">
                    <span className="line-clamp-2 text-body-sm font-medium leading-snug text-foreground">
                      {entry.title}
                    </span>
                    <span className="tabular mt-0.5 block text-meta text-faint">
                      {entry.publishedAt} · {entry.slug}
                    </span>
                    {entry.summary && (
                      <p className="mt-1 line-clamp-2 text-meta leading-relaxed text-muted-foreground">
                        {entry.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                    <Badge tone={durumTonu(entry.status)}>
                      {contentStatusLabels[entry.status]}
                    </Badge>
                    {isSeedEntry(entry) && <Badge tone="muted">Tohum</Badge>}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      aria-label={`Düzenle ${entry.title} ${entry.publishedAt} · ${entry.slug}`}
                      onClick={() => startEdit(entry)}
                    >
                      Düzenle
                    </Button>

                    {/* İncelemedeki katkının iki cevabı var. */}
                    {isSeedEntry(entry) ? (
                      <span className="text-meta text-faint">
                        Kaydedince panel kaydına dönüşür
                      </span>
                    ) : entry.status === 'incelemede' ? (
                      <>
                        <button
                          type="button"
                          disabled={!canWrite || busy}
                          onClick={() =>
                            void durumUygula(() => approveEntry(entry.id))
                          }
                          className="text-meta text-cold hover:text-primary disabled:opacity-40"
                        >
                          Onayla ve yayınla
                        </button>
                        <button
                          type="button"
                          disabled={!canWrite || busy}
                          onClick={() =>
                            setReddedilen(
                              reddedilen === entry.id ? null : entry.id
                            )
                          }
                          className="text-meta text-danger hover:underline disabled:opacity-40"
                        >
                          Reddet
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={!canWrite || busy}
                        onClick={() =>
                          void durumUygula(() =>
                            setEntryStatus(
                              entry.id,
                              entry.status === 'yayinda' ? 'taslak' : 'yayinda'
                            )
                          )
                        }
                        className="text-meta text-cold hover:text-primary disabled:opacity-40"
                      >
                        {entry.status === 'yayinda' ? 'Yayından al' : 'Yayınla'}
                      </button>
                    )}
                    {!isSeedEntry(entry) && confirmDelete === entry.id ? (
                      <>
                        <span className="text-meta text-danger">
                          Geri alınamaz —
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => remove(entry.id)}
                          className="text-meta text-danger underline"
                        >
                          sil
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="text-meta text-muted-foreground"
                        >
                          vazgeç
                        </button>
                      </>
                    ) : !isSeedEntry(entry) ? (
                      <button
                        type="button"
                        disabled={!canWrite || busy}
                        onClick={() => setConfirmDelete(entry.id)}
                        className="text-meta text-muted-foreground hover:text-danger disabled:opacity-40"
                      >
                        Sil
                      </button>
                    ) : null}
                  </div>

                  {/*
                    RET GEREKÇESİ ZORUNLU. Reddedip sebebini söylememek,
                    katkıyı sessizce çöpe atmaktır: gönderen neyi
                    düzelteceğini bilemez ve aynı şeyi tekrar gönderir.
                  */}
                  {reddedilen === entry.id && (
                    <div className="mt-2 space-y-1.5 rounded-card border border-danger/40 bg-danger/8 p-2">
                      <textarea
                        value={redGerekce}
                        rows={2}
                        disabled={busy}
                        placeholder="Ret gerekçesi — gönderene bu metin gösterilecek"
                        onChange={(e) => setRedGerekce(e.target.value)}
                        className="w-full rounded-input border border-border bg-surface-2 px-2 py-1 text-meta text-foreground placeholder:text-faint focus:border-border-strong focus:outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busy || redGerekce.trim().length < 3}
                          onClick={() =>
                            void durumUygula(() =>
                              rejectEntry(entry.id, redGerekce)
                            )
                          }
                          className="text-meta text-danger underline disabled:no-underline disabled:opacity-40"
                        >
                          Reddet
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReddedilen(null);
                            setRedGerekce('');
                          }}
                          className="text-meta text-muted-foreground"
                        >
                          vazgeç
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Verilmiş ret gerekçesi listede görünür kalıyor. */}
                  {entry.status === 'reddedildi' && entry.rejectionReason && (
                    <p className="mt-1.5 text-meta leading-relaxed text-danger">
                      Ret gerekçesi: {entry.rejectionReason}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {message && (
          <p className="mt-2 text-meta text-muted-foreground">{message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface-1 px-3 py-2">
        <div>
          <p className="label text-primary">
            {ENTRY_KIND_LABELS[kind]} / {editing ? 'Düzenle' : 'Yeni içerik'}
          </p>
          <h3 className="mt-1 text-body-lg font-semibold text-foreground">
            {draft.title || 'Başlıksız içerik'}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={!canWrite || busy || !!problem}>
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setDraft(null);
              setEditing(null);
            }}
          >
            Listeye dön
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-card border border-border bg-surface-1 p-3">
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-2.5">
            <Field label="Başlık" htmlFor="c-title">
              <Input
                id="c-title"
                value={draft.title}
                maxLength={200}
                onChange={(e) => {
                  const title = e.target.value;
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          title,
                          /* Adres yalnızca YENİ kayıtta başlıktan
                             türetiliyor. Yayımlanmış bir içeriğin
                             adresini başlık düzeltmesiyle değiştirmek,
                             paylaşılmış bağlantıları sessizce kırardı. */
                          slug: editing ? d.slug : slugFromTitle(title),
                        }
                      : d
                  );
                }}
              />
            </Field>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field
                label="Adres (slug)"
                htmlFor="c-slug"
                hint={
                  editing
                    ? 'Değiştirirseniz eski bağlantılar kırılır.'
                    : 'Başlıktan otomatik üretiliyor.'
                }
              >
                <Input
                  id="c-slug"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, slug: e.target.value } : d))
                  }
                />
              </Field>

              <Field label="Kategori" htmlFor="c-cat">
                <Select
                  id="c-cat"
                  value={draft.category}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, category: e.target.value } : d
                    )
                  }
                >
                  {Object.entries(categories).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label as string}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Özet"
              htmlFor="c-summary"
              hint="Kartlarda ve arama sonuçlarında bu metin görünür."
            >
              <textarea
                id="c-summary"
                value={draft.summary}
                rows={3}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, summary: e.target.value } : d))
                }
                className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed text-foreground outline-none focus:border-primary"
              />
            </Field>
          </div>

          <div className="space-y-2.5 rounded-card border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="label">Görsel</p>
              <Button
                type="button"
                size="sm"
                variant="danger"
                disabled={!draft.imageUrl && !draft.imageCredit && !draft.imageLicence}
                onClick={() =>
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          imageUrl: '',
                          imageCredit: '',
                          imageLicence: '',
                        }
                      : d
                  )
                }
              >
                Görseli kaldır
              </Button>
            </div>
            {draft.imageUrl ? (
              <img
                src={draft.imageUrl}
                alt=""
                className="aspect-video w-full rounded-card border border-border object-cover"
              />
            ) : (
              <div className="grid aspect-video place-items-center rounded-card border border-dashed border-border text-meta text-faint">
                Görsel yok
              </div>
            )}
            <Field label="Görsel adresi" htmlFor="c-img">
              <Input
                id="c-img"
                value={draft.imageUrl}
                placeholder="https://"
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, imageUrl: e.target.value } : d
                  )
                }
              />
            </Field>
            <Field
              label="Görsel kredisi"
              htmlFor="c-credit"
              hint="Görsel eklediyseniz zorunlu."
            >
              <Input
                id="c-credit"
                value={draft.imageCredit}
                placeholder="NASA, ESA"
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, imageCredit: e.target.value } : d
                  )
                }
              />
            </Field>
            <Field label="Lisans" htmlFor="c-licence">
              <Input
                id="c-licence"
                value={draft.imageLicence}
                placeholder="CC BY 4.0"
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, imageLicence: e.target.value } : d
                  )
                }
              />
            </Field>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <Field label="Yayın tarihi" htmlFor="c-date">
            <Input
              id="c-date"
              type="date"
              value={draft.publishedAt}
              onChange={(e) =>
                setDraft((d) =>
                  d ? { ...d, publishedAt: e.target.value } : d
                )
              }
            />
          </Field>
          <Field
            label={kind === 'haber' ? 'Kaynak adı' : 'Yazar'}
            htmlFor="c-author"
          >
            <Input
              id="c-author"
              value={kind === 'haber' ? draft.sourceName : draft.author}
              onChange={(e) =>
                setDraft((d) =>
                  d
                    ? kind === 'haber'
                      ? { ...d, sourceName: e.target.value }
                      : { ...d, author: e.target.value }
                    : d
                )
              }
            />
          </Field>
          <Field
            label={kind === 'haber' ? 'Kaynak adresi' : 'Okuma süresi'}
            htmlFor="c-meta"
          >
            <Input
              id="c-meta"
              value={kind === 'haber' ? draft.sourceUrl : draft.duration}
              placeholder={kind === 'haber' ? 'https://' : '10 dk okuma'}
              onChange={(e) =>
                setDraft((d) =>
                  d
                    ? kind === 'haber'
                      ? { ...d, sourceUrl: e.target.value }
                      : { ...d, duration: e.target.value }
                    : d
                )
              }
            />
          </Field>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label">İçerik editörü</p>
              <p className="text-meta text-faint">
                Word benzeri editör: başlık, kalın, eğik, liste, alıntı ve
                bağlantıyı doğrudan yazı içinde düzenleyin.
              </p>
            </div>
            {!editing && (
              <label className="cursor-pointer rounded-card border border-border px-2 py-1 text-meta text-cold hover:border-primary hover:text-primary">
                {importing
                  ? 'İçe aktarılıyor…'
                  : 'Yeni içerik: HTML / Word / PDF içe aktar'}
                <input
                  type="file"
                  accept=".html,.htm,.docx,.pdf,text/html,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={!canWrite || importing}
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setImporting(true);
                    setImportWarnings([]);
                    try {
                      const result = await importContentFile(file);
                      if (result.blocks.length === 0)
                        throw new Error(
                          'Belgede aktarılabilir metin bulunamadı.'
                        );
                      const mevcut = draft.bodyBlocks;
                      const eklendi = mevcut.length > 0;
                      const blocks = eklendi
                        ? [...mevcut, ...result.blocks]
                        : result.blocks;
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              bodyBlocks: blocks,
                              bodyText: blocksToText(blocks),
                            }
                          : current
                      );
                      setImportWarnings([
                        ...(eklendi
                          ? [
                              `${result.blocks.length} blok mevcut yeni içeriğin SONUNA eklendi; yazdıklarınız silinmedi.`,
                            ]
                          : []),
                        ...result.warnings,
                      ]);
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : 'Belge içe aktarılamadı.'
                      );
                    } finally {
                      setImporting(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
          <RichContentEditor
            blocks={draft.bodyBlocks}
            placeholder="İçeriği buraya yazın veya yeni içerikte HTML / Word / PDF içe aktarın."
            onChange={(blocks) =>
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      bodyBlocks: blocks,
                      bodyText: blocksToText(blocks),
                    }
                  : current
              )
            }
          />
          {importWarnings.length > 0 && (
            <ul className="mt-2 rounded-card border border-warning/40 bg-warning/5 px-3 py-2 text-meta leading-relaxed text-warning">
              {importWarnings.map((warning, index) => (
                <li key={`${warning}-${index}`}>• {warning}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-card border border-border bg-background p-4">
          <p className="label mb-3">Canlı site önizlemesi</p>
          <article className="space-y-4">
            {draft.imageUrl && (
              <figure className="space-y-1">
                <img
                  src={draft.imageUrl}
                  alt=""
                  className="max-h-[28rem] w-full rounded-card border border-border object-cover"
                />
                {(draft.imageCredit || draft.imageLicence) && (
                  <figcaption className="text-meta text-faint">
                    {[draft.imageCredit, draft.imageLicence]
                      .filter(Boolean)
                      .join(' · ')}
                  </figcaption>
                )}
              </figure>
            )}
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {draft.title || 'Başlıksız içerik'}
              </h1>
              {draft.summary && (
                <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
                  {draft.summary}
                </p>
              )}
            </div>
            {draft.bodyBlocks.length > 0 ? (
              <BlockRenderer blocks={draft.bodyBlocks} />
            ) : (
              <p className="py-8 text-center text-meta text-faint">
                Önizleme için içerik yazın.
              </p>
            )}
          </article>
        </div>

        {problem && (
          <p className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-warning">
            {problem}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={!canWrite || busy || !!problem}>
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
          <label className="inline-flex items-center gap-1.5 text-meta text-muted-foreground">
            <input
              type="checkbox"
              checked={draft.status === 'yayinda'}
              onChange={(e) =>
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        status: e.target.checked ? 'yayinda' : 'taslak',
                      }
                    : d
                )
              }
              className="h-3.5 w-3.5 accent-[var(--color-primary)]"
            />
            Kaydettikten sonra yayında olsun
          </label>
        </div>

        {message && (
          <p className="text-meta text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}
