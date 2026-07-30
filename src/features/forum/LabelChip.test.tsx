import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { LabelChip } from './LabelChip';
import { forumLabelOrder, forumLabels } from './types';

/**
 * `cn` çakışan Tailwind sınıflarını ÇÖZMEZ — yalnızca birleştirir. Aynı
 * özelliği yazan iki sınıf ikisi birden class niteliğinde kalır ve kazananı
 * derlenmiş CSS'teki sıra belirler.
 *
 * Rozet çipi ilk yazıldığında `Badge` içine gömülüydü; `Badge` kendi
 * `tone`'uyla `text-muted-foreground` ve `border-border` yazıyor, rozetin
 * rengi de üstüne biniyordu. Sonuç: altı rozetten dördü rengini kaybedip
 * gri görünüyordu — testler ve tip denetimi yeşil olduğu hâlde.
 *
 * Bu yüzden test edilen şey "renk doğru mu" değil, ÇAKIŞMA YOK MU: taban
 * sınıflar renksiz olduğu sürece rozetin rengi tek başına kalır ve CSS
 * sırası konuşmaz.
 */
const rakipSiniflar = [
  'text-muted-foreground',
  'text-foreground',
  'text-faint',
  'border-border',
];

describe('LabelChip', () => {
  it.each(forumLabelOrder)('%s rozeti kendi rengini taşır', (id) => {
    const { container } = render(<LabelChip id={id} />);
    const chip = container.firstElementChild;
    const siniflar = (chip?.className ?? '').split(/\s+/);

    // Rozetin kendi renk sınıflarının tamamı yerinde.
    for (const beklenen of forumLabels[id].className.split(/\s+/)) {
      expect(siniflar).toContain(beklenen);
    }
  });

  it.each(forumLabelOrder)('%s rozeti çakışan renk sınıfı içermez', (id) => {
    const { container } = render(<LabelChip id={id} />);
    const siniflar = (container.firstElementChild?.className ?? '').split(/\s+/);

    for (const rakip of rakipSiniflar) {
      expect(siniflar).not.toContain(rakip);
    }
  });

  it('rozet adını ve açıklamasını gösterir', () => {
    const { container } = render(<LabelChip id="sorun-giderme" />);
    const chip = container.firstElementChild;
    expect(chip?.textContent).toBe('Sorun Giderme');
    expect(chip?.getAttribute('title')).toBe(
      forumLabels['sorun-giderme'].description
    );
  });
});
