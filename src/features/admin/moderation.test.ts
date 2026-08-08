import { describe, it, expect } from 'vitest';
import {
  canRemoveContent,
  countByStatus,
  removeContent,
  targetLabels,
  statusLabels,
  reasonLabels,
  VARSAYILAN_KALDIRMA_GEREKCESI,
  type ModerationStatus,
  type ModerationTarget,
} from './moderation';

describe('moderasyon kuyruğu sayımı', () => {
  it('boş kuyrukta tüm durumlar sıfır döner', () => {
    const counts = countByStatus([]);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
    // Panelin rozetleri eksik anahtar bekleyemez; hepsi tanımlı olmalı.
    expect(Object.keys(counts)).toHaveLength(5);
  });

  it('durumlara göre sayar', () => {
    const counts = countByStatus([
      { status: 'pending' },
      { status: 'pending' },
      { status: 'approved' },
      { status: 'escalated' },
    ]);

    expect(counts.pending).toBe(2);
    expect(counts.approved).toBe(1);
    expect(counts.escalated).toBe(1);
    expect(counts.rejected).toBe(0);
  });
});

describe('etiket sözlükleri', () => {
  /*
   * SAYI SABİTİ KALDIRILDI. Test "8 hedef türü olmalı" diyordu ve dokuzuncu
   * tür eklenince (0047: özel mesaj) kırıldı — oysa ölçmek istediği şey
   * sayı değil, HER TÜRÜN BİR KARŞILIĞI OLMASI. Zaten `Record<
   * ModerationTarget, string>` tipi eksik anahtarı derlemede yakalıyor;
   * buradaki testin işi etiketin BOŞ ya da yer tutucu olmadığını
   * doğrulamak.
   */
  it('her hedef türünün dolu bir Türkçe karşılığı var', () => {
    const targets = Object.keys(targetLabels) as ModerationTarget[];
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(targetLabels[target].trim().length).toBeGreaterThan(2);
    }
    expect(targetLabels.forum_post).toBe('Forum mesajı');
    expect(targetLabels.message).toBe('Özel mesaj');
  });

  it('her durumun karşılığı var ve boş değil', () => {
    const statuses: ModerationStatus[] = [
      'pending',
      'in_review',
      'approved',
      'rejected',
      'escalated',
    ];
    for (const status of statuses) {
      expect(statusLabels[status].length).toBeGreaterThan(2);
    }
  });

  it('gerekçeler şartnamedeki başlıkları karşılar', () => {
    expect(reasonLabels.telif).toBe('Telif ihlali');
    expect(reasonLabels['yanlis-konum']).toBe('Hassas konum ifşası');
    expect(Object.keys(reasonLabels)).toHaveLength(7);
  });
});


/**
 * KUYRUK KARARININ İÇERİĞE DOKUNDUĞU YER.
 *
 * Buradaki asıl risk sessiz başarısızlık: kuyruk kaydı "kaldırıldı"
 * olarak kapanırken içeriğin yayında kalması. Kuyruğa bakan hiç kimse
 * bunu göremez — kayıt çözülmüş görünür.
 */
describe('içerik kaldırma — hedef eşlemesi', () => {
  /*
   * Metin taşıyan üç hedef. Bunlarda kaldırma gövdeyi arşive taşıyıp
   * yerine gerekçe bırakabiliyor; kolonlar (`deleted_at`,
   * `removal_reason`) bu üç tabloda var.
   */
  it('metin hedeflerinde içerik kaldırılabiliyor', () => {
    expect(canRemoveContent('comment')).toBe(true);
    expect(canRemoveContent('forum_thread')).toBe(true);
    expect(canRemoveContent('forum_post')).toBe(true);
  });

  /*
   * Geri kalanlar bilerek dışarıda. Fotoğraf/ilan/etkinlik/gözlem noktası
   * kendi panelinden durum değişikliğiyle kaldırılıyor; profil hesaba
   * dokunmak demek; özel mesajı moderatör okuyamıyor bile.
   */
  it('diğer hedeflerde içerik bu ekrandan kaldırılmıyor', () => {
    const disarida: ModerationTarget[] = [
      'photo',
      'listing',
      'event',
      'site',
      'profile',
      'message',
    ];
    for (const t of disarida) expect(canRemoveContent(t), t).toBe(false);
  });

  /*
   * Kaldırılamayan bir hedefte fonksiyon SESSİZCE geçmemeli. Sessiz
   * geçseydi panel kararı kaydeder, moderatör işin bittiğini sanır ve
   * içerik yayında kalırdı — düzeltmeye çalıştığımız boşluğun aynısı,
   * bu sefer kodun içinde.
   */
  it('kaldırılamayan hedefte hata veriyor', async () => {
    await expect(removeContent('photo', 'x')).rejects.toThrow(/panel/i);
  });

  /*
   * Yapılandırma yokken de sessizce başarılı dönmemeli — aynı gerekçe.
   */
  it('yapılandırma yokken sessizce başarılı dönmüyor', async () => {
    await expect(removeContent('comment', 'x')).rejects.toThrow();
  });
});

/**
 * GEREKÇE METNİ.
 *
 * Bu cümle kullanıcıya GÖSTERİLEN metin: kaldırılan iletinin yerinde o
 * duruyor. Boş ya da yer tutucu olması, gövdesi boşaltılmış ama neden
 * boşaltıldığı yazmayan bir kutu demek.
 */
describe('varsayılan kaldırma gerekçesi', () => {
  it('kullanıcıya gösterilmeye uygun bir cümle', () => {
    expect(VARSAYILAN_KALDIRMA_GEREKCESI.trim().length).toBeGreaterThan(20);
    expect(VARSAYILAN_KALDIRMA_GEREKCESI).not.toMatch(/TODO|lorem|xxx/i);
  });
});
