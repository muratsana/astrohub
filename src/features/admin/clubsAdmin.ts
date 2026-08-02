import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

/**
 * KULÜP DİZİNİ YÖNETİMİ — veri katmanı (§14.7).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `records.ts`E EKLENMEDİ
 *
 * `records.ts` KULLANICININ ürettiği kayıtları yönetiyor: sahibi olan,
 * durumu olan, moderasyondan geçen şeyler. Kulüp kaydı bunların hiçbiri
 * değil — dizin EDİTORYAL bir kaynak, kaydı site ekibi giriyor. Aynı
 * bileşene sıkıştırmak, orada anlamı olmayan bir "sahip" sütunu taşımak
 * ve "yayımla/reddet" gibi bu kayda uymayan bir durum makinesi
 * varsaymak demekti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİ AYRI "DOĞRULAMA" — İKİ AYRI İŞLEM
 *
 *   `verify` / `unverify`  → KULÜBÜN KENDİSİ. Yöneticiyle iletişim
 *                            kuruldu, kulübün gerçek ve aktif olduğu
 *                            teyit edildi. Rozet bunu gösterir.
 *   `saveInfo`             → BİLGİNİN tazeliği (`infoCheckedOn`) ve
 *                            iletişim alanları.
 *
 * Birincisi bir GÜVEN ifadesi, ikincisi bir TAZELİK ölçüsü. Tek bir
 * "kaydet" düğmesine bağlasaydık, bir telefon numarasını düzelten
 * yönetici farkında olmadan kulübü "doğrulanmış" ilan edebilirdi.
 *
 * `verified_by` KULLANICI TARAFINDAN GÖNDERİLMİYOR: `verify` yalnızca
 * damgayı ve doğrulayanın kimliğini yazıyor ve kimlik oturumdan
 * geliyor. İstemcinin yazdığı bir "kim doğruladı" alanı, denetim
 * kaydında güvenilmez bir satır olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SİLME YOK, LİSTEDEN ÇIKARMA VAR
 *
 * Kapanmış ya da yanlış girilmiş bir kulübü silmek, aynı kulüp tekrar
 * eklendiğinde geçmişini (doğrulama tarihi, kaynak) sıfırlardı.
 * `listed = false` kaydı ziyaretçiden gizliyor, yöneticide bırakıyor —
 * geri açmak tek tıklık iş.
 */

export interface AdminClub {
  slug: string;
  name: string;
  kind: string;
  city: string;
  website: string | null;
  contactEmail: string | null;
  joinUrl: string | null;
  sourceName: string | null;
  infoCheckedOn: string | null;
  verifiedAt: string | null;
  listed: boolean;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/* TEK PARÇA DİZE — parçalara bölünmüş bir seçim listesi Supabase'in
   dönüş tipini çıkaramamasına ve satırların `any`ye düşmesine yol açıyor. */
const SELECT =
  'slug, name, kind, city, website, contact_email, join_url, source_name, info_checked_on, verified_at, listed';

interface Row {
  slug: string;
  name: string;
  kind: string;
  city: string;
  website: string | null;
  contact_email: string | null;
  join_url: string | null;
  source_name: string | null;
  info_checked_on: string | null;
  verified_at: string | null;
  listed: boolean;
}

function toAdminClub(r: Row): AdminClub {
  return {
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    city: r.city,
    website: r.website,
    contactEmail: r.contact_email,
    joinUrl: r.join_url,
    sourceName: r.source_name,
    infoCheckedOn: r.info_checked_on,
    verifiedAt: r.verified_at,
    listed: r.listed,
  };
}

/** Dizinin tamamı — listeden çıkarılanlar dâhil (RLS yöneticiye açıyor). */
export async function fetchAdminClubs(): Promise<AdminClub[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('clubs')
    .select(SELECT)
    .order('name');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toAdminClub);
}

export interface ClubInfoDraft {
  website: string;
  contactEmail: string;
  joinUrl: string;
  sourceName: string;
  infoCheckedOn: string;
}

/**
 * Girdiyi kaydetmeden önceki sorun — boşsa kaydedilebilir.
 *
 * SAF FONKSİYON: ekranı açmadan test edilebiliyor. Veritabanı kısıtları
 * aynı kuralları zaten tutuyor; buradaki kapı, kullanıcının hatasını
 * PostgREST hata metni yerine anlaşılır bir cümleyle söylemek için var.
 */
export function describeClubInfoProblem(draft: ClubInfoDraft): string | null {
  const https = (v: string) => !v || /^https:\/\/[A-Za-z0-9.-]+(\/\S*)?$/.test(v);
  if (!https(draft.website)) return 'Web adresi `https://` ile başlamalı.';
  if (!https(draft.joinUrl)) return 'Katılım bağlantısı `https://` ile başlamalı.';
  if (
    draft.contactEmail &&
    !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(draft.contactEmail)
  ) {
    return 'E-posta adresi geçerli görünmüyor.';
  }
  if (draft.infoCheckedOn && !/^\d{4}-\d{2}-\d{2}$/.test(draft.infoCheckedOn)) {
    return 'Kontrol tarihi YYYY-AA-GG biçiminde olmalı.';
  }
  if (draft.infoCheckedOn && draft.infoCheckedOn > bugun()) {
    /* İleri tarihli "kontrol edildi", ziyaretçiye olmamış bir işi
       olmuş gibi gösterirdi. */
    return 'Kontrol tarihi gelecekte olamaz.';
  }
  return null;
}

function bugun(): string {
  return new Date().toISOString().slice(0, 10);
}

/** İletişim ve güncellik alanlarını yazar — doğrulamaya DOKUNMAZ. */
export async function saveClubInfo(
  slug: string,
  draft: ClubInfoDraft
): Promise<void> {
  const sorun = describeClubInfoProblem(draft);
  if (sorun) throw new Error(sorun);

  const supabase = await client();
  const { error } = await supabase
    .from('clubs')
    .update({
      website: draft.website.trim() || null,
      contact_email: draft.contactEmail.trim() || null,
      join_url: draft.joinUrl.trim() || null,
      source_name: sanitizeText(draft.sourceName, { maxLength: 120 }) || null,
      info_checked_on: draft.infoCheckedOn || null,
    })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

/**
 * Kulübü doğrulanmış işaretler.
 *
 * `verified_by` OTURUMDAN geliyor, formdan değil: rozetin arkasındaki
 * "kim onayladı" bilgisi istemcinin yazabileceği bir şey olmamalı.
 */
export async function verifyClub(slug: string): Promise<void> {
  const supabase = await client();
  const { data: oturum } = await supabase.auth.getUser();
  const kimlik = oturum.user?.id;
  if (!kimlik) throw new Error('Doğrulama için oturum gerekiyor.');

  const { error } = await supabase
    .from('clubs')
    .update({ verified_at: new Date().toISOString(), verified_by: kimlik })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

/**
 * Doğrulamayı geri alır.
 *
 * İKİ ALAN BİRLİKTE SIFIRLANIYOR: tabloda `clubs_verified_pair` kısıtı
 * ikisinin birlikte dolu ya da birlikte boş olmasını şart koşuyor.
 * Yalnız `verified_at`i boşaltmak veritabanından hata dönerdi.
 */
export async function unverifyClub(slug: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('clubs')
    .update({ verified_at: null, verified_by: null })
    .eq('slug', slug);
  if (error) throw new Error(error.message);
}

/** Dizinden çıkarır ya da geri açar (moderasyon). */
export async function setClubListed(
  slug: string,
  listed: boolean
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('clubs').update({ listed }).eq('slug', slug);
  if (error) throw new Error(error.message);
}
