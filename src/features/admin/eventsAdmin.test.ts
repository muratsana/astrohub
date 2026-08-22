import { describe, expect, it } from 'vitest';
import {
  describeEventProblem,
  describeEventPublishWarning,
  draftToRow,
  emptyEventDraft,
  rowToDraft,
  type EventDraft,
} from './eventsAdmin';

/**
 * ETKİNLİK FORM KAPISI.
 *
 * Kısıtların aynısı veritabanında da var (`0010_events_sites_marketplace.sql`
 * :97-108). Buradaki kapı ikinci bir güvenlik katmanı DEĞİL — yöneticiye
 * PostgREST'in "violates check constraint events_coords_paired" metni
 * yerine ne yapması gerektiğini söylüyor. Ölçülen şey mesajın çıkıp
 * çıkmadığı.
 */
const gecerli: EventDraft = {
  ...emptyEventDraft(),
  title: 'Uludağ Gözlem Şenliği',
  city: 'Bursa',
  venue: 'Uludağ, Osmangazi',
  organizerName: 'Uludağ Astronomi Topluluğu',
  startsAt: '2026-08-20T20:00',
  description:
    'Uludağ zirvesinde iki gecelik gözlem şenliği; teleskoplar sağlanacak.',
};

describe('describeEventProblem', () => {
  it('geçerli taslak kaydedilebilir', () => {
    expect(describeEventProblem(gecerli)).toBeNull();
  });

  it('tek başına enlem reddediliyor', () => {
    /* Veritabanındaki `events_coords_paired` kısıtının kullanıcıya
       anlaşılır hali: tek enlem haritada sessizce yanlış yere pin koyar. */
    expect(
      describeEventProblem({ ...gecerli, latitude: '40.07' })
    ).toMatch(/birlikte girilmeli/);
    expect(
      describeEventProblem({ ...gecerli, longitude: '29.22' })
    ).toMatch(/birlikte girilmeli/);
  });

  it('birlikte girilen geçerli koordinat kabul ediliyor', () => {
    expect(
      describeEventProblem({
        ...gecerli,
        latitude: '40.070',
        longitude: '29.221',
      })
    ).toBeNull();
  });

  it('aralık dışı koordinat reddediliyor', () => {
    expect(
      describeEventProblem({ ...gecerli, latitude: '95', longitude: '29' })
    ).toMatch(/Enlem/);
    expect(
      describeEventProblem({ ...gecerli, latitude: '40', longitude: '200' })
    ).toMatch(/Boylam/);
  });

  it('bitiş başlangıçtan önce olamaz', () => {
    expect(
      describeEventProblem({ ...gecerli, endsAt: '2026-08-19T20:00' })
    ).toMatch(/sonra olmalı/);
  });

  it('kontenjan pozitif tam sayı olmalı', () => {
    expect(describeEventProblem({ ...gecerli, capacity: '0' })).toMatch(/pozitif/);
    expect(describeEventProblem({ ...gecerli, capacity: '12.5' })).toMatch(/pozitif/);
    expect(describeEventProblem({ ...gecerli, capacity: '120' })).toBeNull();
  });

  it('bozuk adres eki reddediliyor', () => {
    expect(
      describeEventProblem({ ...gecerli, slug: 'Büyük Şenlik' })
    ).toMatch(/adres eki/i);
    expect(
      describeEventProblem({ ...gecerli, slug: 'uludag-senligi-2026' })
    ).toBeNull();
  });

  it('kısa açıklama reddediliyor', () => {
    expect(describeEventProblem({ ...gecerli, description: 'Kısa' })).toMatch(
      /en az 20/
    );
  });

  it('düzenleyen adı zorunlu', () => {
    expect(describeEventProblem({ ...gecerli, organizerName: '' })).toMatch(
      /Düzenleyen/
    );
  });
});

describe('describeEventPublishWarning', () => {
  it('taslakta kaynak aranmıyor', () => {
    expect(describeEventPublishWarning(gecerli)).toBeNull();
  });

  it('yayındaki etkinlikte kaynak adı isteniyor', () => {
    expect(
      describeEventPublishWarning({ ...gecerli, status: 'yayinda' })
    ).toMatch(/kaynak adı/i);
  });

  it('kaynak ve doğrulama tarihi doluysa uyarı yok', () => {
    expect(
      describeEventPublishWarning({
        ...gecerli,
        status: 'yayinda',
        sourceName: 'Topluluk duyurusu',
        sourceLastVerifiedAt: '2026-08-01',
      })
    ).toBeNull();
  });
});

describe('satır ⇄ taslak dönüşümü', () => {
  it('boş koordinat null olarak yazılıyor, sıfır olarak değil', () => {
    /* `Number('')` sıfırdır; kontrolsüz dönüşüm etkinliği Gine
       Körfezi'ne taşırdı. */
    const row = draftToRow(gecerli);
    expect(row.latitude).toBeNull();
    expect(row.longitude).toBeNull();
  });

  it('boş kontenjan ve kaynak null yazılıyor', () => {
    const row = draftToRow(gecerli);
    expect(row.capacity).toBeNull();
    expect(row.source_name).toBeNull();
    expect(row.source_last_verified_at).toBeNull();
  });

  it('kayıt portalı alanları satıra yazılıyor', () => {
    const row = draftToRow({
      ...gecerli,
      registrationPortalEnabled: true,
      registrationPortalLabel: 'Astrohub başvuru',
      registrationPortalNote: 'Katılım notları admin panelden izlenir.',
    });
    expect(row.registration_portal_enabled).toBe(true);
    expect(row.registration_portal_label).toBe('Astrohub başvuru');
    expect(row.registration_portal_note).toBe(
      'Katılım notları admin panelden izlenir.'
    );
  });

  it('adres eki boşsa başlıktan üretiliyor', () => {
    expect(draftToRow(gecerli).slug).toMatch(/^[a-z0-9-]+$/);
  });

  it('bilinmeyen tür ve durum güvenli varsayılana düşüyor', () => {
    const draft = rowToDraft({
      id: 'x',
      slug: 'a',
      title: 'A',
      event_type: 'uydurma-tur',
      status: 'uydurma-durum',
    });
    expect(draft.type).toBe('gozlem-senligi');
    expect(draft.status).toBe('taslak');
  });

  it('dizi alanları eksikken boş dizi oluyor', () => {
    const draft = rowToDraft({ id: 'x', slug: 'a', title: 'A' });
    expect(draft.observedTargets).toEqual([]);
    expect(draft.rules).toEqual([]);
  });

  it('kayıt portalı alanları satırdan okunuyor', () => {
    const draft = rowToDraft({
      id: 'x',
      slug: 'a',
      title: 'A',
      registration_portal_enabled: true,
      registration_portal_label: 'Astrohub kayıt',
      registration_portal_note: 'Kayıt notu.',
    });
    expect(draft.registrationPortalEnabled).toBe(true);
    expect(draft.registrationPortalLabel).toBe('Astrohub kayıt');
    expect(draft.registrationPortalNote).toBe('Kayıt notu.');
  });
});
