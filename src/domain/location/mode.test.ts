import { describe, expect, it } from 'vitest';
import {
  activeFix,
  canReturnToAuto,
  needsPermissionHelp,
  reduce,
  shouldPrompt,
  INITIAL_STATE,
  type LocationFix,
  type LocationState,
} from './mode';

/**
 * KONUM MODU DURUM MAKİNESİ (Faz 1.2).
 *
 * Ana görev belgesindeki hata: "Kullanıcı manuel bir konum seçtikten
 * sonra GPS ile otomatik konum bulma yeniden etkinleştirilemiyor."
 *
 * Sebep mimariydi — tek `permission` değişkeni hem tarayıcı iznini hem
 * kullanıcının tercihini taşıyordu. Aşağıdaki senaryolar belgedeki
 * 10 test senaryosunun durum makinesiyle ölçülebilen kısmıdır; tarayıcıya
 * özgü olanlar (macOS Safari, iOS, VPN) bu katmanda ölçülemez ve
 * IMPLEMENTATION_STATUS'ta ayrıca raporlanır.
 */

const ANKARA: LocationFix = { label: 'Ankara', latitude: 39.93, longitude: 32.86, ref: '6' };
const GPS: LocationFix = { label: 'Cihaz konumu', latitude: 40.1, longitude: 32.9 };

const akis = (...olaylar: Parameters<typeof reduce>[1][]): LocationState =>
  olaylar.reduce(reduce, INITIAL_STATE);

describe('senaryo 4 — manuel seçimden GPS\'e dönme', () => {
  /*
   * BELGEDEKİ ASIL HATA. Eski kodda manuel seçim GPS önerisini kalıcı
   * kapatıyordu; burada kapatmamalı.
   */
  it('manuel seçimden sonra otomatik moda dönülebiliyor', () => {
    const s = akis(
      { type: 'SELECT_MANUAL', fix: ANKARA },
      { type: 'REQUEST_AUTO' }
    );
    expect(s.mode).toBe('AUTO_GPS');
    expect(shouldPrompt(s)).toBe(true);
  });

  it('manuel seçim izin durumuna hiç dokunmuyor', () => {
    const once = akis({ type: 'GPS_OK', fix: GPS });
    const sonra = reduce(once, { type: 'SELECT_MANUAL', fix: ANKARA });
    /* GPS konumu KORUNUYOR — geri dönüşte yeniden sorulması gerekmiyor. */
    expect(sonra.lastGps).toEqual(GPS);
  });

  it('geri dönüşte seçilen şehir kaybolmuyor', () => {
    const s = akis(
      { type: 'SELECT_MANUAL', fix: ANKARA },
      { type: 'REQUEST_AUTO' },
      { type: 'GPS_OK', fix: GPS },
      { type: 'SELECT_MANUAL', fix: ANKARA }
    );
    expect(s.lastManual).toEqual(ANKARA);
    expect(s.lastGps).toEqual(GPS);
  });
});

describe('senaryo 5 — GPS\'ten manuel seçime geçme', () => {
  it('GPS aktifken şehir seçilebiliyor', () => {
    const s = akis({ type: 'GPS_OK', fix: GPS }, { type: 'SELECT_MANUAL', fix: ANKARA });
    expect(s.mode).toBe('MANUAL');
    expect(activeFix(s)).toEqual(ANKARA);
  });
});

describe('sınırsız geçiş', () => {
  /*
   * Belge "kullanıcı otomatik ve manuel mod arasında SINIRSIZ geçiş
   * yapabilmelidir" diyor. Tek yönlü bir geçiş bu testte ikinci turda
   * kırılır.
   */
  it('on tur gidip gelmek durumu bozmuyor', () => {
    let s = INITIAL_STATE;
    for (let i = 0; i < 10; i += 1) {
      s = reduce(s, { type: 'SELECT_MANUAL', fix: ANKARA });
      expect(s.mode, `tur ${i} manuel`).toBe('MANUAL');
      s = reduce(s, { type: 'REQUEST_AUTO' });
      expect(s.mode, `tur ${i} otomatik`).toBe('AUTO_GPS');
      s = reduce(s, { type: 'GPS_OK', fix: GPS });
    }
    expect(s.lastManual).toEqual(ANKARA);
    expect(s.lastGps).toEqual(GPS);
  });
});

describe('senaryo 2 ve 7 — izni reddetme, sonradan açma', () => {
  it('reddedince yardım gösteriliyor ve prompt tetiklenmiyor', () => {
    const s = akis({ type: 'REQUEST_AUTO' }, { type: 'GPS_DENIED' });
    expect(s.mode).toBe('DENIED');
    expect(needsPermissionHelp(s)).toBe(true);
    /*
     * REDDEDİLMİŞ TARAYICIDA PROMPT ÇAĞRILMAMALI: getCurrentPosition
     * anında hata döner, kullanıcı hiçbir diyalog görmez ve "tıkladım
     * ama bir şey olmadı" der.
     */
    expect(shouldPrompt(s)).toBe(false);
  });

  it('reddedilse bile otomatik moda dönüş yolu AÇIK', () => {
    const s = akis({ type: 'REQUEST_AUTO' }, { type: 'GPS_DENIED' });
    expect(canReturnToAuto(s)).toBe(true);
    /* Kullanıcı ayarlardan izni açtıysa bunu bize bildiren bir olay
       yok — tek yol yeniden denemek. */
    expect(reduce(s, { type: 'REQUEST_AUTO' }).mode).toBe('AUTO_GPS');
  });

  it('reddedince daha önce seçilen şehir silinmiyor', () => {
    const s = akis(
      { type: 'SELECT_MANUAL', fix: ANKARA },
      { type: 'REQUEST_AUTO' },
      { type: 'GPS_DENIED' }
    );
    expect(activeFix(s)).toEqual(ANKARA);
  });
});

describe('senaryo 8 ve 9 — servis kapalı, sağlayıcı hatası', () => {
  it('desteklenmeyen tarayıcıda UNAVAILABLE, çökme yok', () => {
    const s = akis({ type: 'REQUEST_AUTO' }, { type: 'GPS_UNAVAILABLE' });
    expect(s.mode).toBe('UNAVAILABLE');
    expect(shouldPrompt(s)).toBe(false);
    /* Manuel seçim hâlâ mümkün olmalı — site çalışmaya devam ediyor. */
    expect(reduce(s, { type: 'SELECT_MANUAL', fix: ANKARA }).mode).toBe('MANUAL');
  });

  it('hata mesajı taşınıyor ve mod değişince temizleniyor', () => {
    const hatali = akis(
      { type: 'REQUEST_AUTO' },
      { type: 'GPS_ERROR', message: 'Zaman aşımı' }
    );
    expect(hatali.mode).toBe('ERROR');
    expect(hatali.error).toBe('Zaman aşımı');
    expect(reduce(hatali, { type: 'SELECT_MANUAL', fix: ANKARA }).error).toBeNull();
  });

  it('UNAVAILABLE durumunda bile otomatiğe dönüş düğmesi görünüyor', () => {
    /* Kullanıcı tarayıcı değiştirmiş ya da HTTPS'e geçmiş olabilir;
       düğmeyi gizlemek onu çıkmaza sokar. */
    const s = akis({ type: 'GPS_UNAVAILABLE' });
    expect(canReturnToAuto(s)).toBe(true);
  });
});

describe('activeFix', () => {
  it('otomatik modda GPS henüz gelmediyse manuel olana düşüyor', () => {
    const s = akis({ type: 'SELECT_MANUAL', fix: ANKARA }, { type: 'REQUEST_AUTO' });
    expect(s.mode).toBe('AUTO_GPS');
    expect(activeFix(s)).toEqual(ANKARA);
  });

  it('hiç konum yoksa null — uydurma konum üretmiyor', () => {
    expect(activeFix(INITIAL_STATE)).toBeNull();
  });

  it('otomatik modda GPS geldiyse onu veriyor', () => {
    const s = akis({ type: 'SELECT_MANUAL', fix: ANKARA }, { type: 'GPS_OK', fix: GPS });
    expect(activeFix(s)).toEqual(GPS);
  });
});
