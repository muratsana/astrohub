import { describe, expect, it } from 'vitest';
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
    expect(mapListingRow(row({ status: 'sold' })).status).toBe('sold');
    expect(mapListingRow(row({ status: 'archived' })).status).toBe('archived');
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
    expect(isListingPubliclyVisible('active')).toBe(true);
    expect(isListingPubliclyVisible('reserved')).toBe(true);
  });

  it('satılan, taslak ve arşivlenen ilana bağlantı verilmez', () => {
    expect(isListingPubliclyVisible('sold')).toBe(false);
    expect(isListingPubliclyVisible('draft')).toBe(false);
    expect(isListingPubliclyVisible('archived')).toBe(false);
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
