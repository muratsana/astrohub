import type { ContentBlock } from '@/domain/content/blocks';
import { youtubeEmbedUrl } from '@/features/tv/types';
import { cn } from '@/lib/cn';
import { InlineText } from './InlineText';

/**
 * İÇERİK BLOKLARININ ÇİZİMİ.
 *
 * Metin taşıyan her blok `InlineText` üzerinden geçiyor: kalın, eğik ve
 * bağlantı cümlenin içinde yaşıyor ve depolamada düz metin olarak
 * duruyor (gerekçe `domain/content/inline.ts` başında). Buradaki hiçbir
 * yol `dangerouslySetInnerHTML` kullanmıyor.
 */
export function BlockRenderer({
  blocks,
  className,
}: {
  blocks: ContentBlock[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        'metin-yasli space-y-5 text-body-sm leading-[1.85] text-muted-foreground',
        className
      )}
    >
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          const Heading = block.level === 2 ? 'h2' : 'h3';
          return (
            <Heading key={key} className="type-panel pt-2 text-foreground">
              <InlineText text={block.text} />
            </Heading>
          );
        }
        if (block.type === 'quote') {
          return (
            <blockquote
              key={key}
              className="border-l-2 border-primary pl-4 italic text-foreground"
            >
              <InlineText text={block.text} />
            </blockquote>
          );
        }
        if (block.type === 'list') {
          const List = block.style === 'ordered' ? 'ol' : 'ul';
          return (
            <List
              key={key}
              className={cn(
                'space-y-1 pl-5',
                block.style === 'ordered' ? 'list-decimal' : 'list-disc'
              )}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-${itemIndex}`}>
                  <InlineText text={item} />
                </li>
              ))}
            </List>
          );
        }
        if (block.type === 'callout') {
          return (
            <aside
              key={key}
              className={cn(
                'rounded-card border px-3 py-2.5',
                block.tone === 'warning'
                  ? 'border-warning/45 bg-warning/5'
                  : 'border-cold/40 bg-cold/5'
              )}
            >
              {block.title && (
                <p className="label mb-1 text-foreground">{block.title}</p>
              )}
              <p>
                <InlineText text={block.text} />
              </p>
            </aside>
          );
        }

        /*
         * GÖRSEL. `loading="lazy"` ve `decoding="async"`: yazının ortasındaki
         * görsel ilk boyamayı bekletmemeli. Yükseklik bilinmediği için
         * `aspect-*` verilmiyor — sabit bir oran dayatmak, dikey görseli
         * kırpardı; yerine `max-h` ile taşma sınırlanıyor.
         */
        if (block.type === 'image') {
          return (
            <figure key={key} className="space-y-1.5">
              <img
                src={block.src}
                alt={block.alt}
                loading="lazy"
                decoding="async"
                className="max-h-[min(70vh,600px)] w-full rounded-card border border-border object-contain"
              />
              {(block.caption || block.credit) && (
                <figcaption className="text-meta text-faint">
                  {block.caption}
                  {block.caption && block.credit ? ' · ' : ''}
                  {block.credit}
                </figcaption>
              )}
            </figure>
          );
        }

        /*
         * TABLO. Dar ekranda YATAY KAYIYOR, sıkışmıyor: hücreleri
         * daraltmak sayıları alt alta kırar ve tabloyu okunmaz yapar.
         * Sarmalayıcı `tabIndex={0}` alıyor — klavye kullanan okur
         * kaydırılabilir bir alanı ancak odaklanabiliyorsa kaydırabilir.
         *
         * Satırlar dikdörtgen olmak zorunda değil (şemada gerekçesi var);
         * eksik hücreler burada boşla tamamlanıyor, yoksa tarayıcı satırı
         * kısa çizer ve sütunlar kayar.
         */
        if (block.type === 'table') {
          const genislik = Math.max(
            block.header?.length ?? 0,
            ...block.rows.map((row) => row.length)
          );
          const doldur = (row: string[]) =>
            Array.from({ length: genislik }, (_, i) => row[i] ?? '');

          return (
            <div
              key={key}
              tabIndex={0}
              role="region"
              aria-label={block.caption ?? 'Tablo'}
              className="overflow-x-auto rounded-card border border-border"
            >
              <table className="w-full border-collapse text-meta">
                {block.caption && (
                  <caption className="border-b border-border px-3 py-2 text-left text-meta text-faint">
                    {block.caption}
                  </caption>
                )}
                {block.header && (
                  <thead>
                    <tr className="bg-surface-2">
                      {doldur(block.header).map((hucre, i) => (
                        <th
                          key={i}
                          scope="col"
                          className="border-b border-border px-3 py-2 text-left font-medium text-foreground"
                        >
                          {hucre}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-border last:border-0">
                      {doldur(row).map((hucre, i) => (
                        <td key={i} className="px-3 py-2 align-top">
                          {hucre}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        /*
         * MEDYA. Adres burada kuruluyor, kayıtta yalnızca kimlik var
         * (gerekçe `domain/content/blocks.ts` · embed). `youtubeEmbedUrl`
         * biçimi tutmayan kimlikte `null` dönüyor; o durumda çerçeve HİÇ
         * çizilmiyor — boş bir iframe bırakmak, okura bozuk bir kutu
         * göstermek olurdu.
         */
        if (block.type === 'embed') {
          const src = youtubeEmbedUrl('video', block.videoId);
          if (!src) return null;
          return (
            <figure key={key} className="space-y-1.5">
              <div className="aspect-video w-full overflow-hidden rounded-card border border-border bg-black">
                <iframe
                  src={src}
                  title={block.title}
                  className="h-full w-full"
                  allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
              <figcaption className="text-meta text-faint">
                {block.title}
              </figcaption>
            </figure>
          );
        }

        return (
          <p key={key}>
            <InlineText text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
