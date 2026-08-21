import { describe, expect, it } from 'vitest';
import type { PhotoWeekRound } from '@/services/content/photoOfWeek';
import { COZUM_YOK, type AstroPhoto } from '@/features/photos/types';
import {
  findCandidateRoundForPhoto,
  photoNominationWeek,
  roundLabel,
} from './photoWeekRoundDates';

function round(input: Partial<PhotoWeekRound>): PhotoWeekRound {
  return {
    id: input.id ?? 'r1',
    isoYear: input.isoYear ?? 2026,
    isoWeek: input.isoWeek ?? 34,
    status: input.status ?? 'aday_toplama',
    opensAt: input.opensAt ?? '2026-08-17T00:00:00Z',
    closesAt: input.closesAt ?? '2026-08-24T00:00:00Z',
    winnerPhotoId: input.winnerPhotoId ?? null,
  };
}

function photo(input: Partial<AstroPhoto>): AstroPhoto {
  return {
    id: input.id ?? 'p1',
    slug: 'p1',
    title: 'NGC 6888',
    description: '',
    type: 'deep-sky',
    palette: 'RGB',
    capturedAt: input.capturedAt ?? '2026-08-20',
    publishedAt: input.publishedAt,
    user: { username: 'astrohub', displayName: 'Astrohub' },
    ownerId: 'u1',
    target: { catalog: 'NGC 6888', name: 'Crescent Nebula', constellation: 'Kuğu' },
    gradient: 'linear-gradient(#000, #111)',
    location: { label: 'Ankara', visibility: 'region' },
    setup: { optic: '', camera: '', mount: '', guiding: '', filters: '' },
    exposures: [],
    processing: { software: [] },
    calibration: {},
    license: '',
    access: { allowDownload: false, watermarkRequired: false },
    likes: 0,
    comments: 0,
    rating: { toplam: 0, sayi: 0 },
    exif: {
      camera: null,
      lens: null,
      iso: null,
      focalMm: null,
      apertureF: null,
      exposureSeconds: null,
      gpsPresent: false,
    },
    captureSessions: [],
    photoOfWeekWins: [],
    editorsPick: false,
    solve: COZUM_YOK,
    year: 2026,
    city: 'Ankara',
  };
}

describe('haftanin fotografi tur tarihleri', () => {
  it('tur etiketini iki basamakli hafta ile yazar', () => {
    expect(roundLabel(round({ isoWeek: 4 }))).toBe('2026-04');
  });

  it('fotoğraf yayın tarihinden aday haftasını bulur', () => {
    expect(
      photoNominationWeek(
        photo({ capturedAt: '2026-08-20', publishedAt: '2026-08-21T10:00:00Z' })
      )
    ).toEqual({
      isoYear: 2026,
      isoWeek: 34,
      label: '2026-34',
    });
  });

  it('yalnızca aynı haftadaki aday toplama turunu otomatik seçer', () => {
    const rounds = [
      round({ id: 'old', isoWeek: 33 }),
      round({ id: 'closed', isoWeek: 34, status: 'oylama' }),
      round({ id: 'target', isoWeek: 34, status: 'aday_toplama' }),
    ];

    expect(findCandidateRoundForPhoto(rounds, photo({}))).toMatchObject({
      id: 'target',
    });
  });
});
