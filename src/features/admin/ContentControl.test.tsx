import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ContentControl } from './ContentControl';
import {
  type ContentEntry,
  type EntryDraft,
  type EntryKind,
} from '@/services/content/entries';

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

vi.mock('@/services/content/entries', async () => {
  const actual = await vi.importActual<typeof import('@/services/content/entries')>(
    '@/services/content/entries'
  );
  return {
    ...actual,
    useEntries: (kind: EntryKind) => ({
      entries: [{ ...entry, kind }],
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
    validateEntry: () => [],
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
});
