import { useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { sortedNews } from '@/features/news/data';
import { articles } from '@/features/articles/data';
import {
  saveFeatured,
  useFeatured,
  type FeaturedKind,
} from '@/services/content/featured';
import { cn } from '@/lib/cn';

/**
 * ÖNE ÇIKAN İÇERİK KONTROLÜ — ana sayfa şeritlerinin sırası.
 *
 * Ana sayfa haber ve yazı şeritlerinde dörder satır gösteriyor. Hangi
 * dördü sorusunun cevabı "en yenisi" idi; artık editör seçiyor.
 *
 * SEÇİLENLER AYRI BİR LİSTEDE, SIRALI. Yalnızca bir "öne çıkar"
 * işareti konsaydı sıra yine tarihten gelirdi ve editörün "önce bu"
 * demesinin yolu olmazdı. Seçim sırası doğrudan ekrandaki sıra.
 *
 * DÖRTTEN FAZLA SEÇİLEBİLİR ve bu bilinçli: beşinci sıradakiler yedek
 * olur, üstteki bir içerik kaldırıldığında şerit kendiliğinden dolar.
 * Ana sayfada yalnızca ilk dördü görünür ve panel bunu açıkça yazıyor.
 *
 * KAYDETMEDEN ÖNCE HİÇBİR ŞEY YAZILMAZ. Her tıklamada veritabanına
 * gitmek, yarım kalmış bir sıralamayı canlıya taşırdı.
 */

const HOME_ROWS = 4;

interface Entry {
  slug: string;
  title: string;
}

export function FeaturedControl({ canWrite }: { canWrite: boolean }) {
  return (
    <Panel
      title="Ana sayfada öne çıkanlar"
      status={
        <span className="text-[10px] text-faint">
          ilk {HOME_ROWS} satır görünür
        </span>
      }
    >
      <p className="mb-3 text-[11.5px] leading-relaxed text-muted-foreground">
        Ana sayfadaki haber ve yazı şeritleri dörder satır gösterir. Buradan
        seçilenler verilen sırayla en üste gelir; seçim yapılmazsa şerit en
        yeniden eskiye dizilir. Dörtten fazla seçmek zararsız — fazlası
        yedekte bekler.
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        <KindEditor
          kind="haber"
          label="Haberler"
          canWrite={canWrite}
          entries={sortedNews().map((n) => ({ slug: n.slug, title: n.title }))}
        />
        <KindEditor
          kind="yazi"
          label="Yazılar"
          canWrite={canWrite}
          entries={articles.map((a) => ({ slug: a.slug, title: a.title }))}
        />
      </div>
    </Panel>
  );
}

function KindEditor({
  kind,
  label,
  entries,
  canWrite,
}: {
  kind: FeaturedKind;
  label: string;
  entries: Entry[];
  canWrite: boolean;
}) {
  const featured = useFeatured(kind);
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  /* Sunucudaki sıra tazelenince taslak da yenilenir; kullanıcı henüz
     bir şey değiştirmediyse bu görünmez bir tazeleme, değiştirdiyse
     zaten kaydetmiş demektir (kaydetme sonrası `refresh` çağrılıyor). */
  useEffect(() => {
    setDraft(featured.slugs);
  }, [featured.slugs]);

  const titleOf = (slug: string) =>
    entries.find((e) => e.slug === slug)?.title ?? slug;

  function move(index: number, delta: number) {
    setDraft((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await saveFeatured(kind, draft);
      featured.refresh();
      setMessage('Kaydedildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    draft.length !== featured.slugs.length ||
    draft.some((slug, i) => slug !== featured.slugs[i]);

  return (
    <div className="rounded-card border border-border bg-surface-1 p-2.5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="label text-foreground">{label}</h3>
        <span className="text-[10px] text-faint">
          {draft.length} seçili
          {featured.loading ? ' · yükleniyor' : ''}
        </span>
      </div>

      {/* Seçili liste — sıra buradaki sıra. */}
      {draft.length === 0 ? (
        <p className="rounded-card border border-border bg-surface-2 px-2.5 py-3 text-center text-[11px] text-muted-foreground">
          Seçim yok — şerit en yeniden eskiye diziliyor.
        </p>
      ) : (
        <ol className="mb-2 space-y-1">
          {draft.map((slug, index) => (
            <li
              key={slug}
              className={cn(
                'flex items-center gap-1.5 rounded-card border px-2 py-1.5',
                index < HOME_ROWS
                  ? 'border-primary/40 bg-surface-2'
                  : 'border-border bg-surface-2/60'
              )}
            >
              <span className="tabular w-4 shrink-0 text-[10px] text-faint">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] text-foreground">
                {titleOf(slug)}
              </span>
              {/* Dördün altındakiler ana sayfada görünmüyor; bunu
                  yazmak, "seçtim ama çıkmadı" sorusunu baştan
                  engelliyor. */}
              {index >= HOME_ROWS && (
                <span className="shrink-0 text-[9.5px] text-faint">yedek</span>
              )}
              <span className="flex shrink-0 gap-0.5">
                <IconButton
                  label="Yukarı taşı"
                  disabled={!canWrite || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </IconButton>
                <IconButton
                  label="Aşağı taşı"
                  disabled={!canWrite || index === draft.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </IconButton>
                <IconButton
                  label="Listeden çıkar"
                  disabled={!canWrite}
                  onClick={() =>
                    setDraft((list) => list.filter((s) => s !== slug))
                  }
                >
                  ×
                </IconButton>
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Eklenebilecekler */}
      <div className="max-h-44 overflow-y-auto rounded-card border border-border bg-surface-2/40">
        {entries
          .filter((e) => !draft.includes(e.slug))
          .map((entry) => (
            <button
              key={entry.slug}
              type="button"
              disabled={!canWrite}
              onClick={() => setDraft((list) => [...list, entry.slug])}
              className="flex w-full items-center gap-2 border-b border-border px-2 py-1.5 text-left text-[11px] text-muted-foreground transition-colors last:border-0 hover:bg-surface-2 hover:text-foreground disabled:opacity-45"
            >
              <span className="text-primary">+</span>
              <span className="min-w-0 flex-1 truncate">{entry.title}</span>
            </button>
          ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={!canWrite || saving || !dirty}>
          {saving ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
        {dirty && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDraft(featured.slugs)}
            disabled={saving}
          >
            Geri al
          </Button>
        )}
        {message && (
          <span className="text-[10.5px] text-muted-foreground">{message}</span>
        )}
      </div>

      {!canWrite && (
        <p className="mt-1.5 text-[10px] text-faint">
          Değiştirmek için yönetici rolü gerekir; yazma yetkisini RLS
          politikası zorlar.
        </p>
      )}
      {featured.error && (
        <p className="mt-1.5 text-[10px] text-warning">
          Sıra okunamadı: {featured.error}
        </p>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-5 w-5 rounded-[2px] border border-border text-[11px] leading-none text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-30"
    >
      {children}
    </button>
  );
}
