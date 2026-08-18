import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { framingLink } from '@/features/targets/useActiveTarget';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { FilterCell, filterControlClass } from '@/components/ui/FilterBar';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { SkyPreview } from '@/components/media/SkyPreview';
import { TARAMA_ATFI } from '@/services/sky/survey';
import { targetKindLabels, type TargetKind } from '@/domain/targets/derive';
import {
  KATALOG_AILELERI,
  sorguyuOku,
  uzaklikMetni,
  SAYFA_ADEDI,
  SIRALAMA_ETIKETLERI,
  useKatalog,
  useKatalogOzeti,
  type KatalogNesnesi,
  type Siralama,
} from './katalog';
import { isSupabaseConfigured } from '@/services/supabase/client';

/**
 * GÖKYÜZÜ KATALOĞU — 16.663 nesnenin tamamı, filtreli.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BU MODÜL VAR
 *
 * Katalog birincil kaynaklardan eksiksiz kurulduğunda (OpenNGC, VizieR,
 * Imm Deep Sky Compendium) yeni bir sorun doğdu: 16.663 kaydın büyük
 * çoğunluğu 15. kadir civarında, adı olmayan galaksiler. "Eksiksiz" ile
 * "kullanışlı" aynı şey değil.
 *
 * Bu sayfa aradaki farkı kapatıyor. Üç giriş kapısı var ve üçü de
 * gerçek bir soruya karşılık geliyor:
 *
 *   · KATALOG AİLESİ — "Sharpless'ın tamamını göster". Astrofotoğrafçı
 *     çoğu zaman bir katalog üzerinden çalışır (Messier maratonu,
 *     Herschel 400 projesi, Sh2 avı).
 *   · SEÇKİ — "çekmeye değer olanları göster". Imm Kompendiyumu'nun
 *     3.145 nesnesi; 16.663 içinde nereden başlayacağını bilmeyen için
 *     tek anlamlı giriş.
 *   · ÖLÇÜ FİLTRESİ — "Kuğu'da 20 yay dakikasından büyük emisyon
 *     bulutsuları". Setup'ı belli olan biri tam olarak bunu sorar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * FİLTRE DURUMU ADRESTE
 *
 * Bir liste sayfasının paylaşılabilir olması gerekiyor: "şu filtreyle
 * bak" demek için ekran görüntüsü göndermek zorunda kalmamalı. Durum bu
 * yüzden `useSearchParams` içinde ve geri tuşu filtreleri geri alıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GÖRSELLER
 *
 * Her kartta gerçek bir gökyüzü kesiti var (DSS2). Yordamsal yıldız
 * alanı yalnızca koordinatı olmayan kayıtlarda ve görüntü gelene kadar
 * görünüyor. 16.663 nesnenin hepsinin fotoğrafı olmasının tek yolu
 * buydu: elle toplanmış bir görsel kütüphanesi ilk yüz nesneden sonra
 * biter.
 */

const KADIR_SECENEKLERI = [
  { deger: '', etiket: 'Tümü' },
  { deger: '6', etiket: '6 kadirden parlak (çıplak göz)' },
  { deger: '9', etiket: '9 kadirden parlak (dürbün)' },
  { deger: '12', etiket: '12 kadirden parlak' },
  { deger: '15', etiket: '15 kadirden parlak' },
];

const BOYUT_SECENEKLERI = [
  { deger: '', etiket: 'Tümü' },
  { deger: '5', etiket: "5′ ve üstü" },
  { deger: '15', etiket: "15′ ve üstü" },
  { deger: '30', etiket: "30′ ve üstü" },
  { deger: '60', etiket: '1° ve üstü' },
];

export function SkyCatalogPage() {
  const [params, setParams] = useSearchParams();
  const sorgu = useMemo(() => sorguyuOku(params), [params]);

  /*
    Arama kutusu YEREL durumda ve adrese yalnızca gönderildiğinde
    yazılıyor. Her tuşta adres yazmak geçmişi otuz adımlık bir kayıtla
    doldurur ve geri tuşunu kullanılamaz hâle getirir.
  */
  const [aramaMetni, setAramaMetni] = useState(sorgu.q);

  const { data, isLoading, isError } = useKatalog(sorgu);
  const { data: ozet } = useKatalogOzeti();

  const guncelle = (degisiklik: Record<string, string | null>) => {
    const yeni = new URLSearchParams(params);
    for (const [ad, deger] of Object.entries(degisiklik)) {
      if (deger === null || deger === '') yeni.delete(ad);
      else yeni.set(ad, deger);
    }
    /* Filtre değişince ilk sayfaya dönülüyor: 40. sayfadayken filtreyi
       daraltmak, sonuç 20 kayda düşünce boş bir sayfa gösterirdi. */
    if (!('sayfa' in degisiklik)) yeni.delete('sayfa');
    setParams(yeni, { replace: false });
  };

  const toplam = data?.toplam ?? 0;
  const sonSayfa = Math.max(0, Math.ceil(toplam / SAYFA_ADEDI) - 1);
  const satirlar = data?.satirlar ?? [];

  const turler = ozet?.turler ?? [];
  const takimyildizlar = ozet?.takimyildizlar ?? [];

  return (
    <>
      <PageMeta
        title="Gökyüzü Kataloğu"
        description={`NGC, IC, Messier, Caldwell, Herschel 400, Sharpless, Barnard, LBN, LDN, van den Bergh, Arp, Hickson ve daha fazlası — ${ozet?.toplam.toLocaleString('tr-TR') ?? '16.000'}'den fazla gök cismi, konum, parlaklık, açısal boyut ve uzaklık verisiyle.`}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
          { name: 'Gökyüzü Kataloğu', path: '/araclar/gokyuzu-katalogu' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Gökyüzü Kataloğu"
          description={
            ozet
              ? `${ozet.toplam.toLocaleString('tr-TR')} gök cismi, ${ozet.kod.toLocaleString('tr-TR')} katalog kodu. Yirmi iki katalog ailesi tek yerde; konum, parlaklık, açısal boyut ve uzaklık ölçülen değerlerdir.`
              : 'NGC, IC, Messier, Caldwell, Herschel 400, Sharpless ve on altı katalog daha — tek yerde.'
          }
        />

        {!isSupabaseConfigured ? (
          <EmptyState
            message="Katalog bağlantısı yapılandırılmamış"
            hint="Bu modül tamamen veritabanından okuyor; 16.663 kaydın paketlenmiş bir kopyası yok. Sunucu yapılandırması olmadan liste gösterilemez."
          />
        ) : (
          <>
            {/* ── Filtreler ── */}
            <form
              className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={(e) => {
                e.preventDefault();
                guncelle({ q: aramaMetni.trim() || null });
              }}
            >
              <FilterCell
                label="Ara"
                htmlFor="katalog-ara"
                className="sm:col-span-2"
              >
                <Input
                  id="katalog-ara"
                  type="search"
                  placeholder="Sh2-101, NGC 6888, Ay Çekirdeği…"
                  value={aramaMetni}
                  onChange={(e) => setAramaMetni(e.target.value)}
                  className={filterControlClass}
                />
              </FilterCell>

              <FilterCell label="Katalog" htmlFor="katalog-aile">
                <select
                  id="katalog-aile"
                  value={sorgu.aile ?? ''}
                  onChange={(e) => guncelle({ aile: e.target.value || null })}
                  className={filterControlClass}
                >
                  <option value="">Tüm kataloglar</option>
                  {KATALOG_AILELERI.map((a) => (
                    <option key={a.desen} value={a.desen}>
                      {a.ad} — {a.aciklama}
                    </option>
                  ))}
                </select>
              </FilterCell>

              <FilterCell label="Tür" htmlFor="katalog-tur">
                <select
                  id="katalog-tur"
                  value={sorgu.tur ?? ''}
                  onChange={(e) => guncelle({ tur: e.target.value || null })}
                  className={filterControlClass}
                >
                  <option value="">Tüm türler</option>
                  {turler.map((t) => (
                    <option key={t.tur} value={t.tur}>
                      {targetKindLabels[t.tur as TargetKind] ?? t.tur} (
                      {t.adet.toLocaleString('tr-TR')})
                    </option>
                  ))}
                </select>
              </FilterCell>

              <FilterCell label="Takımyıldız" htmlFor="katalog-takimyildiz">
                <select
                  id="katalog-takimyildiz"
                  value={sorgu.takimyildiz ?? ''}
                  onChange={(e) =>
                    guncelle({ takimyildiz: e.target.value || null })
                  }
                  className={filterControlClass}
                >
                  <option value="">Tümü</option>
                  {takimyildizlar.map((t) => (
                    <option key={t.ad} value={t.ad}>
                      {t.ad} ({t.adet.toLocaleString('tr-TR')})
                    </option>
                  ))}
                </select>
              </FilterCell>

              <FilterCell label="Parlaklık" htmlFor="katalog-kadir">
                <select
                  id="katalog-kadir"
                  value={sorgu.enSonukKadir?.toString() ?? ''}
                  onChange={(e) => guncelle({ kadir: e.target.value || null })}
                  className={filterControlClass}
                >
                  {KADIR_SECENEKLERI.map((s) => (
                    <option key={s.deger} value={s.deger}>
                      {s.etiket}
                    </option>
                  ))}
                </select>
              </FilterCell>

              <FilterCell label="Açısal boyut" htmlFor="katalog-boyut">
                <select
                  id="katalog-boyut"
                  value={sorgu.enKucukArcmin?.toString() ?? ''}
                  onChange={(e) => guncelle({ boyut: e.target.value || null })}
                  className={filterControlClass}
                >
                  {BOYUT_SECENEKLERI.map((s) => (
                    <option key={s.deger} value={s.deger}>
                      {s.etiket}
                    </option>
                  ))}
                </select>
              </FilterCell>

              <FilterCell label="Sırala" htmlFor="katalog-sirala">
                <select
                  id="katalog-sirala"
                  value={sorgu.sirala}
                  onChange={(e) => guncelle({ sirala: e.target.value })}
                  className={filterControlClass}
                >
                  {(
                    Object.keys(SIRALAMA_ETIKETLERI) as Siralama[]
                  ).map((s) => (
                    <option key={s} value={s}>
                      {SIRALAMA_ETIKETLERI[s]}
                    </option>
                  ))}
                </select>
              </FilterCell>
            </form>

            {/* ── Seçki anahtarı ve sonuç sayısı ── */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
              <label className="flex cursor-pointer items-center gap-2 text-body-sm text-foreground">
                <input
                  type="checkbox"
                  checked={sorgu.sadeceSecki}
                  onChange={(e) =>
                    guncelle({ secki: e.target.checked ? '1' : null })
                  }
                  className="size-4 accent-[var(--color-primary)]"
                />
                <span>
                  Yalnızca çekmeye değer seçki
                  {ozet ? ` (${ozet.secki.toLocaleString('tr-TR')})` : ''}
                </span>
              </label>

              <p className="tabular text-meta text-muted-foreground">
                {isLoading
                  ? 'Katalog okunuyor…'
                  : `${toplam.toLocaleString('tr-TR')} nesne`}
              </p>
            </div>

            {/* ── Sonuçlar ── */}
            {isError ? (
              <EmptyState
                message="Katalog okunamadı"
                hint="Bağlantı kurulamadı. Sayfayı yenilemeyi deneyin."
              />
            ) : satirlar.length === 0 && !isLoading ? (
              <EmptyState
                message="Bu filtreyle eşleşen nesne yok"
                hint="Katalog ailesini genişletmeyi, parlaklık eşiğini gevşetmeyi ya da takımyıldız filtresini kaldırmayı deneyin."
              />
            ) : (
              <div className="mt-5">
                <CardGrid view="grid">
                  {satirlar.map((n) => (
                    <li key={n.slug} className="flex flex-col">
                      <NesneKarti nesne={n} />
                      {/*
                        KADRAJ BAĞLANTISI KARTIN DIŞINDA.

                        Kartın tamamı zaten bir `<a>`; içine ikinci bir
                        bağlantı koymak geçersiz HTML olurdu ve tıklama
                        iki hedefe birden giderdi. Kardeş öge olarak
                        duruyor: kart hedefin detayına, bu bağlantı
                        doğrudan kadraj aracına götürüyor.
                      */}
                      <Link
                        to={framingLink(n.slug)}
                        className="mt-1 self-start text-meta text-muted-foreground transition-colors hover:text-primary"
                      >
                        Kadrajda gör →
                      </Link>
                    </li>
                  ))}
                </CardGrid>
              </div>
            )}

            {/* ── Sayfalama ── */}
            {toplam > SAYFA_ADEDI && (
              <nav
                aria-label="Sayfalar"
                className="mt-6 flex items-center justify-center gap-3"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={sorgu.sayfa <= 0}
                  onClick={() =>
                    guncelle({ sayfa: String(Math.max(0, sorgu.sayfa - 1)) })
                  }
                >
                  ← Önceki
                </Button>
                <span className="tabular text-meta text-muted-foreground">
                  {sorgu.sayfa + 1} / {sonSayfa + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={sorgu.sayfa >= sonSayfa}
                  onClick={() =>
                    guncelle({
                      sayfa: String(Math.min(sonSayfa, sorgu.sayfa + 1)),
                    })
                  }
                >
                  Sonraki →
                </Button>
              </nav>
            )}

            <p className="mt-8 border-t border-border pt-4 text-meta leading-relaxed text-faint">
              Konum, parlaklık ve açısal boyut: OpenNGC (CC-BY-SA-4.0) ve
              CDS/VizieR katalog tabloları. Uzaklık, lakaplar ve “çekmeye
              değer” seçkisi: Gary Imm, Imm Deep Sky Compendium (2026, 6.
              sürüm). Önizleme görüntüleri: {TARAMA_ATFI}.
            </p>
          </>
        )}
      </Container>
    </>
  );
}

function NesneKarti({ nesne: n }: { nesne: KatalogNesnesi }) {
  const uzaklik = uzaklikMetni(n.uzaklikLy);

  return (
    <ContentCard to={`/hedef/${n.slug}`}>
      <ContentCardMedia
        /* Seçki rozeti kartın üstünde: 16.663 kaydın içinde "buna
           bakmaya değer" bilgisi, listeyi tararken en çok işe yarayan
           tek işaret. */
        badge={n.secki ? <Badge tone="primary">Seçki</Badge> : undefined}
        fieldOfView={n.angularSize !== '—' ? n.angularSize : undefined}
      >
        <SkyPreview
          seed={n.slug}
          kind={n.kind}
          raDeg={n.raDeg}
          decDeg={n.decDeg}
          arcmin={n.sizeArcmin}
          width={480}
          height={360}
          alt={`${n.catalog} — gökyüzü tarama önizlemesi`}
        />
      </ContentCardMedia>

      <ContentCardBody>
        <ContentCardTitle>{n.catalog}</ContentCardTitle>
        <p className="truncate text-meta leading-snug text-muted-foreground">
          {n.name}
        </p>
        <ContentCardMeta tone="cold" className="mt-auto pt-1">
          {targetKindLabels[n.kind] ?? n.kind}
          {n.magnitude !== undefined ? ` · ${n.magnitude.toFixed(1)} kadir` : ''}
        </ContentCardMeta>
        <ContentCardMeta>
          {n.constellation}
          {uzaklik ? ` · ${uzaklik}` : ''}
        </ContentCardMeta>
      </ContentCardBody>
    </ContentCard>
  );
}
