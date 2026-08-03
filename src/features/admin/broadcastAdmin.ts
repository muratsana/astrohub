import { getSupabase } from '@/services/supabase/client';
import { isValidYoutubeId, type BroadcastKind, type YoutubeRef } from '@/features/tv/types';
import { sanitizeText } from '@/lib/sanitize';

/**
 * YAYIN KONTROL VERİ KATMANI — TV ve radyo yönetimi.
 *
 * Arayüz bileşeni Supabase çağrısı yapmaz; hepsi burada. Sebep §12.5'in
 * aynısı: ekran bileşeni değiştiğinde iş kuralı taşınmasın. Ayrıca bu
 * modül testte kolayca sahtelenebilir bir sınır oluşturuyor.
 *
 * YETKİ BURADA KONTROL EDİLMEZ. Kontrol RLS'te: yazma politikası
 * admin/content_editor rolüne bağlı (0011, 0004). Arayüzde ikinci bir
 * kontrol koymak, güvenliği artırmaz ama iki yerin birbirinden sapması
 * riskini getirir. Buradaki tek görev isteği doğru biçimde göndermek.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface AdminBroadcast {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  refKind: YoutubeRef;
  youtubeId: string;
  startsAt: string | null;
  published: boolean;
  position: number;
}

interface BroadcastRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  ref_kind: YoutubeRef;
  youtube_id: string;
  starts_at: string | null;
  published: boolean;
  position: number;
}

/** Yayınlanmamışlar dâhil tüm program — RLS editöre hepsini gösterir. */
export async function fetchBroadcasts(): Promise<AdminBroadcast[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('tv_broadcasts')
    .select(
      'id, slug, title, description, kind, ref_kind, youtube_id, starts_at, published, position'
    )
    .order('position');

  if (error) throw new Error(error.message);

  return (data as unknown as BroadcastRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: row.kind,
    refKind: row.ref_kind,
    youtubeId: row.youtube_id,
    startsAt: row.starts_at,
    published: row.published,
    position: row.position,
  }));
}

export interface NewBroadcast {
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  refKind: YoutubeRef;
  youtubeId: string;
  startsAt: string | null;
}

/**
 * Kimlik biçimi göndermeden önce doğrulanır.
 *
 * Veritabanı kısıtı zaten reddeder ama o red ham bir Postgres hatası
 * olarak döner ("new row violates check constraint …"). Editöre ne
 * yapması gerektiğini söyleyen cümleyi burada üretiyoruz.
 */
export function validateBroadcast(input: NewBroadcast): string | null {
  if (!/^[a-z0-9-]{3,120}$/.test(input.slug)) {
    return 'Kısa ad yalnızca küçük harf, rakam ve tire içerebilir (en az 3 karakter).';
  }
  if (input.title.trim().length < 3) return 'Başlık en az 3 karakter olmalı.';
  if (!isValidYoutubeId(input.refKind, input.youtubeId)) {
    return input.refKind === 'video'
      ? 'Video kimliği 11 karakterdir — izleme adresindeki v= değeri.'
      : 'Kanal kimliği UC ile başlar ve 24 karakterdir.';
  }
  return null;
}

export async function createBroadcast(input: NewBroadcast): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('tv_broadcasts').insert({
    slug: input.slug,
    title: sanitizeText(input.title, { maxLength: 200 }),
    description: sanitizeText(input.description, {
      multiline: true,
      maxLength: 2000,
    }),
    kind: input.kind,
    ref_kind: input.refKind,
    youtube_id: input.youtubeId,
    starts_at: input.startsAt,
    published: false,
  });

  if (error) throw new Error(error.message);
}

export async function setBroadcastPublished(
  id: string,
  published: boolean
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('tv_broadcasts')
    .update({ published })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Bir yayını canlıya alır.
 *
 * Veritabanında "aynı anda en fazla bir canlı yayın" kısmi tekil indeksi
 * var (0011). Önce diğerlerini indiriyoruz, sonra bunu kaldırıyoruz —
 * ters sırada yapmak indeksi ihlal eder ve işlem tümden reddedilir.
 * Aradaki kısa anda hiç canlı yayın görünmez; alternatifi olan "iki
 * canlı yayın" durumundan iyidir.
 */
export async function setLive(id: string): Promise<void> {
  const supabase = await client();

  const { error: clearError } = await supabase
    .from('tv_broadcasts')
    .update({ kind: 'archive' })
    .eq('kind', 'live')
    .neq('id', id);
  if (clearError) throw new Error(clearError.message);

  const { error } = await supabase
    .from('tv_broadcasts')
    .update({ kind: 'live', published: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Canlı yayını sonlandırır: kayıt arşive düşer, silinmez. */
export async function endLive(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('tv_broadcasts')
    .update({ kind: 'archive' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBroadcast(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('tv_broadcasts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   RADYO
   ══════════════════════════════════════════════════════════════════════ */

export interface AdminTrack {
  id: string;
  title: string;
  artist: string;
  source: 'mp3' | 'spotify';
  path: string;
  note: string | null;
  position: number;
  published: boolean;
}

export async function fetchTracks(): Promise<AdminTrack[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('radio_tracks')
    .select('id, title, artist, source, path, note, position, published')
    .order('position');

  if (error) throw new Error(error.message);
  return data as unknown as AdminTrack[];
}

/** Tüm sıra tek RPC ile yazılır; yarım kalmış sıra oluşmaz. */
export async function saveTrackOrder(trackIds: string[]): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.rpc('reorder_radio_tracks', {
    track_ids: trackIds,
  });
  if (error) throw new Error(error.message);
}

export interface NewTrack {
  title: string;
  artist: string;
  source: 'mp3' | 'spotify';
  path: string;
  note: string;
}

/**
 * Radyo kaydı doğrulaması.
 *
 * Spotify tarafında tam adres saklanıyor (şema öyle tanımlı), bu yüzden
 * burada şema kontrolü yapılıyor: yalnızca open.spotify.com. MP3 tarafında
 * saklanan şey bucket içindeki **yol**, tam URL değil — başında `http`
 * olan bir değer yol değildir ve muhtemelen yanlış alana yapıştırılmıştır.
 */
export function validateTrack(input: NewTrack): string | null {
  if (input.title.trim().length < 1) return 'Başlık boş olamaz.';
  if (input.source === 'spotify') {
    if (!/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+/.test(input.path)) {
      return 'Spotify bağlantısı https://open.spotify.com/track/… biçiminde olmalı.';
    }
  } else if (/^https?:\/\//i.test(input.path)) {
    return 'MP3 için bucket içindeki yol girilir (ör. gece/nocturne.mp3), tam adres değil.';
  } else if (input.path.trim().length === 0) {
    return 'Dosya yolu boş olamaz.';
  }
  return null;
}

export async function createTrack(input: NewTrack): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('radio_tracks').insert({
    title: sanitizeText(input.title, { maxLength: 200 }),
    artist: sanitizeText(input.artist, { maxLength: 200 }),
    source: input.source,
    path: input.path.trim(),
    note: sanitizeText(input.note, { maxLength: 500 }) || null,
    published: false,
  });

  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   MP3 KASASI — SÜRÜKLE BIRAK YÜKLEME

   Panel şimdiye kadar yalnızca "bucket içindeki yolu yaz" diyordu. Yani
   editörün önce Supabase paneline girip dosyayı elle yüklemesi, sonra
   yolu buraya kopyalaması gerekiyordu. İki ekran, iki adım ve arada
   yazım hatası yapılabilecek bir alan — yol yanlış yazıldığında hata
   ancak dinleyici oynat'a bastığında, 404 olarak ortaya çıkıyordu.

   Artık dosya doğrudan buradan yükleniyor ve satır aynı işlemde
   açılıyor: yol elle yazılmıyor, dolayısıyla yanlış yazılamıyor.
   ══════════════════════════════════════════════════════════════════════ */

/** Bucket `0005`'te bu sınırla kuruldu; istemci de aynı sayıyı kullanıyor. */
export const RADIO_MAX_BYTES = 20 * 1024 * 1024;

const RADIO_MIME = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/aac'];

/**
 * Dosya adından yol üretir.
 *
 * ASCII dışı harfler ve boşluklar temizleniyor: Supabase depolama yolunda
 * bunlar kabul ediliyor ama üretilen genel URL'de yüzde kodlamasına
 * dönüşüyor ve elle kopyalanan bir adres bozuluyor. Türkçe karakterler
 * karşılıklarına indirgeniyor — "Gökyüzü Sessizliği.mp3" yolda
 * "gokyuzu-sessizligi.mp3" oluyor.
 *
 * Başa zaman damgası eklenmiyor, RASTGELE bir önek ekleniyor: aynı
 * dosyayı iki kez yükleyen editör ilkini sessizce ezmemeli, ama dosya
 * adının okunabilir kalması da gerekiyor.
 */
export function radioObjectPath(fileName: string, suffix: string): string {
  const harfler: Record<string, string> = {
    ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u',
  };

  const nokta = fileName.lastIndexOf('.');
  const govde = nokta > 0 ? fileName.slice(0, nokta) : fileName;
  const uzanti = nokta > 0 ? fileName.slice(nokta + 1).toLowerCase() : 'mp3';

  const temiz = govde
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (c) => harfler[c] ?? c)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return `${temiz || 'parca'}-${suffix}.${uzanti.replace(/[^a-z0-9]/g, '')}`;
}

/**
 * Ses dosyasının süresini okur.
 *
 * `<audio>` öğesinin meta verisi yeterli; dosyanın tamamı çözülmüyor.
 * Okunamazsa `null` dönüyor ve yükleme DEVAM EDİYOR: süre künyenin bir
 * ayrıntısı, parçanın kendisi değil. Bir meta okuma hatası yüzünden
 * yüklemeyi düşürmek orantısız olurdu.
 *
 * Zaman aşımı var çünkü `loadedmetadata` bazı bozuk dosyalarda hiç
 * gelmiyor ve söz sonsuza kadar askıda kalırdı.
 */
export function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof Audio === 'undefined' || typeof URL.createObjectURL !== 'function') {
      resolve(null);
      return;
    }

    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let bitti = false;

    const kapat = (value: number | null) => {
      if (bitti) return;
      bitti = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };

    const zamanlayici = setTimeout(() => kapat(null), 8000);

    audio.addEventListener('loadedmetadata', () => {
      clearTimeout(zamanlayici);
      kapat(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
    });
    audio.addEventListener('error', () => {
      clearTimeout(zamanlayici);
      kapat(null);
    });

    audio.preload = 'metadata';
    audio.src = url;
  });
}

/** Yükleme öncesi istemci tarafı denetim — sunucu sınırının aynısı. */
export function validateAudioFile(file: File): string | null {
  if (file.size > RADIO_MAX_BYTES) {
    return `Dosya ${Math.round(RADIO_MAX_BYTES / 1024 / 1024)} MB sınırını aşıyor (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  /*
   * Tarayıcı bazı .mp3 dosyalarına boş tür veriyor; uzantı yedek olarak
   * kabul ediliyor. Asıl sınır bucket'ın `allowed_mime_types` ayarı —
   * buradaki denetim kullanıcıya erken ve anlaşılır bir cevap vermek
   * için, güvenlik sınırı değil.
   */
  const uzantiTamam = /\.(mp3|ogg|aac|m4a)$/i.test(file.name);
  if (file.type && !RADIO_MIME.includes(file.type) && !uzantiTamam) {
    return 'Yalnızca MP3, OGG ve AAC dosyaları yüklenebilir.';
  }
  if (!file.type && !uzantiTamam) {
    return 'Dosya türü tanınmadı. MP3 uzantılı bir dosya seçin.';
  }
  return null;
}

export interface UploadedTrack {
  path: string;
  durationSec: number | null;
}

/**
 * MP3'ü kasaya yükler ve `radio_tracks` satırını açar.
 *
 * SIRA: önce dosya, sonra satır. Fotoğraf yüklemesindekinin TERSİ ve
 * sebebi farklı — orada yol kimlikten türüyor, burada yol dosya adından.
 * Satır önce açılsaydı ve yükleme düşseydi, panelde çalmayan bir parça
 * satırı kalırdı; bu sırada ise kopan yükleme geride yalnızca sahipsiz
 * bir nesne bırakıyor ve o da aynı adla tekrar yüklendiğinde üzerine
 * yazılıyor.
 *
 * Satır YAYINDA AÇILMIYOR (`published: false`). Yükleme bitince parça
 * anında yayına girseydi, yanlış dosyayı sürükleyen editörün hatası
 * doğrudan dinleyiciye ulaşırdı. Yayına alma ayrı ve bilinçli bir adım.
 */
export async function uploadRadioTrack(
  file: File,
  meta: { title?: string; artist?: string; note?: string } = {}
): Promise<UploadedTrack> {
  const sorun = validateAudioFile(file);
  if (sorun) throw new Error(sorun);

  const supabase = await client();

  /* Rastgele son ek: aynı adlı ikinci dosya ilkini ezmemeli. */
  const suffix = Math.random().toString(36).slice(2, 8);
  const path = radioObjectPath(file.name, suffix);

  const durationSec = await readAudioDuration(file);

  const { error: uploadError } = await supabase.storage
    .from('radio')
    .upload(path, file, {
      contentType: file.type || 'audio/mpeg',
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  /* Başlık verilmediyse dosya adı kullanılıyor — boş bir başlık, panelde
     ayırt edilemeyen satırlar demek. */
  const nokta = file.name.lastIndexOf('.');
  const varsayilanBaslik = nokta > 0 ? file.name.slice(0, nokta) : file.name;

  const { error: insertError } = await supabase.from('radio_tracks').insert({
    title: sanitizeText(meta.title?.trim() || varsayilanBaslik, {
      maxLength: 200,
    }),
    artist: sanitizeText(meta.artist?.trim() || 'Bilinmiyor', { maxLength: 200 }),
    source: 'mp3',
    path,
    duration_sec: durationSec,
    note: meta.note ? sanitizeText(meta.note, { maxLength: 500 }) : null,
    published: false,
  });

  if (insertError) {
    /*
     * Satır açılamadıysa yüklenen nesne geride kalmamalı — fotoğraf
     * akışındaki geri alma yığınının küçük hali. Temizlik hatası
     * yutuluyor: kullanıcıya gösterilecek olan asıl hata.
     */
    try {
      await supabase.storage.from('radio').remove([path]);
    } catch (cause) {
      console.error('geri alma: radyo nesnesi silinemedi', cause);
    }
    throw new Error(insertError.message);
  }

  return { path, durationSec };
}

/**
 * Parçayı hem tablodan hem kasadan siler.
 *
 * `deleteTrack` yalnızca satırı siliyordu ve nesne bucket'ta kalıyordu:
 * hiçbir satırın işaret etmediği, panelde görünmeyen ama yer tutan bir
 * dosya. Bu sürüm önce satırı, sonra nesneyi siliyor.
 */
export async function deleteRadioTrackWithFile(
  id: string,
  source: 'mp3' | 'spotify',
  path: string
): Promise<void> {
  await deleteTrack(id);
  if (source !== 'mp3') return;

  const supabase = await client();
  try {
    await supabase.storage.from('radio').remove([path]);
  } catch (cause) {
    /* Satır gitti; nesne kaldıysa kullanıcıya hata göstermek yanıltıcı
       olur — silme işlemi görünür sonucu itibarıyla başarılı. */
    console.error('radyo dosyası silinemedi', cause);
  }
}

export async function setTrackPublished(
  id: string,
  published: boolean
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('radio_tracks')
    .update({ published })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

async function deleteTrack(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('radio_tracks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
