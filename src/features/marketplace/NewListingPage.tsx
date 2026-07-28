import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
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
import type { ListingCondition } from './data';
import { sanitizeText } from '@/lib/sanitize';
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

export function NewListingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useLocationContext();
  const equipment = useEquipmentCatalog();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EquipmentCategory>('optik-tup');
  const [equipmentSlug, setEquipmentSlug] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState(location.label);
  const [condition, setCondition] = useState<ListingCondition>('İyi');
  const [description, setDescription] = useState('');
  const [includes, setIncludes] = useState('');
  const [hasInvoice, setHasInvoice] = useState(false);
  const [shippingOk, setShippingOk] = useState(true);
  const [negotiable, setNegotiable] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function submit() {
    if (!user) {
      navigate('/giris');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const slug = await createListing(input);
      navigate(`/ilan/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İlan yayımlanamadı');
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

        {!user && (
          <p className="mb-4 rounded-card border border-cold/40 bg-surface-1 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
            İlan yayımlamak için giriş yapmanız gerekiyor. Formu şimdi
            doldurabilirsiniz — <span className="text-foreground">yazdıklarınız
            kaybolmaz</span>, yayımla düğmesi sizi girişe yönlendirir.
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
                      <option value="">Katalogda yok / seçmek istemiyorum</option>
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
                    className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-[12px] leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
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
                    placeholder={'Orijinal kutu\nAlan düzleştirici\n2" uzatma tüpü'}
                    className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-[12px] leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
                  />
                </Field>
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

                <Field label="Şehir" htmlFor="l-city">
                  <Input
                    id="l-city"
                    value={city}
                    maxLength={60}
                    onChange={(e) => setCity(e.target.value)}
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
              <p className="mb-3 text-[11.5px] leading-relaxed text-muted-foreground">
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
                <p className="mb-3 rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2 text-[11px] leading-snug text-warning">
                  {problem}
                </p>
              ) : (
                <p className="mb-3 rounded-card border border-success/40 bg-surface-2 px-2.5 py-2 text-[11px] leading-snug text-success">
                  İlan yayımlanmaya hazır.
                </p>
              )}

              {error && (
                <p className="mb-3 rounded-card border border-danger/45 bg-surface-2 px-2.5 py-2 text-[11px] leading-snug text-danger">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={submit} disabled={busy || !!problem}>
                  {busy ? 'Yayımlanıyor…' : user ? 'İlanı yayımla' : 'Giriş yap'}
                </Button>
                <ButtonLink to="/ilanlar" variant="ghost">
                  Vazgeç
                </ButtonLink>
              </div>

              {/* Fotoğraf yok ve bu gizlenmiyor. */}
              <p className="mt-3 border-t border-border pt-3 text-[10.5px] leading-relaxed text-faint">
                <span className="text-muted-foreground">Fotoğraf yükleme
                henüz açık değil.</span>{' '}
                İlan kartında ürün tipine göre bir yer tutucu görünür;
                medya altyapısı devreye girdiğinde ilanınıza fotoğraf
                ekleyebileceksiniz. Alıcı fotoğraf isterse mesajla
                paylaşabilirsiniz.
              </p>
            </Panel>

            {/* Önizleme: yayımlanacak künyenin aynısı. */}
            <div className="mt-4 rounded-card border border-border bg-surface-1 p-3">
              <p className="label mb-2">Önizleme</p>
              <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground">
                {sanitizeText(title, { maxLength: 160 }) || 'Başlık'}
              </p>
              <p className="tabular mt-1.5 font-display text-[17px] font-bold leading-none text-primary">
                {Number.isFinite(input.price) && input.price > 0
                  ? `${input.price.toLocaleString('tr-TR')} ₺`
                  : '— ₺'}
              </p>
              <p className="tabular mt-1 truncate text-[10px] text-muted-foreground">
                {city || 'Şehir'} · {condition}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge tone="muted">{equipmentCategoryLabels[category]}</Badge>
                {negotiable && <Badge tone="cold">Pazarlık payı</Badge>}
              </div>
            </div>
          </div>
        </div>
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
        'inline-flex cursor-pointer items-center gap-2 rounded-card border px-2.5 py-1.5 text-[11px] transition-colors',
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
