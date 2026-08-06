import { describe, expect, it } from 'vitest';
import {
  MEMBERSHIP_STATUSES,
  ROLES,
  membershipLabels,
  roleDescriptions,
  roleLabels,
  revokeRole,
  ACCOUNT_STATUSES,
  accountStatusLabels,
  accountStatusDescriptions,
  isWriteAllowed,
  setAccountStatus,
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
   * ASIL KURAL. Son admin rolü alınırsa paneli kimse açamaz ve geri
   * dönüş yolu yalnızca SQL konsolu olur. Kural istemcide, çünkü RLS
   * satır bazlı çalışıyor ve "kaç tane kaldı" sorusunu sormuyor.
   *
   * Yapılandırma yokken fonksiyon veritabanına hiç gitmeden hata
   * veriyor; ölçülen şey bu yolun sessizce başarılı dönmemesi.
   */
  it('yapılandırma yokken sessizce başarılı dönmüyor', async () => {
    await expect(revokeRole('bir-kullanici', 'admin')).rejects.toThrow();
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
