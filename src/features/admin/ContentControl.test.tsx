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

vi.mock('@/features/knowledge/glossary', () => ({
  glossaryCategoryLabels: { kosullar: 'Koşullar' },
  glossaryTerms: [
    {
      slug: 'bortle-olcegi',
      title: 'Bortle ölçeği',
      category: 'kosullar',
      summary: 'Gökyüzü karanlığını tarif eden dokuz basamaklı ölçek.',
      body: ['Saha karşılaştırmasında kullanılır.'],
    },
  ],
}));

vi.mock('@/features/knowledge/faq', () => ({
  faqCategoryLabels: { hesap: 'Hesap' },
  faqItems: [
    {
      slug: 'uyelik-ucretli-mi',
      title: 'Astrohub ücretli mi?',
      category: 'hesap',
      summary: 'Hayır. Şu an sitede ödeme alınmıyor.',
      body: ['Standart üyelik ücretsizdir.'],
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

function renderKind(kind: EntryKind) {
  return render(
    <MemoryRouter>
      <ContentControl canWrite initialKind={kind} />
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
        name: 'Düzenle Örnek Haber 2026-08-10 · ornek-haber',
      })
    );
    expect(
      screen.queryByText('Yeni içerik: HTML / Word / PDF içe aktar')
    ).not.toBeInTheDocument();
    expect(screen.getByText('İçerik editörü')).toBeInTheDocument();
    expect(screen.getByText('Kapak görseli')).toBeInTheDocument();
    expect(screen.getByText('Fotoğraf ekle / değiştir')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Görsel ekle' })).toBeInTheDocument();
  });

  it('veritabanı boşken canlı site tohum içeriklerini listeler', () => {
    state.entries = [];
    renderControl();
    expect(
      screen.getByRole('button', {
        name: 'Düzenle Canlı Haber 2026-08-09 · canli-haber',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Tohum')).toBeInTheDocument();
  });

  it('sözlük tohum içeriklerini listeler', () => {
    state.entries = [];
    renderKind('sozluk');
    expect(
      screen.getByRole('button', {
        name: 'Düzenle Bortle ölçeği 2026-08-01 · bortle-olcegi',
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Haberler yönetimi' })).toBeNull();
  });

  it('sss tohum içeriklerini listeler', () => {
    state.entries = [];
    renderKind('sss');
    expect(
      screen.getByRole('button', {
        name: 'Düzenle Astrohub ücretli mi? 2026-08-01 · uyelik-ucretli-mi',
      })
    ).toBeInTheDocument();
  });
});
