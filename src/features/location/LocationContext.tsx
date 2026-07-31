import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  cities,
  findCity,
  nearestCity,
  DEFAULT_CITY_ID,
  TURKEY_TIME_ZONE,
  type City,
} from './cities';
import {
  reduce as reduceLocationMode,
  canReturnToAuto as canReturnToAutoOf,
  needsPermissionHelp as needsPermissionHelpOf,
  modeLabels,
  INITIAL_STATE as LOCATION_MODE_INITIAL,
  type LocationMode,
} from '@/domain/location/mode';

/**
 * Gözlem konumu (§7.9, §15.3).
 *
 * Akış: uygulama varsayılan bir şehirle açılır ve kullanıcıya bir kez
 * tarayıcı konum izni önerilir. İzin verilirse yaklaşık koordinat kullanılır;
 * reddedilir ya da ertelenirse şehir seçici devrede kalır.
 *
 * Gizlilik: koordinat **sunucuya gönderilmez**, yalnızca tarayıcıda tutulur ve
 * yalnızca efemeris hesabında kullanılır. Konum, en yakın şehir adıyla
 * gösterilir — ekranda ham koordinat teşhir edilmez.
 */

const STORAGE_KEY = 'astrohub:location';

export type LocationSource = 'default' | 'city' | 'device';

export interface ObservingLocation {
  /** Ekranda gösterilecek ad. */
  label: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: LocationSource;
  /** Şehir ön ayarından geliyorsa tipik Bortle sınıfı. */
  bortle?: number;
}

/** Konum izni akışının hangi aşamada olduğu. */
export type PermissionState =
  | 'unasked' // kullanıcıya henüz sorulmadı
  | 'granted' // cihaz konumu kullanılıyor
  | 'denied' // reddedildi ya da hata aldı
  | 'dismissed' // "şehir seçeyim" dendi
  | 'pending'; // tarayıcı diyaloğu açık

interface LocationContextValue {
  location: ObservingLocation;
  cities: City[];
  permission: PermissionState;
  /**
   * Konum MODU — kullanıcının ne istediği (`permission` tarayıcının ne
   * dediği). İkisi ayrı tutulmazsa manuel şehir seçimi GPS yolunu
   * kalıcı kapatıyordu; Faz 1.2'de düzeltilen hata buydu.
   */
  mode: LocationMode;
  modeLabel: string;
  /** "Otomatik konuma dön" düğmesi çizilmeli mi. */
  canReturnToAuto: boolean;
  /** Tarayıcı ayar yönergesi gösterilmeli mi. */
  needsPermissionHelp: boolean;
  /** Öneri kutusu gösterilmeli mi? (yalnızca hiç sorulmadıysa) */
  shouldOfferGeolocation: boolean;
  setCity: (id: string) => void;
  requestDeviceLocation: () => void;
  dismissGeolocationOffer: () => void;
}

const LocationContext = createContext<LocationContextValue | undefined>(
  undefined
);

function cityLocation(city: City, source: LocationSource): ObservingLocation {
  return {
    label: city.name,
    latitude: city.latitude,
    longitude: city.longitude,
    timeZone: TURKEY_TIME_ZONE,
    source,
    bortle: city.bortle,
  };
}

interface StoredLocation {
  source: LocationSource;
  cityId?: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  permission?: PermissionState;
}

function readStored(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredLocation) : null;
  } catch {
    return null;
  }
}

function writeStored(value: StoredLocation) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Depolama yoksa seçim yalnızca bu oturumda geçerli olur.
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ObservingLocation>(() => {
    const stored = readStored();

    if (stored?.source === 'device' && stored.latitude != null && stored.longitude != null) {
      return {
        label: stored.label ?? nearestCity(stored.latitude, stored.longitude).name,
        latitude: stored.latitude,
        longitude: stored.longitude,
        timeZone: TURKEY_TIME_ZONE,
        source: 'device',
      };
    }

    const city = findCity(stored?.cityId ?? DEFAULT_CITY_ID);
    return cityLocation(city ?? findCity(DEFAULT_CITY_ID)!, stored?.cityId ? 'city' : 'default');
  });

  const [permission, setPermission] = useState<PermissionState>(
    () => readStored()?.permission ?? 'unasked'
  );

  /*
   * MOD, İZİNDEN AYRI. Saklanan kayıt cihaz konumuysa otomatik moddan
   * başlıyoruz; değilse manuel. İzin durumu buna KARIŞMIYOR — eski
   * kodda karışıyordu ve şehir seçen kullanıcı GPS'e dönemiyordu.
   */
  const [modeState, setModeState] = useState(() => {
    const stored = readStored();
    return stored?.source === 'device'
      ? { ...LOCATION_MODE_INITIAL, mode: 'AUTO_GPS' as LocationMode }
      : LOCATION_MODE_INITIAL;
  });

  const setCity = useCallback((id: string) => {
    const city = findCity(id);
    if (!city) return;
    setLocation(cityLocation(city, 'city'));
    /*
     * ASIL DÜZELTME: burada eskiden `permission` 'dismissed' yapılıyordu.
     * Yani şehir seçmek, izni hiç reddetmemiş bir kullanıcıda bile GPS
     * önerisini kalıcı kapatıyor ve "otomatik konuma dön" yolu
     * kalmıyordu. Manuel seçim artık YALNIZCA modu değiştiriyor.
     */
    setModeState((s) =>
      reduceLocationMode(s, {
        type: 'SELECT_MANUAL',
        fix: {
          label: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
          ref: id,
        },
      })
    );
    setPermission((current) => {
      writeStored({ source: 'city', cityId: id, permission: current });
      return current;
    });
  }, []);

  const requestDeviceLocation = useCallback(() => {
    if (!navigator.geolocation) {
      /* Desteklenmiyor ≠ reddedildi. İkisini aynı saymak, tarayıcısını
         değiştiren kullanıcıya "izni açın" demek olurdu. */
      setModeState((s) => reduceLocationMode(s, { type: 'GPS_UNAVAILABLE' }));
      setPermission('denied');
      return;
    }

    setModeState((s) => reduceLocationMode(s, { type: 'REQUEST_AUTO' }));
    setPermission('pending');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const label = nearestCity(coords.latitude, coords.longitude).name;
        const next: ObservingLocation = {
          label,
          latitude: coords.latitude,
          longitude: coords.longitude,
          timeZone: TURKEY_TIME_ZONE,
          source: 'device',
        };
        setLocation(next);
        setModeState((s) =>
          reduceLocationMode(s, {
            type: 'GPS_OK',
            fix: { label, latitude: coords.latitude, longitude: coords.longitude },
          })
        );
        setPermission('granted');
        writeStored({
          source: 'device',
          latitude: coords.latitude,
          longitude: coords.longitude,
          label,
          permission: 'granted',
        });
      },
      (err) => {
        /*
         * ÜÇ HATA AYRI. Eski kod hepsini 'denied' sayıyordu; zaman aşımı
         * yaşayan kullanıcıya "izni açın" demek onu olmayan bir ayarı
         * aramaya gönderirdi.
         */
        setModeState((s) =>
          reduceLocationMode(
            s,
            err.code === err.PERMISSION_DENIED
              ? { type: 'GPS_DENIED' }
              : err.code === err.POSITION_UNAVAILABLE
                ? { type: 'GPS_ERROR', message: 'Konum servisi yanıt vermedi.' }
                : { type: 'GPS_ERROR', message: 'Konum alınamadı, tekrar deneyin.' }
          )
        );
        setPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'unasked');
        writeStored({
          source: 'city',
          cityId: DEFAULT_CITY_ID,
          permission: err.code === err.PERMISSION_DENIED ? 'denied' : 'unasked',
        });
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 }
    );
  }, []);

  /**
   * İZİN ZATEN VERİLMİŞSE KONUMU KENDİLİĞİNDEN AL.
   *
   * BULUNAN HATA: kullanıcı tarayıcıya konum iznini vermiş olsa bile
   * uygulama `getCurrentPosition`'ı yalnızca "Konum izni ver" düğmesine
   * basıldığında çağırıyordu. Düğmeye basılmadıkça — ya da öneri kutusu
   * bir kez kapatıldıkça — konum sonsuza kadar varsayılan şehirde
   * (İstanbul) kalıyordu. Ankara'daki bir kullanıcı için sayfadaki her
   * hesap yanlış enlemde yapılıyordu ve bunun görünür bir işareti yoktu.
   *
   * Permissions API "granted" diyorsa tarayıcı bize sormadan konum
   * verir; ek bir diyalog açılmaz, yani kullanıcıyı rahatsız etmeden
   * doğru konuma geçilir. "denied" ise öneri kutusunu boşuna
   * göstermemek için durum işaretlenir.
   *
   * KULLANICININ ŞEHİR SEÇİMİ EZİLMEZ: otomatik alma yalnızca hiç seçim
   * yapılmamışken (`source === 'default'`) çalışır. Elle Ankara seçen
   * birini cihaz konumuyla başka yere taşımak, seçimi geri almak olurdu.
   */
  useEffect(() => {
    if (!navigator.permissions?.query) return;
    let active = true;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!active) return;
        if (status.state === 'denied') {
          setPermission((current) =>
            current === 'unasked' ? 'denied' : current
          );
          return;
        }
        if (status.state === 'granted' && location.source === 'default') {
          requestDeviceLocation();
        }
      })
      .catch(() => {
        // Bazı tarayıcılar geolocation sorgusunu desteklemez — sessiz geç.
      });

    return () => {
      active = false;
    };
  }, [location.source, requestDeviceLocation]);

  const dismissGeolocationOffer = useCallback(() => {
    setPermission('dismissed');
    writeStored({
      source: location.source === 'device' ? 'device' : 'city',
      cityId: findCity(DEFAULT_CITY_ID)!.id,
      permission: 'dismissed',
    });
  }, [location.source]);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      cities,
      permission,
      mode: modeState.mode,
      modeLabel: modeLabels[modeState.mode],
      canReturnToAuto: canReturnToAutoOf(modeState),
      needsPermissionHelp: needsPermissionHelpOf(modeState),
      shouldOfferGeolocation: permission === 'unasked',
      setCity,
      requestDeviceLocation,
      dismissGeolocationOffer,
    }),
    [
      location,
      permission,
      modeState,
      setCity,
      requestDeviceLocation,
      dismissGeolocationOffer,
    ]
  );

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error('useLocationContext, LocationProvider içinde kullanılmalıdır.');
  return ctx;
}
