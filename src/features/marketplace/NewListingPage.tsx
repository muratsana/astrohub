import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { LocationTypeahead } from '@/components/ui/LocationTypeahead';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocationContext } from '@/features/location/LocationContext';
import {
  equipmentCategoryLabels,
  type EquipmentCategory,
} from '@/features/equipment/data';
import { useEquipmentCatalog } from '@/services/content/equipment';
import {
  createListing,
  validateListing,
  type NewListingInput,
} from '@/services/content/listings';
import {
  LISTING_MAX_EDGE,
  LISTING_PHOTO_BUDGET_LABEL,
  LISTING_PHOTO_LIMIT,
  uploadListingPhoto,
} from '@/services/marketplace/photos';
import type { ListingCondition } from './data';
import { sanitizeText } from '@/lib/sanitize';
import { useFlag } from '@/features/site/SiteConfigContext';
import { FlagClosedNote } from '@/features/site/FlagClosedNote';
import { cn } from '@/lib/cn';

/**
 * İLAN VER (§7.13).
 *
 * NEDEN BU SAYFA GEÇ GELDİ VE NEDEN BÖYLE: pazaryeri okuma tarafı
 * aylardır çalışıyordu ama ilan açmanın yolu yoktu — servis katmanı
 * (`createListing`) hazır, arayüzü eksikti. Bir pazaryeri yalnızca
 * okunabiliyorsa pazaryeri değil, katalogdur.
 *
 * FORM ALICININ SORACAĞI SORULARA GÖRE DİZİLDİ, veritabanı alanlarına
 * göre değil. İkinci el ekipmanda mesaj trafiğinin neredeyse tamamı üç
 * sorudan çıkar: "kaç yıllık / kutusu faturası var mı / kargo var mı".
 * Üçü de forma alan olarak konmuş durumda; ilan sahibi doldurmadığında
 * soru gelmeye devam eder ve sayfa bunu açıkça söylüyor.
 *
 * KATALOG BAĞLANTISI İSTEĞE BAĞLI. Model seçilirse ilan detayında
 * teknik künye ve benzer modeller görünür; seçilmezse ilan yine
 * yayımlanır. Katalogda olmayan bir ürün satılamaz değildir ve zorunlu
 * bir seçim, kataloğun eksikliğini kullanıcının sorunu hâline getirirdi.
 *
 * OTURUM YOKSA form yine dolduruluyor; gönderim girişe yönlendiriyor ve
 * form TEMİZLENMİYOR. Yazdığını kaybeden kullanıcı ikinci kez yazmıyor.
 */

/**
 * Durum seçenekleri.
 *
 * `data.ts` bunları yalnızca tip olarak taşıyor; formun bir diziye
 * ihtiyacı var ve tipten dizi türetilemiyor. Tek kaynak olması için
 * tip burada `satisfies` ile denetleniyor: yeni bir durum eklenirse
 * derleme burada patlar, sessizce eksik kalmaz.
 */
const CONDITIONS = [
  'Sıfır gibi',
  'Çok iyi',
  'İyi',
  'Yıpranmış',
] as const satisfies readonly ListingCondition[];

const categoryOrder: EquipmentCategory[] = [
  'optik-tup',
  'lens',
  'montur',
  'astro-kamera',
  'filtre',
  'guide',
  'aksesuar',
];

interface SelectedListingPhoto {
  id: string;
  file: File;
  url: string;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function NewListingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useLocationContext();
  const equipment = useEquipmentCatalog();
  const ilanlarAcik = useFlag('ilanlar_acik');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('optik-tup');
  const [equipmentSlug, setEquipmentSlug] = useState('');
  const [price, setPrice] = useState('');
  /*
   * ŞEHİR ALANI `label` İLE DEĞİL `provinceName` İLE DOLUYOR.
   *
   * `label` GÖSTERİM metni ve her zaman bir il adı değil: cihaz konumu
   * kullanan biri "Cihaz konumu" ya da "Ankara / Çankaya" görüyor. İkisi
   * de `ProvinceSelect`in listesinde yok; seçici o değeri "(listede yok)"
   * seçeneğiyle koruyor — o kaçış yolu SERBEST METİN DÖNEMİNDEN kalma
   * kayıtlar için var, yeni ilana ön değer olsun diye değil. Sonuç,
   * kullanıcının fark etmeden il olmayan bir değerle ilan vermesi ve
   * pazaryeri süzgecinde "Cihaz konumu" diye bir şehir çıkmasıydı.
   *
   * `provinceName` doluysa 81 ilden biri olduğu garanti; boşsa il
   * bilinmiyor demek ve alan BOŞ açılıyor — yanlış bir ili hazır
   * seçmektense kullanıcıya sordurmak.
   */
  const [city, setCity] = useState(location.provinceName ?? '');
  /* İlçe konumdan ÖN DOLDURULMUYOR. `location.districtId` yalnızca
     kullanıcı ilçeyi kendisi seçtiyse dolu; cihaz konumundan gelen
     `districtName` bir TAHMİN (en yakın merkez, 40 km'ye kadar) ve onu
     ilana yazmak, kullanıcının doğrulamadığı bir adresi yayımlamak
     olurdu. */
  const [district, setDistrict] = useState('');

  const [condition, setCondition] = useState<ListingCondition>('İyi');
  const [description, setDescription] = useState('');
  const [includes, setIncludes] = useState('');
  const [hasInvoice, setHasInvoice] = useState(false);
  const [shippingOk, setShippingOk] = useState(true);
  const [negotiable, setNegotiable] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [photos, setPhotos] = useState<SelectedListingPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const url of photoUrls.current) URL.revokeObjectURL(url);
      photoUrls.current = [];
    },
    []
  );

  /*
   * GEÇ ÖN DOLDURMA KALDIRILDI.
   *
   * Burada bir etki vardı: cihaz konumu form AÇIKKEN çözülürse alan hâlâ
   * boşsa dolduruluyordu. Alan bir `select` iken zararsızdı — seçili
   * seçenek değişiyordu, o kadar.
   *
   * Konum alanı arama kutusuna dönüşünce aynı davranış KONTROLÜ
   * DEĞİŞTİRİR oldu: kutu seçim yapılınca yerini bir özet satırına
   * bırakıyor. Yani kullanıcı yazmaya başladığı anda kutu elinin altından
   * çekilebiliyor, ya da "Değiştir" ile temizlediği seçim bir saniye
   * sonra geri geliyordu.
   *
   * Açılışta ön doldurma DURUYOR (`useState` başlangıç değeri): konum
   * zaten biliniyorsa form onu hazır getiriyor. Sonradan gelen konum
   * için doğru cevap sessizce yazmak değil, kullanıcının yazması —
   * alanın ne gösterdiği her an kullanıcının kararı olsun.
   */

  /* Seçilen kategoriye ait modeller — bütün katalogda gezinmek yerine
     kullanıcı zaten seçtiği kategorinin içinde arıyor. */
  const models = useMemo(
    () =>
      equipment.items
        .filter((m) => m.category === category)
        .slice()
        .sort((a, b) => a.model.localeCompare(b.model, 'tr')),
    [equipment.items, category]
  );

  const input: NewListingInput = {
    title,
    category,
    price: Number(price.replace(',', '.')),
    city,
    district: district || undefined,
    condition,
    description,
    /* Satır başına bir parça: "kutusu, adaptör, uzatma tüpü" diye tek
       satıra yazılan liste ilan detayında tek bir uzun cümleye
       dönüşüyordu. */
    includes: includes
      .split('\n')
      .map((line) => sanitizeText(line, { maxLength: 80 }))
      .filter(Boolean),
    hasInvoice,
    shippingOk,
    negotiable,
    sellerId: user?.id ?? '',
    equipmentSlug: equipmentSlug || undefined,
  };

  /* Doğrulama yayımlamadan ÖNCE de görünür: kullanıcı düğmeye basıp
     hata almaktansa neyin eksik olduğunu yazarken görmeli. */
  const problem = validateListing(input);

  function revokePhotoUrl(url: string) {
    URL.revokeObjectURL(url);
    photoUrls.current = photoUrls.current.filter((item) => item !== url);
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;

    setPhotoError(null);
    const incoming = Array.from(files);
    const slots = Math.max(0, LISTING_PHOTO_LIMIT - photos.length);
    if (slots === 0) {
      setPhotoError(
        `Bir ilana en fazla ${LISTING_PHOTO_LIMIT} fotoğraf eklenebilir.`
      );
      return;
    }

    const accepted: SelectedListingPhoto[] = [];
    for (const file of incoming.slice(0, slots)) {
      if (!file.type.startsWith('image/')) {
        setPhotoError('Yalnızca görsel dosyaları seçilebilir.');
        continue;
      }
      const url = URL.createObjectURL(file);
      photoUrls.current.push(url);
      accepted.push({
        id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        url,
      });
    }

    if (incoming.length > slots) {
      setPhotoError(
        `İlk ${slots} fotoğraf eklendi; sınır ${LISTING_PHOTO_LIMIT}.`
      );
    }
    if (accepted.length > 0) setPhotos((current) => [...current, ...accepted]);
  }

  function removePhoto(id: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.id === id);
      if (target) revokePhotoUrl(target.url);
      return current.filter((photo) => photo.id !== id);
    });
  }

  async function submit() {
    if (createdSlug) {
      navigate(`/ilan/${createdSlug}`);
      return;
    }
    if (!user) {
      navigate('/giris');
      return;
    }
    setBusy(true);
    setError(null);
    setCreatedSlug(null);
    let publishedSlug: string | null = null;
    try {
      const created = await createListing(input);
      publishedSlug = created.slug;
      for (let index = 0; index < photos.length; index += 1) {
        await uploadListingPhoto({
          listingId: created.id,
          userId: user.id,
          file: photos[index].file,
          position: index,
        });
      }
      navigate(`/ilan/${created.slug}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'İlan yayımlanamadı';
      if (publishedSlug) {
        setCreatedSlug(publishedSlug);
        setError(`İlan yayımlandı; fotoğraf yükleme tamamlanamadı: ${message}`);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title="İlan Ver"
        description="İkinci el astronomi ekipmanı ilanı yayımlayın: ekipman veritabanına bağlı künye, fiyat, durum ve teslim bilgisi."
        noIndex
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'İlanlar', to: '/ilanlar' },
            { label: 'İlan Ver' },
          ]}
          title="İlan Ver"
          description="Astrohub ödemeye aracılık etmez ve emanet (escrow) hizmeti sunmaz; iletişim ve teslim taraflar arasındadır."
        />

        {/*
          İLAN KAPALIYSA FORM HİÇ ÇİZİLMİYOR.
          Yorumlarda formu bırakıp notu yanına koymak yeterliydi: orada
          kapalı olan tek bir kutu. Burada kapalı olan bütün bir iş —
          otuz alan doldurup "ilanlar kapalı" cevabı almak, en pahalı
          hayal kırıklığı. Ziyaretçi listeye dönebilsin diye bağlantı
          duruyor.
        */}
        {!ilanlarAcik ? (
          <div className="grid gap-3">
            <FlagClosedNote>
              Yeni ilan yayımlama şu an kapalı; mevcut ilanlar durmaya devam
              ediyor.
            </FlagClosedNote>
            <div>
              <ButtonLink to="/ilanlar" variant="secondary" size="sm">
                İlanlara dön
              </ButtonLink>
            </div>
          </div>
        ) : (
          <>
            {!user && (
              <p className="mb-4 rounded-card border border-cold/40 bg-surface-1 px-3 py-2.5 text-body-sm leading-relaxed text-muted-foreground">
                İlan yayımlamak için giriş yapmanız gerekiyor. Formu şimdi
                doldurabilirsiniz —{' '}
                <span className="text-foreground">yazdıklarınız kaybolmaz</span>
                , yayımla düğmesi sizi girişe yönlendirir.
              </p>
            )}

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
              <div className="grid gap-4">
                <Panel title="Ürün">
                  <div className="grid gap-3">
                    <Field
                      label="Başlık"
                      htmlFor="l-title"
                      hint="Marka ve model yazın — arama başlıkta yapılıyor."
                    >
                      <Input
                        id="l-title"
                        value={title}
                        maxLength={160}
                        placeholder="Sky-Watcher Esprit 100ED + alan düzleştirici"
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Kategori" htmlFor="l-category">
                        <Select
                          id="l-category"
                          value={category}
                          onChange={(e) => {
                            setCategory(e.target.value as EquipmentCategory);
                            /* Kategori değişince model seçimi geçersiz
                           kalır; sessizce taşımak, ilanın yanlış
                           künyeyle çıkmasına yol açardı. */
                            setEquipmentSlug('');
                          }}
                        >
                          {categoryOrder.map((c) => (
                            <option key={c} value={c}>
                              {equipmentCategoryLabels[c]}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <Field
                        label="Katalog modeli"
                        htmlFor="l-model"
                        hint="İsteğe bağlı — seçilirse ilanda teknik künye görünür."
                      >
                        <Select
                          id="l-model"
                          value={equipmentSlug}
                          onChange={(e) => setEquipmentSlug(e.target.value)}
                        >
                          <option value="">
                            Katalogda yok / seçmek istemiyorum
                          </option>
                          {models.map((m) => (
                            <option key={m.slug} value={m.slug}>
                              {m.brand} {m.model}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <Field
                      label="Açıklama"
                      htmlFor="l-desc"
                      hint="Kullanım süresi, kusurlar ve neden satıldığı. Bunlar yazılmazsa aynı sorular mesaj olarak gelir."
                    >
                      <textarea
                        id="l-desc"
                        value={description}
                        rows={7}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={
                          '2023 yılında alındı, yaklaşık 40 gece kullanıldı.\nOptikte çizik yok, tüpte taşımadan kalan hafif bir iz var.\nDaha uzun odağa geçtiğim için satıyorum.'
                        }
                        className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                      />
                    </Field>

                    <Field
                      label="Pakette neler var"
                      htmlFor="l-includes"
                      hint="Her satıra bir parça."
                    >
                      <textarea
                        id="l-includes"
                        value={includes}
                        rows={4}
                        onChange={(e) => setIncludes(e.target.value)}
                        placeholder={
                          'Orijinal kutu\nAlan düzleştirici\n2" uzatma tüpü'
                        }
                        className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                      />
                    </Field>
                  </div>
                </Panel>

                <Panel
                  title="Fotoğraflar"
                  status={`${photos.length}/${LISTING_PHOTO_LIMIT}`}
                >
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="max-w-xl text-body-sm leading-relaxed text-muted-foreground">
                        En fazla {LISTING_PHOTO_LIMIT} fotoğraf ekleyin.
                        Dosyalar yüklenirken en uzun kenar {LISTING_MAX_EDGE}px
                        olacak şekilde küçültülür ve fotoğraf başına{' '}
                        {LISTING_PHOTO_BUDGET_LABEL} sınırına sığdırılır.
                      </p>
                      <label
                        htmlFor="l-photos"
                        aria-disabled={photos.length >= LISTING_PHOTO_LIMIT}
                        className={cn(
                          'inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-card border px-3.5 text-meta font-medium leading-none tracking-[0.03em] [text-indent:0.14em]',
                          photos.length >= LISTING_PHOTO_LIMIT
                            ? 'pointer-events-none border-border text-muted-foreground opacity-45'
                            : 'border-border-strong text-foreground hover:border-primary hover:text-primary'
                        )}
                      >
                        Fotoğraf seç
                      </label>
                      <input
                        id="l-photos"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="sr-only"
                        disabled={photos.length >= LISTING_PHOTO_LIMIT}
                        onChange={(e) => {
                          addPhotos(e.currentTarget.files);
                          e.currentTarget.value = '';
                        }}
                      />
                    </div>

                    {photoError && (
                      <Alert tone="warning" className="mt-0">
                        {photoError}
                      </Alert>
                    )}

                    {photos.length === 0 ? (
                      <div className="rounded-card border border-dashed border-border bg-surface-2 px-3 py-6 text-center text-body-sm text-muted-foreground">
                        Fotoğraf seçilmedi. İlk fotoğraf ilan kapak görseli
                        olarak kullanılır.
                      </div>
                    ) : (
                      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {photos.map((photo, index) => (
                          <li
                            key={photo.id}
                            className="overflow-hidden rounded-card border border-border bg-surface-2"
                          >
                            <div className="relative">
                              <img
                                src={photo.url}
                                alt={`${index + 1}. ilan fotoğrafı önizlemesi`}
                                className="aspect-[4/3] w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removePhoto(photo.id)}
                                className="absolute right-2 top-2 rounded-card border border-border-strong bg-background/90 px-2 py-1 text-meta text-foreground hover:border-danger hover:text-danger"
                              >
                                Sil
                              </button>
                              {index === 0 && (
                                <span className="absolute left-2 top-2 rounded-card border border-primary/50 bg-background/90 px-2 py-1 text-meta text-primary">
                                  Kapak
                                </span>
                              )}
                            </div>
                            <div className="px-2.5 py-2">
                              <p className="truncate text-meta font-medium text-foreground">
                                {photo.file.name}
                              </p>
                              <p className="tabular mt-1 text-meta text-faint">
                                {formatFileSize(photo.file.size)}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Panel>

                <Panel title="Fiyat ve teslim">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Fiyat (₺)" htmlFor="l-price">
                      <Input
                        id="l-price"
                        inputMode="numeric"
                        value={price}
                        placeholder="48500"
                        onChange={(e) =>
                          setPrice(e.target.value.replace(/[^\d.,]/g, ''))
                        }
                      />
                    </Field>

                    <Field label="Konum (il / ilçe)" htmlFor="l-location">
                      {/*
                    TEK KUTU. Önce il sonra ilçe soran iki açılır liste
                    vardı; "Gölbaşı" yazmak isteyen biri önce onun hangi
                    ilde olduğunu hatırlamak zorunda kalıyordu.

                    `allowProvinceOnly` AÇIK: kargoyla satılan bir
                    teleskopun ilçesi alıcıyı ilgilendirmiyor ve ilçe bu
                    formda hiçbir zaman zorunlu değildi.
                  */}
                      <LocationTypeahead
                        id="l-location"
                        city={city}
                        district={district}
                        onSelect={(secim) => {
                          setCity(secim.city);
                          setDistrict(secim.district);
                        }}
                        onClear={() => {
                          setCity('');
                          setDistrict('');
                        }}
                        allowProvinceOnly
                      />
                    </Field>

                    <Field label="Durum" htmlFor="l-condition">
                      <Select
                        id="l-condition"
                        value={condition}
                        onChange={(e) =>
                          setCondition(e.target.value as ListingCondition)
                        }
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Toggle
                      id="l-invoice"
                      label="Faturası var"
                      checked={hasInvoice}
                      onChange={setHasInvoice}
                    />
                    <Toggle
                      id="l-shipping"
                      label="Kargo gönderebilirim"
                      checked={shippingOk}
                      onChange={setShippingOk}
                    />
                    <Toggle
                      id="l-negotiable"
                      label="Pazarlık payı var"
                      checked={negotiable}
                      onChange={setNegotiable}
                    />
                  </div>
                </Panel>
              </div>

              {/* Yayımlama sütunu — sayfayı kaydırmadan durum görünür. */}
              <div className="lg:sticky lg:top-[calc(var(--spacing-shell)+1rem)] lg:self-start">
                <Panel title="Yayımla">
                  <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
                    İlan hemen yayına girer ve pazaryeri listesinde görünür.
                    Sattığınızda ilan sayfanızdan "satıldı" olarak
                    işaretleyebilirsiniz.
                  </p>

                  {/*
                Eksikler tek tek değil, sırayla gösteriliyor: aynı anda
                beş kırmızı satır göstermek formu bir sınav kâğıdına
                çeviriyor. `validateListing` zaten ilk engeli döndürüyor.
              */}
                  {problem ? (
                    <p className="mb-3 rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-warning">
                      {problem}
                    </p>
                  ) : (
                    <p className="mb-3 rounded-card border border-success/40 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-success">
                      İlan yayımlanmaya hazır.
                    </p>
                  )}

                  {error && (
                    <p className="mb-3 rounded-card border border-danger/45 bg-surface-2 px-2.5 py-2 text-meta leading-snug text-danger">
                      {error}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={submit}
                      disabled={busy || (!!problem && !createdSlug)}
                    >
                      {busy
                        ? 'Yayımlanıyor…'
                        : createdSlug
                          ? 'İlana git'
                          : user
                            ? 'İlanı yayımla'
                            : 'Giriş yap'}
                    </Button>
                    <ButtonLink to="/ilanlar" variant="ghost">
                      Vazgeç
                    </ButtonLink>
                  </div>

                  <p className="mt-3 border-t border-border pt-3 text-meta leading-relaxed text-faint">
                    Fotoğraflar yayından önce eklenir; ilanın sahibi daha sonra
                    detay sayfasından sırayı düzenleyebilir. Üst sınır{' '}
                    <span className="text-muted-foreground">
                      {LISTING_PHOTO_LIMIT} fotoğraf
                    </span>{' '}
                    ve fotoğraf başına{' '}
                    <span className="text-muted-foreground">
                      {LISTING_PHOTO_BUDGET_LABEL}
                    </span>{' '}
                    olarak korunur.
                  </p>
                </Panel>

                {/* Önizleme: yayımlanacak künyenin aynısı. */}
                <div className="mt-4 rounded-card border border-border bg-surface-1 p-3">
                  <p className="label mb-2">Önizleme</p>
                  <p className="line-clamp-2 text-caption font-medium leading-snug text-foreground">
                    {sanitizeText(title, { maxLength: 160 }) || 'Başlık'}
                  </p>
                  <p className="tabular mt-1.5 font-display text-readout-sm font-bold leading-none text-primary">
                    {Number.isFinite(input.price) && input.price > 0
                      ? `${input.price.toLocaleString('tr-TR')} ₺`
                      : '— ₺'}
                  </p>
                  <p className="tabular mt-1 truncate text-meta text-muted-foreground">
                    {city || 'Şehir'} · {condition}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="muted">
                      {equipmentCategoryLabels[category]}
                    </Badge>
                    {negotiable && <Badge tone="cold">Pazarlık payı</Badge>}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-card border px-2.5 py-1.5 text-meta transition-colors',
        checked
          ? 'border-primary/50 bg-primary/10 text-foreground'
          : 'border-border text-muted-foreground hover:border-border-strong'
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--color-primary)]"
      />
      {label}
    </label>
  );
}
