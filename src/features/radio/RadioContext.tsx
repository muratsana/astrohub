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
import { useStation } from '@/services/content/radioStation';
import {
  broadcastPosition,
  decideSource,
  onTrackEnd,
  type RadioSource,
} from './handover';
import { dailyShuffle } from './dailyShuffle';

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
  playing: boolean;
  volume: number;
  hasBroadcast: boolean;
  currentTrack: RadioTrack | null;
  canSkip: boolean;
  shuffle: boolean;
  /** Kullanıcı oynatıcıyı gizlediyse dock görünmez. */
  dockVisible: boolean;

  toggle: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  toggleShuffle: () => void;
  /** Şu an hangi kaynak çalıyor: kayıtlı kasa mı, canlı yayın mı. */
  source: RadioSource;
  /** Canlı yayın başladı, çalan parça bitince devredilecek. */
  pendingLive: boolean;
  setVolume: (v: number) => void;
  hideDock: () => void;
  showDock: () => void;
}

const RadioContext = createContext<RadioState | undefined>(undefined);

const VOLUME_KEY = 'astrohub:radio:volume';
const DEFAULT_VOLUME = 0.6;
const SHUFFLE_KEY = 'astrohub:radio:daily-shuffle';

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

  const [shuffle, setShuffle] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(SHUFFLE_KEY) !== 'false';
  });
  const mp3Tracks = useMemo(() => {
    const rows = tracks.filter((track) => track.source === 'mp3');
    return shuffle
      ? dailyShuffle(rows, new Date().toISOString().slice(0, 10))
      : rows;
  }, [shuffle, tracks]);

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

  /* CANLI YAYIN ↔ KASA. Gerekçe ve kurallar `handover.ts` içinde;
     buradaki iş yalnızca kararı uygulamak. Yoklama aralığı 45 saniye:
     `station_is_live` üç dakikalık bayatlık penceresi kullanıyor, daha
     seyrek yoklamak canlı yayının başlangıcını dakikalarca kaçırırdı. */
  const { station, live } = useStation(45_000);
  const [source, setSource] = useState<RadioSource>('kasa');
  const [pendingLive, setPendingLive] = useState(false);

  /* `onEnded` dinleyicisi bir kez kuruluyor ve `pendingLive`i kapanışta
     yakalıyor — o değer parça biterken BAYAT olurdu. Ref güncel değeri
     taşıyor: dinleyiciyi her değişimde yeniden kurmak, çalan sesi
     kesme riski taşırdı. */
  const pendingLiveRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  useEffect(() => {
    pendingLiveRef.current = pendingLive;
  }, [pendingLive]);
  const [dockVisible, setDockVisible] = useState(true);

  const [volume, setVolumeState] = useState(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_VOLUME;
    const stored = Number(localStorage.getItem(VOLUME_KEY));
    if (!Number.isFinite(stored) || stored < 0 || stored > 1) {
      return DEFAULT_VOLUME;
    }
    if (stored <= 0.05) {
      try {
        localStorage.setItem(VOLUME_KEY, String(DEFAULT_VOLUME));
      } catch {
        // Depolama kapalıysa varsayılan ses yalnızca oturum boyu uygulanır.
      }
      return DEFAULT_VOLUME;
    }
    return stored;
  });

  const current = index >= 0 ? (mp3Tracks[index] ?? null) : null;
  const hasBroadcast =
    (source === 'canli' && Boolean(station?.streamUrl)) || mp3Tracks.length > 0;

  useEffect(() => {
    const karar = decideSource({
      live,
      streamUrl: station?.streamUrl ?? null,
      hasTracks: mp3Tracks.length > 0,
      current: source,
      playing,
    });
    setSource(karar.source);
    setPendingLive(karar.pending);
  }, [live, station?.streamUrl, mp3Tracks.length, source, playing]);

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

  const requestPlayback = useCallback((audio: HTMLAudioElement) => {
    if (volume <= 0.05) {
      setVolumeState(DEFAULT_VOLUME);
      audio.volume = DEFAULT_VOLUME;
      try {
        localStorage.setItem(VOLUME_KEY, String(DEFAULT_VOLUME));
      } catch {
        // Depolama kapalıysa varsayılan ses yalnızca oturum boyu uygulanır.
      }
    }
    setPlaying(true);
    void audio.play().catch(() => setPlaying(false));
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

    const onEnded = () => {
      /* Bekleyen canlı yayın varsa sıradaki parçaya GEÇMİYORUZ —
         devir teslim tam bu anda oluyor (gerekçe `handover.ts`). */
      if (onTrackEnd(pendingLiveRef.current) === 'canli') {
        setSource('canli');
        setPendingLive(false);
        return;
      }
      next();
    };
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
    if (!audio) return;

    /* Canlı yayında adres akıştan gelir, listeden değil. Akışın
       "bitişi" yok; `ended` olayı da gelmiyor ve gerekmiyor. */
    const hedef = source === 'canli' ? station?.streamUrl : current?.url;
    if (!hedef) return;
    let removeSeekListener: (() => void) | undefined;

    if (audio.src !== hedef) {
      audio.src = hedef;
      audio.load();
    }

    const seek = pendingSeekRef.current;
    if (source === 'kasa' && seek !== null) {
      const uygula = () => {
        pendingSeekRef.current = null;
        try {
          audio.currentTime = seek;
        } catch {
          // Bazı bozuk/eksik meta veriler seek'i reddeder; yayın yine çalar.
        }
      };

      if (audio.readyState >= 1) {
        uygula();
      } else {
        audio.addEventListener('loadedmetadata', uygula, { once: true });
        removeSeekListener = () =>
          audio.removeEventListener('loadedmetadata', uygula);
      }
    }

    if (playing) {
      // play() bir söz döner ve otomatik oynatma politikası yüzünden
      // reddedilebilir; sessizce yutmak yerine durumu geri alıyoruz ki
      // düğme gerçeği göstersin.
      requestPlayback(audio);
    } else {
      audio.pause();
    }

    return removeSeekListener;
  }, [current, playing, requestPlayback, source, station?.streamUrl]);

  const reconnectLive = useCallback(() => {
    const audio = audioRef.current;
    const streamUrl = station?.streamUrl;
    if (!audio || !streamUrl) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audio.src = streamUrl;
    audio.load();
  }, [station?.streamUrl]);

  const syncKasaToBroadcastClock = useCallback(() => {
    const position = broadcastPosition(mp3Tracks, Date.now());
    if (!position) return;
    pendingSeekRef.current = position.offsetSec;
    setIndex(position.index);
  }, [mp3Tracks]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (source === 'canli') {
      if (!station?.streamUrl) return;
      reconnectLive();
      requestPlayback(audio);
      return;
    } else {
      if (mp3Tracks.length === 0) return;
      const position = broadcastPosition(mp3Tracks, Date.now());
      const targetIndex = position?.index ?? (index >= 0 ? index : 0);
      const target = mp3Tracks[targetIndex];
      if (!target) return;

      if (position) {
        pendingSeekRef.current = position.offsetSec;
        setIndex(position.index);
      } else {
        syncKasaToBroadcastClock();
      }

      if (audio.src !== target.url) {
        audio.src = target.url;
        audio.load();
      }

      const seek = pendingSeekRef.current;
      if (seek !== null) {
        const uygula = () => {
          pendingSeekRef.current = null;
          try {
            audio.currentTime = seek;
          } catch {
            // Bazı bozuk/eksik meta veriler seek'i reddeder; yayın yine çalar.
          }
        };

        if (audio.readyState >= 1) {
          uygula();
        } else {
          audio.addEventListener('loadedmetadata', uygula, { once: true });
        }
      }

      requestPlayback(audio);
    }
  }, [
    index,
    mp3Tracks,
    reconnectLive,
    requestPlayback,
    source,
    station?.streamUrl,
    syncKasaToBroadcastClock,
  ]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [pause, play, playing]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    try {
      localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // Depolama kapalıysa ses seviyesi yalnızca oturum boyu hatırlanır.
    }
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((current) => {
      const nextValue = !current;
      try {
        localStorage.setItem(SHUFFLE_KEY, String(nextValue));
      } catch {
        // Depolama kapalıysa seçim yalnızca bu oturumda kalır.
      }
      return nextValue;
    });
    setIndex(0);
  }, []);

  const value = useMemo<RadioState>(
    () => ({
      playing,
      volume,
      hasBroadcast,
      currentTrack: current,
      canSkip: source === 'kasa' && mp3Tracks.length > 1,
      shuffle,
      dockVisible,
      toggle,
      pause,
      next,
      previous,
      toggleShuffle,
      source,
      pendingLive,
      setVolume,
      hideDock: () => setDockVisible(false),
      showDock: () => setDockVisible(true),
    }),
    [
      source,
      pendingLive,
      playing,
      volume,
      hasBroadcast,
      dockVisible,
      toggle,
      pause,
      setVolume,
      current,
      mp3Tracks.length,
      next,
      previous,
      shuffle,
      toggleShuffle,
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
