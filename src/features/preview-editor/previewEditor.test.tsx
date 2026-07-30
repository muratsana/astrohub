import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  PreviewEditorProvider,
  usePreviewEditor,
  isPreviewEditorEnabled,
} from './PreviewEditorContext';
import { PreviewEditorPanel } from './PreviewEditorPanel';
import { defaultHeroSlides } from '@/features/home/hero/slides';

/**
 * Önizleme editörü bir tasarım aracıdır, ürün özelliği değildir.
 *
 * En kritik güvence: üretim derlemesinde **hiç açılmamalı**. Test ortamında
 * `VITE_PREVIEW_EDITOR` tanımsızdır, bu yüzden panel render edilmemelidir.
 */

function Probe() {
  const { enabled, slides } = usePreviewEditor();
  return (
    <div>
      <span data-testid="enabled">{String(enabled)}</span>
      <span data-testid="first-title">{slides[0].title}</span>
    </div>
  );
}

function renderWithProvider(children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <PreviewEditorProvider>{children}</PreviewEditorProvider>
    </MemoryRouter>
  );
}

beforeEach(() => localStorage.clear());

describe('önizleme editörü', () => {
  it('üretim/test ortamında kapalıdır', () => {
    expect(isPreviewEditorEnabled).toBe(false);
  });

  it('kapalıyken panel hiç render edilmez', () => {
    renderWithProvider(<PreviewEditorPanel />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /önizleme editörü/i })
    ).not.toBeInTheDocument();
  });

  it('kapalıyken bile slaytları koddaki değerlerle sunar', () => {
    renderWithProvider(<Probe />);
    expect(screen.getByTestId('enabled')).toHaveTextContent('false');
    expect(screen.getByTestId('first-title')).toHaveTextContent(
      defaultHeroSlides[0].title
    );
  });

  it('düzenleme yapıldığında değeri günceller ve saklar', () => {
    function Harness() {
      const { slides, updateField } = usePreviewEditor();
      return (
        <div>
          <span data-testid="title">{slides[0].title}</span>
          <button
            onClick={() =>
              updateField(defaultHeroSlides[0].id, 'title', 'Yeni başlık')
            }
          >
            değiştir
          </button>
        </div>
      );
    }

    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'değiştir' }));

    expect(screen.getByTestId('title')).toHaveTextContent('Yeni başlık');
    expect(localStorage.getItem('astrohub:preview-hero')).toContain(
      'Yeni başlık'
    );
  });

  it('sıfırlama koddaki değerlere döner ve depoyu temizler', () => {
    function Harness() {
      const { slides, updateField, reset, dirty } = usePreviewEditor();
      return (
        <div>
          <span data-testid="title">{slides[0].title}</span>
          <span data-testid="dirty">{String(dirty)}</span>
          <button
            onClick={() =>
              updateField(defaultHeroSlides[0].id, 'title', 'Geçici')
            }
          >
            değiştir
          </button>
          <button onClick={reset}>sıfırla</button>
        </div>
      );
    }

    renderWithProvider(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'değiştir' }));
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'sıfırla' }));
    expect(screen.getByTestId('title')).toHaveTextContent(
      defaultHeroSlides[0].title
    );
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
    expect(localStorage.getItem('astrohub:preview-hero')).toBeNull();
  });

  it('kodda slayt sayısı değişmişse saklanan kopyayı yok sayar', () => {
    // Eski bir oturumdan kalan, artık geçersiz olan iki slaytlık kopya
    localStorage.setItem(
      'astrohub:preview-hero',
      JSON.stringify(defaultHeroSlides.slice(0, 2))
    );
    renderWithProvider(<Probe />);
    expect(screen.getByTestId('first-title')).toHaveTextContent(
      defaultHeroSlides[0].title
    );
  });
});
