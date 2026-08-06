/**
 * TEŞHİS ARACI — PHD2 grafiği okuma.
 *
 * Paketin `GraphReader.jsx` bileşeninin TSX karşılığı. Altı senaryo,
 * hepsi aynı benzetim çekirdeğinden (`makeTrace`) deterministik tohumla
 * üretiliyor: sayfa her açıldığında aynı grafik çiziliyor, dolayısıyla
 * metindeki sayılar grafiği anlatmaya devam ediyor.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { makeTrace, linFit, rms, type TraceOptions } from '../core';
import { PhdGraph, PhdLegend } from './PhdGraph';

interface Senaryo {
  ad: string;
  trace: TraceOptions;
  v: ReactNode;
}

const CASES: Record<string, Senaryo> = {
  ok: {
    ad: 'Sağlıklı guiding',
    trace: {
      decRate: 0.05,
      raRate: 0,
      seeing: 0.34,
      pe: 0.3,
      guided: true,
      seed: 11,
    },
    v: (
      <>
        <b className="dz-hd dz-ok">Sağlıklı guiding.</b>
        Her iki eksende de gürültü yönsüz, eğilim çizgisi düz, düzeltmeler iki
        yöne de dağılmış. Bu grafikte aranacak bir şey yok — RMS değeri seeing
        tarafından belirleniyor. Bu noktadan sonra iyileşme, montürden değil
        gökyüzünden gelir.
      </>
    ),
  },
  polar: {
    ad: 'Kutup hizalama hatası',
    trace: {
      decRate: 2.63,
      raRate: 0,
      seeing: 0.28,
      pe: 0.5,
      guided: false,
      seed: 23,
    },
    v: (
      <>
        <b className="dz-hd dz-mid">Kutup hizalama hatası — ölçüm modunda.</b>
        Bu grafik <b>guiding kapalıyken</b> alınmıştır; PHD2&apos;nin Guiding
        Assistant tam olarak bunu yapar: düzeltme darbelerini keser ve
        yıldızın serbest hareketini ölçer. Bu yüzden alt satırdaki darbe
        kutusu boştur.
        <p>
          İmza nettir: <b>DEC eğilim çizgisi düz bir rampa</b>. Eğim 2.63 ″/dk;
          3.82 ile çarpınca <b>10 yay dakikası</b> hata eder. RA ekseni
          periyodik hatayla salınıyor ama net bir eğilimi yok — bu ayrımın
          kendisi teşhisin parçasıdır.
        </p>
        <p>
          <b>Guiding açıkken</b> aynı hata çok daha sinsi görünür: DEC çizgisi
          düzleşir, geriye yalnızca <em>hep aynı yöne giden düzeltme
          darbeleri</em> kalır. Simülatördeki &quot;Guiding açık / kapalı&quot;
          düğmesiyle ikisini karşılaştırabilirsiniz.
        </p>
      </>
    ),
  },
  backlash: {
    ad: 'DEC boşluğu',
    trace: {
      decRate: 0,
      decOsc: 1.6,
      decOscP: 110,
      raRate: 0,
      seeing: 0.3,
      pe: 0.3,
      guided: true,
      backlash: 1.7,
      minMove: 0.12,
      aggr: 0.85,
      lp: 0.5,
      seed: 31,
    },
    v: (
      <>
        <b className="dz-hd dz-mid">Deklinasyon boşluğu.</b>
        Ayırt edici işaret: sorun yalnızca <b>yön değiştiğinde</b> ortaya
        çıkıyor. Aynı yönde düzeltme yaparken her şey normal; yön dönünce
        montür birkaç kare boyunca hiç tepki vermiyor ve yıldız uzaklaşmaya
        devam ediyor.
        <p>
          Çözüm: Guiding Assistant&apos;ın boşluk testini çalıştırın (önce
          montür yazılımındaki kendi boşluk telafisini kapatın). 3 saniyeden
          uzun boşlukta PHD2 doğrudan <b>tek yönlü guiding&apos;e</b> geçmenizi
          önerir — ve o zaman küçük bir kasıtlı kutup hatası işinize yarar.
        </p>
      </>
    ),
  },
  flex: {
    ad: 'Diferansiyel esneme',
    trace: {
      decRate: 0.06,
      raRate: 0.04,
      seeing: 0.3,
      pe: 0.25,
      guided: true,
      seed: 47,
    },
    v: (
      <>
        <b className="dz-hd dz-bad">
          Diferansiyel esneme — grafiğin yalan söylediği durum.
        </b>
        Gördüğünüz gibi grafik <em>kusursuz</em>. Rehber yıldız yerli yerinde.
        Ama ana kameranızdaki yıldızlar uzamış çıkıyor.
        <p>
          Sebep: rehber teleskop ile ana teleskop birbirine göre kayıyor. PHD2
          rehber kameradaki yıldızı sabit tutuyor, ana kamera ise başka bir
          yere bakıyor. PHD2 kılavuzu bunu düzeltilemeyen hatalar listesine
          koyar.
        </p>
        <p>
          Teşhis: iyi guiding logu + kötü ana kare. Çözüm: bütün bağlantıları
          sıkın, odaklayıcıyı kilitleyin, mümkünse OAG&apos;ye geçin.{' '}
          <b>Bu bir kutup hizalama sorunu değildir</b> — hizalamayı düzelterek
          çözemezsiniz.
        </p>
      </>
    ),
  },
  stiction: {
    ad: 'Sürtünme / salınım',
    trace: {
      decRate: 0,
      decOsc: 1.1,
      decOscP: 95,
      raRate: 0,
      seeing: 0.32,
      pe: 0.3,
      guided: true,
      stiction: 2.4,
      minMove: 0.13,
      aggr: 0.95,
      lp: 0.55,
      seed: 53,
    },
    v: (
      <>
        <b className="dz-hd dz-mid">Sürtünme (stiction) ve salınım.</b>
        Boşluğa benzer ama farkı şu: yön değişiminden sonra önce gecikme,
        ardından <b>aşırı düzeltme</b> geliyor ve sistem salınmaya başlıyor.
        PHD2 kılavuzu bunu deklinasyon salınımlarının en yaygın sebebi sayar
        ve Guiding Asistanı&apos;nın boşluk ile sürtünmeyi her zaman ayırt
        edemeyeceğini söyler.
        <p>
          Çözüm: deklinasyon eksenini gevşetip yağlayın, agresifliği düşürün,
          min-move&apos;u yükseltin.
        </p>
      </>
    ),
  },
  seeing: {
    ad: 'Kötü seeing',
    trace: {
      decRate: 0.05,
      raRate: 0,
      seeing: 1.15,
      pe: 0.4,
      guided: true,
      minMove: 0.08,
      aggr: 0.9,
      seed: 67,
    },
    v: (
      <>
        <b className="dz-hd">Kötü seeing.</b>
        Yüksek frekanslı, yönsüz gürültü. Eğilim çizgisi düz — yani bir
        sürüklenme yok. Montürünüzde bir sorun yok; atmosfer çalkalanıyor.
        <p>
          Bu durumda guiding&apos;i daha agresif yapmak işleri{' '}
          <b>kötüleştirir</b>: guiding seeing gürültüsünü kovalamaya başlar.
          Rehber pozunu uzatın (2 sn → 3–4 sn) ve min-move değerini
          yükseltin. Guiding Assistant bunu zaten önerir.
        </p>
      </>
    ),
  },
};

const ORDER = ['ok', 'polar', 'backlash', 'flex', 'stiction', 'seeing'];

export function GraphReader() {
  const [key, setKey] = useState('ok');
  const c = CASES[key];

  const { trace, st } = useMemo(() => {
    const t = makeTrace({ n: 150, expSec: 2, ...CASES[key].trace });
    return {
      trace: t,
      st: {
        slope: linFit(t.dec).slope * 30,
        raRms: rms(t.ra),
        decRms: rms(t.dec),
        totRms: Math.hypot(rms(t.ra), rms(t.dec)),
      },
    };
  }, [key]);

  return (
    <div className="dz-tool">
      <h4>Teşhis aracı — PHD2 grafiği nasıl okunur?</h4>
      <p className="dz-sub">
        Bir sorun seçin; o sorunun grafikte nasıl göründüğünü ve nasıl ayırt
        edileceğini görün.
      </p>

      {/*
        SEÇİM SATIRI `radiogroup` DEĞİL, DÜĞME SATIRI.

        Altı senaryonun her biri ayrı bir grafik ve ayrı bir metin
        gösteriyor; bu bir form seçimi değil, görünüm değiştirme. Ekran
        okuyucuya durumu `aria-pressed` bildiriyor.
      */}
      <div className="dz-pillrow">
        {ORDER.map((k) => (
          <button
            key={k}
            type="button"
            className={'dz-pill' + (k === key ? ' dz-on' : '')}
            aria-pressed={k === key}
            onClick={() => setKey(k)}
          >
            {CASES[k].ad}
          </button>
        ))}
      </div>

      <div className="dz-phdbox">
        <PhdGraph series={trace} xlabel="5 dakika" />
        <PhdLegend />
      </div>

      <div className="dz-out" aria-live="polite">
        <div className="dz-stat dz-sm">
          <div className="dz-k">Toplam RMS</div>
          <div className="dz-val">
            {st.totRms.toFixed(2)}
            <small>″</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">DEC eğimi</div>
          <div className="dz-val">
            {st.slope.toFixed(2)}
            <small> ″/dk</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">RA RMS</div>
          <div className="dz-val">
            {st.raRms.toFixed(2)}
            <small>″</small>
          </div>
        </div>
        <div className="dz-stat dz-sm">
          <div className="dz-k">DEC RMS</div>
          <div className="dz-val">
            {st.decRms.toFixed(2)}
            <small>″</small>
          </div>
        </div>
      </div>

      <div className="dz-verdict">{c.v}</div>
    </div>
  );
}
