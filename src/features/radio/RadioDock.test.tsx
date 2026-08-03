import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { RadioDock } from './RadioDock';

const actions = {
  toggle: vi.fn(),
  next: vi.fn(),
  previous: vi.fn(),
  setVolume: vi.fn(),
  hideDock: vi.fn(),
};

vi.mock('./RadioContext', () => ({
  useRadio: () => ({
    playing: true,
    hasBroadcast: true,
    dockVisible: true,
    currentTrack: {
      id: 't1',
      title: 'Gece Akışı',
      artist: 'Astrohub',
      source: 'mp3',
      url: 'https://cdn.example.com/gece.mp3',
    },
    canSkip: true,
    source: 'kasa',
    volume: 0.6,
    ...actions,
  }),
}));

describe('RadioDock', () => {
  beforeEach(() => vi.clearAllMocks());

  it('çalan parçayı ve yayın kontrollerini gösteriyor', () => {
    render(
      <MemoryRouter>
        <RadioDock />
      </MemoryRouter>
    );

    expect(screen.getByText('Gece Akışı')).toBeInTheDocument();
    expect(screen.getByText('Astrohub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Önceki parça' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sonraki parça' })).toBeInTheDocument();
    expect(screen.getByLabelText('Radyo ses seviyesi')).toHaveValue('0.6');
  });

  it('gizleme eylemini bağlama iletiyor', () => {
    render(
      <MemoryRouter>
        <RadioDock />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Radyo oynatıcısını gizle' }));
    expect(actions.hideDock).toHaveBeenCalledOnce();
  });
});
