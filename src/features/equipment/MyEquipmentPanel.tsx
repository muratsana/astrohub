import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { SetupBuilder } from './builder/SetupBuilder';
import { headlineSpec } from './builder/headline';
import { EquipmentGlyph } from './EquipmentGlyph';
import { equipmentPath } from './data';
import {
  emptyDraft,
  visibilityLabels,
  type SavedSetup,
  type SetupVisibility,
} from '@/features/setups/store';
import { useSetups, type SetupStore } from '@/features/setups/useSetups';
import { isUuid } from '@/features/setups/remote';
import { useInventory, type InventoryStore } from '@/features/setups/useInventory';
import { SLOT_LABELS, type SetupDraft, type SlotId } from '@/domain/setup/types';
import { listSetups as listLegacySetups } from '@/features/setups/storage';

/**
 * EKİPMANLARIM — hesabın altındaki tek ekipman yüzeyi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN /ekipman'DAN /hesap'A TAŞINDI
 *
 * `/ekipman` hem katalogdu hem kişisel depoydu ve dört sekmesi vardı:
 * "Setup Oluştur", "Ekipman Kataloğu", "Setup'larım", "Ekipmanlarım".
 * Dördünden üçü kullanıcının KENDİ verisiydi — yani hesabına ait bir
 * içerik, herkese açık bir katalog sayfasının içinde duruyordu.
 *
 * Ayrımın maliyeti görünürdü: kullanıcı ekipmanını profilinden değil,
 * katalog sayfasının üçüncü sekmesinden yönetiyordu. Kimse bulamadı —
 * canlıda bir tek kayıtlı kurulum ve dört envanter satırı vardı.
 *
 * Artık kişisel olan `/hesap`ta, katalog `/ekipman`da.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN "SETUP" DEĞİL "EKİPMAN"
 *
 * Kullanıcı elindeki şeye "setup" demiyor. Arayüzde iki ayrı kelime
 * vardı ve ikisi aynı şeyi anlatıyordu: "Setup'larım" (kurulumlar) ve
 * "Ekipmanlarım" (tek tek modeller). İki liste, iki ad, tek kavram —
 * hangisine ne gireceği belirsizdi.
 *
 * Tek kavram kaldı: EKİPMAN, yani birlikte çalışan bir bütün. Tek tek
 * modeller onun parçası ve ayrı bir yerde tutulmuyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ENVANTER ARTIK ELLE DOLDURULMUYOR
 *
 * Ayrı bir "Ekipmanlarım" sekmesi vardı ve orada kullanıcı sahip olduğu
 * modelleri tek tek işaretliyordu. Aynı bilgiyi kurulum yaparken zaten
 * veriyordu: yuvalara koyduğu her model, sahip olduğu bir model.
 * İkinci kez sormanın sonucu, ikincisinin boş kalmasıydı.
 *
 * Şimdi kaydettiğiniz her ekipmanın parçaları envantere kendiliğinden
 * giriyor (`ensureOwned`). Aşağıdaki liste onu GÖSTERİYOR, doldurmayı
 * istemiyor — ve yanlış giren bir kayıt oradan çıkarılabiliyor.
 */
export function MyEquipmentPanel() {
  const store = useSetups();
  const inventory = useInventory();
  const [kurulumAcik, setKurulumAcik] = useState(false);

  /*
   * Kaydetme İKİ İŞ YAPIYOR: kaydı yazıyor ve parçalarını envantere
   * ekliyor. Sıra önemli değil ama ikisi de beklenmeli — envanter
   * yazması hata verirse kullanıcı bunu `inventory.error` şeridinde
   * görüyor, kayıt yine de duruyor.
   */
  async function kaydet(meta: {
    name: string;
    description: string;
    purpose: string;
    visibility: SetupVisibility;
  }, draft: SetupDraft) {
    await store.save({ ...meta, draft });
    await inventory.ensureOwned(Object.values(draft.slots).filter(Boolean));
    setKurulumAcik(false);
  }

  return (
    <div className="grid gap-4">
      <Panel
        title="Ekipmanlarım"
        status={
          store.setups.length > 0
            ? String(store.setups.length) + ' ekipman'
            : undefined
        }
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="min-w-[16rem] flex-1 text-body-sm leading-relaxed text-muted-foreground">
            Birlikte kullandığınız teleskop, kamera, montür ve filtreleri bir
            ekipman olarak kaydedin. Kayıtlı ekipman fotoğraf yüklerken künyeyi
            tek seçimle doldurur, kadraj aracında öntanımlı gelir ve
            profilinizde görünür.
          </p>
          <Button
            size="sm"
            variant={kurulumAcik ? 'ghost' : 'secondary'}
            onClick={() => setKurulumAcik((v) => !v)}
          >
            {kurulumAcik ? 'Vazgeç' : 'Yeni ekipman kur'}
          </Button>
        </div>

        {kurulumAcik && (
          <div className="mt-3 border-t border-border pt-3">
            <NewEquipmentForm onSave={kaydet} />
          </div>
        )}

        <SyncNotice store={store} />
        {inventory.error && (
          <Alert variant="text" className="mt-2">
            Envanter kaydedilemedi ({inventory.error}). Ekipmanınız kayıtlı;
            parça listesi bir sonraki girişte yeniden denenecek.
          </Alert>
        )}
      </Panel>

      {store.setups.length === 0 ? (
        <EmptyState
          message="Henüz kayıtlı ekipmanınız yok"
          hint="“Yeni ekipman kur” ile başlayın: bileşenleri seçtikçe aralarındaki uyumluluk ve optik hesaplar anında görünür."
        />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {store.setups.map((setup) => (
            <li key={setup.id}>
              <EquipmentCard setup={setup} store={store} />
            </li>
          ))}
        </ul>
      )}

      <InventorySection inventory={inventory} />

      <LegacySection />
    </div>
  );
}

/** Kurulum formu — taslak durumu burada, panel gövdesini şişirmesin. */
function NewEquipmentForm({
  onSave,
}: {
  onSave: (
    meta: {
      name: string;
      description: string;
      purpose: string;
      visibility: SetupVisibility;
    },
    draft: SetupDraft
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SetupDraft>(emptyDraft);
  return (
    <SetupBuilder
      draft={draft}
      onChange={setDraft}
      onSave={(meta) => void onSave(meta, draft)}
    />
  );
}

/**
 * Kalıcılık durumu — "kaydedildi" deyip yalnızca tarayıcıya yazmış olmak,
 * cihaz değiştiren kullanıcıda sebebi anlaşılmayan bir kayıp üretir.
 */
function SyncNotice({ store }: { store: SetupStore }) {
  if (store.error) {
    return (
      <Alert variant="text" className="mt-2">
        Veritabanına yazılamadı ({store.error}). Ekipmanınız tarayıcınızda
        duruyor; bir sonraki girişte yeniden denenecek.
      </Alert>
    );
  }

  if (!store.durable) {
    return (
      <p className="mt-2 text-meta text-muted-foreground">
        Ekipmanlarınız yalnızca bu tarayıcıda saklanıyor.{' '}
        <Link to="/giris" className="text-primary hover:underline">
          Giriş yaparsanız
        </Link>{' '}
        hesabınıza kaydedilir ve diğer cihazlarınızda da görünür.
      </p>
    );
  }

  return store.syncing ? (
    <p className="mt-2 text-meta text-faint">Hesabınızla eşitleniyor…</p>
  ) : null;
}

function EquipmentCard({
  setup,
  store,
}: {
  setup: SavedSetup;
  store: SetupStore;
}) {
  const catalog = useEquipmentCatalog();
  const [gorunurlukYaziliyor, setGorunurlukYaziliyor] = useState(false);

  const parts = (Object.entries(setup.draft.slots) as [SlotId, string][])
    .map(([slot, slug]) => {
      const model = catalog.items.find((m) => m.slug === slug);
      return model ? { slot, model } : null;
    })
    .filter(
      (p): p is { slot: SlotId; model: (typeof catalog.items)[number] } =>
        p !== null
    );

  /*
   * Görünürlük KARTIN ÜSTÜNDE değiştirilebiliyor.
   *
   * Eskiden yalnızca kurulum formunda seçiliyordu: kaydedilmiş bir
   * ekipmanın görünürlüğünü değiştirmek için onu silip yeniden kurmak
   * gerekiyordu. Varsayılanı "profilde" yaptığımıza göre, geri alma yolu
   * da bir tık uzakta olmalı.
   */
  async function gorunurlukDegistir(value: SetupVisibility) {
    setGorunurlukYaziliyor(true);
    await store.save({
      id: setup.id,
      name: setup.name,
      description: setup.description,
      purpose: setup.purpose,
      visibility: value,
      draft: setup.draft,
    });
    setGorunurlukYaziliyor(false);
  }

  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-surface-1 p-3">
      <div className="mb-1 flex flex-wrap items-baseline gap-2">
        <h3 className="text-body-sm font-medium text-foreground">
          {setup.name}
        </h3>
        {setup.isDefault && <Badge tone="primary">varsayılan</Badge>}
      </div>
      {setup.purpose && <p className="text-meta text-cold">{setup.purpose}</p>}
      {setup.description && (
        <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
          {setup.description}
        </p>
      )}

      <ul className="mt-2 space-y-0.5">
        {parts.map(({ slot, model }) => (
          <li
            key={slot}
            className="flex items-baseline justify-between gap-2 text-meta"
          >
            <span className="text-muted-foreground">{SLOT_LABELS[slot]}</span>
            <span className="truncate text-right text-foreground">
              {model.brand} {model.model}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-2.5">
        <Field label="Görünürlük" htmlFor={'vis-' + setup.id}>
          <Select
            id={'vis-' + setup.id}
            value={setup.visibility}
            disabled={gorunurlukYaziliyor}
            onChange={(e) =>
              void gorunurlukDegistir(e.target.value as SetupVisibility)
            }
            className="h-9 text-meta"
          >
            {(
              Object.entries(visibilityLabels) as [SetupVisibility, string][]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
        {!setup.isDefault && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void store.makeDefault(setup.id)}
          >
            Varsayılan yap
          </Button>
        )}
        {/* Paylaşım bağlantısı yalnızca veritabanına yazılmış kayıtlar için
            anlamlı: yerel kimlik karşı tarafta hiçbir şey açmaz. */}
        {isUuid(setup.id) && (
          <ButtonLink to={'/ekipmanim/' + setup.id} size="sm" variant="ghost">
            Aç / paylaş
          </ButtonLink>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void store.duplicate(setup.id)}
        >
          Çoğalt
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => void store.remove(setup.id)}
        >
          Sil
        </Button>
      </div>

      <p className="tabular mt-1.5 text-meta text-faint">
        {new Date(setup.updatedAt).toLocaleDateString('tr-TR')} tarihinde
        güncellendi
      </p>
    </div>
  );
}

/**
 * Envanter — kendiliğinden dolan parça listesi.
 *
 * Bu bölüm bir FORM DEĞİL, bir ÖZET. Kullanıcıdan hiçbir şey istemiyor;
 * kurduğu ekipmanların parçalarını gösteriyor ve yalnızca yanlış giren
 * bir kaydı çıkarma yolu sunuyor. Hiç kayıt yokken tamamen gizleniyor:
 * boş bir kutu göstermek, doldurulması gereken bir iş varmış izlenimi
 * verirdi — oysa burada yapılacak bir iş yok.
 */
function InventorySection({ inventory }: { inventory: InventoryStore }) {
  const catalog = useEquipmentCatalog();
  const ownedSet = useMemo(() => new Set(inventory.owned), [inventory.owned]);
  const ownedModels = catalog.items.filter((m) => ownedSet.has(m.slug));

  if (ownedModels.length === 0) return null;

  return (
    <Panel title="Envanterim" status={String(ownedModels.length) + ' parça'}>
      <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
        Kurduğunuz ekipmanların parçaları buraya kendiliğinden ekleniyor.
        Elinizden çıkan bir parçayı listeden çıkarabilirsiniz — kayıtlı
        ekipmanlarınız bundan etkilenmez.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {ownedModels.map((m) => (
          <li
            key={m.slug}
            className="flex items-center gap-2.5 rounded-card border border-border bg-surface-2 px-3 py-2.5"
          >
            <EquipmentGlyph
              category={m.category}
              className="h-8 w-8 shrink-0 text-primary"
            />
            <span className="min-w-0 flex-1">
              <Link
                to={equipmentPath(m)}
                className="block truncate text-body-sm text-foreground hover:text-primary"
              >
                {m.model}
              </Link>
              <span className="tabular block truncate text-meta text-muted-foreground">
                {m.brand} · {headlineSpec(m)}
              </span>
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void inventory.toggle(m.slug)}
            >
              Çıkar
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/**
 * KADRAJ ARACINDAN GELEN ESKİ KAYITLAR.
 *
 * İki ayrı "setup" kavramı vardı ve ikisi ayrı yerlerde duruyordu:
 * `storage.ts` (kadraj/uyumluluk aracının düz sayı girdileri) ve
 * `store.ts` (katalog referanslı ekipman). Birincisi üye panelinin
 * `/panel/setuplar` bölümünde, ikincisi katalog sayfasının sekmesinde.
 * Kullanıcı için ikisi de "benim ekipmanım"dı ve hangisinin nerede
 * olduğunu bilmesinin bir yolu yoktu.
 *
 * Bu bölüm eski kayıtları da AYNI SAYFAYA getiriyor. Dönüştürmüyoruz:
 * eski kayıt katalog referansı değil ham sayı tutuyor ve tahminle
 * eşleştirmek yanlış modeli kullanıcının ekipmanı diye yazmak olurdu.
 *
 * Hiç eski kayıt yoksa bölüm tamamen yok: yeni kullanıcıya taşınacak
 * bir geçmişi varmış gibi göstermenin anlamı yok.
 */
function LegacySection() {
  const legacy = listLegacySetups();
  if (legacy.length === 0) return null;

  return (
    <Panel title="Kadraj aracından kayıtlı ekipmanlar" status={String(legacy.length) + ' kayıt'}>
      <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
        Bunlar kadraj aracında kurduğunuz eski kayıtlar; katalog modeli
        yerine doğrudan girdiğiniz sayıları taşıyorlar. Olduğu gibi
        çalışmaya devam ediyorlar. Katalog modelleriyle yeniden kurarsanız
        model verisi güncellendikçe hesaplarınız da güncellenir.
      </p>
      <ul>
        {legacy.map((setup) => (
          <li key={setup.id} className="border-b border-border last:border-0">
            <Link
              to={'/ekipmanim/' + setup.id}
              className="group flex items-baseline justify-between gap-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-caption text-foreground group-hover:text-primary">
                  {setup.name}
                </span>
                <span className="mt-0.5 block truncate text-meta text-muted-foreground">
                  {setup.input.optic.name} · {setup.input.camera.name}
                </span>
              </span>
              <span className="tabular shrink-0 text-meta text-faint">
                {new Date(setup.savedAt).toLocaleDateString('tr-TR')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
