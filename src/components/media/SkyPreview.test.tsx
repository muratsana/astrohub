import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkyPreview } from './SkyPreview';

describe('SkyPreview', () => {
  it('özel sınıf geçilse bile tarama görselini kendi kutusuna sabitler', () => {
    const { container } = render(
      <SkyPreview
        seed="m31"
        kind="galaksi"
        raDeg={10}
        decDeg={20}
        arcmin={60}
        width={960}
        height={720}
        alt="M31"
        className="h-full w-full"
      />
    );

    const kapsayici = container.firstElementChild;
    expect(kapsayici).toHaveClass('relative');
    expect(kapsayici).toHaveClass('overflow-hidden');
    expect(kapsayici).toHaveClass('h-full');
    expect(kapsayici).toHaveClass('w-full');
    expect(screen.getByRole('img', { name: 'M31' })).toHaveClass('absolute');
  });
});
