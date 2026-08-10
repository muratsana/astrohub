import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ContentControl } from './ContentControl';
import {
  type ContentEntry,
  type EntryDraft,
  type EntryKind,
} from '@/services/content/entries';

const state = vi.hoisted(() => ({
  entries: [] as ContentEntry[],
}));

const entry: ContentEntry = {
  id: 'e1',
  kind: 'haber',
  slug: 'ornek-haber',
  title: 'Örnek Haber',
  summary: 'Özet',
  body: ['Gövde'],
  bodyBlocks: [{ type: 'paragraph', text: 'Gövde' }],
  category: 'kesif',
  publishedAt: '2026-08-10',
  status: 'taslak',
  author: null,
  duration: null,
  level: null,
  tint: null,
  image: null,
  source: null,
  submittedBy: null,
  rejectionReason: null,
  reviewedAt: null,
};

vi.mock('@/features/news/data', () => ({
  newsCategoryLabels: { kesif: 'Keşif' },
  sortedNews: () => [
    {
      slug: 'canli-haber',
      title: 'Canlı Haber',
      category: 'kesif',
      publishedAt: '2026-08-09',
      summary: 'Canlı sitede görünen haber özeti yeterince uzun.',
      body: ['Canlı haber gövdesi'],
      source: { name: 'Astrohub', url: 'https://astrohub.com.tr' },
      tint: '150,185,235',
    },
  ],
}));

vi.mock('@/features/articles/data', () => ({
  articleCategoryLabels: { rehber: 'Rehber' },
  articles: [
    {
      slug: 'canli-yazi',
      title: 'Canlı Yazı',
      category: 'rehber',
      level: 'Başlangıç',
      duration: '10 dk okuma',
      publishedAt: '2026-08-08',
      author: 'Astrohub',
      summary: 'Canlı sitede görünen yazı özeti yeterince uzun.',
      body: ['Canlı yazı gövdesi'],
      tint: '150,185,235',
    },
  ],
}));

vi.mock('@/services/content/entries', async () => {
  const actual = await vi.importActual<typeof import('@/services/content/entries')>(
    '@/services/content/entries'
  );
  return {
    ...actual,
    useEntries: (kind: EntryKind) => ({
      entries: state.entries.map((item) => ({ ...item, kind })),
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
    draftFromEntry: (item: ContentEntry): EntryDraft => ({
      ...actual.EMPTY_DRAFT,
      kind: item.kind,
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      bodyText: item.body.join('\n\n'),
      bodyBlocks: item.bodyBlocks,
      category: item.category,
      publishedAt: item.publishedAt,
      status: item.status,
    }),
    validateEntry: () => null,
  };
});

function renderControl() {
  return render(
    <MemoryRouter>
      <ContentControl canWrite initialKind="haber" />
    </MemoryRouter>
  );
}

describe('ContentControl importer akışı', () => {
  beforeEach(() => {
    state.entries = [{ ...entry }];
  });

  it('importer yeni içerik eklemede görünür', () => {
    renderControl();
    fireEvent.click(screen.getByRole('button', { name: 'Yeni' }));
    expect(
      screen.getByText('Yeni içerik: HTML / Word / PDF içe aktar')
    ).toBeInTheDocument();
  });

  it('importer mevcut içerik düzenlemede görünmez', () => {
    renderControl();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Örnek Haber 2026-08-10 · ornek-haber',
      })
    );
    expect(
      screen.queryByText('Yeni içerik: HTML / Word / PDF içe aktar')
    ).not.toBeInTheDocument();
    expect(screen.getByText('İçerik blokları')).toBeInTheDocument();
  });

  it('veritabanı boşken canlı site tohum içeriklerini listeler', () => {
    state.entries = [];
    renderControl();
    expect(
      screen.getByRole('button', {
        name: 'Canlı Haber 2026-08-09 · canli-haber',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Tohum')).toBeInTheDocument();
  });
});
