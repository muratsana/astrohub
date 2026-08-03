import { z } from 'zod';
import { sanitizeText } from '@/lib/sanitize';

const text = z.string().trim().min(1).max(20_000);

export const ContentBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('paragraph'), text }),
  z.object({
    type: z.literal('heading'),
    level: z.union([z.literal(2), z.literal(3)]),
    text: text.max(300),
  }),
  z.object({ type: z.literal('quote'), text }),
  z.object({
    type: z.literal('list'),
    style: z.enum(['bullet', 'ordered']),
    items: z.array(text.max(1_000)).min(1).max(100),
  }),
  z.object({
    type: z.literal('callout'),
    tone: z.enum(['info', 'warning']),
    title: z.string().trim().max(120).optional(),
    text,
  }),
]);

export const ContentBlocksSchema = z.array(ContentBlockSchema).max(500);

export type ContentBlock = z.infer<typeof ContentBlockSchema>;

export function paragraphsToBlocks(paragraphs: string[]): ContentBlock[] {
  return paragraphs
    .map((value) => sanitizeText(value, { multiline: true }))
    .filter(Boolean)
    .map((value) => ({ type: 'paragraph' as const, text: value }));
}

export function parseContentBlocks(
  value: unknown,
  legacyParagraphs: string[] = []
): ContentBlock[] {
  const parsed = ContentBlocksSchema.safeParse(value);
  return parsed.success && parsed.data.length > 0
    ? parsed.data
    : paragraphsToBlocks(legacyParagraphs);
}

/** Eski istemciler ve arama özeti için kayıplı fakat güvenli düz metin. */
export function blocksToParagraphs(blocks: ContentBlock[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === 'list') return block.items;
    return [block.text];
  });
}

export function blocksToText(blocks: ContentBlock[]): string {
  return blocksToParagraphs(blocks).join('\n\n');
}

export function textToBlocks(value: string): ContentBlock[] {
  return paragraphsToBlocks(value.split(/\n\s*\n/));
}
