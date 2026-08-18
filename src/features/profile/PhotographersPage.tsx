import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { breadcrumbJsonLd } from '@/lib/seo';
import { cities } from '@/features/location/cities';
import { profileAvatarUrl } from '@/services/content/profile';
import { MessageButton } from '@/features/social/MessageButton';
import {
  usePhotographers,
  type Photographer,
} from '@/services/content/photographers';

/**
 * ASTROFOTOĞRAFÇILAR DİZİNİ.
 *
 * Siteye bir kullanıcıyı BULMANIN yolu yoktu: profil sayfası, takip ve
 * mesajlaşma çalışıyordu ama hepsine tek giriş, birinin fotoğrafına denk
 * gelip adına tıklamaktı. Gerekçe ve ölçümler `photographers.ts`
 * başlığında.
 *
 * SEO'YA AÇIK. Kulüp dizini gibi bu sayfa da indekslenebilir: "Ankara
 * astrofotoğrafçı" araması buraya düşmeli. Kartlarda yalnızca
 * kullanıcının KENDİ paylaştığı alanlar var — gerçek adını gizleyen
 * kullanıcının adı burada da gizli.
 */
export function PhotographersPage() {
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [onlyWithEquipment, setOnlyWithEquipment] = useState(false);
  const [search, setSearch] = useState('');

  const { items, loading, error } = usePhotographers({
    city: city || undefined,
    district: district || undefined,
    onlyWithEquipment,
    search,
  });

  /*
   * İlçe listesi SONUÇLARDAN türetiliyor, 974 satırlık ilçe tablosundan
   * değil. Kullanıcısı olmayan bir ilçeyi seçenek olarak sunmak, boş
   * sonuç üreten bir filtre sunmaktır.
   */
  const districts = useMemo(() => {
    const set = new Set(
      items.map((p) => p.district).filter((d): d is string => !!d)
    );
    return [...set].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [items]);

  /* Etkin filtre SAYISI — çubuk daraltıldığında kullanıcı kaç süzgeç
     açık bıraktığını görmeli. */
  const activeCount =
    (city ? 1 : 0) +
    (district ? 1 : 0) +
    (onlyWithEquipment ? 1 : 0) +
    (search.trim() ? 1 : 0);

  return (
    <>
      <PageMeta
        title="Astrofotoğrafçılar"
        description="Türkiye'deki astrofotoğrafçılar: şehre, ilçeye ve ekipmanına göre bul, takip et, mesaj gönder."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Astrofotoğrafçılar', path: '/astrofotografcilar' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Astrofotoğrafçılar' },
          ]}
          title="Astrofotoğrafçılar"
          description="Yakınındaki gözlemcileri bul, ekipmanlarını gör, takip et ve mesaj gönder."
        />

        <FilterBar activeCount={activeCount}>
          <FilterCell label="Şehir" htmlFor="ph-city" active={Boolean(city)}>
            <Select
              id="ph-city"
              value={city || 'hepsi'}
              onChange={(e) => {
                setCity(e.target.value === 'hepsi' ? '' : e.target.value);
                /* İl değişince ilçe seçimi düşüyor: Ankara'nın Çankaya'sı
                   seçiliyken İzmir'e geçmek, hiçbir zaman sonuç
                   vermeyecek bir çift üretirdi. */
                setDistrict('');
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm şehirler</option>
              {cities.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FilterCell>

          {districts.length > 0 && (
            <FilterCell
              label="İlçe"
              htmlFor="ph-district"
              active={Boolean(district)}
            >
              <Select
                id="ph-district"
                value={district || 'hepsi'}
                onChange={(e) =>
                  setDistrict(e.target.value === 'hepsi' ? '' : e.target.value)
                }
                className={filterControlClass}
              >
                <option value="hepsi">Tüm ilçeler</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </FilterCell>
          )}

          <FilterCell label="Ara" htmlFor="ph-search" active={Boolean(search.trim())}>
            <Input
              id="ph-search"
              type="search"
              placeholder="Ad ya da kullanıcı adı"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>

          <FilterToggle
            id="ph-equipment"
            checked={onlyWithEquipment}
            onChange={setOnlyWithEquipment}
            label="Ekipmanını paylaşanlar"
          />
        </FilterBar>

        {error && (
          <p className="mt-4 rounded-card border border-danger/45 bg-surface-1 px-3 py-2 text-body-sm text-danger">
            Dizin okunamadı: {error}
          </p>
        )}

        {loading ? (
          <p className="mt-4 text-body-sm text-muted-foreground">
            Astrofotoğrafçılar yükleniyor…
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            className="mt-4"
            message="Bu filtrelerle kimse bulunamadı"
            hint="Şehir ya da ilçe seçimini genişletin. Kullanıcı adını ve şehrini henüz girmemiş hesaplar dizinde listelenmez."
          />
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((person) => (
              <li key={person.userId}>
                <PhotographerCard person={person} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

function PhotographerCard({ person }: { person: Photographer }) {
  const avatar = profileAvatarUrl(person.avatarPath);
  const konum = [person.district, person.city].filter(Boolean).join(' · ');

  return (
    <div className="flex h-full flex-col rounded-card border border-border bg-surface-1 p-3">
      <div className="flex items-center gap-2.5">
        {avatar ? (
          <img
            src={avatar}
            alt=""
            loading="lazy"
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2 text-body-sm text-muted-foreground"
          >
            {(person.displayName || person.username)
              .slice(0, 1)
              .toLocaleUpperCase('tr-TR')}
          </span>
        )}
        <span className="min-w-0">
          <Link
            to={'/profil/' + person.username}
            className="block truncate text-body-sm font-medium text-foreground hover:text-primary"
          >
            {person.displayName || person.username}
          </Link>
          <span className="block truncate text-meta text-muted-foreground">
            {konum || '—'}
          </span>
        </span>
      </div>

      {person.bio && (
        <p className="mt-2 line-clamp-2 text-meta leading-relaxed text-muted-foreground">
          {person.bio}
        </p>
      )}

      {person.equipment.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {person.equipment.slice(0, 3).map((name) => (
            <li key={name}>
              <Badge tone="muted">{name}</Badge>
            </li>
          ))}
        </ul>
      )}

      {/*
        Takip düğmesi BURADA YOK, mesaj var.

        Takip `useFollow` ile geliyor ve o kanca kart başına iki sorgu
        atıyor (sayaç RPC'si + durum). Yirmi kartlık bir dizinde bu kırk
        istek demekti. Takip, profilin kendisinde tek çağrıyla duruyor;
        karttaki ad oraya götürüyor.
      */}
      <div className="mt-auto pt-2.5">
        <MessageButton targetUserId={person.userId} label="Mesaj" />
      </div>
    </div>
  );
}
