import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Select } from '@/components/ui/Input';
import {
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { RangeFilter } from '@/components/ui/RangeFilter';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { ButtonLink } from '@/components/ui/Button';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useEventCatalog } from '@/services/content/events';
import { useExplorer } from '@/features/explorer/useExplorer';
import { eventsSpec } from './eventsSpec';
import { EventCalendar } from './EventCalendar';
import { EventViews } from './EventViews';
import { eventTypeLabels } from './types';

/**
 * ETKİNLİK TAKVİMİ — modülün ikinci görünümü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI SAYFA
 *
 * `/etkinlikler` harita merkezli ve 650 satır: öne çıkan afiş, kaydırılabilir
 * altlık, ışık kirliliği katmanı, yakınlık sıralaması. Takvimi oraya üçüncü
 * bir panel olarak eklemek, "bu ay ne var" diye gelen kullanıcıya harita
 * yığınının tamamını indirtirdi. Harita "nerede?", takvim "ne zaman?"
 * sorusuna cevap veriyor — iki soru, iki adres, ortak şerit.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SÜZGEÇ MOTORU BURADA ANLAMLI
 *
 * `eventsSpec` yazılmış ama hiçbir sayfaya bağlanmamıştı (eski dal
 * incelemesi §4): tür, şehir, geçmiş/gelecek, ücretsiz/ücretli, kamp ve
 * tarih aralığı tanımlı duruyordu ve kullanıcı hiçbirini kullanamıyordu.
 * Takvim bu süzgeçlerin doğal yeri — ay ızgarası zaten "hangi etkinlikler"
 * sorusunu soruyor, süzgeç de onu daraltıyor. Seçim adres çubuğuna
 * yazıldığı için "Ağustos'taki ücretsiz kamplar" paylaşılabilir bir
 * bağlantı oluyor.
 */
export function EventCalendarPage() {
  const catalog = useEventCatalog();
  const events = catalog.items;

  const ex = useExplorer(events, eventsSpec);
  const tur = ex.query.facets.tur?.[0] ?? 'hepsi';
  const sehir = ex.query.facets.sehir?.[0] ?? 'hepsi';
  const zaman = ex.query.facets.zaman?.[0] ?? 'hepsi';

  /* Tek seçimlik şeritler: seçili olan varsa önce onu kaldır, sonra
     yenisini ekle. Faset motoru çoklu seçimi destekliyor ama bu üç alan
     için "hem geçmiş hem gelecek" gibi bir seçim anlamsız. */
  const tekSec = (param: string, mevcut: string, sonraki: string) => {
    if (mevcut !== 'hepsi') ex.toggleFacet(param, mevcut);
    if (sonraki !== 'hepsi' && sonraki !== mevcut) ex.toggleFacet(param, sonraki);
  };

  /* Şehir listesi katalogdan geliyor, sabit bir listeden değil: yeni bir
     şehirde etkinlik açıldığında seçenek kendiliğinden beliriyor. */
  const sehirler = [...new Set(events.map((e) => e.city))].sort((a, b) =>
    a.localeCompare(b, 'tr-TR')
  );

  return (
    <>
      <PageMeta
        title="Etkinlik Takvimi"
        description="Gözlem geceleri, astronomi kampları ve atölyeler — ay ay takvim görünümü, tür, şehir ve tarih süzgeçleriyle."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Etkinlikler', path: '/etkinlikler' },
          { name: 'Takvim', path: '/etkinlikler/takvim' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Etkinlikler', to: '/etkinlikler' },
            { label: 'Takvim' },
          ]}
          title="Etkinlik Takvimi"
          description="Hangi gece ne var? Ay ızgarasında gün gün etkinlikler; süzgeçler adres çubuğuna yazıldığı için sonucu olduğu gibi paylaşabilirsiniz."
          actions={
            <ButtonLink to="/etkinlik/yeni" size="sm">
              Etkinlik ekle
            </ButtonLink>
          }
        />

        <EventViews />

        <ModuleToolbar
          columns={4}
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{ current: ex.total, total: events.length, noun: 'etkinlik' }}
          sort={{
            id: 'event-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: eventsSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
        >
          <FilterCell
            label="Ara"
            htmlFor="event-search"
            active={ex.searchInput.trim().length > 0}
            className="min-w-[18rem] flex-[2_1_18rem]"
          >
            <Input
              id="event-search"
              type="search"
              placeholder="Etkinlik, şehir, mekân veya düzenleyen"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>

          <FilterCell label="Tür" htmlFor="event-type" active={tur !== 'hepsi'}>
            <Select
              id="event-type"
              value={tur}
              onChange={(e) => tekSec('tur', tur, e.target.value)}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm türler</option>
              {Object.entries(eventTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterCell
            label="Şehir"
            htmlFor="event-city"
            active={sehir !== 'hepsi'}
          >
            <Select
              id="event-city"
              value={sehir}
              onChange={(e) => tekSec('sehir', sehir, e.target.value)}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm şehirler</option>
              {sehirler.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterCell
            label="Zaman"
            htmlFor="event-when"
            active={zaman !== 'hepsi'}
          >
            <Select
              id="event-when"
              value={zaman}
              onChange={(e) => tekSec('zaman', zaman, e.target.value)}
              className={filterControlClass}
            >
              <option value="hepsi">Hepsi</option>
              <option value="gelecek">Yaklaşan</option>
              <option value="gecmis">Geçmiş</option>
            </Select>
          </FilterCell>

          {eventsSpec.ranges?.[0] && (
            <FilterCell label="Tarih aralığı">
              <RangeFilter
                spec={eventsSpec.ranges[0]}
                value={ex.query.ranges.tarih}
                onChange={(next) => ex.setRange('tarih', next)}
              />
            </FilterCell>
          )}

          <FilterCell label="Ücret">
            <div className="flex flex-wrap items-center gap-2">
              <FilterToggle
                id="event-free"
                label="Ücretsiz"
                checked={(ex.query.facets.ucretsiz ?? []).includes('evet')}
                onChange={() => ex.toggleFacet('ucretsiz', 'evet')}
              />
              <FilterToggle
                id="event-camping"
                label="Kamp"
                checked={(ex.query.facets.kamp ?? []).includes('evet')}
                onChange={() => ex.toggleFacet('kamp', 'evet')}
              />
            </div>
          </FilterCell>
        </ModuleToolbar>

        <CatalogSourceNote selection={catalog} />

        {ex.items.length === 0 ? (
          <EmptyState
            message="Bu süzgeçle etkinlik yok"
            hint="Tarih aralığını genişletmeyi ya da şehir seçimini kaldırmayı deneyin."
          />
        ) : (
          /* Takvim süzülmüş listeyi alıyor, tamamını değil: ızgara
             kullanıcının seçtiği şeyi göstermeli, seçimin dışındakileri
             soluk çizmek gibi bir orta yol burada yanıltıcı olurdu. */
          <EventCalendar events={ex.items} />
        )}
      </Container>
    </>
  );
}
