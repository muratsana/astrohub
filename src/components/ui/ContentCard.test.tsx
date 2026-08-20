import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { CARD_RATIO } from './cardRatios';
import {
  ContentCard,
  ContentCardActions,
  ContentCardBody,
  ContentCardMedia,
  ContentCardSkeleton,
  ContentCardSkeletonGrid,
  ContentCardTitle,
} from './ContentCard';

/**
 * BİRLEŞİK KART AİLESİ (Faz 2.2).
 *
 * Bu dosyanın iki işi var:
 *   1. Kartın davranışını ölçmek (aşağıdaki `describe`lar).
 *   2. AİLENİN DAĞILMASINI ENGELLEMEK — son `describe`, kaynakta kart
 *      kökünün yeniden elle yazılmasını ve kayıt dışı en-boy oranı
 *      eklenmesini yakalar. Asıl koruma o; bileşen testi tek başına
 *      birinin yarın kendi kartını yazmasını engellemez.
 */

const src = resolve(__dirname, '../..');

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

const sources = tsxFiles(src).map((path) => ({
  path: relative(src, path).replace(/\\/g, '/'),
  text: readFileSync(path, 'utf8'),
}));

const wrap = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ContentCard kökü', () => {
  it('bağlantı verilince gezinilebilir bir bağlantı çiziyor', () => {
    wrap(
      <ContentCard to="/foto/1" ariaLabel="Orion Bulutsusu">
        <ContentCardBody>
          <ContentCardTitle>Orion</ContentCardTitle>
        </ContentCardBody>
      </ContentCard>
    );
    const link = screen.getByRole('link', { name: 'Orion Bulutsusu' });
    expect(link).toHaveAttribute('href', '/foto/1');
  });

  /*
   * Tıklanmayan kart da AYNI çerçeveyi taşımalı. Ayrı bir kap kullanılsaydı
   * bağlantısız kart görsel olarak başka bir aileye düşerdi — belgedeki
   * "kartlar içerikleri farklı olsa bile aynı görsel aileye ait
   * görünmelidir" kuralının ihlali.
   */
  it('bağlantısız kart da aynı kök sınıfı taşıyor', () => {
    const { container: withLink } = wrap(
      <ContentCard to="/x">
        <span>a</span>
      </ContentCard>
    );
    const { container: plain } = wrap(
      <ContentCard>
        <span>a</span>
      </ContentCard>
    );

    const shared = ['rounded-card', 'border-border', 'bg-surface-1'];
    for (const cls of shared) {
      expect(withLink.firstElementChild?.className, cls).toContain(cls);
      expect(plain.firstElementChild?.className, cls).toContain(cls);
    }
    expect(plain.firstElementChild?.tagName).toBe('DIV');
  });

  it('ızgara varyantı hücreyle birlikte geriliyor', () => {
    /* `h-full` olmadan CSS grid kartı germez ve aynı satırdaki kartlar
       farklı yükseklikte kalır (bkz. CardGrid yorumu). */
    const { container } = wrap(
      <ContentCard>
        <span>a</span>
      </ContentCard>
    );
    expect(container.firstElementChild?.className).toContain('h-full');
  });
});

describe('ContentCardMedia', () => {
  it('üç kayıtlı orandan birini uyguluyor', () => {
    const { container } = wrap(
      <ContentCardMedia ratio="square">
        <img alt="" />
      </ContentCardMedia>
    );
    expect(container.querySelector('.aspect-square')).not.toBeNull();
  });

  /*
   * Oran kutuyu görsel inmeden ÖNCE ayırır. Varsayılanı kaldırıp
   * "oransız" bir yol açmak, sessizce düzen kayması (CLS) üretir.
   */
  it('oran verilmezse standart orana düşüyor, oransız kalmıyor', () => {
    const { container } = wrap(
      <ContentCardMedia>
        <img alt="" />
      </ContentCardMedia>
    );
    expect(container.querySelector('[class*="aspect-"]')).not.toBeNull();
  });

  it('rozet, işaret ve görüş alanı yuvalarını taşıyor', () => {
    wrap(
      <ContentCardMedia badge={<i>DU</i>} flag={<b>Editör</b>} fieldOfView="3.1° × 2.1°">
        <img alt="" />
      </ContentCardMedia>
    );
    expect(screen.getByText('DU')).toBeInTheDocument();
    expect(screen.getByText('Editör')).toBeInTheDocument();
    expect(screen.getByText('3.1° × 2.1°')).toBeInTheDocument();
  });
});

describe('başlık taşması', () => {
  it('tek satırlık başlık kesiliyor', () => {
    const { container } = wrap(<ContentCardTitle>Çok uzun bir başlık</ContentCardTitle>);
    expect(container.firstElementChild?.className).toContain('truncate');
  });

  /*
   * İki satıra izin verilen yerde YER AYRILIYOR. Ayrılmasaydı tek satırlık
   * başlık taşıyan kart, iki satırlık komşusundan kısa çıkar ve ızgara
   * kırılırdı.
   */
  it('iki satırlık başlıkta yükseklik önceden ayrılıyor', () => {
    const { container } = wrap(<ContentCardTitle lines={2}>Uzun</ContentCardTitle>);
    const cls = container.firstElementChild?.className ?? '';
    expect(cls).toContain('line-clamp-2');
    expect(cls).toContain('min-h-[2lh]');
  });
});

describe('aksiyon bölgesi', () => {
  it('kartın altına yapışıyor', () => {
    /* `mt-auto` olmadan kısa içerikli kartın düğmeleri ortada asılı kalır
       ve komşu kartın düğmeleriyle hizalanmaz. */
    const { container } = wrap(<ContentCardActions>x</ContentCardActions>);
    expect(container.firstElementChild?.className).toContain('mt-auto');
  });
});

describe('iskelet', () => {
  it('kartla aynı kökü ve aynı oranı kullanıyor', () => {
    const { container: card } = wrap(
      <ContentCard>
        <ContentCardMedia ratio="square">
          <img alt="" />
        </ContentCardMedia>
      </ContentCard>
    );
    const { container: skeleton } = wrap(<ContentCardSkeleton ratio="square" />);

    for (const cls of ['rounded-card', 'border-border', 'bg-surface-1', 'h-full']) {
      expect(skeleton.firstElementChild?.className, cls).toContain(cls);
    }
    /* Oran ikisinde de aynı sınıftan geliyor; ayrı yazılsalardı ilk
       değişiklikte ayrışır ve iskelet kart gibi görünmezdi. */
    expect(card.querySelector('.aspect-square')).not.toBeNull();
    expect(skeleton.querySelector('.aspect-square')).not.toBeNull();
  });

  /*
   * Ekran okuyucu yer tutucu blokları okumamalı — "boş boş boş" diye
   * ilerler ve kullanıcı listenin geldiğini anlamaz.
   */
  it('ekran okuyucuya görünmüyor', () => {
    const { container } = wrap(<ContentCardSkeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden');
  });

  it('ızgara iskeleti istenen sayıda hücre üretiyor', () => {
    const { container } = wrap(
      <ul>
        <ContentCardSkeletonGrid count={7} />
      </ul>
    );
    expect(container.querySelectorAll('li')).toHaveLength(7);
  });
});

/**
 * ═════════════════════════════════════════════════════════════════════
 * DAĞILMA TELİ
 * ═════════════════════════════════════════════════════════════════════
 *
 * Aşağıdaki iki test bileşeni değil, KAYNAĞI ölçüyor. Bileşen testleri
 * `ContentCard`ın doğru çalıştığını gösterir ama kimsenin yarın kendi
 * kartını elle yazmayacağını göstermez — sorun tam olarak buydu.
 */
describe('kart ailesi dağılmıyor', () => {
  /*
   * Kart kökü ONDAN FAZLA dosyada birebir kopyalanmıştı. Yeni bir kopya
   * eklenirse burada düşer.
   */
  it('kart kökü başka dosyada yeniden yazılmıyor', () => {
    const IZINLI = new Set(['components/ui/ContentCard.tsx']);

    const kopyalar = sources.filter(({ path, text }) => {
      if (IZINLI.has(path)) return false;
      /*
       * İmza: `group` + kart yüzeyi + kart kenarı + kart hover'ı.
       *
       * `group` imzanın parçası çünkü kartı DÜĞMEDEN ayıran şey o: kart
       * hover'da içindeki başlığı da renklendirir, düğme kendinden başka
       * bir şeyi etkilemez. Google giriş düğmesi ve konum seçici aynı
       * yüzey sınıflarını taşıyor ama kart değiller.
       */
      return /group[^"'`]*rounded-card[^"'`]*border-border[^"'`]*bg-surface-1[^"'`]*hover:border-border-strong/.test(
        text
      );
    });

    expect(
      kopyalar.map((k) => k.path),
      'Bu dosyalar kart kökünü elle yazıyor; ContentCard kullanmalılar'
    ).toEqual([]);
  });

  /*
   * Kayıt dışı en-boy oranı = kart ailesinin çatlaması. Altı orandan üçe
   * inildi; dördüncüsü eklenecekse önce `CARD_RATIO`ya ve gerekçesiyle
   * birlikte ContentCard'ın başlığındaki nota girmeli.
   */
  it('kart görsellerinde kayıt dışı en-boy oranı yok', () => {
    const kayitli = new Set(Object.values(CARD_RATIO));
    /* Kart olmayan, tek seferlik yerler: tam sayfa hero'lar, takvim
       hücresi, hesaplayıcı önizlemesi, video oynatıcı. Bunlar ızgara
       kartı değil; kart ailesi kuralı onları bağlamıyor. */
    const KART_DISI = new Set([
      'components/RouteFallback.tsx',
      'features/sky/DarkCalendarPage.tsx',
      'features/calculators/MosaicPlannerPage.tsx',
      'features/upload/UploadWizardPage.tsx',
      'features/events/EventDetailPage.tsx',
      'features/events/EventMapPage.tsx',
      'features/observing-sites/SiteDetailPage.tsx',
      'features/news/NewsDetailPage.tsx',
      'features/targets/TargetDetailPage.tsx',
      'features/tv/TvPage.tsx',
      /* Yazının içine gömülen video. `TvPage` ile aynı gerekçe: oranı
         kart ailesi değil YouTube belirliyor — 16:9 dışında bir orana
         zorlarsak oynatıcı kendi içinde siyah bant bırakır. */
      'components/content/BlockRenderer.tsx',
      /* Tam ekran görüntüleyici — ızgara karosu değil, tek bir görselin
         kendisi. Oranı ekranı doldurmak için seçiliyor. */
      'features/photos/PhotoViewer.tsx',
    ]);

    const kacaklar: string[] = [];
    for (const { path, text } of sources) {
      if (KART_DISI.has(path)) continue;
      for (const m of text.matchAll(/aspect-(?:\[[^\]]+\]|square|video)/g)) {
        if (!kayitli.has(m[0])) kacaklar.push(`${path}: ${m[0]}`);
      }
    }

    expect(kacaklar, 'Kayıt dışı oran — CARD_RATIO kullanılmalı').toEqual([]);
  });
});
