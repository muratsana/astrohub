import { cities } from '../location/cities';

/**
 * ŞEHİR SEO ADRESLERİ (§20).
 *
 * Adres deseni `/{sehir}-astronomi-etkinlikleri`. Şehir adı bir yol
 * parçasının **içinde** geçtiği için React Router'ın dinamik segmenti
 * (`:param`) kullanılamaz — dinamik segment yalnızca tam bir parçayı
 * karşılar, `/:city-astronomi-etkinlikleri` diye bir desen yoktur.
 *
 * Bu yüzden rotalar şehir listesinden **üretilir**: on beş şehir, on beş
 * açık rota. Yan faydası, tanımsız bir şehir adının 404 vermesi — kök
 * seviyede yakalayıcı bir rota koysaydık `/rastgele-astronomi-etkinlikleri`
 * boş bir sayfa üretirdi ve arama motoru bunu indeksleyebilirdi.
 */

const SUFFIX = 'astronomi-etkinlikleri';

/** Şehir kimliğinden rota parçası: "ankara" → "ankara-astronomi-etkinlikleri". */
export function cityRouteSlug(cityId: string): string {
  return `${cityId}-${SUFFIX}`;
}

/**
 * Yol adresinden şehir kimliği; eşleşme yoksa `null`.
 *
 * Sayfa hangi şehir için açıldığını buradan öğrenir: rotalar üretildiği
 * için bir `useParams` değeri yok, adresin kendisi parametredir.
 */
export function cityIdFromPath(pathname: string): string | null {
  const segment = pathname.replace(/^\/+|\/+$/g, '');
  if (!segment.endsWith(`-${SUFFIX}`)) return null;
  const id = segment.slice(0, -(SUFFIX.length + 1));
  return cities.some((c) => c.id === id) ? id : null;
}

/** Tüm şehir sayfası yolları — router ve sitemap aynı listeyi kullanır. */
export const cityRoutePaths: string[] = cities.map((c) => cityRouteSlug(c.id));

/**
 * Şehir ADINDAN sayfa yolu; o şehrin sayfası yoksa `null`.
 *
 * Kulüp dizini (§14.7) şehir adıyla çalışıyor, bu modül kimlikle. Eşleme
 * burada duruyor ki "Nevşehir'in sayfası var mı" sorusunun cevabı tek
 * yerde olsun — çağıran taraf `cities` listesini kendi taramaya
 * kalksaydı, listeye şehir eklendiğinde bir yer güncellenir, öteki
 * unutulurdu. `null` dönmesi bir hata değil: şehir sayfaları seçili bir
 * liste ve olmayan bir adrese bağlantı vermek kırık bağlantı demek.
 */
export function cityPathForName(name: string): string | null {
  const city = cities.find((c) => c.name === name);
  return city ? `/${cityRouteSlug(city.id)}` : null;
}
