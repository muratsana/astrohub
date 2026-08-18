import { describe, it, expect } from 'vitest';
import {
  canRemoveContent,
  countByStatus,
  decideClubDeletion,
  durumEtiketi,
  isResolved,
  removeContent,
  resolveItem,
  restoreContent,
  sendModerationFeedback,
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
    /*
      SAYI SABİTİ YOK, KARŞILAŞTIRMA VAR.

      Test "5 durum olmalı" diyordu ve altıncı durum eklenince (FAZ 6:
      `archived`) kırıldı — oysa ölçmek istediği şey sayı değil, sayaçta
      HER DURUMUN BİR ANAHTARI OLMASI. Eksik anahtar panelin rozetini
      `undefined` gösterirdi.
    */
    expect(Object.keys(counts).sort()).toEqual(Object.keys(statusLabels).sort());
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
    const statuses = Object.keys(statusLabels) as ModerationStatus[];
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
   * FOTOĞRAF, İLAN, ETKİNLİK VE SAHA ARTIK BURADAN DA KALDIRILABİLİYOR.
   *
   * Önceki karar bunları dışarıda bırakıyordu: "kendi panelinden durum
   * değişikliğiyle kaldırılıyor". Gerekçe tutarlıydı ama sonucu canlıda
   * şu oldu — telif şikâyeti "Kaldırıldı" durumuna geçti, kaldırma
   * düğmesi fotoğraf için hiç çizilmediği için fotoğraf yayında kaldı ve
   * ekran olmamış bir şeyi olmuş gibi gösterdi.
   *
   * Şikâyeti değerlendiren kişi kararını da aynı yerde uygulayabilmeli;
   * başka bir panele geçmesi gereken bir akış, o adımın atlanacağı
   * akıştır.
   */
  it('şikâyet edilebilen içerik türleri buradan kaldırılabiliyor', () => {
    const icerde: ModerationTarget[] = ['photo', 'listing', 'event', 'site'];
    for (const t of icerde) expect(canRemoveContent(t), t).toBe(true);
  });

  /*
   * İKİSİ HÂLÂ DIŞARIDA VE ÖYLE KALMALI: profil kaldırmak hesaba
   * dokunmak demek (askı/yasak ayrı bir akış), özel mesajı moderatör
   * okuyamıyor bile — okuyamadığı bir şeyi silmesi için düğme koymak
   * yanlış olurdu.
   */
  it('profil ve özel mesaj bu ekrandan kaldırılmıyor', () => {
    for (const t of ['profile', 'message'] as ModerationTarget[]) {
      expect(canRemoveContent(t), t).toBe(false);
    }
  });

  /*
   * Kaldırılamayan bir hedefte fonksiyon SESSİZCE geçmemeli. Sessiz
   * geçseydi panel kararı kaydeder, moderatör işin bittiğini sanır ve
   * içerik yayında kalırdı — düzeltmeye çalıştığımız boşluğun aynısı,
   * bu sefer kodun içinde.
   */
  it('kaldırılamayan hedefte hata veriyor', async () => {
    /* Profil kaldırılabilir hedef değil; sessizce başarılı dönmek
       moderatöre yapmadığı bir işi yapmış gibi göstermek olurdu. */
    await expect(removeContent('profile', 'x')).rejects.toThrow(/kaldırılamıyor/i);
  });

  /* Geri alma da aynı kapıdan geçiyor: kaldırılamayan bir hedefi geri
     almak da anlamsız. */
  it('geri alma da kaldırılamayan hedefte reddediliyor', async () => {
    await expect(restoreContent('message', 'x')).rejects.toThrow(/geri alınamıyor/i);
  });

  /*
   * Yapılandırma yokken de sessizce başarılı dönmemeli — aynı gerekçe.
   */
  it('yapılandırma yokken sessizce başarılı dönmüyor', async () => {
    await expect(removeContent('comment', 'x')).rejects.toThrow();
    await expect(restoreContent('comment', 'x')).rejects.toThrow();
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

/**
 * TOPLULUK SİLME TALEBİ (FAZ 6).
 *
 * Buradaki iki risk de sessiz: talebi düz UPDATE ile kapatmak topluluğu
 * SİLMEZ (kuyrukta "onaylandı" yazan, sitede duran bir topluluk kalır) ve
 * gerekçesiz ret sahibine boş bir bildirim gönderir.
 */
describe('silme talebi — kararı ayrı kapı veriyor', () => {
  it('talebi düz kuyruk güncellemesiyle kapatmıyor', async () => {
    await expect(
      resolveItem('talep-1', 'approved', 'admin-1', undefined, 'club_deletion')
    ).rejects.toThrow(/Silmeyi onayla/);
  });

  it('şikâyet kaydı aynı yoldan geçmeye devam ediyor', async () => {
    /* Yapılandırma yok; hata SUNUCU yolundan geliyor — yani kapı açık. */
    await expect(
      resolveItem('sikayet-1', 'approved', 'admin-1', undefined, 'comment')
    ).rejects.toThrow(/yapılandırılmamış/i);
  });

  it('gerekçesiz ret veritabanına hiç gitmiyor', async () => {
    await expect(decideClubDeletion('talep-1', false, '   ')).rejects.toThrow(
      /Ret gerekçesi zorunlu/
    );
  });

  it('onayda gerekçe istemiyor', async () => {
    /* Onay için gerekçe zorunlu değil: bildirimin gövdesi sabit cümle.
       Hata sunucu yolundan geliyorsa doğrulama geçmiş demektir. */
    await expect(decideClubDeletion('talep-1', true)).rejects.toThrow(
      /yapılandırılmamış/i
    );
  });

  it('boş geri bildirim gönderilmiyor', async () => {
    await expect(sendModerationFeedback('kayit-1', '  ')).rejects.toThrow(
      /boş olamaz/
    );
  });
});

describe('durum okunuşu türe göre değişiyor', () => {
  /*
   * Kuyruğun `approved`/`rejected` değerleri şikâyette İÇERİK hakkında,
   * talepte TALEP hakkında ve tam ters okunuyor. Aynı etiketi
   * kullansaydık onaylanmış bir silme talebi kuyrukta "Onaylandı" diye
   * görünürdü — topluluğun kaldırıldığını hiçbir yerde yazmadan.
   */
  it('onaylanmış talep "Silindi" diyor, onaylanmış şikâyet "Onaylandı"', () => {
    expect(
      durumEtiketi({ target_type: 'club_deletion', status: 'approved' })
    ).toBe('Silindi');
    expect(durumEtiketi({ target_type: 'comment', status: 'approved' })).toBe(
      'Onaylandı'
    );
  });

  it('reddedilmiş talep "Reddedildi" diyor, reddedilmiş şikâyet "Kaldırıldı"', () => {
    expect(
      durumEtiketi({ target_type: 'club_deletion', status: 'rejected' })
    ).toBe('Reddedildi');
    expect(durumEtiketi({ target_type: 'comment', status: 'rejected' })).toBe(
      'Kaldırıldı'
    );
  });
});

describe('kapanmış kayıt', () => {
  /* Arşiv de bir kapanış: veritabanı da kapalı talebi yeniden karara
     bağlamayı reddediyor. Panelde düğmelerin kaybolması bununla aynı
     kuralı söylüyor. */
  it('arşiv kapanış sayılıyor', () => {
    expect(isResolved('archived')).toBe(true);
    expect(isResolved('approved')).toBe(true);
    expect(isResolved('rejected')).toBe(true);
  });

  it('açık kayıtlar kapanmış sayılmıyor', () => {
    expect(isResolved('pending')).toBe(false);
    expect(isResolved('in_review')).toBe(false);
    expect(isResolved('escalated')).toBe(false);
  });
});
