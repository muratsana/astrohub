import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { RadioDock } from './RadioDock';

const actions = {
  toggle: vi.fn(),
  next: vi.fn(),
  previous: vi.fn(),
  toggleShuffle: vi.fn(),
  setVolume: vi.fn(),
  hideDock: vi.fn(),
};

const roles = vi.hoisted(() => ({ isAdmin: false }));

vi.mock('@/features/admin/useRoles', () => ({
  useRoles: () => ({ isAdmin: roles.isAdmin }),
}));

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
    shuffle: true,
    source: 'kasa',
    volume: 0.6,
    ...actions,
  }),
}));

describe('RadioDock', () => {
  beforeEach(() => {
    roles.isAdmin = false;
    vi.clearAllMocks();
  });

  it('normal kullanıcıya yalnız dinleme kontrolünü gösteriyor', () => {
    render(
      <MemoryRouter>
        <RadioDock />
      </MemoryRouter>
    );

    expect(screen.getByText('Gece Akışı')).toBeInTheDocument();
    expect(screen.getByText('Astrohub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Canlı yayını duraklat' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Önceki parça' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sonraki parça' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Radyo ses seviyesi')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Radyo oynatıcısını gizle' })).not.toBeInTheDocument();
  });

  it('admin kullanıcıya gelişmiş yayın kontrollerini gösteriyor', () => {
    roles.isAdmin = true;

    render(
      <MemoryRouter>
        <RadioDock />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Önceki parça' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sonraki parça' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Günlük karışık sırayı kapat' })).toBeInTheDocument();
    expect(screen.getByLabelText('Radyo ses seviyesi')).toHaveValue('0.6');
  });

  it('admin gizleme eylemini bağlama iletiyor', () => {
    roles.isAdmin = true;

    render(
      <MemoryRouter>
        <RadioDock />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Radyo oynatıcısını gizle' }));
    expect(actions.hideDock).toHaveBeenCalledOnce();
  });
});
