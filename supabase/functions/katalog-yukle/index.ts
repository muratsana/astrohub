/**
 * KATALOG İÇE AKTARMA — birincil kataloglardan veritabanına.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NE YAPIYOR
 *
 * OpenNGC (NGC + IC + Messier + Caldwell) ve VizieR'deki dokuz katalog
 * tablosunu indiriyor, tek bir normalleştirilmiş listeye indiriyor ve
 * hazırlık tablosuna yazıyor. Birleştirmenin kendisi SQL'de
 * (`app.katalog_birlestir`) çünkü orada mevcut kayıtlarla eşleştirme
 * küme işlemi; burada satır satır yapılsaydı 19.000 ayrı sorgu olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN EDGE FUNCTION
 *
 * İçe aktarma ~12 MB indiriyor ve 19.000 satır yazıyor. Bunu tarayıcıda
 * yapmak, yönetim panelini açan kişinin bağlantısına 12 MB yüklemek
 * demekti; ayrıca `service_role` anahtarı gerektirir ve o anahtar
 * tarayıcıya İNMEZ. Sunucuda çalışan bir fonksiyon her iki sorunu da
 * çözüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YETKİ — İKİ KAPI
 *
 * Fonksiyonun iki meşru çağıranı var ve ikisi farklı kimlik taşıyor:
 *
 *   · YÖNETİM PANELİ — oturumlu bir yöneticinin JWT'siyle geliyor.
 *     Kontrol `katalog_yetkisi()` RPC'siyle veritabanında yapılıyor;
 *     "oturumu var" yetmez, rolü de yönetici olmalı.
 *
 *   · ZAMANLANMIŞ BAKIM — veritabanındaki `pg_net` çağrısıyla geliyor
 *     ve taşıyabileceği bir kullanıcı oturumu yok. O yüzden Vault'ta
 *     duran paylaşılan bir sır kullanıyor; aynı desen `plate-solve-poll`
 *     için de kurulu.
 *
 * `verify_jwt` KAPALI olmak zorunda: açık olsaydı sırla gelen çağrı
 * fonksiyona hiç ulaşamazdı. Kapının kendisi burada, kapı geçilmeden
 * tek bir tablo okunmuyor.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  OPENNGC_EK_URL,
  OPENNGC_URL,
  SINIR_URL,
  VIZIER_KAYNAKLAR,
  vizierUrl,
} from './kaynaklar.ts';
import { sinirlariAyristir } from './takimyildiz.ts';
import {
  birlestir,
  openNgcAyristir,
  slugCakismalariniCoz,
  vizierAyristir,
  type Nesne,
} from './ayristir.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

function json(gövde: unknown, status = 200): Response {
  return new Response(JSON.stringify(gövde), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/**
 * Kaynak indirir; başarısızsa AÇIKÇA düşüyor.
 *
 * Sessiz atlama en tehlikeli davranış olurdu: Sh2 indirilemediğinde
 * içe aktarma "tamam" der, 313 bulutsu eksik kalır ve bunu kimse fark
 * etmez. Rapor hangi kaynağın kaç satır verdiğini de döndürüyor.
 */
async function indir(url: string, ad: string): Promise<string> {
  const yanit = await fetch(url, {
    headers: { 'User-Agent': 'astrohub-katalog/1.0' },
  });
  if (!yanit.ok) {
    throw new Error(`${ad}: HTTP ${yanit.status}`);
  }
  const metin = await yanit.text();
  if (metin.length < 500) {
    throw new Error(`${ad}: yanıt beklenmedik biçimde kısa (${metin.length} bayt)`);
  }
  return metin;
}

const PARCA = 2000;

/**
 * Çağıran yetkili mi — sır ya da yönetici JWT'si.
 *
 * Sır karşılaştırması sabit uzunlukta değil; zamanlama saldırısı bu
 * eşikte anlamlı bir tehdit değil çünkü sır 32 baytlık rastgele bir
 * değer ve saldırganın deneme başına bir ağ gidiş-dönüşü var.
 */
async function yetkiliMi(
  istek: Request,
  url: string,
  db: ReturnType<typeof createClient>
): Promise<boolean> {
  const sunulan = istek.headers.get('x-katalog-sirri');
  if (sunulan) {
    const { data } = await db.rpc('katalog_sirri_dogru_mu', { sunulan });
    if (data === true) return true;
  }

  const yetki = istek.headers.get('Authorization');
  if (!yetki) return false;

  /* Kullanıcının kendi anahtarıyla ayrı bir istemci: yetki kontrolünü
     servis anahtarıyla yapsaydık `app.is_admin()` her zaman "hayır"
     derdi (servis anahtarında oturum yok) ve panel kapısı hiç
     çalışmazdı. */
  const cagiran = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: yetki } },
  });
  const { data } = await cagiran.rpc('katalog_yetkisi');
  return data === true;
}

Deno.serve(async (istek: Request): Promise<Response> => {
  if (istek.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = Deno.env.get('SUPABASE_URL');
  const servis = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !servis) {
    return json({ hata: 'Sunucu yapılandırması eksik.' }, 500);
  }

  const db = createClient(url, servis);

  if (!(await yetkiliMi(istek, url, db))) {
    return json({ hata: 'Bu işlem yönetici yetkisi gerektiriyor.' }, 403);
  }

  const rapor: Record<string, number> = {};

  try {
    const sinirMetni = await indir(SINIR_URL, 'IAU sınırları');
    const sinirlar = sinirlariAyristir(sinirMetni);
    if (sinirlar.length < 300) {
      throw new Error(`IAU sınır tablosu eksik: ${sinirlar.length} satır`);
    }
    rapor['iau_sinir'] = sinirlar.length;

    const [ngcMetni, ekMetni] = await Promise.all([
      indir(OPENNGC_URL, 'OpenNGC'),
      indir(OPENNGC_EK_URL, 'OpenNGC addendum'),
    ]);

    const { nesneler: ngc, kopyalar } = openNgcAyristir(
      ngcMetni,
      ekMetni,
      sinirlar
    );
    rapor['openngc'] = ngc.length;
    if (ngc.length < 12000) {
      throw new Error(`OpenNGC beklenenden az kayıt verdi: ${ngc.length}`);
    }

    const listeler: Nesne[][] = [ngc];
    for (const kaynak of VIZIER_KAYNAKLAR) {
      const metin = await indir(vizierUrl(kaynak), kaynak.baslik);
      const liste = vizierAyristir(kaynak, metin, sinirlar);
      rapor[kaynak.onek.toLowerCase()] = liste.length;
      if (liste.length === 0) {
        throw new Error(`${kaynak.baslik}: hiç satır ayrıştırılamadı`);
      }
      listeler.push(liste);
    }

    const tumu = birlestir(listeler, kopyalar);
    slugCakismalariniCoz(tumu);
    rapor['birlesik'] = tumu.length;
    rapor['kod'] = tumu.reduce((t, n) => t + n.kodlar.length, 0);

    await db.rpc('katalog_hazirligi_bosalt');

    for (let i = 0; i < tumu.length; i += PARCA) {
      const dilim = tumu.slice(i, i + PARCA).map((n) => ({
        slug: n.slug,
        ad: n.ad,
        katalog: n.katalog,
        tur: n.tur,
        takimyildiz: n.takimyildiz,
        ra_deg: n.raDeg,
        dec_deg: n.decDeg,
        kadir: n.kadir,
        buyuk_eksen: n.buyukEksen,
        kucuk_eksen: n.kucukEksen,
        kodlar: n.kodlar,
      }));

      const { error } = await db.rpc('katalog_hazirligi_yaz', { kayitlar: dilim });
      if (error) throw new Error(`hazırlık yazımı: ${error.message}`);
    }

    const { data: sonuc, error: birlesmeHatasi } = await db.rpc(
      'katalog_birlestir'
    );
    if (birlesmeHatasi) {
      throw new Error(`birleştirme: ${birlesmeHatasi.message}`);
    }

    return json({ tamam: true, rapor, birlestirme: sonuc });
  } catch (hata) {
    return json(
      { tamam: false, rapor, hata: (hata as Error).message },
      500
    );
  }
});
