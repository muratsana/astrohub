import { useMemo } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { faqCategoryLabels, type FaqCategory, type FaqItem } from './faq';
import { useFaq } from './useKnowledge';

/**
 * SIK SORULAN SORULAR (§14.9).
 *
 * ══════════════════════════════════════════════════════════════════════
 * `<details>` — JAVASCRIPT'SİZ AÇILIR KAPANIR
 *
 * Akordeon için durum tutan bir bileşen yazmadık. `<details>/<summary>`
 * tarayıcının kendi öğesi: klavyeyle çalışıyor, ekran okuyucu açık/kapalı
 * durumunu kendisi duyuruyor, JS gelmeden önce de açılıyor. Kendi
 * yazdığımız her akordeon bu üç şeyi elle kurmak zorunda kalırdı ve
 * genellikle üçüncüsü unutulur.
 *
 * PRERENDER'DA HEPSİ KAPALI ama içerik HTML'de VAR — `<details>`
 * kapalıyken de metni belgede taşır, yani arama motoru cevapları görür.
 * JS ile açılan bir akordeonda o metin ilk HTML'de hiç olmazdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU SAYFA SİTE HAKKINDA, ASTRONOMİ DERSİ DEĞİL
 *
 * Astronomi bilgisi sözlükte ve yazılarda. Buradaki sorular kullanıcının
 * SİTEYİ kullanırken takıldığı yerler: kota, gizlilik, telif, ilan
 * güvenliği. İkisini karıştırmak her iki modülü de bulanıklaştırırdı.
 */
export function FaqPage() {
  const { items, loading } = useFaq();

  /* Kategoriye göre gruplanıyor; sıra `faqCategoryLabels`ın sırası —
     alfabetik değil. "Hesap ve üyelik" ilk sırada olmalı çünkü en çok
     sorulan orası; alfabetik sıralasak "Gizlilik" başa geçerdi. */
  const gruplar = useMemo(() => {
    const map = new Map<FaqCategory, FaqItem[]>();
    for (const item of items) {
      const liste = map.get(item.category);
      if (liste) liste.push(item);
      else map.set(item.category, [item]);
    }
    return (Object.keys(faqCategoryLabels) as FaqCategory[])
      .map((key) => ({ key, items: map.get(key) ?? [] }))
      .filter((g) => g.items.length > 0);
  }, [items]);

  return (
    <>
      <PageMeta
        title="Sık Sorulan Sorular"
        description="Astrohub hakkında sık sorulanlar: üyelik ve kotalar, fotoğraf telifi, gözlem günlüğü gizliliği, ilan güvenliği ve veri kaynakları."
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'SSS' }]}
          title="Sık Sorulan Sorular"
          description="Site hakkında merak edilenler. Astronomi terimleri için Sözlük'e, uzun anlatım için Yazılar'a bakın."
        />

        {loading && items.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
        ) : (
          <div className="space-y-6">
            {gruplar.map((grup) => (
              <section key={grup.key}>
                <h2 className="mb-2 text-h3 text-foreground">
                  {faqCategoryLabels[grup.key]}
                </h2>
                <div className="space-y-1.5">
                  {grup.items.map((item) => (
                    <details
                      key={item.slug}
                      id={item.slug}
                      className="scroll-mt-20 rounded-card border border-border bg-surface-1 px-3 py-2.5 [&[open]]:bg-surface-2"
                    >
                      <summary className="cursor-pointer list-none text-body-sm font-medium text-foreground marker:content-none">
                        {item.title}
                      </summary>
                      <p className="mt-1.5 text-body-sm leading-relaxed text-muted-foreground">
                        {item.summary}
                      </p>
                      {item.body.map((p, i) => (
                        <p
                          key={i}
                          className="mt-1.5 text-body-sm leading-relaxed text-muted-foreground"
                        >
                          {p}
                        </p>
                      ))}
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 border-t border-border pt-4 text-meta text-muted-foreground">
          Cevabını bulamadınız mı?{' '}
          <Link to="/forum" className="text-primary hover:underline">
            Foruma sorun
          </Link>{' '}
          — topluluk ve yönetim orada.
        </p>
      </Container>
    </>
  );
}
