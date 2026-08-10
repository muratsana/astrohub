import { contentStatusLabels } from '@/domain/content/status';
import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { newsCategoryLabels } from '@/features/news/data';
import { articleCategoryLabels } from '@/features/articles/data';
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
import { InlineText } from '@/components/content/InlineText';
import { blocksToText, type ContentBlock } from '@/domain/content/blocks';
import { hasInlineMarkup } from '@/domain/content/inline';
import { isAllowedImageHost } from '@/domain/content/imageHosts';
import { isValidYoutubeId, youtubeIdFromInput } from '@/features/tv/types';
import { importContentFile } from './contentImport';

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

export function ContentControl({
  canWrite,
  initialKind = 'haber',
  initialSlug,
}: {
  canWrite: boolean;
  initialKind?: EntryKind;
  initialSlug?: string | null;
}) {
  const [kind, setKind] = useState<EntryKind>(initialKind);

  useEffect(() => {
    setKind(initialKind);
  }, [initialKind]);

  return (
    <Panel
      title="İçerik yönetimi"
      status={
        <div className="flex gap-1">
          {(['haber', 'yazi'] as EntryKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'rounded-card border px-2 py-0.5 text-meta transition-colors',
                kind === k
                  ? 'border-primary text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {k === 'haber' ? 'Haberler' : 'Yazılar'}
            </button>
          ))}
        </div>
      }
    >
      <KindEditor kind={kind} canWrite={canWrite} initialSlug={initialSlug} />
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

  const categories =
    kind === 'haber' ? newsCategoryLabels : articleCategoryLabels;

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
    const entry = entries.find((item) => item.slug === initialSlug);
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
  }, [entries, initialSlug, loading, openedSlug]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setMessage(null);
    try {
      await saveEntry(draft, editing?.id);
      refresh();
      setDraft(null);
      setEditing(null);
      setMessage('Kaydedildi.');
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

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      {/* Liste */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="label">
            {entries.length} kayıt{loading ? ' · yükleniyor' : ''}
          </span>
          <Button size="sm" onClick={startNew} disabled={!canWrite}>
            Yeni
          </Button>
        </div>

        {error && (
          <p className="mb-2 rounded-card border border-danger/45 bg-surface-2 px-2 py-1.5 text-meta text-danger">
            {error}
          </p>
        )}

        {entries.length === 0 && !loading ? (
          <p className="rounded-card border border-border bg-surface-2 px-2.5 py-3 text-center text-meta text-muted-foreground">
            Henüz kayıt yok. "Yeni" ile ilk içeriği oluşturun — mevcut haber ve
            yazılar uygulama içindeki veri dosyalarından geliyor ve burada
            görünmüyor.
          </p>
        ) : (
          <ul className="max-h-[420px] space-y-1 overflow-y-auto">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div
                  className={cn(
                    'rounded-card border px-2 py-1.5',
                    editing?.id === entry.id
                      ? 'border-primary/50 bg-surface-2'
                      : 'border-border bg-surface-2/50'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => startEdit(entry)}
                    className="block w-full text-left"
                  >
                    <span className="line-clamp-2 text-body-sm leading-snug text-foreground">
                      {entry.title}
                    </span>
                    <span className="tabular mt-0.5 block text-meta text-faint">
                      {entry.publishedAt} · {entry.slug}
                    </span>
                  </button>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge tone={durumTonu(entry.status)}>
                      {contentStatusLabels[entry.status]}
                    </Badge>

                    {/* İncelemedeki katkının iki cevabı var. */}
                    {entry.status === 'incelemede' ? (
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
                    {confirmDelete === entry.id ? (
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
                    ) : (
                      <button
                        type="button"
                        disabled={!canWrite || busy}
                        onClick={() => setConfirmDelete(entry.id)}
                        className="text-meta text-muted-foreground hover:text-danger disabled:opacity-40"
                      >
                        Sil
                      </button>
                    )}
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
      </div>

      {/* Form */}
      <div>
        {!draft ? (
          <p className="rounded-card border border-border bg-surface-2/50 px-3 py-8 text-center text-body-sm leading-relaxed text-muted-foreground">
            Soldan bir kayıt seçin ya da "Yeni" ile içerik oluşturun.
            <br />
            <span className="text-faint">
              Yeni kayıtlar taslak olarak açılır; yayına almak ayrı bir adımdır.
            </span>
          </p>
        ) : (
          <div className="grid gap-2.5 rounded-card border border-border bg-surface-1 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="label text-foreground">
                {editing ? 'Düzenle' : 'Yeni içerik'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setDraft(null);
                  setEditing(null);
                }}
                className="text-meta text-muted-foreground hover:text-foreground"
              >
                Kapat
              </button>
            </div>

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

            <div className="grid gap-2.5 xl:grid-cols-2">
              <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="label">İçerik blokları</p>
                    <p className="text-meta text-faint">
                      Başlık, paragraf, görsel, tablo, video ve listeleri
                      sırayla düzenleyin. Metinde <code>**kalın**</code>,{' '}
                      <code>*eğik*</code> ve{' '}
                      <code>[bağlantı](/adres)</code> çalışır.
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
                            const mevcut = draft?.bodyBlocks ?? [];
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
                <ContentBlockEditor
                  blocks={draft.bodyBlocks}
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

              <div className="rounded-card border border-border bg-background p-3">
                <p className="label mb-3">Canlı site önizlemesi</p>
                {draft.bodyBlocks.length > 0 ? (
                  <BlockRenderer blocks={draft.bodyBlocks} />
                ) : (
                  <p className="py-8 text-center text-meta text-faint">
                    Önizleme için bir blok ekleyin.
                  </p>
                )}
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

            {/* Görsel — kredi zorunlu, gerekçesi ipucunda. */}
            <div className="grid gap-2.5 sm:grid-cols-3">
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
          </div>
        )}

        {message && (
          <p className="mt-2 text-meta text-muted-foreground">{message}</p>
        )}
      </div>
    </div>
  );
}

const BLOCK_LABELS: Record<ContentBlock['type'], string> = {
  paragraph: 'Paragraf',
  heading: 'Başlık',
  quote: 'Alıntı',
  list: 'Liste',
  callout: 'Bilgi kutusu',
  image: 'Görsel',
  table: 'Tablo',
  embed: 'Video',
};

/** Metnini tek bir alanla düzenlediğimiz bloklar. */
function isTextBlock(
  block: ContentBlock
): block is Extract<
  ContentBlock,
  { type: 'paragraph' | 'heading' | 'quote' | 'callout' | 'list' }
> {
  return (
    block.type === 'paragraph' ||
    block.type === 'heading' ||
    block.type === 'quote' ||
    block.type === 'callout' ||
    block.type === 'list'
  );
}

function blankBlock(type: ContentBlock['type']): ContentBlock {
  if (type === 'heading') return { type, level: 2, text: '' };
  if (type === 'list') return { type, style: 'bullet', items: [''] };
  if (type === 'callout') return { type, tone: 'info', text: '' };
  if (type === 'image') return { type, src: '', alt: '' };
  if (type === 'table') return { type, header: ['', ''], rows: [['', '']] };
  if (type === 'embed') return { type, provider: 'youtube', videoId: '', title: '' };
  return { type, text: '' };
}

function blockText(block: ContentBlock): string {
  if (block.type === 'list') return block.items.join('\n');
  return isTextBlock(block) ? block.text : '';
}

function withBlockText(block: ContentBlock, value: string): ContentBlock {
  if (block.type === 'list') {
    return { ...block, items: value.split('\n') };
  }
  return isTextBlock(block) ? { ...block, text: value } : block;
}

/*
 * TABLO METİN OLARAK DÜZENLENİYOR: her satır bir satır, hücreler `|` ile
 * ayrılıyor. Hücre hücre bir ızgara arayüzü yazmak yerine bunu seçtik,
 * çünkü tablolar başka bir yerden (Word, Excel, sayfa) KOPYALANARAK
 * geliyor ve metin alanına yapıştırılabiliyorlar. Izgarada aynı iş,
 * hücreye tek tek girmek demekti.
 *
 * Satır sonundaki boş hücreler korunuyor (`split` kırpılmıyor): "değer
 * yok" ile "sütun yok" farklı şeyler ve tablo hizası buna bakıyor.
 */
function tableToText(block: Extract<ContentBlock, { type: 'table' }>): string {
  const satirlar = [...(block.header ? [block.header] : []), ...block.rows];
  return satirlar.map((row) => row.join(' | ')).join('\n');
}

function textToTable(
  block: Extract<ContentBlock, { type: 'table' }>,
  value: string,
  basliklı: boolean
): ContentBlock {
  const satirlar = value
    .split('\n')
    .map((line) => line.split('|').map((cell) => cell.trim()));

  /* Tek satır varken "ilk satır başlık" seçiliyse gövde boş kalırdı ve
     şema `rows`u en az bir satır istiyor. Boş bir gövde satırı bırakmak,
     yazan kişinin yazmaya devam edeceği yeri açık tutuyor. */
  if (basliklı) {
    const [header = [''], ...rows] = satirlar;
    return { ...block, header, rows: rows.length ? rows : [header.map(() => '')] };
  }
  return { ...block, header: undefined, rows: satirlar.length ? satirlar : [['']] };
}

/** Blok içi tek satırlık alan. Etiket görünür — `aria-label` yetmiyor:
    gören kullanıcı da hangi alanın ne olduğunu bilmeli. */
function BlockField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-meta text-muted-foreground">
      <span className="mb-0.5 block text-faint">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-card border border-border bg-background px-2.5 py-1.5 text-meta text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}

/**
 * SATIR İÇİ BİÇİM ÖNİZLEMESİ.
 *
 * Yalnızca metinde çizilecek bir biçim varken görünüyor; her bloğun
 * altına ikinci bir metin kutusu koymak gürültü olurdu.
 *
 * Asıl işi güven vermek değil, UYARMAK. Ayrıştırıcı eski içeriğin
 * üstünde de çalışıyor ve "3*4*5" gibi bir dizi istemeden eğik yazıya
 * dönebilir (gerekçe `domain/content/inline.ts`). Yazan kişi sonucu
 * yayımlamadan önce burada görüyor.
 */
function InlinePreview({ text }: { text: string }) {
  if (!hasInlineMarkup(text)) return null;
  return (
    <p className="mt-1 rounded-card border border-dashed border-border px-2.5 py-1.5 text-meta leading-relaxed text-muted-foreground">
      <span className="mr-1.5 text-faint">Önizleme:</span>
      <InlineText text={text} />
    </p>
  );
}

function ContentBlockEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
}) {
  function replace(index: number, block: ContentBlock) {
    onChange(
      blocks.map((current, currentIndex) =>
        currentIndex === index ? block : current
      )
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <div
          key={index}
          className="rounded-card border border-border bg-surface-2 p-2"
        >
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Select
              aria-label={`${index + 1}. blok türü`}
              value={block.type}
              onChange={(event) =>
                replace(
                  index,
                  blankBlock(event.target.value as ContentBlock['type'])
                )
              }
              className="h-8 w-auto py-0 text-meta"
            >
              {Object.entries(BLOCK_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            {block.type === 'heading' && (
              <Select
                aria-label={`${index + 1}. başlık seviyesi`}
                value={String(block.level)}
                onChange={(event) =>
                  replace(index, {
                    ...block,
                    level: Number(event.target.value) as 2 | 3,
                  })
                }
                className="h-8 w-auto py-0 text-meta"
              >
                <option value="2">H2</option>
                <option value="3">H3</option>
              </Select>
            )}
            {block.type === 'list' && (
              <Select
                aria-label={`${index + 1}. liste biçimi`}
                value={block.style}
                onChange={(event) =>
                  replace(index, {
                    ...block,
                    style: event.target.value as 'bullet' | 'ordered',
                  })
                }
                className="h-8 w-auto py-0 text-meta"
              >
                <option value="bullet">Madde</option>
                <option value="ordered">Numaralı</option>
              </Select>
            )}
            <span className="ml-auto text-meta text-faint">{index + 1}</span>
            <button
              type="button"
              aria-label="Bloğu yukarı taşı"
              disabled={index === 0}
              onClick={() => move(index, -1)}
              className="px-1 text-meta text-muted-foreground disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="Bloğu aşağı taşı"
              disabled={index === blocks.length - 1}
              onClick={() => move(index, 1)}
              className="px-1 text-meta text-muted-foreground disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="Bloğu sil"
              onClick={() =>
                onChange(
                  blocks.filter((_, currentIndex) => currentIndex !== index)
                )
              }
              className="px-1 text-meta text-danger"
            >
              Sil
            </button>
          </div>
          {isTextBlock(block) && (
            <>
              <textarea
                aria-label={`${index + 1}. blok metni`}
                value={blockText(block)}
                rows={block.type === 'list' ? 4 : 3}
                placeholder={
                  block.type === 'list' ? 'Her satıra bir madde' : 'Metin'
                }
                onChange={(event) =>
                  replace(index, withBlockText(block, event.target.value))
                }
                className="w-full resize-y rounded-card border border-border bg-background px-2.5 py-2 text-meta leading-relaxed text-foreground outline-none focus:border-primary"
              />
              <InlinePreview text={blockText(block)} />
            </>
          )}

          {block.type === 'image' && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              <BlockField
                label="Görsel adresi (https)"
                value={block.src}
                onChange={(v) => replace(index, { ...block, src: v })}
                placeholder="https://…"
              />
              <BlockField
                label="Alternatif metin (zorunlu)"
                value={block.alt}
                onChange={(v) => replace(index, { ...block, alt: v })}
                placeholder="Görselde ne var?"
              />
              <BlockField
                label="Alt yazı"
                value={block.caption ?? ''}
                onChange={(v) =>
                  replace(index, { ...block, caption: v || undefined })
                }
              />
              <BlockField
                label="Telif"
                value={block.credit ?? ''}
                onChange={(v) =>
                  replace(index, { ...block, credit: v || undefined })
                }
              />
              {/* Adres girilmişse küçük bir önizleme: yanlış bağlantıyı
                  yayınlamadan önce görmek, kaydettikten sonra fark
                  etmekten ucuz. */}
              {isAllowedImageHost(block.src) && (
                <img
                  src={block.src}
                  alt=""
                  className="max-h-32 rounded-card border border-border object-contain sm:col-span-2"
                />
              )}
              {/*
               * KONAK UYARISI KAYDETMEDEN ÖNCE. Tarayıcının `img-src`
               * beyaz listesi dışındaki görsel üretimde sessizce
               * yüklenmiyor; uyarı olmasaydı editör bunu ancak yayından
               * sonra, okurun gördüğü kırık kutuyla öğrenirdi.
               */}
              {block.src.trim() && !isAllowedImageHost(block.src) && (
                <p className="text-meta text-warning sm:col-span-2">
                  Bu adres izinli kaynaklardan değil ve yayında
                  yüklenmez. Görseli siteye yükleyip depolama adresini
                  kullanın.
                </p>
              )}
              {!block.alt.trim() && (
                <p className="text-meta text-warning sm:col-span-2">
                  Alternatif metin boşken görsel yayımlanmaz — ekran okuyucu
                  kullanan okur için görsel hiç yokmuş gibi olur.
                </p>
              )}
            </div>
          )}

          {block.type === 'table' && (
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-meta text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(block.header)}
                  onChange={(event) =>
                    replace(
                      index,
                      textToTable(
                        block,
                        tableToText(block),
                        event.target.checked
                      )
                    )
                  }
                  className="h-3.5 w-3.5 accent-[var(--color-primary)]"
                />
                İlk satır başlık
              </label>
              <textarea
                aria-label={`${index + 1}. tablo içeriği`}
                value={tableToText(block)}
                rows={5}
                placeholder={'Ad | Çap | Odak\nNewton | 200 | 1000'}
                onChange={(event) =>
                  replace(
                    index,
                    textToTable(block, event.target.value, Boolean(block.header))
                  )
                }
                className="w-full resize-y rounded-card border border-border bg-background px-2.5 py-2 font-mono text-meta leading-relaxed text-foreground outline-none focus:border-primary"
              />
              <p className="text-meta text-faint">
                Her satır bir satır, hücreler <code>|</code> ile ayrılır.
                Word ya da tablodan kopyalanan metni yapıştırıp
                ayraçları düzeltmek en hızlı yol.
              </p>
              <BlockField
                label="Tablo başlığı"
                value={block.caption ?? ''}
                onChange={(v) =>
                  replace(index, { ...block, caption: v || undefined })
                }
              />
            </div>
          )}

          {block.type === 'embed' && (
            <div className="grid gap-1.5 sm:grid-cols-2">
              <BlockField
                label="YouTube adresi ya da kimliği"
                value={block.videoId}
                placeholder="https://www.youtube.com/watch?v=…"
                onChange={(v) =>
                  /* Yapıştırılan adresten kimlik çıkarılıyor; çıkmazsa
                     yazılan değer olduğu gibi duruyor ki alan yazarken
                     kilitlenmesin. Doğrulama aşağıdaki uyarıda. */
                  replace(index, {
                    ...block,
                    videoId: youtubeIdFromInput(v) ?? v,
                  })
                }
              />
              <BlockField
                label="Video başlığı (zorunlu)"
                value={block.title}
                onChange={(v) => replace(index, { ...block, title: v })}
                placeholder="Ekran okuyucu bu adı okur"
              />
              {block.videoId && !isValidYoutubeId('video', block.videoId) && (
                <p className="text-meta text-warning sm:col-span-2">
                  Bu bir YouTube video kimliği değil. Adresi yapıştırın ya da
                  11 karakterli kimliği yazın; biçim tutmazsa video
                  yayımlanmaz.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(BLOCK_LABELS) as ContentBlock['type'][]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange([...blocks, blankBlock(type)])}
            className="rounded-card border border-border px-2 py-1 text-meta text-muted-foreground hover:border-primary hover:text-primary"
          >
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}
