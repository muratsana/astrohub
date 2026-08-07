import { describe, expect, it, vi } from 'vitest';
import {
  isListingPubliclyVisible,
  mapListingRow,
  PUBLIC_LISTING_STATUSES,
} from './listings';

/* eslint-disable @typescript-eslint/no-explicit-any */
function row(over: Record<string, unknown> = {}): any {
  return {
    id: '2f6a1c88-0d3e-4a5b-9c7d-1e2f3a4b5c6d',
    seller_id: 'a1b2c3d4-0000-4000-8000-000000000001',
    slug: 'esprit-100ed-satilik',
    title: 'Sky-Watcher Esprit 100ED',
    category_id: 'teleskop',
    price: '52000',
    city: 'İzmir',
    condition: 'Çok iyi',
    has_invoice: true,
    shipping_ok: true,
    negotiable: false,
    description: 'Az kullanıldı',
    includes: ['Taşıma çantası'],
    status: 'active',
    posted_at: '2026-07-20T09:00:00Z',
    profiles: { username: 'deniz', display_name: 'Deniz K.' },
    equipment_models: { slug: 'sky-watcher-esprit-100ed' },
    listing_photos: null,
    ...over,
  };
}

/**
 * Durum eşlemesi satıcının kendi listesi için taşınıyor: pazaryeri
 * yalnızca yayındakileri gösterdiği için durum uzun süre arayüze hiç
 * gelmiyordu.
 */
describe('mapListingRow — durum', () => {
  it('bilinen durumu taşır', () => {
    expect(mapListingRow(row({ status: 'yayinda' })).status).toBe('yayinda');
    expect(mapListingRow(row({ status: 'arsivlendi' })).status).toBe(
      'arsivlendi'
    );
  });

  /*
   * FAZ 3: satış durumu ayrı eksen. Satılmış ilan YAYINDA kalıyor ve
   * "satıldı" bilgisi `saleState` alanından geliyor — ikisini tek kolonda
   * tutmak, satışı yayından kaldırma gibi göstermek demekti.
   */
  it('satış durumunu ayrı alanda taşır', () => {
    const satilmis = mapListingRow(
      row({ status: 'yayinda', sale_state: 'satildi' })
    );
    expect(satilmis.status).toBe('yayinda');
    expect(satilmis.saleState).toBe('satildi');
  });

  it('tanınmayan satış durumunu uydurmaz', () => {
    expect(
      mapListingRow(row({ status: 'yayinda', sale_state: 'pazarlikta' }))
        .saleState
    ).toBe(undefined);
  });

  /*
   * Tanınmayan durum `undefined` kalıyor. Varsayılan olarak "active"
   * yazmak, satıcıya ilanının yayında olduğunu söylemek olurdu — rozet
   * hiç görünmemesi, yanlış görünmesinden iyi.
   */
  it('tanınmayan durumu uydurmaz', () => {
    expect(mapListingRow(row({ status: 'pending_review' })).status).toBe(
      undefined
    );
  });
});

describe('mapListingRow — ilan görseli', () => {
  it('kapak fotoğrafı olarak en düşük sıralı görseli taşır', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://astrohub.test');
    expect(
      mapListingRow(
        row({
          listing_photos: [
            { storage_path: 'u/l/2.jpg', position: 2 },
            { storage_path: 'u/l/0.jpg', position: 0 },
          ],
        })
      ).imageUrl
    ).toContain('/storage/v1/object/public/listings/u/l/0.jpg');
    vi.unstubAllEnvs();
  });

  it('fotoğraf yoksa görsel adresi uydurmaz', () => {
    expect(mapListingRow(row({ listing_photos: [] })).imageUrl).toBeUndefined();
  });
});

/**
 * Herkese açık sayfası olan durumlar — panelin hangi satırı bağlantı
 * yapacağına bu karar veriyor.
 *
 * `sold` RLS'te okunabilir ama katalog onu ÇEKMİYOR; detay sayfası da
 * kaydı kataloğun içinden aradığı için satılmış ilanın sayfası 404
 * veriyor. Bağlantı yapmak, satıcıyı kendi ilanından 404'e göndermek
 * olurdu.
 */
describe('isListingPubliclyVisible', () => {
  it('yayındaki ve rezerve ilanın sayfası var', () => {
    expect(isListingPubliclyVisible('yayinda')).toBe(true);
    expect(isListingPubliclyVisible('yayinda', 'rezerve')).toBe(true);
  });

  /*
   * FAZ 3'ten sonra satılmış ilan da `yayinda` — satış durumu ayrı
   * kolonda. Kullanıcının gördüğü davranış DEĞİŞMEDİ: katalog satılmışı
   * elediği için detay sayfası yine yok.
   */
  it('satılan, taslak ve arşivlenen ilana bağlantı verilmez', () => {
    expect(isListingPubliclyVisible('yayinda', 'satildi')).toBe(false);
    expect(isListingPubliclyVisible('taslak')).toBe(false);
    expect(isListingPubliclyVisible('arsivlendi')).toBe(false);
  });

  /* Tohum ilanlarda durum yok ve onların sayfası var. */
  it('durumu olmayan kaydı tıklanabilir sayar', () => {
    expect(isListingPubliclyVisible(undefined)).toBe(true);
  });

  it('katalog süzgeciyle aynı kümeden besleniyor', () => {
    for (const status of PUBLIC_LISTING_STATUSES) {
      expect(isListingPubliclyVisible(status)).toBe(true);
    }
  });
});
