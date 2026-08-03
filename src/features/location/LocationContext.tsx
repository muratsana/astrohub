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
  findCity,
  DEFAULT_CITY_ID,
  TURKEY_TIME_ZONE,
  type City,
} from './cities';
import {
  readStoredLocation as readStored,
  writeStoredLocation as writeStored,
} from './storage';
import type {
  LocationSource,
  ObservingLocation,
  PermissionState,
} from './types';
import { fetchProvinces, type Province } from '@/services/content/provinces';
import {
  fetchDistricts,
  nearestDistrict,
  NEAREST_DISTRICT_LIMIT_KM,
} from '@/services/content/districts';
import { createLocalReverseGeocoder } from '@/domain/location/geocode';
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

export type {
  LocationSource,
  ObservingLocation,
  PermissionState,
} from './types';

/**
 * CİHAZ KONUMU ETİKETİ — il eşleşmediğinde.
 *
 * Eskiden 15 şehirlik listeden "en yakın" koşulsuz seçiliyordu; sınırın
 * ötesindeki (ya da VPN arkasındaki) kullanıcı ekranda gerçek olmayan
 * bir il adı görüyordu. Eşleşme yoksa artık iddiada bulunulmuyor —
 * hesap yine gerçek koordinatla yapılıyor, yalnızca etiket susuyor.
 */
const DEVICE_LABEL = 'Cihaz konumu';

/**
 * Ters kodlayıcı modül düzeyinde: il listesi `fetchProvinces` içinde
 * zaten önbellekli, çözücünün kendisi durumsuz.
 */
const geocoder = createLocalReverseGeocoder(async () =>
  (await fetchProvinces()).items.map((p) => ({
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    ref: p.slug,
  }))
);

/**
 * CİHAZ KONUMUNUN İLÇE ADI (§4.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İKİNCİ BİR ADIM, NEDEN ÇÖZÜCÜNÜN İÇİNDE DEĞİL
 *
 * Ters kodlayıcı 81 il merkezine bakıyor ve ADAY LİSTESİ paket içinde;
 * 974 ilçeyi oraya koymak listeyi ilk yüklenen JS'e sokardı. İlçe
 * yalnızca cihaz konumu ALINDIKTAN sonra, o da yalnızca eşleşen ilin
 * satırları için isteniyor — yani ~40 satır, bir kez, önbellekli.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SESSİZ BAŞARISIZLIK BİLEREK
 *
 * Her dönüş yolu `null`: il eşleşmediyse, plaka kodu bulunamadıysa,
 * tablo okunamadıysa ya da en yakın merkez `NEAREST_DISTRICT_LIMIT_KM`
 * ötesindeyse. `null` "ilçe yazma" demek — etiket il adında kalıyor.
 * İlçe bir SÜS; onun için il adını geciktirmek ya da hata göstermek
 * kullanıcıya hiçbir şey kazandırmaz.
 */
async function nearestDistrictName(
  provinceSlug: string | undefined,
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!provinceSlug) return null;
  try {
    const code = (await fetchProvinces()).items.find(
      (p) => p.slug === provinceSlug
    )?.code;
    if (!code) return null;
    const near = nearestDistrict(
      await fetchDistricts(code),
      latitude,
      longitude
    );
    return near && near.distanceKm <= NEAREST_DISTRICT_LIMIT_KM
      ? near.district.name
      : null;
  } catch {
    return null;
  }
}

interface LocationContextValue {
  location: ObservingLocation;
  /**
   * Şehir seçicinin listesi — 81 il (`provinces`), yapılandırma yoksa
   * tohum yedeği. Modül başına ayrı liste tutmak §4.1'in yasakladığı
   * şeydi: "Ankara" altı yerde altı ayrı yazımla bulunuyordu.
   */
  provinces: Province[];
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
  /**
   * İl + ilçe seçimi (§4.1).
   *
   * `setCity`den AYRI bir fonksiyon: ilçe seçmek ili de değiştirebilir
   * ve iki çağrı yapmak arada bir kare il merkezini göstermek demekti.
   * Tek çağrı, tek durum güncellemesi.
   */
  setDistrict: (input: {
    provinceSlug: string;
    provinceName: string;
    districtId: string;
    districtName: string;
    latitude: number;
    longitude: number;
  }) => void;
  setObservingSite: (input: {
    label: string;
    provinceSlug?: string;
    provinceName: string;
    latitude: number;
    longitude: number;
    bortle?: number;
    altitude?: number;
  }) => void;
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
    cityId: city.id,
    provinceName: city.name,
    bortle: city.bortle,
  };
}

/**
 * İl kaydından gözlem konumu.
 *
 * BORTLE YALNIZCA ÖLÇÜLÜ OLANLARDA. Tohum listedeki 15 il merkezinin
 * tipik Bortle sınıfı elde var; kalan 66 için yok. Bir sayı uydurmak
 * (ör. nüfusa bakıp tahmin etmek) kullanıcının gökyüzü beklentisini
 * yanlış kurardı — alan boş kalıyor ve ışık kirliliği sayfası kendi
 * varsayılanını kullanıyor.
 */
function provinceLocation(
  province: Province,
  source: LocationSource
): ObservingLocation {
  return {
    label: province.name,
    latitude: province.latitude,
    longitude: province.longitude,
    timeZone: TURKEY_TIME_ZONE,
    source,
    cityId: province.slug,
    provinceName: province.name,
    bortle: findCity(province.slug)?.bortle,
  };
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ObservingLocation>(() => {
    const stored = readStored();

    if (
      stored?.source === 'device' &&
      stored.latitude != null &&
      stored.longitude != null
    ) {
      return {
        /* Saklanan etiket yoksa iddiasız başlanıyor; il listesi geldiğinde
           aşağıdaki etki onu çözüyor. Eskiden burada 15 şehirlik listeden
           senkron bir tahmin yapılıyordu. */
        label: stored.label ?? DEVICE_LABEL,
        latitude: stored.latitude,
        longitude: stored.longitude,
        timeZone: TURKEY_TIME_ZONE,
        source: 'device',
        provinceName: stored.provinceName,
        districtName: stored.districtName,
      };
    }

    if (
      stored?.source === 'site' &&
      stored.latitude != null &&
      stored.longitude != null
    ) {
      return {
        label: stored.label ?? DEVICE_LABEL,
        latitude: stored.latitude,
        longitude: stored.longitude,
        timeZone: TURKEY_TIME_ZONE,
        source: 'site',
        cityId: stored.cityId,
        provinceName: stored.provinceName,
        altitude: stored.altitude,
      };
    }

    const city = findCity(stored?.cityId ?? DEFAULT_CITY_ID);
    return cityLocation(
      city ?? findCity(DEFAULT_CITY_ID)!,
      stored?.cityId ? 'city' : 'default'
    );
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

  /*
   * İL LİSTESİ TEK KAYNAKTAN (§4.1). Yükleme asenkron; gelene kadar
   * tohum yedeği kullanılıyor, böylece seçici hiçbir anda boş açılmıyor.
   * `fetchProvinces` kendi içinde önbellekli — dört seçici dört istek
   * atmıyor.
   */
  const [provinces, setProvinces] = useState<Province[]>([]);

  useEffect(() => {
    let active = true;
    fetchProvinces()
      .then((result) => {
        if (!active) return;
        setProvinces(result.items);

        /*
         * SAKLANAN SEÇİM TOHUMDA OLMAYAN BİR İL OLABİLİR. İlk render
         * yalnızca 15 şehri tanıyor; "Sivas" seçmiş kullanıcı sayfayı
         * yenilediğinde varsayılana düşüyordu. Liste gelince kendi ili
         * geri konuyor.
         */
        const stored = readStored();
        if (stored?.source !== 'city' || !stored.cityId) return;
        const province = result.items.find((p) => p.slug === stored.cityId);
        if (!province) return;
        setLocation((current) =>
          current.label === province.name
            ? current
            : provinceLocation(province, 'city')
        );
      })
      .catch(() => {
        /* Liste okunamadıysa tohum yedeği yerinde kalıyor. */
      });
    return () => {
      active = false;
    };
  }, []);

  const setCity = useCallback(
    (id: string) => {
      /*
       * ÖNCE İL LİSTESİ, SONRA TOHUM. Sıra önemli: aynı slug ikisinde de
       * varsa kazanan veritabanı kaydı olmalı — koordinatı orada güncellenir.
       */
      const province = provinces.find((p) => p.slug === id);
      const city = findCity(id);
      if (!province && !city) return;
      setLocation(
        province
          ? provinceLocation(province, 'city')
          : cityLocation(city!, 'city')
      );
      const fix = {
        label: province?.name ?? city!.name,
        latitude: province?.latitude ?? city!.latitude,
        longitude: province?.longitude ?? city!.longitude,
      };
      /*
       * ASIL DÜZELTME: burada eskiden `permission` 'dismissed' yapılıyordu.
       * Yani şehir seçmek, izni hiç reddetmemiş bir kullanıcıda bile GPS
       * önerisini kalıcı kapatıyor ve "otomatik konuma dön" yolu
       * kalmıyordu. Manuel seçim artık YALNIZCA modu değiştiriyor.
       */
      setModeState((s) =>
        reduceLocationMode(s, {
          type: 'SELECT_MANUAL',
          fix: { ...fix, ref: id },
        })
      );
      setPermission((current) => {
        writeStored({ source: 'city', cityId: id, permission: current });
        return current;
      });
    },
    [provinces]
  );

  const setDistrict = useCallback(
    (input: {
      provinceSlug: string;
      provinceName: string;
      districtId: string;
      districtName: string;
      latitude: number;
      longitude: number;
    }) => {
      setLocation({
        /* Etiket İKİ KADEMELİ: "Ankara / Çankaya". Yalnızca ilçe adı
           yazsaydık "Merkez" gibi onlarca ilde tekrarlanan adlar
           anlamsız olurdu. */
        label: `${input.provinceName} / ${input.districtName}`,
        latitude: input.latitude,
        longitude: input.longitude,
        timeZone: TURKEY_TIME_ZONE,
        source: 'city',
        cityId: input.provinceSlug,
        provinceName: input.provinceName,
        districtId: input.districtId,
        districtName: input.districtName,
        bortle: findCity(input.provinceSlug)?.bortle,
      });
      setModeState((s) =>
        reduceLocationMode(s, {
          type: 'SELECT_MANUAL',
          fix: {
            label: `${input.provinceName} / ${input.districtName}`,
            latitude: input.latitude,
            longitude: input.longitude,
            ref: input.provinceSlug,
          },
        })
      );
      setPermission((current) => {
        writeStored({
          source: 'city',
          cityId: input.provinceSlug,
          permission: current,
        });
        return current;
      });
    },
    []
  );

  const setObservingSite = useCallback(
    (input: {
      label: string;
      provinceSlug?: string;
      provinceName: string;
      latitude: number;
      longitude: number;
      bortle?: number;
      altitude?: number;
    }) => {
      setLocation({
        label: input.label,
        latitude: input.latitude,
        longitude: input.longitude,
        timeZone: TURKEY_TIME_ZONE,
        source: 'site',
        cityId: input.provinceSlug,
        provinceName: input.provinceName,
        bortle: input.bortle,
        altitude: input.altitude,
      });
      setModeState((s) =>
        reduceLocationMode(s, {
          type: 'SELECT_MANUAL',
          fix: {
            label: input.label,
            latitude: input.latitude,
            longitude: input.longitude,
            ref: input.provinceSlug,
          },
        })
      );
      setPermission((current) => {
        writeStored({
          source: 'site',
          cityId: input.provinceSlug,
          latitude: input.latitude,
          longitude: input.longitude,
          label: input.label,
          provinceName: input.provinceName,
          altitude: input.altitude,
          permission: current,
        });
        return current;
      });
    },
    []
  );

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

    const onSuccess = ({ coords }: GeolocationPosition) => {
      const { latitude, longitude } = coords;
      /*
       * KONUM ÖNCE, ETİKET SONRA. Hesaplar koordinatı hemen kullanmalı;
       * il adını beklemek "bu gece"yi bir tur boyunca varsayılan şehirde
       * bırakırdı. Etiket çözülene kadar iddiasız duruyor.
       */
      const next: ObservingLocation = {
        label: DEVICE_LABEL,
        latitude,
        longitude,
        timeZone: TURKEY_TIME_ZONE,
        source: 'device',
      };
      setLocation(next);
      setModeState((s) =>
        reduceLocationMode(s, {
          type: 'GPS_OK',
          fix: { label: DEVICE_LABEL, latitude, longitude },
        })
      );
      setPermission('granted');
      writeStored({
        source: 'device',
        latitude,
        longitude,
        label: DEVICE_LABEL,
        permission: 'granted',
      });

      void geocoder.resolve(latitude, longitude).then(async (match) => {
        /* Eşleşme yoksa etiket "Cihaz konumu" kalıyor — sınır ötesinde
             ya da liste okunamadığında il adı uydurulmuyor. */
        if (!match) return;

        /*
         * ETİKET İKİ HAMLEDE YAZILIYOR: önce il, sonra ilçe.
         *
         * İkisini tek zincire dizmek il adını da ilçe isteği kadar
         * geciktirirdi — elde olan bilgiyi ağ turu boyunca saklamak
         * olurdu. İl adı çözülür çözülmez yazılıyor; ilçe gelirse
         * yanına ekleniyor, gelmezse il adı öylece kalıyor.
         *
         * KOŞUL HER İKİ YAZIMDA DA AYNI: kullanıcı bu arada elle
         * şehir seçtiyse ya da konum yenilendiyse geç gelen etiket
         * onu EZMİYOR.
         */
        const yaz = (label: string, districtName?: string) => {
          setLocation((current) =>
            current.source === 'device' &&
            current.latitude === latitude &&
            current.longitude === longitude
              ? { ...current, label, provinceName: match.label, districtName }
              : current
          );
          setModeState((s) =>
            reduceLocationMode(s, {
              type: 'GPS_OK',
              fix: { label, latitude, longitude, ref: match.ref },
            })
          );
          writeStored({
            source: 'device',
            latitude,
            longitude,
            label,
            provinceName: match.label,
            districtName,
            permission: 'granted',
          });
        };

        yaz(match.label);

        const ilce = await nearestDistrictName(match.ref, latitude, longitude);
        /*
         * `cityId` VE `districtId` BİLEREK YAZILMIYOR. İkisi de bir
         * KAYDA işaret ediyor ve paylaşılabilir bağlantı (`?sehir=`)
         * o kayıttan kuruluyor; cihaz konumunun paylaşılacak bir
         * karşılığı olmamalı (§14.4). Buradaki ilçe bir ETİKET —
         * kullanıcının kendi ekranında "yaklaşık neredeyim"i söyler,
         * dışarıya bir şey söylemez.
         */
        if (ilce) yaz(`${match.label} / ${ilce}`, ilce);
      });
    };

    const onFailure = (err: GeolocationPositionError) => {
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
              : {
                  type: 'GPS_ERROR',
                  message: 'Konum alınamadı, tekrar deneyin.',
                }
        )
      );
      setPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'unasked');
      if (err.code === err.PERMISSION_DENIED) {
        writeStored({
          ...(readStored() ?? {
            source: 'city',
            cityId: location.cityId ?? DEFAULT_CITY_ID,
          }),
          permission: 'denied',
        });
      }
    };

    const geo = navigator.geolocation;
    geo.getCurrentPosition(
      onSuccess,
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          onFailure(err);
          return;
        }
        geo.getCurrentPosition(onSuccess, onFailure, {
          enableHighAccuracy: true,
          timeout: 20_000,
          maximumAge: 0,
        });
      },
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 600_000 }
    );
  }, [location.cityId]);

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

    const applyStatus = (state: PermissionStatus['state']) => {
      if (state === 'denied') {
        setPermission((current) =>
          current === 'unasked' || current === 'dismissed' ? 'denied' : current
        );
        return;
      }
      if (state === 'prompt') {
        setPermission((current) =>
          current === 'pending' ? current : 'unasked'
        );
        return;
      }
      setPermission('granted');
      if (
        location.source === 'default' ||
        (location.source === 'city' && location.cityId === DEFAULT_CITY_ID)
      ) {
        requestDeviceLocation();
      }
    };

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (!active) return;
        applyStatus(status.state);
        status.onchange = () => {
          if (active) applyStatus(status.state);
        };
      })
      .catch(() => {
        // Bazı tarayıcılar geolocation sorgusunu desteklemez — sessiz geç.
      });

    return () => {
      active = false;
    };
  }, [location.cityId, location.source, requestDeviceLocation]);

  const dismissGeolocationOffer = useCallback(() => {
    setPermission('dismissed');
    writeStored({
      source:
        location.source === 'device'
          ? 'device'
          : location.source === 'site'
            ? 'site'
            : 'city',
      cityId: location.cityId ?? findCity(DEFAULT_CITY_ID)!.id,
      latitude:
        location.source === 'device' || location.source === 'site'
          ? location.latitude
          : undefined,
      longitude:
        location.source === 'device' || location.source === 'site'
          ? location.longitude
          : undefined,
      label: location.source === 'site' ? location.label : undefined,
      provinceName: location.provinceName,
      altitude: location.altitude,
      permission: 'dismissed',
    });
  }, [location]);

  const value = useMemo<LocationContextValue>(
    () => ({
      location,
      provinces,
      permission,
      mode: modeState.mode,
      modeLabel: modeLabels[modeState.mode],
      canReturnToAuto: canReturnToAutoOf(modeState),
      needsPermissionHelp: needsPermissionHelpOf(modeState),
      shouldOfferGeolocation: permission === 'unasked',
      setCity,
      setDistrict,
      setObservingSite,
      requestDeviceLocation,
      dismissGeolocationOffer,
    }),
    [
      location,
      provinces,
      permission,
      modeState,
      setCity,
      setDistrict,
      setObservingSite,
      requestDeviceLocation,
      dismissGeolocationOffer,
    ]
  );

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocationContext(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx)
    throw new Error(
      'useLocationContext, LocationProvider içinde kullanılmalıdır.'
    );
  return ctx;
}
