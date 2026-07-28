import { describe, expect, it } from 'vitest';
import { mapThreadRow, threadSlug } from './forum';

/* eslint-disable @typescript-eslint/no-explicit-any */
function row(over: Record<string, unknown> = {}): any {
  return {
    id: 'e5b1c2d3-4f5a-4b6c-8d7e-9f0a1b2c3d4e',
    slug: 'phd2-guide-hatasi-a1b2c',
    title: 'PHD2 guide hatası meridyen sonrası ikiye katlanıyor',
    body: 'EQ6-R Pro, 8" Newton, OAG…',
    category_id: 'ekipman',
    created_at: '2026-07-20T18:00:00Z',
    last_activity_at: '2026-07-21T09:00:00Z',
    reply_count: 2,
    view_count: 140,
    pinned: false,
    locked: false,
    solution_post_id: null,
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
      'baslangic'
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
