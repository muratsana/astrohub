import { describe, expect, it } from 'vitest';
import {
  MEMBERSHIP_STATUSES,
  ROLES,
  membershipLabels,
  roleDescriptions,
  roleLabels,
  revokeRole,
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
