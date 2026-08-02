import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('tab seçimini aria-selected ile işaretler', () => {
    render(
      <SegmentedControl
        ariaLabel="Kategori"
        value="hepsi"
        onChange={vi.fn()}
        options={[
          { value: 'hepsi', label: 'Tümü' },
          { value: 'teknik', label: 'Teknik' },
        ]}
      />
    );

    expect(screen.getByRole('tab', { name: 'Tümü' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Teknik' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('group modunda aria-pressed kullanır ve değişimi bildirir', () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        role="group"
        ariaLabel="Yoğunluk"
        value="detayli"
        onChange={onChange}
        options={[
          { value: 'baslik', label: 'Başlık' },
          { value: 'detayli', label: 'Başlık + metin' },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Başlık' }));
    expect(onChange).toHaveBeenCalledWith('baslik');
    expect(screen.getByRole('button', { name: 'Başlık + metin' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('tooltip açıklamasını hedefe bağlar', () => {
    render(
      <SegmentedControl
        ariaLabel="Kategori"
        value="hepsi"
        onChange={vi.fn()}
        options={[
          {
            value: 'hepsi',
            label: 'Tümü',
            tooltip: 'Bütün kayıtları göster',
          },
        ]}
      />
    );

    const tab = screen.getByRole('tab', { name: 'Tümü' });
    const tooltip = screen.getByRole('tooltip');
    expect(tab.getAttribute('aria-describedby')).toBe(tooltip.id);
    expect(tooltip).toHaveTextContent('Bütün kayıtları göster');
  });
});
