import { describe, expect, it } from 'vitest';
import {
  isValidYoutubeId,
  youtubeEmbedUrl,
  youtubeIdFromInput,
  youtubeWatchUrl,
  sortBroadcasts,
  liveBroadcast,
  type Broadcast,
} from './types';

const VIDEO = 'dQw4w9WgXcQ';
const CHANNEL = 'UCuAXFkgsw1L7xaCfnd5JJOw';

describe('isValidYoutubeId', () => {
  it('video kimliği tam 11 karakterdir', () => {
    expect(isValidYoutubeId('video', VIDEO)).toBe(true);
    expect(isValidYoutubeId('video', 'kisa')).toBe(false);
    expect(isValidYoutubeId('video', VIDEO + 'x')).toBe(false);
  });

  it('kanal kimliği UC ile başlar ve 24 karakterdir', () => {
    expect(isValidYoutubeId('channel', CHANNEL)).toBe(true);
    expect(isValidYoutubeId('channel', VIDEO)).toBe(false);
  });

  it('tipler karışmaz', () => {
    expect(isValidYoutubeId('video', CHANNEL)).toBe(false);
  });
});

/**
 * Editöre video ekleyen kişinin elinde kimlik değil ADRES oluyor. Bu
 * fonksiyon çıkarımı gevşek yapıyor ama doğrulamayı gevşetmiyor: hangi
 * biçimden gelirse gelsin sonuç `isValidYoutubeId`den geçiyor. Yani
 * kolaylık güvenlik sınırının ÖNÜNDE duruyor, yerine geçmiyor.
 */
describe('youtubeIdFromInput', () => {
  it('yaygın adres biçimlerinden kimliği çıkarır', () => {
    for (const adres of [
      `https://www.youtube.com/watch?v=${VIDEO}`,
      `https://youtu.be/${VIDEO}`,
      `https://www.youtube.com/embed/${VIDEO}`,
      `https://www.youtube.com/shorts/${VIDEO}`,
      `https://www.youtube-nocookie.com/embed/${VIDEO}`,
    ]) {
      expect(youtubeIdFromInput(adres)).toBe(VIDEO);
    }
  });

  it('düz kimliği olduğu gibi kabul eder', () => {
    expect(youtubeIdFromInput(`  ${VIDEO}  `)).toBe(VIDEO);
  });

  /*
   * Başka bir alan adı YouTube gibi davranamaz: çıkarım yalnızca bilinen
   * konaklarda çalışıyor, aksi hâlde "youtube" geçen herhangi bir adres
   * kimlik üretebilirdi.
   */
  it('tanımadığı konaktan kimlik üretmez', () => {
    expect(youtubeIdFromInput(`https://kotu.example/watch?v=${VIDEO}`)).toBeNull();
  });

  it('kimlik çıkmayan girdide null döner', () => {
    expect(youtubeIdFromInput('https://www.youtube.com/watch?v=kisa')).toBeNull();
    expect(youtubeIdFromInput('')).toBeNull();
    expect(youtubeIdFromInput('rastgele metin')).toBeNull();
  });
});

describe('youtubeEmbedUrl', () => {
  it('video için nocookie gömme adresi üretir', () => {
    const url = youtubeEmbedUrl('video', VIDEO);
    expect(url).toContain('https://www.youtube-nocookie.com/embed/' + VIDEO);
    expect(url).toContain('rel=0');
  });

  it('kanal için canlı akış adresi üretir', () => {
    const url = youtubeEmbedUrl('channel', CHANNEL);
    expect(url).toContain('/embed/live_stream');
    expect(url).toContain(`channel=${CHANNEL}`);
  });

  it('autoplay yalnızca istendiğinde eklenir', () => {
    expect(youtubeEmbedUrl('video', VIDEO)).not.toContain('autoplay');
    expect(youtubeEmbedUrl('video', VIDEO, { autoplay: true })).toContain(
      'autoplay=1'
    );
  });

  /*
   * Asıl koruma bu: kimlik alanına adres benzeri bir şey yazılırsa
   * oynatıcı hiç kurulmaz. `<iframe src>` içine giden bir alanın
   * doğrulanmadan geçmesi, en sessiz enjeksiyon yüzeylerinden biri.
   */
  it('bozuk kimlikte adres üretmez', () => {
    expect(youtubeEmbedUrl('video', 'javascript:alert(1)')).toBeNull();
    expect(youtubeEmbedUrl('video', '../../evil')).toBeNull();
    expect(youtubeEmbedUrl('channel', 'https://kotu.site')).toBeNull();
    expect(youtubeEmbedUrl('video', '')).toBeNull();
  });

  it('kimlik adresin içine kaçamaz', () => {
    // 11 karakterlik ama eğik çizgi içeren bir dize biçim kontrolünü geçmez.
    expect(youtubeEmbedUrl('video', 'abc/def/ghi')).toBeNull();
  });
});

describe('youtubeWatchUrl', () => {
  it('video ve kanal için farklı adres verir', () => {
    expect(youtubeWatchUrl('video', VIDEO)).toBe(
      `https://www.youtube.com/watch?v=${VIDEO}`
    );
    expect(youtubeWatchUrl('channel', CHANNEL)).toBe(
      `https://www.youtube.com/channel/${CHANNEL}/live`
    );
  });

  it('bozuk kimlikte bağlantı vermez', () => {
    expect(youtubeWatchUrl('video', 'kotu')).toBeNull();
  });
});

function broadcast(partial: Partial<Broadcast> & { slug: string }): Broadcast {
  return {
    title: partial.slug,
    description: '',
    kind: 'scheduled',
    refKind: 'video',
    youtubeId: VIDEO,
    position: 0,
    ...partial,
  };
}

describe('sortBroadcasts', () => {
  it('canlı yayın her zaman başta', () => {
    const sorted = sortBroadcasts([
      broadcast({ slug: 'arsiv', kind: 'archive', startsAt: '2026-01-01' }),
      broadcast({ slug: 'program', kind: 'scheduled', startsAt: '2026-09-01' }),
      broadcast({ slug: 'canli', kind: 'live' }),
    ]);

    expect(sorted[0].slug).toBe('canli');
  });

  it('program en yakın tarihten, arşiv en yeniden sıralanır', () => {
    const sorted = sortBroadcasts([
      broadcast({ slug: 'gec', kind: 'scheduled', startsAt: '2026-12-01' }),
      broadcast({ slug: 'erken', kind: 'scheduled', startsAt: '2026-08-01' }),
      broadcast({ slug: 'eski-arsiv', kind: 'archive', startsAt: '2025-01-01' }),
      broadcast({ slug: 'yeni-arsiv', kind: 'archive', startsAt: '2026-01-01' }),
    ]);

    expect(sorted.map((b) => b.slug)).toEqual([
      'erken',
      'gec',
      'yeni-arsiv',
      'eski-arsiv',
    ]);
  });

  it('girdi dizisini değiştirmez', () => {
    const input = [broadcast({ slug: 'b', kind: 'archive' }), broadcast({ slug: 'a', kind: 'live' })];
    sortBroadcasts(input);
    expect(input[0].slug).toBe('b');
  });
});

describe('liveBroadcast', () => {
  it('canlı yayını bulur', () => {
    const items = [broadcast({ slug: 'a' }), broadcast({ slug: 'canli', kind: 'live' })];
    expect(liveBroadcast(items)?.slug).toBe('canli');
  });

  it('canlı yayın yoksa null döner — boş bir oynatıcı kurulmasın', () => {
    expect(liveBroadcast([broadcast({ slug: 'a' })])).toBeNull();
    expect(liveBroadcast([])).toBeNull();
  });
});
