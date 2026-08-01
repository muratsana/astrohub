import { describe, expect, it } from 'vitest';
import { COMMENT_KINDS, deleteComment, type CommentKind } from './comments';

/**
 * KULLANICI METİNLERİ — tür tanımlarının şemayla hizası.
 *
 * Asıl risk burada `records.ts`tekiyle aynı sınıftan ama daha sinsi:
 * üç tablonun YAZAR KOLONU aynı değil. `photo_comments.user_id`,
 * `forum_posts.author_id`, `site_reviews.user_id`. Tek isim varsaymak
 * forum sekmesini sessizce boş bırakırdı — sorgu hata verir, liste hiç
 * dolmaz ve moderatör "gönderi yok" sanır.
 */

const KINDS = Object.keys(COMMENT_KINDS) as CommentKind[];

describe('COMMENT_KINDS · tanım bütünlüğü', () => {
  it('üç metin türünü de taşıyor', () => {
    expect(KINDS).toEqual(['photoComment', 'forumPost', 'siteReview']);
  });

  /*
   * ASIL KURAL. Forum yazarı `author_id`, diğer ikisi `user_id`.
   */
  it('forum gönderisi author_id, diğerleri user_id kullanıyor', () => {
    expect(COMMENT_KINDS.forumPost.authorColumn).toBe('author_id');
    expect(COMMENT_KINDS.photoComment.authorColumn).toBe('user_id');
    expect(COMMENT_KINDS.siteReview.authorColumn).toBe('user_id');
  });

  it('yazar kolonu select ifadesinde de var', () => {
    for (const k of KINDS) {
      const spec = COMMENT_KINDS[k];
      expect(spec.select, k).toContain(spec.authorColumn);
    }
  });

  it('her tür body ve created_at seçiyor', () => {
    for (const k of KINDS) {
      expect(COMMENT_KINDS[k].select, k).toContain('body');
      expect(COMMENT_KINDS[k].select, k).toContain('created_at');
    }
  });

  /*
   * Puan yalnızca saha yorumunda var. Diğerlerinde `rating` seçmek
   * olmayan bir kolona sormak demek ve sorgu tamamen düşerdi.
   */
  it('puan yalnızca saha yorumunda', () => {
    expect(COMMENT_KINDS.siteReview.hasRating).toBe(true);
    expect(COMMENT_KINDS.siteReview.select).toContain('rating');
    expect(COMMENT_KINDS.photoComment.hasRating).toBe(false);
    expect(COMMENT_KINDS.photoComment.select).not.toContain('rating');
    expect(COMMENT_KINDS.forumPost.hasRating).toBe(false);
    expect(COMMENT_KINDS.forumPost.select).not.toContain('rating');
  });

  it('her türün etiketi var', () => {
    for (const k of KINDS) {
      expect(COMMENT_KINDS[k].label.length, k).toBeGreaterThan(0);
    }
  });
});

describe('deleteComment', () => {
  /*
   * Yapılandırma yokken sessizce başarılı dönmemeli: moderatör "kaldırdım"
   * sanıp kapatırsa uygunsuz metin sitede kalır.
   */
  it('yapılandırma yokken sessizce başarılı dönmüyor', async () => {
    await expect(deleteComment('photoComment', 'x')).rejects.toThrow();
  });
});

/**
 * DÜZENLEME YOK.
 *
 * Modül yalnızca okuma ve silme veriyor. Bir moderatörün başkasının
 * cümlesini değiştirebilmesi, o kişinin ağzına söz koymak demek — ve
 * böyle bir fonksiyon eklenirse bu test kırılır.
 */
describe('modül yüzeyi', () => {
  it('güncelleme fonksiyonu dışa vermiyor', async () => {
    const mod = await import('./comments');
    const yazma = Object.keys(mod).filter((k) =>
      /update|edit|patch|guncelle/i.test(k)
    );
    expect(yazma).toEqual([]);
  });
});
