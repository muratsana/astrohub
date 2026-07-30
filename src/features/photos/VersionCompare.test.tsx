import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { VersionCompare } from './VersionCompare';
import { VersionHistory } from './VersionHistory';
import { photos } from './data';

const before = { label: 'v1', gradient: 'linear-gradient(#000, #111)' };
const after = { label: 'v2', gradient: 'linear-gradient(#222, #333)' };

describe('sürüm karşılaştırma sürgüsü (§8.1)', () => {
  it('ortadan başlar ve iki sürümü de etiketler', () => {
    render(<VersionCompare before={before} after={after} />);

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getAllByText('v1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('v2').length).toBeGreaterThan(0);
  });

  it('ok tuşlarıyla klavyeden sürülebilir — fare tek yol değil', () => {
    render(<VersionCompare before={before} after={after} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '55');

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '45');
  });

  it('Home ve End uçlara gider', () => {
    render(<VersionCompare before={before} after={after} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');
  });

  it('sınırların dışına taşmaz', () => {
    render(<VersionCompare before={before} after={after} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'Home' });
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(slider, { key: 'End' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('ilgisiz tuşlar konumu değiştirmez', () => {
    render(<VersionCompare before={before} after={after} />);
    const slider = screen.getByRole('slider');

    fireEvent.keyDown(slider, { key: 'a' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });
});

describe('sürüm geçmişi', () => {
  const withVersions = photos.find((p) => (p.versions?.length ?? 0) > 1)!;

  it('tohum veride en az bir çok sürümlü fotoğraf var', () => {
    expect(withVersions).toBeDefined();
  });

  it('varsayılan olarak ilk ve son sürümü karşılaştırır', () => {
    render(
      <MemoryRouter>
        <VersionHistory versions={withVersions.versions!} />
      </MemoryRouter>
    );

    const versions = withVersions.versions!;
    expect(screen.getByLabelText(/sol \(önce\)/i)).toHaveValue(versions[0].id);
    expect(screen.getByLabelText(/sağ \(sonra\)/i)).toHaveValue(
      versions[versions.length - 1].id
    );
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('iki tarafta aynı sürüm seçilirse sürgü yerine uyarı gösterir', () => {
    render(
      <MemoryRouter>
        <VersionHistory versions={withVersions.versions!} />
      </MemoryRouter>
    );

    const versions = withVersions.versions!;
    fireEvent.change(screen.getByLabelText(/sağ \(sonra\)/i), {
      target: { value: versions[0].id },
    });

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByText(/iki farklı sürüm seçin/i)).toBeInTheDocument();
  });

  it('tüm sürümleri geçmiş listesinde sıralar', () => {
    render(
      <MemoryRouter>
        <VersionHistory versions={withVersions.versions!} />
      </MemoryRouter>
    );

    for (const version of withVersions.versions!) {
      expect(screen.getAllByText(version.label).length).toBeGreaterThan(0);
    }
  });
});
