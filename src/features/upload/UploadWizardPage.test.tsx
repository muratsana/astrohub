import { describe, expect, it } from 'vitest';
import type { AstroPhoto } from '@/features/photos/types';
import { COZUM_YOK, PHOTO_LICENSE } from '@/features/photos/types';
import { wizardStateFromPhoto } from './uploadWizardEditState';

const photo: AstroPhoto = {
  id: 'photo-1',
  ownerId: 'user-1',
  slug: 'andromeda',
  title: 'Andromeda Galaxy',
  target: {
    catalog: 'M 31',
    name: 'Andromeda Galaksisi',
    constellation: 'And',
  },
  type: 'deep-sky',
  user: { username: 'muratsana', displayName: 'Murat Sana' },
  description: 'İki gecelik LRGB denemesi.',
  gradient: 'from-slate-900 to-black',
  image: {
    url: 'https://example.com/display.jpg',
    thumbUrl: 'https://example.com/thumb.jpg',
    credit: 'Murat Sana',
    licence: PHOTO_LICENSE,
  },
  capturedAt: '2026-08-01',
  captureSessions: [{ id: 'c1', startsOn: '2026-08-01', endsOn: '2026-08-02' }],
  location: { label: 'Beyağaç / Denizli', visibility: 'region' },
  city: 'Denizli',
  district: 'Beyağaç',
  setup: {
    optic: '130mm APO',
    camera: 'ZWO ASI2600MM Pro',
    mount: 'Losmandy G11T',
    filters: 'LRGB',
    guiding: 'OAG',
  },
  exposures: [{ filter: 'L', frames: 22, exposureSeconds: 180 }],
  palette: 'LRGB',
  processing: { software: ['PixInsight'], aiDeclared: false },
  license: PHOTO_LICENSE,
  solve: COZUM_YOK,
  likes: 0,
  comments: 0,
  rating: { toplam: 0, sayi: 0 },
  year: 2026,
};

describe('wizardStateFromPhoto', () => {
  it('mevcut fotoğrafı koruyacak edit state üretir', () => {
    const state = wizardStateFromPhoto(photo);

    expect(state.fileName).toBe('Mevcut fotoğraf');
    expect(state.targetSlug).toBe('m31-andromeda');
    expect(state.targetKind).toBe('galaksi');
    expect(state.title).toBe('Andromeda Galaxy');
    expect(state.description).toBe(photo.description);
    expect(state.captureSessions).toEqual(photo.captureSessions);
    expect(state.city).toBe('Denizli');
    expect(state.district).toBe('Beyağaç');
    expect(state.optic).toBe('130mm APO');
    expect(state.camera).toBe('ZWO ASI2600MM Pro');
    expect(state.mount).toBe('Losmandy G11T');
    expect(state.setupFilter).toBe('LRGB');
    expect(state.setupGuide).toBe('OAG');
    expect(state.exposures).toEqual(photo.exposures);
    expect(state.palette).toBe('LRGB');
    expect(state.software).toBe('PixInsight');
    expect(state.copyrightConfirmed).toBe(true);
  });

  it('paketlenmiş listede olmayan veritabanı hedefini düzenlemede kaybetmez', () => {
    const uzakHedefli: AstroPhoto = {
      ...photo,
      title: 'V398 Cyg çalışması',
      target: {
        slug: 'v398-cyg',
        catalog: 'V398 Cyg',
        name: 'V398 Cyg',
        constellation: 'Cyg',
        kind: 'yildiz',
      },
      type: 'deep-sky',
    };

    const state = wizardStateFromPhoto(uzakHedefli);

    expect(state.targetSlug).toBe('v398-cyg');
    expect(state.targetKind).toBe('yildiz');
    expect(state.selectedTarget?.catalog).toBe('V398 Cyg');
    expect(state.title).toBe('V398 Cyg çalışması');
  });
});
