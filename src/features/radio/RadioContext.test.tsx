import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RadioProvider, useRadio } from './RadioContext';

vi.mock('@/services/content/radio', () => ({
  fetchRadioTracks: vi.fn(async () => [
    {
      id: 'test-track',
      title: 'Test',
      artist: 'Astrohub',
      source: 'mp3',
      url: 'https://cdn.example.com/test.mp3',
      durationSec: 120,
    },
  ]),
}));

vi.mock('@/services/content/radioStation', () => ({
  useStation: () => ({ station: null, live: false, loading: false }),
}));

const playContexts: boolean[] = [];
const audioInstances: FakeAudio[] = [];
let insideClick = false;

class FakeAudio extends EventTarget {
  currentTime = 0;
  preload = '';
  readyState = 1;
  src = '';
  volume = 1;

  constructor() {
    super();
    audioInstances.push(this);
  }

  load = vi.fn();
  pause = vi.fn();
  play = vi.fn(() => {
    playContexts.push(insideClick);
    return Promise.resolve();
  });
}

function Trigger() {
  const { hasBroadcast, toggle } = useRadio();
  return (
    <button
      type="button"
      disabled={!hasBroadcast}
      onClick={() => {
        insideClick = true;
        try {
          toggle();
        } finally {
          insideClick = false;
        }
      }}
    >
      Dinle
    </button>
  );
}

describe('RadioProvider', () => {
  beforeEach(() => {
    playContexts.length = 0;
    audioInstances.length = 0;
    insideClick = false;
    localStorage.clear();
    vi.stubGlobal('Audio', FakeAudio);
  });

  it('ilk oynatma denemesini kullanıcı tıklaması içinde yapar', async () => {
    render(
      <RadioProvider>
        <Trigger />
      </RadioProvider>
    );

    const button = screen.getByRole('button', { name: 'Dinle' });
    await waitFor(() => expect(button).not.toBeDisabled());

    fireEvent.click(button);

    expect(playContexts[0]).toBe(true);
  });

  it('kaldırılan ses kontrolünden kalan sessiz ayarı oynatırken düzeltir', async () => {
    localStorage.setItem('astrohub:radio:volume', '0');

    render(
      <RadioProvider>
        <Trigger />
      </RadioProvider>
    );

    const button = screen.getByRole('button', { name: 'Dinle' });
    await waitFor(() => expect(button).not.toBeDisabled());

    fireEvent.click(button);

    expect(audioInstances[0]?.volume).toBe(0.6);
    expect(localStorage.getItem('astrohub:radio:volume')).toBe('0.6');
  });
});
