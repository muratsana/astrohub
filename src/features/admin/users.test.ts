import { describe, expect, it } from 'vitest';
import {
  MEMBERSHIP_STATUSES,
  ROLES,
  membershipLabels,
  roleDescriptions,
  roleLabels,
  revokeRole,
  sendSystemMessage,
  ACCOUNT_STATUSES,
  accountStatusLabels,
  accountStatusDescriptions,
  isWriteAllowed,
  setAccountStatus,
  fetchUsers,
  exportUsersCsv,
  anonymizeUser,
  cancelDeletionRequest,
  fetchUserContent,
  USER_SORTS,
  USER_PAGE_SIZE,
  userSortLabels,
  type AppRole,
  type MembershipStatus,
} from './users';

/**
 * KULLANICI YÖNETİMİ — sabitlerin veritabanı enum'larıyla hizası.
 *
 * `app_role` ve `membership_status` veritabanında enum. Buradaki
 * listeler onların istemci kopyası ve AYRIŞABİLİRLER: şemaya yeni bir
 * rol eklenirse panel onu göstermez, buradan silinen bir değer ise
 * enum'a yazılamaz. İkisi de sessiz hatalar — bu yüzden liste tam olarak
 * yazılı ve testle sabitlenmiş.
 *
 * Canlı enum değerleri ayrıca sorgulandı (`pg_enum`); bu test o hizanın
 * kod tarafında bozulmamasını koruyor.
 */

describe('roller', () => {
  it('veritabanındaki app_role enum sırasıyla aynı', () => {
    expect(ROLES).toEqual([
      'member',
      'verified_organizer',
      'club_manager',
      'content_editor',
      'moderator',
      'admin',
    ]);
  });

  it('her rolün etiketi ve açıklaması var', () => {
    for (const r of ROLES) {
      expect(roleLabels[r], r).toBeTruthy();
      expect(roleDescriptions[r], r).toBeTruthy();
    }
  });

  /*
   * Açıklama, rolün NE AÇTIĞINI söylemeli. Etiketi tekrarlayan bir
   * açıklama ("Moderatör: moderatör") yöneticiye hiçbir şey öğretmez ve
   * yanlış rol vermeye açık kapı bırakır.
   */
  it('açıklama etiketin tekrarı değil', () => {
    for (const r of ROLES) {
      expect(roleDescriptions[r], r).not.toBe(roleLabels[r]);
      expect(roleDescriptions[r].length, r).toBeGreaterThan(
        roleLabels[r].length
      );
    }
  });
});

describe('üyelik durumları', () => {
  it('veritabanındaki membership_status enum sırasıyla aynı', () => {
    expect(MEMBERSHIP_STATUSES).toEqual([
      'active',
      'grace',
      'expired',
      'canceled',
      'none',
    ]);
  });

  it('her durumun Türkçe etiketi var', () => {
    for (const m of MEMBERSHIP_STATUSES) {
      expect(membershipLabels[m], m).toBeTruthy();
    }
  });
});

describe('tip güvenliği', () => {
  /*
   * Etiket haritaları `Record<AppRole, string>` — enum genişlerse
   * derleme kırılıyor. Bu test o sözleşmenin çalışma zamanında da
   * tuttuğunu doğruluyor: haritada fazladan anahtar olmamalı.
   */
  it('etiket haritalarında fazladan anahtar yok', () => {
    expect(Object.keys(roleLabels).sort()).toEqual([...ROLES].sort());
    expect(Object.keys(membershipLabels).sort()).toEqual(
      [...MEMBERSHIP_STATUSES].sort()
    );
  });

  it('tipler listeden türüyor', () => {
    const r: AppRole = 'admin';
    const m: MembershipStatus = 'active';
    expect(ROLES).toContain(r);
    expect(MEMBERSHIP_STATUSES).toContain(m);
  });
});

describe('son yönetici koruması', () => {
  /*
   * ASIL KURAL ARTIK VERİTABANINDA — `app.guard_last_admin()`
   * tetikleyicisi (`20260807220000`). Eskiden bu sayım `revokeRole`
   * içindeydi ve yanlış taraftaydı: doğrudan bir REST çağrısı
   * (`DELETE /rest/v1/user_roles?role=eq.admin`) istemcideki kontrolü
   * hiç görmeden son admin satırını silebiliyordu.
   *
   * Yaptırım üretimde sınandı (7 Ağu, geri alınan işlem içinde): tek
   * admin varken silme `insufficient_privilege` ile reddedildi, iki
   * admin varken devretme çalıştı, admin dışı roller serbest kaldı.
   *
   * Burada ölçülen tek şey `revokeRole`un yapılandırma yokken sessizce
   * başarılı dönmemesi — kuralın kendisi değil, çağrı yolunun sağlamlığı.
   */
  it('yapılandırma yokken sessizce başarılı dönmüyor', async () => {
    await expect(revokeRole('bir-kullanici', 'admin')).rejects.toThrow();
  });
});

describe('sistem mesajı', () => {
  /*
   * Başlık zorunlu ve kontrol veritabanına GİTMEDEN yapılıyor: bildirim
   * listesinde görünen tek metin başlık, boş bir başlık kullanıcıya boş
   * satır olarak görünürdü. Yetki kontrolü ise burada değil —
   * `notify_user()` admin/moderatör değilse 42501 döndürüyor.
   */
  it('başlıksız mesajı veritabanına hiç göndermiyor', async () => {
    await expect(sendSystemMessage('bir-kullanici', '   ', 'gövde')).rejects.toThrow(
      /Başlık zorunlu/
    );
  });
});

/**
 * HESAP DURUMU (Faz 1, Görev 1.1).
 *
 * Buradaki testler YAPTIRIMI ölçmüyor — yaptırım RLS'te ve canlı
 * veritabanında rol taklidiyle doğrulandı (bkz.
 * `docs/KARARLAR-ADMIN-YENIDEN-YAZIM.md`, Görev 1.1 kanıt tablosu).
 *
 * Bu testlerin işi, İSTEMCİ kopyasının veritabanıyla aynı kuralı
 * uygulaması. `app.is_account_active()` süresi geçmiş askıyı aktif
 * sayıyor; `isWriteAllowed` aynı şeyi söylemezse panel "askıda" yazan
 * bir kullanıcının rahatça yazdığını gösterir — ya da tersi, ki daha
 * kötü: yönetici cezanın işlediğini sanır.
 */
describe('hesap durumu', () => {
  it('veritabanındaki account_status enum sırasıyla aynı', () => {
    expect(ACCOUNT_STATUSES).toEqual([
      'active',
      'suspended',
      'banned',
      'deactivated',
    ]);
  });

  it('her durumun etiketi ve açıklaması var', () => {
    for (const s of ACCOUNT_STATUSES) {
      expect(accountStatusLabels[s], s).toBeTruthy();
      expect(accountStatusDescriptions[s], s).toBeTruthy();
    }
  });

  it('aktif hesap yazabilir', () => {
    expect(isWriteAllowed({ status: 'active', suspendedUntil: null })).toBe(true);
  });

  it('süresiz askı yazamaz', () => {
    expect(isWriteAllowed({ status: 'suspended', suspendedUntil: null })).toBe(
      false
    );
  });

  it('süresi dolmamış askı yazamaz', () => {
    const yarin = new Date(Date.now() + 86400000).toISOString();
    expect(isWriteAllowed({ status: 'suspended', suspendedUntil: yarin })).toBe(
      false
    );
  });

  /* `app.is_account_active()` ile aynı kural: süresi geçmiş askı aktif
     sayılıyor ve bunun için bir cron işi ÇALIŞMASI gerekmiyor. */
  it('süresi geçmiş askı yazabilir — kayıt hâlâ suspended olsa bile', () => {
    const dun = new Date(Date.now() - 86400000).toISOString();
    expect(isWriteAllowed({ status: 'suspended', suspendedUntil: dun })).toBe(
      true
    );
  });

  it('yasaklı ve dondurulmuş hesap süre ne olursa olsun yazamaz', () => {
    const dun = new Date(Date.now() - 86400000).toISOString();
    expect(isWriteAllowed({ status: 'banned', suspendedUntil: dun })).toBe(false);
    expect(isWriteAllowed({ status: 'deactivated', suspendedUntil: null })).toBe(
      false
    );
  });

  /* Gerekçe kullanıcıya GÖSTERİLİYOR; boş bırakılabilseydi askıya alınan
     kişi sebebini hiç öğrenemezdi. Kontrol veritabanına gitmeden önce. */
  it('gerekçesiz durum değişikliği reddedilir', async () => {
    await expect(
      setAccountStatus('00000000-0000-0000-0000-000000000000', {
        status: 'suspended',
        reason: '   ',
      })
    ).rejects.toThrow(/Gerekçe zorunlu/);
  });
});

/**
 * LİSTE SORGUSU (Görev 1.3).
 *
 * Sunucu taraflı sayfalamanın kendisi veritabanına gidiyor ve burada
 * ölçülemiyor. Ölçülen şey, sorguyu ÇEVRELEYEN kararlar: sabitlerin
 * hizası ve yapılandırma yokken sessizce boş liste dönülmemesi.
 *
 * "Sessizce boş dönme" burada özellikle önemli: bir yönetici filtreye
 * uyan kimse olmadığını mı yoksa bağlantının kopuk olduğunu mu gördüğünü
 * ayırt edemezse, gerçek bir sorunu "kayıt yok" diye okur.
 */
describe('kullanıcı listesi sorgusu', () => {
  it('sıralama seçenekleri ve etiketleri eksiksiz', () => {
    expect(USER_SORTS).toEqual(['createdAt', 'username', 'lastSeen']);
    for (const s of USER_SORTS) {
      expect(userSortLabels[s], s).toBeTruthy();
    }
  });

  it('sayfa boyutu makul bir üst sınırda', () => {
    /* Belge 50/sayfa diyor. Değer değişirse sayfalama metinleri
       (`1–50 / 120`) ve CSV sınırı birlikte gözden geçirilmeli. */
    expect(USER_PAGE_SIZE).toBe(50);
  });

  it('yapılandırma yokken sessizce boş liste dönmüyor', async () => {
    await expect(fetchUsers({ search: 'x' })).rejects.toThrow();
  });

  it('CSV dışa aktarımı da sessizce boş dosya üretmiyor', async () => {
    await expect(exportUsersCsv({})).rejects.toThrow();
  });
});

/**
 * KVKK AKSİYONLARI (Görev 1.4/6).
 *
 * Anonimleştirmenin kendisi veritabanına yazıyor ve burada ölçülemiyor.
 * Ölçülen şey, YAZMADAN ÖNCEKİ kapı: gerekçesiz bir anonimleştirme
 * denetim kaydında "neden" sütunu boş bir satır bırakırdı ve o satır
 * altı ay sonra hiçbir şey ifade etmezdi.
 */
describe('KVKK aksiyonları', () => {
  it('gerekçesiz anonimleştirme reddedilir', async () => {
    await expect(
      anonymizeUser('00000000-0000-0000-0000-000000000000', '  ')
    ).rejects.toThrow(/Gerekçe zorunlu/);
  });

  it('gerekçesiz talep kapatma reddedilir', async () => {
    await expect(
      cancelDeletionRequest('00000000-0000-0000-0000-000000000000', '')
    ).rejects.toThrow(/Gerekçe zorunlu/);
  });

  /* İçerik sayımı yapılandırma yokken sessizce sıfır dönmemeli: sıfır
     "hiç içerik yok" demek ve yönetici o kullanıcıyı içeriksiz sanar. */
  it('içerik sayımı yapılandırma yokken sessizce sıfır dönmüyor', async () => {
    await expect(
      fetchUserContent('00000000-0000-0000-0000-000000000000')
    ).rejects.toThrow();
  });
});
