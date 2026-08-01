import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { useExplorer } from './useExplorer';
import { byText, type ExplorerSpec } from './query';

/**
 * DATA EXPLORER BAĞLAMASI (Faz 4).
 *
 * Saf mantık `query.test.ts` içinde ölçülüyor. Burada yalnızca React'e
 * bağlanan iki davranış var ve ikisi de yalnızca gerçek bir render
 * ağacında görünür: gecikme ve URL senkronu.
 */

interface Kayit {
  ad: string;
  tur: string;
}

const spec: ExplorerSpec<Kayit> = {
  searchFields: (i) => [i.ad],
  facets: [{ param: 'tur', label: 'Tür', valueOf: (i) => i.tur }],
  sorts: [{ value: 'ad', label: 'Ad', compare: byText((i) => i.ad) }],
  defaultSort: 'ad',
};

const veri: Kayit[] = [
  { ad: 'Iğdır', tur: 'a' },
  { ad: 'Çankırı', tur: 'b' },
  { ad: 'Ankara', tur: 'a' },
];

function Prob() {
  const ex = useExplorer(veri, spec);
  const loc = useLocation();
  return (
    <div>
      <input
        aria-label="ara"
        value={ex.searchInput}
        onChange={(e) => ex.setSearch(e.target.value)}
      />
      <button onClick={() => ex.toggleFacet('tur', 'a')}>tür-a</button>
      <button onClick={ex.clearAll}>temizle</button>
      <p data-testid="sonuc">{ex.items.map((i) => i.ad).join(',')}</p>
      <p data-testid="sayi">{ex.total}</p>
      <p data-testid="url">{loc.search}</p>
      <p data-testid="chip">{ex.chips.map((c) => c.label).join('|')}</p>
    </div>
  );
}

const kur = (baslangic = '/') =>
  render(
    <MemoryRouter initialEntries={[baslangic]}>
      <Prob />
    </MemoryRouter>
  );

const oku = (id: string) => screen.getByTestId(id).textContent;

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe('arama gecikmesi', () => {
  /*
   * KUTU HEMEN, SORGU GEÇ. Tek değer olsaydı ya kutu takılırdı ya da her
   * harf bir URL yazımı üretirdi.
   */
  it('kutu anında güncelleniyor, sonuç gecikmeli', () => {
    kur();
    const kutu = screen.getByLabelText('ara');

    fireEvent.change(kutu, { target: { value: 'igdir' } });
    expect((kutu as HTMLInputElement).value).toBe('igdir');
    /* Henüz süzülmedi. */
    expect(oku('sayi')).toBe('3');

    act(() => void vi.advanceTimersByTime(300));
    expect(oku('sonuc')).toBe('Iğdır');
    expect(oku('sayi')).toBe('1');
  });

  /*
   * Hızlı yazan biri her harfte bir URL yazımı tetiklememeli; yalnızca
   * SON değer yazılmalı.
   */
  it('ardışık tuşlarda yalnızca son değer uygulanıyor', () => {
    kur();
    const kutu = screen.getByLabelText('ara');

    for (const v of ['i', 'ig', 'igd', 'igdir']) {
      fireEvent.change(kutu, { target: { value: v } });
      act(() => void vi.advanceTimersByTime(100));
    }
    act(() => void vi.advanceTimersByTime(300));

    expect(oku('url')).toBe('?ara=igdir');
    expect(oku('sonuc')).toBe('Iğdır');
  });
});

describe('URL senkronu', () => {
  it('facet seçimi URL\'ye yazılıyor', () => {
    kur();
    fireEvent.click(screen.getByText('tür-a'));
    expect(oku('url')).toBe('?tur=a');
    expect(oku('sonuc')).toBe('Ankara,Iğdır');
  });

  /*
   * PAYLAŞILAN BAĞLANTI AÇILINCA FİLTRE UYGULANMIŞ GELMELİ — `useState`
   * ile tutulan eski durumda bu mümkün değildi.
   */
  it('parametreli adresle açılınca filtre uygulanmış geliyor', () => {
    kur('/?ara=cankiri');
    expect(oku('sonuc')).toBe('Çankırı');
    expect((screen.getByLabelText('ara') as HTMLInputElement).value).toBe('cankiri');
  });

  it('aktif filtreler chip olarak listeleniyor', () => {
    kur('/?ara=van&tur=a');
    expect(oku('chip')).toBe('"van"|Tür: a');
  });

  /*
   * "Hepsini temizle" arama kutusunu da boşaltmalı. Yalnızca sorguyu
   * temizleseydi kutuda eski terim kalır ve kullanıcı filtrenin hâlâ
   * uygulandığını sanardı.
   */
  it('hepsini temizle kutuyu da boşaltıyor', () => {
    kur('/?ara=cankiri&tur=b');
    fireEvent.click(screen.getByText('temizle'));

    expect((screen.getByLabelText('ara') as HTMLInputElement).value).toBe('');
    expect(oku('url')).toBe('');
    expect(oku('sayi')).toBe('3');
  });

  /*
   * Explorer dışı parametre korunmalı: aynı sayfada başka bir özellik
   * URL kullanıyor olabilir.
   */
  it('yabancı parametre filtre değişiminde kayboluyor değil', () => {
    kur('/?gece=2026-08-05');
    fireEvent.click(screen.getByText('tür-a'));
    expect(oku('url')).toContain('gece=2026-08-05');
    expect(oku('url')).toContain('tur=a');
  });
});
