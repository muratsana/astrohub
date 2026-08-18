import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * PARLAK YILDIZ KATALOĞU — İÇE AKTARMA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN VAR
 *
 * Alan çözümü katmanı bulutsuyu, galaksiyi, kümeyi etiketliyordu ama
 * YILDIZ hiç göstermiyordu. `celestial_objects` içindeki 485 "yildiz"
 * satırı konumsal bir katalog değil, tek tek eklenmiş dikkat çekici
 * nesneler — çözülmüş altı fotoğrafın hiçbirinin kadrajında yoklar.
 * Yıldız etiketlemek için gerçek bir katalog gerekiyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KENAR FONKSİYONU, NEDEN MİGRASYON DEĞİL
 *
 * 112 bin satır bir SQL dosyasına gömülemez: migrasyon dosyası
 * megabaytlarca INSERT'e döner, incelenemez hâle gelir ve depoyu
 * veriyle şişirir. Veriyi ÜRETEN kaynak burada yazılı; tablo bu
 * fonksiyonla dolduruluyor ve katalog güncellendiğinde aynı düğmeye
 * yeniden basılıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÜÇ KAYNAK, ÜÇ AYRI İŞ
 *
 *   · Hipparcos (ESA 1997, CDS/VizieR): konum, kadir, HD/HIP, tayf.
 *     Omurga bu. Kamuya açık — paylaş-benzer yükümlülüğü olan
 *     derlemeler yerine bilinçli tercih.
 *   · IAU-CSN: IAU'nun onayladığı özel adlar (Sadr, Albireo…). 450
 *     kadar yıldız, ama etiketin okunur olanı bunlar.
 *   · Yale BSC: Bayer/Flamsteed imleri. "γ Cyg", "HD 194093"ten çok
 *     daha fazlasını söylüyor.
 *
 * İkisi de EKSİK OLABİLİR ve bu bir hata değil: yıldızların ezici
 * çoğunluğunun adı yok, HD numarası var.
 */

const HIPPARCOS =
  'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=I/239/hip_main&-out=HIP,HD,Vmag,SpType&-out.add=_RAJ2000,_DEJ2000&-out.max=unlimited&Vmag=%3C10.5';
const BSC =
  'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=V/50/catalog&-out=HD,Name&-out.max=unlimited';
const IAU = 'https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt';

/*
 * Tek yazmada gönderilen satır sayısı. Daha büyüğü istek gövdesini ve
 * bellek tepesini gereksiz büyütüyor, daha küçüğü tur sayısını
 * artırıp fonksiyonun ömrünü yiyor.
 */
const CHUNK = 1000;

/**
 * Bayer kısaltmasından Yunan harfine.
 *
 * BSC "Eps Phe" yazıyor; ekranda görmek istediğimiz "ε Phe". Harfi
 * çevirmemek, gökyüzü kataloğunun geri kalanıyla tutarsız bir gösterim
 * bırakırdı — site her yerde Yunan harfini kullanıyor.
 */
const YUNAN: Record<string, string> = {
  Alp: 'α', Bet: 'β', Gam: 'γ', Del: 'δ', Eps: 'ε', Zet: 'ζ',
  Eta: 'η', The: 'θ', Iot: 'ι', Kap: 'κ', Lam: 'λ', Mu: 'μ',
  Nu: 'ν', Xi: 'ξ', Omi: 'ο', Pi: 'π', Rho: 'ρ', Sig: 'σ',
  Tau: 'τ', Ups: 'υ', Phi: 'φ', Chi: 'χ', Psi: 'ψ', Ome: 'ω',
};
const USTSIMGE: Record<string, string> = { '1': '¹', '2': '²', '3': '³' };

async function metin(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`${url} → HTTP ${response.status}`);
  return await response.text();
}

/**
 * VizieR TSV gövdesi.
 *
 * Dosya `#` ile başlayan üstbilgi, sonra sütun adları, sonra BİRİM
 * satırı, sonra tirelerden oluşan bir ayraç ve ancak ondan sonra veri
 * içeriyor. Ayracı aramak, birim satırını veri sanmaktan daha
 * dayanıklı: sütun sayısı değişse de tire satırı hep orada.
 */
function tsvSatirlari(govde: string): string[][] {
  const satirlar = govde.split('\n').filter((s) => !s.startsWith('#'));
  const ayrac = satirlar.findIndex((s) => /^-{3,}/.test(s));
  if (ayrac < 0) return [];
  return satirlar
    .slice(ayrac + 1)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.split('\t'));
}

function tam(v: string | undefined): number | null {
  const n = Number.parseInt((v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function ondalik(v: string | undefined): number | null {
  const n = Number.parseFloat((v ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * BSC'nin 10 karakterlik `Name` alanı SABİT SÜTUNLU:
 * 1-3 Flamsteed, 4-6 Bayer, 7 üstsimge, 8-10 takımyıldız.
 * Boşluğa göre bölmek "33    Psc" ile "Kap1Scl"i aynı kurala
 * sokamıyor; sütunlar bunu kendiliğinden çözüyor.
 */
function bscImi(ham: string): string | null {
  if (!ham || ham.trim().length === 0) return null;
  const alan = ham.padEnd(10, ' ');
  const flamsteed = alan.slice(0, 3).trim();
  const bayer = alan.slice(3, 6).trim();
  const ust = alan.slice(6, 7).trim();
  const takim = alan.slice(7, 10).trim();
  if (!takim) return null;

  const harf = bayer ? (YUNAN[bayer] ?? bayer) : '';
  const ustsimge = ust ? (USTSIMGE[ust] ?? ust) : '';
  const bas = harf ? `${harf}${ustsimge}` : flamsteed;
  return bas ? `${bas} ${takim}` : null;
}

Deno.serve(async (req: Request) => {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  /*
   * Bakım uç noktası: dışarıdan çağrılmasın. Projenin iç işleri için
   * zaten tanımlı olan paylaşılan sır kullanılıyor; bu iş için ikinci
   * bir sır üretmek, saklanacak ve döndürülecek bir sır daha demekti.
   */
  const secret = Deno.env.get('PLATE_SOLVE_POLL_SECRET');
  if (!secret || req.headers.get('x-ops-secret') !== secret) {
    return json(401, { hata: 'yetkisiz' });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const [hipGovde, bscGovde, iauGovde] = await Promise.all([
      metin(HIPPARCOS),
      metin(BSC),
      metin(IAU),
    ]);

    /* HD → Bayer/Flamsteed imi. */
    const imler = new Map<number, string>();
    for (const s of tsvSatirlari(bscGovde)) {
      const hd = tam(s[0]);
      const im = bscImi(s[1] ?? '');
      if (hd !== null && im) imler.set(hd, im);
    }

    /*
     * IAU-CSN sabit sütunlu değil ve ortada boşluk taşıyan alanlar var
     * ("HR 472"). Satırın SONU ise düzenli: HIP, HD, RA, Dec ve tarih.
     * Sondan yakalamak, ortadaki değişkenliği tamamen atlıyor.
     */
    const adlar = new Map<number, string>();
    for (const satir of iauGovde.split('\n')) {
      if (!satir || satir.startsWith('#') || satir.startsWith('$')) continue;
      const m = satir.match(
        /\s(\d+|_)\s+(\d+|_)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+\d{4}-\d{2}-\d{2}/
      );
      if (!m) continue;
      const hip = tam(m[1]);
      const ad = satir.trim().split(/\s+/)[0];
      if (hip !== null && ad && ad !== '_') adlar.set(hip, ad);
    }

    const satirlar = tsvSatirlari(hipGovde);
    const yildizlar: Record<string, unknown>[] = [];
    for (const s of satirlar) {
      // _RAJ2000, _DEJ2000, HIP, HD, Vmag, SpType
      const ra = ondalik(s[0]);
      const dec = ondalik(s[1]);
      const hip = tam(s[2]);
      if (ra === null || dec === null || hip === null) continue;
      const hd = tam(s[3]);

      yildizlar.push({
        hip,
        hd,
        proper_name: adlar.get(hip) ?? null,
        designation: hd !== null ? (imler.get(hd) ?? null) : null,
        ra_deg: ra,
        dec_deg: dec,
        magnitude: ondalik(s[4]),
        spectral_type: (s[5] ?? '').trim() || null,
        updated_at: new Date().toISOString(),
      });
    }

    if (yildizlar.length < 1000) {
      /* Kaynak biçimi değişmişse sessizce boş bir tablo bırakmak,
         katmanı hiç yıldız göstermeyen eski hâline döndürürdü. */
      throw new Error(
        `beklenenden az satır ayrıştırıldı (${yildizlar.length}); kaynak biçimi değişmiş olabilir`
      );
    }

    let yazilan = 0;
    for (let i = 0; i < yildizlar.length; i += CHUNK) {
      const parca = yildizlar.slice(i, i + CHUNK);
      const { error } = await admin
        .from('bright_stars')
        .upsert(parca, { onConflict: 'hip' });
      if (error) throw new Error(`yazma (${i}): ${error.message}`);
      yazilan += parca.length;
    }

    return json(200, {
      durum: 'tamam',
      yazilan,
      ozel_adli: adlar.size,
      imli: imler.size,
    });
  } catch (e) {
    return json(500, { hata: String(e instanceof Error ? e.message : e) });
  }
});
