/**
 * CANLI YAYIN ↔ MP3 KASASI DEVİR TESLİMİ.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * RADYO TEK KANAL, İKİ KAYNAK
 *
 * AstroHub Radyo iki şeyden besleniyor:
 *
 *   kasa   Yöneticinin yüklediği mp3'ler, sonsuz döngüde. Sunucu
 *          gerektirmiyor, bugün çalışıyor.
 *   canli  Yayın sunucusundan (AzuraCast/Icecast) gelen akış. Bir
 *          yayıncı mikrofonu açtığında ya da AutoDJ oradan çaldığında.
 *
 * Dinleyici için bunlar İKİ RADYO DEĞİL, bir radyonun iki hâli. O yüzden
 * seçimi kullanıcıya sormuyoruz: canlı yayın varsa canlı yayın çalar.
 * Bu, gerçek radyonun da davranışı — kanalı açtığında ne yayındaysa onu
 * duyarsın.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * DEVİR PARÇA SONUNDA, ORTASINDA DEĞİL
 *
 * Canlı yayın başladığı an çalan mp3'ü kesmek teknik olarak kolaydı ve
 * yanlış olurdu: dinleyici bir parçanın ortasında, hiçbir şey yapmadan
 * başka bir sese atlar. Gerçek radyo otomasyonu da böyle yapmaz —
 * AutoDJ çalan parçayı bitirir, sonra mikrofonu devreder.
 *
 * Bu yüzden `beklemede` diye bir ara durum var: canlı yayın başladı ama
 * henüz geçilmedi. Geçiş, çalan parça bittiğinde oluyor.
 *
 * TERSİ BEKLEMİYOR. Canlı yayın DÜŞTÜĞÜNDE beklenecek bir şey yok —
 * ortada ses kalmadı. O anda kasaya dönülüyor, hemen.
 * ═══════════════════════════════════════════════════════════════════════
 */

export type RadioSource = 'kasa' | 'canli';

interface TimedTrack {
  durationSec?: number;
}

export interface HandoverInput {
  /** Yayın sunucusu ölçülmüş biçimde ayakta mı (`station_is_live`). */
  live: boolean;
  /** Yayın adresi — canlıya geçmenin ikinci şartı. */
  streamUrl: string | null;
  /** Kasada çalınabilir mp3 var mı. */
  hasTracks: boolean;
  /** Şu anki kaynak. */
  current: RadioSource;
  /** Şu an ses çalıyor mu — duruyorsa beklemeye gerek yok. */
  playing: boolean;
}

export interface HandoverDecision {
  /** Hemen geçilecek kaynak. */
  source: RadioSource;
  /**
   * Canlı yayın başladı ama parça bitmeyi bekliyor. Arayüz bunu
   * "canlı yayın başladı, bu parçadan sonra geçilecek" olarak
   * gösteriyor — sessiz bir bekleme, açıklanmamış bir gecikmedir.
   */
  pending: boolean;
}

/**
 * Bir sonraki kaynağı seçer.
 *
 * CANLIYA GEÇMENİN İKİ ŞARTI VAR ve ikisi de gerekli: yayın ölçülmüş
 * biçimde ayakta OLMALI ve bir adres bulunmalı. Adres olmadan "canlı"
 * demek, çalınacak bir şey olmadan canlı demektir — §10.2'nin
 * yasakladığı şeyin ta kendisi.
 */
export function decideSource(input: HandoverInput): HandoverDecision {
  const canliMumkun = input.live && Boolean(input.streamUrl);

  /* Canlı yayın düştüyse bekleme yok: ortada ses kalmadı. */
  if (!canliMumkun) {
    return { source: 'kasa', pending: false };
  }

  /* Zaten canlıdaysak kalıyoruz. */
  if (input.current === 'canli') {
    return { source: 'canli', pending: false };
  }

  /* Kasa çalmıyorsa (duraklatılmış ya da parça yok) beklenecek bir
     parça da yok — geçiş anında yapılıyor. */
  if (!input.playing || !input.hasTracks) {
    return { source: 'canli', pending: false };
  }

  /* Kasa çalıyor: parça bitene kadar bekle. */
  return { source: 'kasa', pending: true };
}

/**
 * Parça bittiğinde ne yapılacağı.
 *
 * Bekleyen bir canlı yayın varsa sıradaki parçaya GEÇİLMİYOR, canlıya
 * devrediliyor. Yoksa döngü sürüyor.
 */
export function onTrackEnd(pending: boolean): RadioSource {
  return pending ? 'canli' : 'kasa';
}

export interface BroadcastPosition {
  index: number;
  offsetSec: number;
}

/*
 * Kasa da dinleyici için bir playlist değil, otomasyonlu yayın akışıdır.
 * Duraklatıp yeniden başlatan kişi kaldığı saniyeye değil, arkada akmaya
 * devam eden yayın saatine bağlanır. Süre bilgisi eksikse gerçek çizelge
 * kurulamaz; o durumda oynatıcı mevcut parçayı yeniden yüklemekle yetinir.
 */
export function broadcastPosition(
  tracks: TimedTrack[],
  nowMs: number,
  originMs = Date.UTC(2026, 0, 1)
): BroadcastPosition | null {
  if (tracks.length === 0) return null;

  const durations = tracks.map((track) => track.durationSec ?? NaN);
  if (durations.some((duration) => !Number.isFinite(duration) || duration <= 0)) {
    return null;
  }

  const total = durations.reduce((sum, duration) => sum + duration, 0);
  if (total <= 0) return null;

  let cursor = Math.floor(Math.max(0, nowMs - originMs) / 1000) % total;
  for (let index = 0; index < durations.length; index++) {
    const duration = durations[index];
    if (cursor < duration) return { index, offsetSec: cursor };
    cursor -= duration;
  }

  return { index: 0, offsetSec: 0 };
}

export const sourceLabels: Record<RadioSource, string> = {
  kasa: 'Kayıtlı yayın',
  canli: 'Canlı yayın',
};
