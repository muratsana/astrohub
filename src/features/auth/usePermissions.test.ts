import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  permissionsFromPayload,
  roleLabels,
  type Payload,
} from './usePermissions';

/**
 * YETKİ KAPISININ DAVRANIŞI.
 *
 * Burada sınanan şey ARAYÜZ tarafı. Gerçek yetki sınırı RLS'te ve kota
 * tetikleyicilerinde; onlar veritabanı olmadan sınanamıyor ve bu testin
 * konusu değil. Sınanan, arayüzün veritabanının verdiği cevabı DOĞRU
 * OKUYUP OKUMADIĞI — özellikle sessizce yanlış tarafa düşebilecek iki
 * yerde: sınırsız kota ve tanımsız özellik.
 */

const BOS: Payload = {
  roller: [],
  statu: 'standart',
  izinler: [],
  kotalar: {},
  uyelik_bitis: null,
};

const p = (over: Partial<Payload>) =>
  permissionsFromPayload('ready', { ...BOS, ...over });

describe('kota okuma', () => {
  it('null SINIRSIZ demek, sıfır değil', () => {
    /*
     * Bu ayrım kağıt üstünde küçük, sonucu büyük: premium kullanıcının
     * setup sınırı null geliyor. `?? 0` yazan bir arayüz onu "hiç setup
     * açamazsın" diye okur ve premium kullanıcıyı standarttan daha kısıtlı
     * hale getirirdi.
     */
    const premium = p({ statu: 'premium', kotalar: { setup_sayisi: null } });
    expect(premium.kota('setup_sayisi')).toBeNull();

    const standart = p({ kotalar: { setup_sayisi: 1 } });
    expect(standart.kota('setup_sayisi')).toBe(1);
  });

  it('sıfır sınır "hiç yapamaz" olarak korunuyor', () => {
    /* Standart kullanıcının revizyon hakkı sıfır. Bu bir sınır ve
       null'a çevrilirse sınırsız sanılırdı. */
    expect(p({ kotalar: { revizyon: 0 } }).kota('revizyon')).toBe(0);
  });

  it('tanımsız anahtar null döner (sınır tanımlı değil)', () => {
    expect(p({}).kota('galeri_foto')).toBeNull();
  });

  it('plandaki 5 / 30 farkı okunuyor', () => {
    expect(p({ kotalar: { galeri_foto: 5 } }).kota('galeri_foto')).toBe(5);
    expect(
      p({ statu: 'premium', kotalar: { galeri_foto: 30 } }).kota('galeri_foto')
    ).toBe(30);
  });
});

describe('izin okuma', () => {
  it('listede olmayan özellik false', () => {
    expect(p({ izinler: ['ilan_yayinla'] }).izin('gokyuzu_arsivi')).toBe(false);
  });

  it('listedeki özellik true', () => {
    expect(p({ izinler: ['ilan_yayinla'] }).izin('ilan_yayinla')).toBe(true);
  });

  it('oturumsuz ziyaretçide hiçbir izin yok', () => {
    const anon = permissionsFromPayload('ready', BOS);
    expect(anon.izin('mesaj_gonder')).toBe(false);
    expect(anon.izin('galeriye_foto_ekle')).toBe(false);
    expect(anon.canAccessAdmin).toBe(false);
  });

  it('hata durumunda izin verilmiyor — güvenli taraf', () => {
    /* Yetki okunamadığında "her şeye izin var" varsaymak, geçici bir ağ
       hatasını yetki yükseltmesine çevirirdi. */
    const hata = permissionsFromPayload('error', BOS, 'ağ hatası');
    expect(hata.izin('icerik_olustur')).toBe(false);
    expect(hata.isAdmin).toBe(false);
    expect(hata.canAccessAdmin).toBe(false);
  });
});

describe('rol ve statü', () => {
  it('admin ve moderatör panele girebiliyor, diğerleri giremiyor', () => {
    expect(p({ roller: ['admin'] }).canAccessAdmin).toBe(true);
    expect(p({ roller: ['moderator'] }).canAccessAdmin).toBe(true);
    expect(p({ roller: ['content_editor'] }).canAccessAdmin).toBe(false);
    expect(p({ roller: ['jury'] }).canAccessAdmin).toBe(false);
  });

  it('kaldırılmış roller arayüzde geçerli rol sayılmıyor', () => {
    const state = p({ roller: ['jury'], statu: 'standart' });
    expect(state.roles).toEqual([]);
    expect(state.isAdmin).toBe(false);
    expect(state.isModerator).toBe(false);
    expect(state.canAccessAdmin).toBe(false);
  });
});

describe('enum ile arayüz eşleşmesi', () => {
  it('roleLabels, app_role enum değerlerinin hepsini karşılıyor', () => {
    /*
     * Enum'a değer eklenip etikete eklenmediğinde arayüz `undefined`
     * yazar ve bu hiçbir yerde hata vermez — yalnızca ekranda boş bir
     * rozet olarak görünür. Kaynak enum tanımının kendisi.
     */
    const sql = readFileSync(
      resolve(__dirname, '../../../supabase/migrations/0001_extensions_and_core.sql'),
      'utf8'
    );
    const govde = sql.match(/create type app\.app_role as enum \(([\s\S]*?)\);/);
    expect(govde, 'app_role enum tanımı bulunamadı').toBeTruthy();

    const degerler = [...govde![1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(degerler.length).toBeGreaterThan(0);
    for (const d of degerler) {
      expect(roleLabels, `enum değeri "${d}" için etiket yok`).toHaveProperty(d);
    }

    expect(roleLabels).not.toHaveProperty('jury');
  });
});
