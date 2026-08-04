import { describe, expect, it } from 'vitest';
import { mapThreadRow, threadSlug } from './forum';
import {
  forumCategories,
  forumCategoryOrder,
  filterThreads,
  sortThreads,
  type ForumThread,
} from '@/features/forum/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
function row(over: Record<string, unknown> = {}): any {
  return {
    id: 'e5b1c2d3-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
    slug: 'phd2-guide-hatasi-a1b2c',
    title: 'PHD2 guide hatası meridyen sonrası ikiye katlanıyor',
    body: 'EQ6-R Pro, 8" Newton, OAG…',
    category_id: 'ekipmanlar',
    created_at: '2026-07-20T18:00:00Z',
    last_activity_at: '2026-07-21T09:00:00Z',
    reply_count: 2,
    view_count: 140,
    pinned: false,
    locked: false,
    solution_post_id: null,
    labels: [],
    profiles: { username: 'mert_astro', display_name: 'Mert Yılmaz' },
    forum_posts: [],
    ...over,
  };
}

describe('threadSlug', () => {
  it('Türkçe karakterleri ASCII karşılığına çevirir', () => {
    // Adres çubuğunda yüzde kodlaması okunmuyor ve paylaşılan bağlantı
    // anlamsız görünüyordu.
    expect(threadSlug('Işık kirliliği ölçümü', 'a1b2c')).toBe(
      'isik-kirliligi-olcumu-a1b2c'
    );
  });

  it('noktalama ve fazla tireyi temizler', () => {
    expect(threadSlug('Yardım!! PHD2 --- hata???', 'xyz12')).toBe(
      'yardim-phd2-hata-xyz12'
    );
  });

  it('uzun başlığı kısaltır ama son eki korur', () => {
    const slug = threadSlug('a'.repeat(200), 'zzzzz');
    expect(slug.endsWith('-zzzzz')).toBe(true);
    expect(slug.length).toBeLessThanOrEqual(70);
  });

  it('boş başlıkta bile geçerli bir adres üretir', () => {
    // Doğrulama başlığı zaten reddediyor ama slug üreticisi kendi
    // başına da bozuk bir değer döndürmemeli.
    expect(threadSlug('!!!', 'q1w2e')).toBe('konu-q1w2e');
  });
});

describe('forum kategorileri', () => {
  it('sekiz ana başlıkla sınırlı kalır', () => {
    expect(forumCategoryOrder.map((id) => forumCategories[id].name)).toEqual([
      'Ekipmanlar',
      'Yazılımlar',
      'Görüntü İşleme',
      'Etkinlikler',
      'Topluluklar',
      'Bilimsel Çalışmalar',
      'Radyo Astronomi',
      'Astro Kampçılık',
    ]);
  });
});

describe('mapThreadRow', () => {
  it('yanıtları tarih sırasına dizer', () => {
    const thread = mapThreadRow(
      row({
        forum_posts: [
          {
            id: 'p2',
            body: 'ikinci',
            created_at: '2026-07-21T09:00:00Z',
            profiles: null,
          },
          {
            id: 'p1',
            body: 'birinci',
            created_at: '2026-07-20T20:00:00Z',
            profiles: { username: 'a', display_name: 'A' },
          },
        ],
      })
    );
    expect(thread.replies.map((r) => r.body)).toEqual(['birinci', 'ikinci']);
  });

  it('çözüm işaretini yalnızca doğru yanıta koyar', () => {
    const thread = mapThreadRow(
      row({
        solution_post_id: 'p1',
        forum_posts: [
          { id: 'p1', body: 'çözüm', created_at: '2026-07-20T20:00:00Z', profiles: null },
          { id: 'p2', body: 'değil', created_at: '2026-07-21T09:00:00Z', profiles: null },
        ],
      })
    );
    expect(thread.replies[0].solution).toBe(true);
    expect(thread.replies[1].solution).toBeUndefined();
    expect(thread.solved).toBe(true);
  });

  it('bilinmeyen kategoriyi ilk kategoriye çeker', () => {
    // Konuyu listeden tamamen düşürmek, yanlış rozet göstermekten kötü.
    expect(mapThreadRow(row({ category_id: 'uydurma' })).category).toBe(
      'ekipmanlar'
    );
  });

  it('profil yoksa konuyu düşürmez', () => {
    const thread = mapThreadRow(row({ profiles: null }));
    expect(thread.author.username).toBe('bilinmiyor');
    expect(thread.title).toContain('PHD2');
  });

  it('kilitli ve sabit bayraklarını yalnızca doğruyken taşır', () => {
    // `false` yerine `undefined`: arayüz `pinned &&` ile rozet çiziyor ve
    // açık bir `false` da aynı işi görürdü, ama tip "yok" ile "kapalı"yı
    // ayırt ediyor ve tohum kayıtlar da aynı biçimi kullanıyor.
    const plain = mapThreadRow(row());
    expect(plain.pinned).toBeUndefined();
    expect(plain.locked).toBeUndefined();

    const flagged = mapThreadRow(row({ pinned: true, locked: true }));
    expect(flagged.pinned).toBe(true);
    expect(flagged.locked).toBe(true);
  });
});

/* ══════════════════════ Rozetler ══════════════════════ */

describe('mapThreadRow — rozetler', () => {
  it('tanınmayan rozeti eler', () => {
    // Kolon `text[]`; eski bir satır ya da elle düzenleme listede olmayan
    // bir değer taşıyabilir. Ham geçirmek arayüzde boş rozet kutusuna
    // dönüşüyordu.
    const thread = mapThreadRow(row({ labels: ['soru', 'uydurma'] }));
    expect(thread.labels).toEqual(['soru']);
  });

  it('rozet yoksa alanı hiç koymaz', () => {
    expect(mapThreadRow(row({ labels: [] })).labels).toBeUndefined();
    expect(mapThreadRow(row({ labels: null })).labels).toBeUndefined();
  });

  it('üçten fazla rozeti kırpar', () => {
    const thread = mapThreadRow(
      row({ labels: ['soru', 'rehber', 'inceleme', 'tavsiye'] })
    );
    expect(thread.labels).toHaveLength(3);
  });
});

/* ══════════════════════ Sıralama ve filtre ══════════════════════ */

function thread(over: Partial<ForumThread> = {}): ForumThread {
  return {
    id: 'x',
    slug: 'x',
    title: 'Başlık',
    category: 'ekipmanlar',
    author: { username: 'a', displayName: 'A' },
    createdAt: '2026-01-01T00:00:00Z',
    lastActivityAt: '2026-01-01T00:00:00Z',
    replyCount: 0,
    viewCount: 0,
    body: 'metin',
    replies: [],
    ...over,
  };
}

describe('sortThreads', () => {
  const eski = thread({ id: 'eski', createdAt: '2026-01-01T00:00:00Z' });
  const yeni = thread({ id: 'yeni', createdAt: '2026-06-01T00:00:00Z' });

  it('en yeni tarihli açılış sırasına göre sıralar', () => {
    expect(sortThreads([eski, yeni], 'en-yeni').map((t) => t.id)).toEqual([
      'yeni',
      'eski',
    ]);
  });

  it('en eski tarihli sırayı ters çevirir', () => {
    expect(sortThreads([yeni, eski], 'en-eski').map((t) => t.id)).toEqual([
      'eski',
      'yeni',
    ]);
  });

  it('sabitlenmiş konu seçilen sıralamadan bağımsız üstte kalır', () => {
    // Sabitleme bir sıralama tercihi değil, moderasyon kararı: "en eski"
    // seçilince duyurunun listenin ortasına düşmesi sabitlemeyi anlamsız
    // kılardı.
    const sabit = thread({
      id: 'sabit',
      pinned: true,
      createdAt: '2026-12-01T00:00:00Z',
    });
    expect(
      sortThreads([eski, yeni, sabit], 'en-eski').map((t) => t.id)
    ).toEqual(['sabit', 'eski', 'yeni']);
  });

  it('bozuk tarihte geçerli kayıtların sırasını bozmaz', () => {
    const bozuk = thread({ id: 'bozuk', createdAt: 'tarih-değil' });
    expect(
      sortThreads([yeni, bozuk, eski], 'en-yeni').map((t) => t.id)
    ).toEqual(['yeni', 'eski', 'bozuk']);
  });

  it('girdi dizisini değiştirmez', () => {
    const input = [eski, yeni];
    sortThreads(input, 'en-yeni');
    expect(input.map((t) => t.id)).toEqual(['eski', 'yeni']);
  });
});

describe('filterThreads', () => {
  const soru = thread({ id: 'soru', labels: ['soru'] });
  const rehber = thread({ id: 'rehber', labels: ['rehber', 'duyuru'] });
  const rozetsiz = thread({ id: 'rozetsiz' });

  it('rozete göre süzer', () => {
    expect(
      filterThreads([soru, rehber, rozetsiz], { label: 'duyuru' }).map(
        (t) => t.id
      )
    ).toEqual(['rehber']);
  });

  it('rozet süzgeci yokken hepsini döndürür', () => {
    expect(filterThreads([soru, rehber, rozetsiz], {})).toHaveLength(3);
  });

  it('aramada rozet ve kategori adını da tarar', () => {
    // Kullanıcı listede gördüğü kelimeyi arıyor; rozet adı ekranda
    // görünürken aramada karşılıksız kalması şaşırtıcıydı.
    expect(filterThreads([soru, rehber], { search: 'Rehber' })).toHaveLength(1);
    expect(
      filterThreads([soru], { search: 'Ekipmanlar' }).map((t) => t.id)
    ).toEqual(['soru']);
  });

  it('kategori ve rozeti birlikte uygular', () => {
    const baska = thread({
      id: 'baska',
      category: 'goruntu-isleme',
      labels: ['soru'],
    });
    expect(
      filterThreads([soru, baska], {
        category: 'goruntu-isleme',
        label: 'soru',
      }).map((t) => t.id)
    ).toEqual(['baska']);
  });
});
