import { formatIntegration, totalIntegrationSeconds } from './integration';
import { oturumlariMetni, type CaptureSession } from './captureSession';

/**
 * PAYLAŞIM KİTİ KÜNYESİ — Instagram için hazır metin (D06, D07, D10, D14).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN OTOMATİK
 *
 * Astrofotoğrafçı aynı bilgiyi (hedef, entegrasyon, ekipman) her paylaşımda
 * elle yazıyor; sitede bu veri zaten yapılı duruyor. Künye onu sosyal
 * gönderiye hazır bir metne çeviriyor: tek tık kopyala ya da indir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GİZLİLİK KÜNYEDE DE GEÇERLİ (D14)
 *
 * Konum yalnızca görünürlük 'hidden' DEĞİLKEN yazılıyor ve yazıldığında
 * da sitede saklanan il/ilçe düzeyindeki etiket kullanılıyor — tam
 * koordinat zaten hiçbir yerde yok. "Gizli" seçen kullanıcının gözlem
 * yeri künyeye de sızmıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OPSİYONEL ALANLAR (D10)
 *
 * Ekipman, konum, tarih ve @kullanıcı adı ayrı ayrı açılıp kapanabiliyor;
 * kullanıcının bazı gönderilerde ekipman yazmak istememesi olağan. Kapalı
 * bir alan künyede hiç satır bırakmıyor — boş "Konum: —" yazmıyor.
 */

export interface CaptionInput {
  target: { name: string; catalog: string };
  exposures: { filter: string; frames: number; exposureSeconds: number }[];
  palette: string;
  captureSessions?: CaptureSession[];
  capturedAt?: string;
  setup: { optic: string; camera: string; mount: string };
  location: { label: string; visibility: string };
  username: string;
  url?: string;
}

export interface CaptionOptions {
  /** @kullanıcı adı satırı (D13). */
  handle?: boolean;
  equipment?: boolean;
  location?: boolean;
  dates?: boolean;
  /** Kullanıcının serbest notu — künyenin başına (D10). */
  note?: string;
}

const VARSAYILAN: Required<Omit<CaptionOptions, 'note'>> = {
  handle: true,
  equipment: true,
  location: true,
  dates: true,
};

/** Çekim tarihlerini künye için okunur biçime çevirir (D07). */
function tarihMetni(input: CaptionInput): string {
  const oturumlar =
    input.captureSessions && input.captureSessions.length > 0
      ? input.captureSessions
      : input.capturedAt
        ? [{ id: 'x', startsOn: input.capturedAt.slice(0, 10), endsOn: null }]
        : [];
  return oturumlariMetni(oturumlar);
}

/**
 * Sosyal künye metnini üretir. Satırlar boş alanları atlıyor; sonuç
 * doğrudan panoya ya da caption.txt'e gidebilir.
 */
export function shareCaption(
  input: CaptionInput,
  options: CaptionOptions = {}
): string {
  const o = { ...VARSAYILAN, ...options };
  const satirlar: string[] = [];

  if (options.note && options.note.trim()) {
    satirlar.push(options.note.trim(), '');
  }

  // Başlık: hedef adı + katalog.
  const hedef = input.target.catalog
    ? `${input.target.name} (${input.target.catalog})`
    : input.target.name;
  satirlar.push(`📷 ${hedef}`);

  // Entegrasyon + palet.
  const saniye = totalIntegrationSeconds(input.exposures);
  if (saniye > 0) {
    const palet = input.palette ? ` · ${input.palette}` : '';
    satirlar.push(`⏱️ ${formatIntegration(saniye)} toplam${palet}`);
  }

  if (o.dates) {
    const tarih = tarihMetni(input);
    if (tarih) satirlar.push(`📅 ${tarih}`);
  }

  if (o.equipment) {
    const ekipman = [input.setup.optic, input.setup.camera, input.setup.mount]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(' · ');
    if (ekipman) satirlar.push(`🔭 ${ekipman}`);
  }

  if (
    o.location &&
    input.location.visibility !== 'hidden' &&
    input.location.label
  ) {
    satirlar.push(`📍 ${input.location.label}`);
  }

  if (input.url) {
    satirlar.push(`🔗 ${input.url}`);
  }

  if (o.handle && input.username) {
    satirlar.push('', `@${input.username} · astrohub.com.tr`);
  }

  return satirlar.join('\n');
}

/** Sabit hashtag şeridi — künyenin altına eklenebilir. */
export function shareHashtags(input: CaptionInput): string {
  const etiketler = ['astrophotography', 'astrofotograf', 'astrohub'];
  const kod = input.target.catalog.replace(/\s+/g, '').toLowerCase();
  if (kod) etiketler.push(kod);
  return etiketler.map((e) => `#${e}`).join(' ');
}
