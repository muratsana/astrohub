import { describe, expect, it, beforeEach } from 'vitest';
import {
  gizliAlanlariAyikla,
  taslakOku,
  taslakSil,
  taslakYaz,
} from './formDraft';

describe('form taslağı', () => {
  beforeEach(() => sessionStorage.clear());

  it('yazılanı geri okuyor', () => {
    taslakYaz('kayit', { email: 'a@b.c', acceptTerms: true });
    expect(taslakOku('kayit')).toEqual({ email: 'a@b.c', acceptTerms: true });
  });

  it('olmayan taslakta null dönüyor', () => {
    expect(taslakOku('yok')).toBeNull();
  });

  it('silinen taslak geri gelmiyor', () => {
    taslakYaz('kayit', { email: 'a@b.c' });
    taslakSil('kayit');
    expect(taslakOku('kayit')).toBeNull();
  });

  /*
   * Bozuk JSON depolamaya ancak elle kurcalamayla girer, ama girdiğinde
   * `JSON.parse` fırlatır ve form HİÇ açılmazdı. Taslak bir kolaylık;
   * kolaylığın sayfayı düşürmesi kabul edilemez.
   */
  it('bozuk içerikte çökmüyor', () => {
    sessionStorage.setItem('astrohub.taslak.kayit', '{bozuk');
    expect(taslakOku('kayit')).toBeNull();
  });

  /* Dizi ya da ilkel bir değer forma yedirilirse `reset` beklenmedik
     biçimde davranır; şeklini doğrulamak ucuz. */
  it('nesne olmayan içeriği yok sayıyor', () => {
    sessionStorage.setItem('astrohub.taslak.kayit', '[1,2,3]');
    expect(taslakOku('kayit')).toBeNull();
    sessionStorage.setItem('astrohub.taslak.kayit', '"metin"');
    expect(taslakOku('kayit')).toBeNull();
  });
});

describe('gizli alan ayıklama', () => {
  /*
   * ŞİFRE TASLAĞA GİRMEMELİ. `sessionStorage` aynı kaynaktaki her
   * betiğe açık; oraya düz metin şifre yazmak, bir kayıt formunun
   * rahatlığı için orantısız bir risk. Bu testin kırılması, şifrenin
   * sessizce diske düşmeye başladığı an demektir.
   */
  it('şifre alanlarını dışarıda bırakıyor', () => {
    expect(
      gizliAlanlariAyikla(
        {
          email: 'a@b.c',
          password: 'gizli123',
          confirmPassword: 'gizli123',
          acceptTerms: true,
        },
        ['password', 'confirmPassword']
      )
    ).toEqual({ email: 'a@b.c', acceptTerms: true });
  });

  it('boş ve tanımsız değerleri saklamıyor', () => {
    expect(
      gizliAlanlariAyikla(
        { email: '', ad: undefined, sehir: 'Ankara' },
        []
      )
    ).toEqual({ sehir: 'Ankara' });
  });
});
