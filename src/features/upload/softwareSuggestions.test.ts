import { describe, expect, it } from 'vitest';
import {
  applySoftwareSuggestion,
  softwareAutocompleteSuggestions,
} from './softwareSuggestions';

describe('software autocomplete', () => {
  it('Pixinsight yazımını PixInsight önerisine bağlar', () => {
    expect(softwareAutocompleteSuggestions('Pixinsight')[0]).toBe('PixInsight');
  });

  it('virgülden sonraki aktif yazılımı tamamlar', () => {
    expect(softwareAutocompleteSuggestions('Siril, pho')[0]).toBe('Photoshop');
    expect(applySoftwareSuggestion('Siril, pho', 'Photoshop')).toBe(
      'Siril, Photoshop, '
    );
  });

  it('zaten seçilmiş yazılımı tekrar önermez', () => {
    const suggestions = softwareAutocompleteSuggestions('PixInsight, sir');

    expect(suggestions).toContain('Siril');
    expect(suggestions).not.toContain('PixInsight');
  });
});
