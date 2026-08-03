import type { ContentBlock } from '@/domain/content/blocks';
import { cn } from '@/lib/cn';

export function BlockRenderer({
  blocks,
  className,
}: {
  blocks: ContentBlock[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-5 text-body-sm leading-[1.85] text-muted-foreground', className)}>
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        if (block.type === 'heading') {
          const Heading = block.level === 2 ? 'h2' : 'h3';
          return <Heading key={key} className="type-panel pt-2 text-foreground">{block.text}</Heading>;
        }
        if (block.type === 'quote') {
          return <blockquote key={key} className="border-l-2 border-primary pl-4 italic text-foreground">{block.text}</blockquote>;
        }
        if (block.type === 'list') {
          const List = block.style === 'ordered' ? 'ol' : 'ul';
          return (
            <List key={key} className={cn('space-y-1 pl-5', block.style === 'ordered' ? 'list-decimal' : 'list-disc')}>
              {block.items.map((item, itemIndex) => <li key={`${key}-${itemIndex}`}>{item}</li>)}
            </List>
          );
        }
        if (block.type === 'callout') {
          return (
            <aside key={key} className={cn('rounded-card border px-3 py-2.5', block.tone === 'warning' ? 'border-warning/45 bg-warning/5' : 'border-cold/40 bg-cold/5')}>
              {block.title && <p className="label mb-1 text-foreground">{block.title}</p>}
              <p>{block.text}</p>
            </aside>
          );
        }
        return <p key={key}>{block.text}</p>;
      })}
    </div>
  );
}
