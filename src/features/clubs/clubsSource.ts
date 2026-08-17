import type { ContentStatus } from '@/domain/content/status';
import { useEffect, useMemo, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { clubPhotoUrl } from '@/services/clubs/photoUrl';
import {
  clubs as seedClubs,
  clubTopicOrder,
  type AstronomyClub,
  type ClubKind,
  type ClubTopic,
} from './data';

/**
 * KULÜP DİZİNİ — ZİYARETÇİ TARAFI OKUMASI (§14.7).
 *
 * ══════════════════════════════════════════════════════════════════════
 * DİZİN KODDAN VERİTABANINA TAŞINDI
 *
 * `/topluluklar` bugüne kadar `data.ts` içindeki altı kayıttan
 * besleniyordu. §14.7'nin istediği "kulüp yöneticisi doğrulama",
 * "güncellik doğrulaması", "moderasyon" ve "iletişim bilgileri"
 * maddelerinin hiçbiri bu hâlde mümkün değildi: bir telefon numarasını
 * düzeltmek dağıtım almak demekti. `0067` tabloyu açtı ve tohumu bu
 * dosyanın okuduğu koddan üretti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `mergeWithSeed` KULLANILMIYOR — VE BU BİLİNÇLİ BİR AYRIM
 *
 * Haber/yazı/sözlükte veritabanı satırları koddaki tohumun ÜSTÜNE
 * ekleniyor (`mergeWithSeed`): orada tohum bir demo içerik, tablo ise
 * gerçek içeriğin geldiği yer, ikisi birlikte var olabilir.
 *
 * Burada öyle değil: tablo zaten tohumun tamamını içeriyor. Birleştirme
 * yapsaydık, yöneticinin dizinden ÇIKARDIĞI kulüp koddaki kopyasından
 * geri gelirdi — yani moderasyon kararı sessizce iptal edilirdi. Tablo
 * okunabildiği sürece TEK KAYNAK tablo; kod yalnızca YEDEK.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BOŞ CEVAP YEDEĞE DÜŞÜYOR — VE BUNUN BİR BEDELİ VAR
 *
 * `listed = false` satırları RLS'te süzülüyor, yani ziyaretçiye hiç
 * gelmiyor. Bunun sonucu: istemci "tablo boş" ile "yöneticinin hepsini
 * listeden çıkardığı" durumu AYIRT EDEMİYOR ve boş cevabı yedek olarak
 * okuyor.
 *
 * Takas bilerek bu yönde yapıldı. Gerçekçi olan senaryo tablonun hiç
 * kurulmamış olması (göç uygulanmamış bir ortam); altı kulübün tamamını
 * tek tek listeden çıkarmak dizini kapatmanın yolu değil. Alternatif —
 * `listed`i ziyaretçiye de göndermek — dizinden çıkarılmayı talep etmiş
 * bir kulübün kaydını API'de açıkta bırakırdı. Gizlemenin değeri,
 * "dizini tamamen boşaltabilme" yeteneğinden yüksek.
 */

/** Dizinde çizilen kulüp: koddaki alanlar + doğrulama ve iletişim. */
export interface ClubView extends AstronomyClub {
  /**
   * KULÜBÜN KENDİSİ doğrulandı mı — rozet bunu gösterir. `null` = hayır.
   * `source.lastVerifiedAt` ile karıştırılmamalı: o BİLGİNİN tazeliği.
   */
  verifiedAt: string | null;
  contactEmail?: string;
  joinUrl?: string;
  status?: ContentStatus;
}

const KINDS: ClubKind[] = ['dernek', 'universite', 'gozlem-grubu'];

/** Koddaki kayıtlar, doğrulanmamış hâlleriyle — yedek liste. */
export const DEFAULT_CLUBS: ClubView[] = seedClubs.map((c) => ({
  ...c,
  verifiedAt: null,
}));

const SELECT =
  'slug, name, kind, city, district, founded_on, place, founded_year, member_count, summary, ' +
  'topics, activities, public_events, shared_equipment, website, contact_email, ' +
  'join_url, social_url, whatsapp_url, photo_paths, organizer_name, source_name, ' +
  'info_checked_on, verified_at, listed, status';

/**
 * Ham satırları dizin kayıtlarına çevirir.
 *
 * `listed` BURADA DA SÜZÜLÜYOR. RLS zaten süzüyor — ama YÖNETİCİYE
 * süzmüyor (0059'un tuzağı: listeden çıkarılanı geri açabilmesi için
 * görmesi gerek). O satırlar ziyaretçi sayfasında çizilseydi dizin
 * yöneticide başka, ziyaretçide başka görünürdü. Yönetimin yeri panel.
 */
export function toClubs(rows: unknown): ClubView[] {
  if (!Array.isArray(rows) || rows.length === 0) return DEFAULT_CLUBS;

  const listelenen = rows
    .filter(isRow)
    .filter((r) => r.listed !== false && durum(r.status) === 'yayinda');
  /* Gelen satırların hepsi listeden çıkarılmışsa boş liste DOĞRU cevap:
     bu bir yönetici kararı, veri eksikliği değil. Böyle bir cevabı zaten
     yalnızca yönetici alır — ziyaretçiye o satırlar hiç gelmez. */
  if (listelenen.length === 0) return [];

  const gecerli = listelenen
    .map(normalize)
    .filter((c): c is ClubView => c !== null);

  /* Satır vardı ama hiçbiri çizilebilir değilse veri bozuk → yedek. */
  return gecerli.length > 0 ? gecerli : DEFAULT_CLUBS;
}

function isRow(r: unknown): r is Record<string, unknown> {
  return Boolean(r) && typeof r === 'object';
}

function normalize(row: Record<string, unknown>): ClubView | null {
  const slug = metin(row.slug);
  const name = metin(row.name);
  /* Adı ya da adresi olmayan kayıt çizilemez: tıklanınca 404 veren bir
     kart, olmayan karttan kötü. */
  if (!slug || !name) return null;

  const kind = KINDS.includes(row.kind as ClubKind)
    ? (row.kind as ClubKind)
    : 'gozlem-grubu';

  const yil = sayi(row.founded_year);
  const uye = sayi(row.member_count);
  const website = metin(row.website);
  const katilim = metin(row.join_url);
  const sosyal = metin(row.social_url);
  const whatsapp = metin(row.whatsapp_url);
  const topics = konuListesi(row.topics);
  const photoPaths = Array.isArray(row.photo_paths)
    ? row.photo_paths.map(metin).filter(Boolean).slice(0, 3)
    : [];
  const uploadedPhotos = photoPaths
    .map((path, i) => {
      const url = clubPhotoUrl(path);
      return url ? { url, alt: `${name} fotoğrafı ${i + 1}` } : null;
    })
    .filter((p): p is { url: string; alt: string } => p !== null);
  const seedPhotos = seedClubs.find((c) => c.slug === slug)?.photos ?? [];
  const photos = uploadedPhotos.length > 0 ? uploadedPhotos : seedPhotos;

  return {
    slug,
    name,
    kind,
    city: metin(row.city) || 'Bilinmiyor',
    district: metin(row.district) || undefined,
    ...(metin(row.founded_on) ? { foundedOn: metin(row.founded_on) } : {}),
    ...(metin(row.place) ? { place: metin(row.place) } : {}),
    ...(yil !== null ? { foundedYear: yil } : {}),
    ...(uye !== null ? { memberCount: uye } : {}),
    summary: metin(row.summary),
    ...(topics.length > 0 ? { topics } : {}),
    activities: Array.isArray(row.activities)
      ? row.activities.map(metin).filter(Boolean)
      : [],
    publicEvents: row.public_events === true,
    sharedEquipment: row.shared_equipment === true,
    ...(guvenliAdres(website) ? { website } : {}),
    ...(guvenliAdres(katilim) ? { joinUrl: katilim } : {}),
    ...(guvenliAdres(sosyal) ? { socialUrl: sosyal } : {}),
    ...(guvenliWhatsapp(whatsapp) ? { whatsappUrl: whatsapp } : {}),
    ...(photos.length > 0 ? { photos } : {}),
    ...(metin(row.contact_email)
      ? { contactEmail: metin(row.contact_email) }
      : {}),
    ...(metin(row.organizer_name)
      ? { organizerName: metin(row.organizer_name) }
      : {}),
    source: {
      name: metin(row.source_name) || 'Kurum duyurusu',
      lastVerifiedAt: metin(row.info_checked_on),
    },
    verifiedAt: metin(row.verified_at) || null,
    status: durum(row.status),
  };
}

function metin(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Sayı ya da `null` — `Number(null) === 0` tuzağına düşmeden. */
function sayi(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function konuListesi(raw: unknown): ClubTopic[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(metin)
    .filter((v): v is ClubTopic => clubTopicOrder.includes(v as ClubTopic));
}

function durum(raw: unknown): ContentStatus {
  const value = metin(raw);
  return value === 'incelemede' || value === 'reddedildi' ? value : 'yayinda';
}

/**
 * Yalnızca `https` dış adres.
 *
 * Dizin dışarı bağlantı veriyor; `javascript:` bir dizinde tıklanabilir
 * olmamalı. Kısıt veritabanında da var — buradaki ikinci kapı, tablonun
 * başka bir yoldan bozulması ihtimali için.
 */
function guvenliAdres(url: string): boolean {
  return /^https:\/\/[A-Za-z0-9.-]+(\/[^\s]*)?$/.test(url);
}

function guvenliWhatsapp(url: string): boolean {
  return /^https:\/\/(chat\.whatsapp\.com|wa\.me)\/[^\s]+$/.test(url);
}

export interface ClubsResult {
  clubs: ClubView[];
  loading: boolean;
  /** Veri tabloda mı, koddaki yedekte mi — sayfa altı notu bunu söylüyor. */
  fromDatabase: boolean;
}

/**
 * Dizini okur.
 *
 * `useState` doğrudan koddaki listeyle başlıyor: dizin ön derlemede
 * (prerender) de çizilen bir sayfa ve boş bir kare, arama motoruna boş
 * bir dizin göstermek demekti.
 */
export function useClubs(): ClubsResult {
  const [state, setState] = useState<ClubsResult>({
    clubs: DEFAULT_CLUBS,
    loading: isSupabaseConfigured,
    fromDatabase: false,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase || !active) return;

        const { data, error } = await supabase
          .from('clubs')
          .select(SELECT)
          /*
           * SİLİNMİŞ KAYIT PUBLIC LİSTEDE DURMAZ.
           *
           * RLS bunu tek başına halletmiyor ve bu bilinçli: okuma politikası
           * `app.icerik_gorunur(status, deleted_at)` YANINDA sahiplik ve rol
           * dallarını da taşıyor (`or owner = auth.uid() or app.is_admin()
           * or app.has_role('moderator')`) — sahibi kendi taslağını, yönetici
           * de her kaydı görebilsin diye. Sonuç olarak soft-delete edilmiş bir
           * kayıt, SAHİBİNE ve YÖNETİCİYE public sayfada görünmeye devam
           * ediyordu; panel ise aynı kayıt için "public'te görünmüyor" diyordu.
           *
           * Ziyaretçi için sızıntı yok (onda yalnızca `icerik_gorunur` dalı
           * çalışıyor), ama sahibi hangi kaydın canlı hangisinin silinmiş
           * olduğunu ayırt edemiyordu. Süzgeç bu yüzden sorguda.
           */
          .is('deleted_at', null)
          .order('name');
        if (!active) return;

        /* Hata ziyaretçiye gösterilmiyor: yapabileceği bir şey yok ve
           koddaki dizin zaten doğru bir cevap. Sayfanın altındaki not
           "veritabanından" demeyi bırakıyor, o kadar. */
        if (error) {
          setState({
            clubs: DEFAULT_CLUBS,
            loading: false,
            fromDatabase: false,
          });
          return;
        }

        setState({
          clubs: toClubs(data),
          loading: false,
          fromDatabase: Array.isArray(data) && data.length > 0,
        });
      } catch {
        if (active) {
          setState({
            clubs: DEFAULT_CLUBS,
            loading: false,
            fromDatabase: false,
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return state;
}

/** Tek kulüp — detay sayfası için. */
export function useClub(slug: string | undefined): {
  club: ClubView | undefined;
  loading: boolean;
} {
  const { clubs, loading } = useClubs();
  const club = useMemo(
    () => (slug ? clubs.find((c) => c.slug === slug) : undefined),
    [clubs, slug]
  );
  return { club, loading };
}

/**
 * Şehirleri kulüp sayısıyla döndürür — şehir bazlı keşif ve yerel SEO
 * sayfalarının dizini (§14.7).
 *
 * Sıralama Türkçe: `localeCompare(..., 'tr')` olmadan "İzmir" ile
 * "Isparta" yanlış sırada durur.
 */
export function citiesOf(list: ClubView[]): { city: string; count: number }[] {
  const sayac = new Map<string, number>();
  for (const c of list) sayac.set(c.city, (sayac.get(c.city) ?? 0) + 1);
  return [...sayac.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => a.city.localeCompare(b.city, 'tr'));
}
