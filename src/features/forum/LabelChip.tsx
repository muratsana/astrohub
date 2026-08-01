import { forumLabels, type ForumLabelId } from './types';
import { cn } from '@/lib/cn';

/**
 * KONU ROZETİ ÇİPİ.
 *
 * Rozetin görünümü tek bir yerde tanımlı; forum listesi ve konu detayı
 * aynı bileşeni kullanıyor.
 *
 * NEDEN `Badge` DEĞİL: `Badge` kendi `tone`'unu uygularken metin ve kenar
 * rengini zaten yazıyor. Üstüne rozetin rengini `className` ile geçirmek
 * iki çakışan Tailwind sınıfı üretiyor ve `cn` yalnızca birleştirdiği için
 * (tailwind-merge değil) kazananı sınıf sırası değil, derlenmiş CSS'teki
 * sıra belirliyor. Ölçtüm: altı rozetten dördü rengini kaybedip gri
 * görünüyordu. Bu yüzden taban sınıflar RENK İÇERMEZ — renk yalnızca
 * `forumLabels[id].className` üzerinden gelir, çakışacak bir şey yoktur.
 *
 * Bileşen bilinçli olarak `className` propu ALMIYOR: dışarıdan sınıf
 * kabul etmek, aynı çakışmayı ilk çağrı yerinde geri getirirdi.
 */
export function LabelChip({ id }: { id: ForumLabelId }) {
  const badge = forumLabels[id];
  if (!badge) return null;

  return (
    <span
      title={badge.description}
      className={cn(
        'inline-block shrink-0 rounded-card border px-1.5 py-0.5 text-meta font-medium leading-[1.5] tracking-[0.02em]',
        badge.className
      )}
    >
      {badge.name}
    </span>
  );
}
