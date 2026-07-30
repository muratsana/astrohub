import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { radioTracks } from './data';
import type { RadioTrack } from './types';
import { fetchRadioTracks } from '@/services/content/radio';

/**
 * RADYO BAĞLAMI — kalıcı oynatıcının beyni.
 *
 * Sağlayıcı router'ın **dışında**, uygulama kökünde durur. Sebebi doğrudan
 * ürün gereksinimi: müzik sayfa değişince kesilmemeli. Oynatıcı bir rota
 * bileşeninin içinde yaşasaydı, kullanıcı galeriye geçtiği anda `<audio>`
 * öğesi DOM'dan sökülür ve ses susardı.
 *
 * `<audio>` öğesi de bu yüzden React ağacında değil, `useRef` içinde
 * imperatif olarak tutulur — React'in yeniden render'ı sesi etkilemez.
 */

interface RadioState {
  tracks: RadioTrack[];
  /** Sırada çalan MP3'ün indeksi; liste boşsa -1. */
  index: number;
  current: RadioTrack | null;
  playing: boolean;
  volume: number;
  /** Kullanıcı oynatıcıyı gizlediyse dock görünmez. */
  dockVisible: boolean;
  /** Gömülü oynatıcıda açılan Spotify parçası. */
  spotifyTrack: RadioTrack | null;

  toggle: () => void;
  play: (trackId?: string) => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  hideDock: () => void;
  showDock: () => void;
  openSpotify: (track: RadioTrack) => void;
  closeSpotify: () => void;
}

const RadioContext = createContext<RadioState | undefined>(undefined);

const VOLUME_KEY = 'astrohub:radio:volume';

export function RadioProvider({ children }: { children: ReactNode }) {
  /*
   * Liste veritabanından gelir (QA FUNC-04): editörün panelden eklediği
   * parça dinleyiciye ulaşmalı. Tohum dizi (bilerek boş) yalnızca
   * yapılandırmasız ortamların yedeğidir; istek servis katmanında tek
   * sefere iner ve başarısızlıkta sessizce tohumda kalınır — radyo
   * "bozuk" değil "henüz parça yok" olarak görünür.
   */
  const [tracks, setTracks] = useState<RadioTrack[]>(radioTracks);
  useEffect(() => {
    let active = true;
    void fetchRadioTracks().then((rows) => {
      if (active && rows) setTracks(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  const mp3Tracks = useMemo(
    () => tracks.filter((t) => t.source === 'mp3'),
    [tracks]
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = useState(mp3Tracks.length > 0 ? 0 : -1);

  // Liste sonradan geldiğinde (DB yanıtı) sıra başa alınır; liste
  // kısalırsa taşan indeks toparlanır. -1'de kalmak, parça varken
  // oynatıcının ölü görünmesi demekti.
  useEffect(() => {
    setIndex((i) => {
      if (mp3Tracks.length === 0) return -1;
      if (i === -1 || i >= mp3Tracks.length) return 0;
      return i;
    });
  }, [mp3Tracks.length]);
  const [playing, setPlaying] = useState(false);
  const [spotifyTrack, setSpotifyTrack] = useState<RadioTrack | null>(null);
  const [dockVisible, setDockVisible] = useState(true);

  const [volume, setVolumeState] = useState(() => {
    if (typeof localStorage === 'undefined') return 0.6;
    const stored = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(stored) && stored >= 0 && stored <= 1 ? stored : 0.6;
  });

  const current = index >= 0 ? (mp3Tracks[index] ?? null) : null;

  // Ses öğesi bir kez kurulur ve uygulama boyunca yaşar.
  useEffect(() => {
    if (typeof Audio === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'none';
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const next = useCallback(() => {
    setIndex((i) => (mp3Tracks.length === 0 ? -1 : (i + 1) % mp3Tracks.length));
  }, [mp3Tracks.length]);

  const previous = useCallback(() => {
    setIndex((i) =>
      mp3Tracks.length === 0
        ? -1
        : (i - 1 + mp3Tracks.length) % mp3Tracks.length
    );
  }, [mp3Tracks.length]);

  // Parça bitince sıradakine geç — sonsuz döngü. "Radyo" olmasının şartı.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => next();
    const onError = () => {
      // Bir parça çalınamıyorsa (silinmiş dosya, ağ hatası) yayın durmamalı;
      // sıradakine geçilir. Tek bozuk dosya bütün radyoyu susturmamalı.
      setPlaying(false);
      next();
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);
    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [next]);

  // Kaynak değişince yükle; çalıyorduysa devam et.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;

    if (audio.src !== current.url) {
      audio.src = current.url;
      audio.load();
    }

    if (playing) {
      // play() bir söz döner ve otomatik oynatma politikası yüzünden
      // reddedilebilir; sessizce yutmak yerine durumu geri alıyoruz ki
      // düğme gerçeği göstersin.
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [current, playing]);

  const play = useCallback(
    (trackId?: string) => {
      if (trackId) {
        const i = mp3Tracks.findIndex((t) => t.id === trackId);
        if (i >= 0) setIndex(i);
      }
      if (mp3Tracks.length === 0) return;
      // MP3 çalmaya başlayınca Spotify oynatıcısı kapanır — iki ses
      // kaynağının üst üste binmesi kabul edilemez.
      setSpotifyTrack(null);
      setPlaying(true);
    },
    [mp3Tracks]
  );

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    if (mp3Tracks.length === 0) return;
    setPlaying((p) => !p);
  }, [mp3Tracks.length]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // Depolama kapalıysa ses seviyesi yalnızca oturum boyu hatırlanır.
    }
  }, []);

  const openSpotify = useCallback((track: RadioTrack) => {
    // Spotify gömülü oynatıcısı açılırken MP3 yayını susar.
    setPlaying(false);
    setSpotifyTrack(track);
  }, []);

  const closeSpotify = useCallback(() => setSpotifyTrack(null), []);

  const value = useMemo<RadioState>(
    () => ({
      tracks,
      index,
      current,
      playing,
      volume,
      dockVisible,
      spotifyTrack,
      toggle,
      play,
      pause,
      next,
      previous,
      setVolume,
      hideDock: () => setDockVisible(false),
      showDock: () => setDockVisible(true),
      openSpotify,
      closeSpotify,
    }),
    [
      tracks,
      index,
      current,
      playing,
      volume,
      dockVisible,
      spotifyTrack,
      toggle,
      play,
      pause,
      next,
      previous,
      setVolume,
      openSpotify,
      closeSpotify,
    ]
  );

  return <RadioContext.Provider value={value}>{children}</RadioContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRadio(): RadioState {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error('useRadio, RadioProvider içinde kullanılmalıdır.');
  return ctx;
}
