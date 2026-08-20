import type { ContentBlock } from '@/domain/content/blocks';
import { technicalSeriesArticles } from './technicalSeries';
/**
 * Yazılar modülü — rehberler, eğitim yazıları ve işleme dersleri.
 *
 * Önceki "Eğitim Merkezi" modülünün yerini alır ve kapsamını genişletir:
 * yalnızca ders değil, teknik inceleme ve saha notu da barındırır.
 * CMS/DB bağlantısı Faz 1.8'de.
 */

export type ArticleLevel = 'Başlangıç' | 'Orta' | 'İleri';

export type ArticleCategory =
  'rehber' | 'isleme' | 'teknik' | 'gozlem' | 'inceleme';

export const articleCategoryLabels: Record<ArticleCategory, string> = {
  rehber: 'Başlangıç Rehberi',
  isleme: 'İşleme',
  teknik: 'Teknik',
  gozlem: 'Gözlem',
  inceleme: 'İnceleme',
};

export interface Article {
  slug: string;
  title: string;
  /**
   * Yazının kendi adresi — verilmezse `/yazi/<slug>` varsayılır.
   */
  href?: string;
  category: ArticleCategory;
  level: ArticleLevel;
  /** "15 dk okuma" gibi okuma süresi. */
  duration: string;
  publishedAt: string;
  author: string;
  summary: string;
  body: string[];
  bodyBlocks?: ContentBlock[];
  tint: string;
  /**
   * Kart görseli.
   *
   * LİSANS: yalnızca yeniden kullanımına izin veren kaynaklar — NASA/ESA
   * yayınları kamu malı, ESO görselleri CC BY 4.0. Kredi arayüzde
   * gösteriliyor; gösterilmediğinde CC BY ihlal edilir.
   *
   * KONUYLA İLGİLİ OLMAK ZORUNDA. Rehberlere rastgele bir bulutsu
   * koymak kartı süsler ama okuyucuya yalan söyler: polar alignment
   * yazısının yanındaki görsel kutup yıldızı izleri, narrowband
   * yazısınınki Hubble paletiyle işlenmiş bir kare. Görselin işi
   * dekorasyon değil, yazının ne hakkında olduğunu bir bakışta
   * söylemek.
   *
   * Adres çalışmazsa `RemoteImage` sessizce yıldız alanına düşer.
   */
  image?: {
    url: string;
    credit: string;
    licence: string;
  };
}

export const articles: Article[] = technicalSeriesArticles;

/**
 * Yazının gideceği adres.
 *
 * Çoğu yazı `/yazi/<slug>` altında duruyor; kendi sayfası olanlar `href`
 * taşıyor. Bağlantıyı kuran her yüzey (liste, ana sayfa şeridi, arama
 * dizini, "ilgili yazılar") bunu kullanmalı — aksi hâlde bir yüzey
 * güncellenmeyi unutur ve kart boş bir kayda gider.
 */
export function articleHref(article: Pick<Article, 'slug' | 'href'>): string {
  return article.href ?? `/yazi/${article.slug}`;
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
