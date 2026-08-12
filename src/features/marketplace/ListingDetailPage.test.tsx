import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ListingDetailPage } from './ListingDetailPage';
import { relatedListings, type Listing } from './data';

/**
 * İLAN DETAY SAYFASI — "yol bulunamadı" hatası (plan FAZ 16.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖLÇÜLEN HATA
 *
 * Sayfa ilanı `data.ts` içindeki STATİK listeden buluyordu. Kullanıcının
 * yayımladığı ilan veritabanına yazılıyor, pazaryeri listesinde
 * görünüyor, ama detay adresine gidildiğinde 404 çıkıyordu. Canlıda
 * yeniden üretildi: `/ilan/200-ah-lifepo4-...-lqm6y` → "Sayfa Bulunamadı",
 * ilan ise veritabanında `yayinda` durumunda duruyordu.
 *
 * Bu testin varlık sebebi hatayı yakalamak değil, GERİ GELMESİNİ
 * engellemek: biri kancayı tekrar statik aramayla değiştirirse test
 * düşer.
 */

const ORNEK: Listing = {
  id: 'x1',
  slug: 'veritabanindaki-ilan',
  title: 'Veritabanından gelen ilan',
  category: 'optik-tup',
  price: 25000,
  currency: 'TRY',
  city: 'Ankara',
  condition: 'İyi',
  hasInvoice: false,
  shippingOk: true,
  negotiable: true,
  description: 'Açıklama metni yeterince uzun olmalı ki gerçekçi olsun.',
  includes: [],
  status: 'yayinda',
  postedAt: '2026-08-10T10:00:00Z',
  seller: { username: 'deneme', displayName: 'Deneme', verified: false, rating: 0 },
} as unknown as Listing;

let bulunan: Listing | null = ORNEK;
let yukleniyor = false;

/* Sayfa oturum bağlamına dokunuyor (mesaj/şikâyet düğmeleri); test
   gerçek sağlayıcıyı kurmadan çalışsın diye kanca sahteleniyor. */
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: null, loading: false, configured: false }),
}));

vi.mock('@/services/content/listings', () => ({
  useListingBySlug: () => ({ listing: bulunan, loading: yukleniyor, error: null }),
}));

function ciz(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/ilan/${slug}`]}>
      <Routes>
        <Route path="/ilan/:slug" element={<ListingDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  bulunan = ORNEK;
  yukleniyor = false;
});

describe('ilan detayı', () => {
  it('statik listede OLMAYAN ilanı veritabanından çizer', async () => {
    /* Slug bilerek tohumda yok: eski davranışta bu 404 verirdi. */
    ciz('veritabanindaki-ilan');
    expect(
      await screen.findByText('Veritabanından gelen ilan')
    ).toBeInTheDocument();
  });

  it('yüklenirken 404 göstermez', () => {
    /* Sorgu bir tur sürüyor; o sırada "bulunamadı" demek var olan bir
       ilanı yok gibi gösterir ve kullanıcı sayfayı kapatır. */
    bulunan = null;
    yukleniyor = true;
    ciz('veritabanindaki-ilan');
    expect(screen.queryByText(/Sayfa Bulunamadı/i)).not.toBeInTheDocument();
    expect(screen.getByText(/yükleniyor/i)).toBeInTheDocument();
  });

  it('puanlanmamış satıcıyı "0.0 / 5" diye göstermez', async () => {
    /* Veritabanından gelen her satıcının puanı 0 (puanlama henüz
       üretilmiyor). "0.0 / 5" yazmak yeni satıcıyı kötü puanlı
       gösteriyordu. */
    ciz('veritabanindaki-ilan');
    expect(await screen.findByText(/Henüz değerlendirme yok/)).toBeInTheDocument();
    expect(screen.queryByText('0.0 / 5')).not.toBeInTheDocument();
  });

  it('gerçekten yoksa 404 çizer', () => {
    bulunan = null;
    yukleniyor = false;
    ciz('olmayan-ilan');
    expect(screen.getByText(/Sayfa Bulunamadı/i)).toBeInTheDocument();
  });
});

describe('benzer ilanlar', () => {
  it('sadece kategori aynı diye alakasız ilan önermez', () => {
    const enerjiSistemi = {
      ...ORNEK,
      slug: '200-ah-lifepo4-gunes-enerji-sistemi',
      title: '200 Ah Lifepo4 Güneş Enerji Sistemi Komple Set',
      description:
        'Outdo Huawei Lifepo4 akü, Tommatech inverter, MPPT şarj kontrolcü ve güneş paneli girişi.',
      category: 'optik-tup',
      equipmentSlug: undefined,
    } as Listing;

    expect(relatedListings(enerjiSistemi)).toEqual([]);
  });
});
