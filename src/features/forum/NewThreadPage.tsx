import { useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { forumCategories, forumCategoryOrder } from './types';
import { sanitizeText } from '@/lib/sanitize';

/**
 * YENİ KONU FORMU.
 *
 * Gönderme, hesap sistemi bağlanana kadar devre dışı. Formu şimdiden
 * yazmanın nedeni, kategori seçimi ve "iyi soru" yönlendirmesinin ürünün
 * parçası olması — sonradan eklenen bir yardım metni kimse okumuyor.
 */
export function NewThreadPage() {
  const [category, setCategory] = useState<string>(forumCategoryOrder[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const info = forumCategories[category as keyof typeof forumCategories];

  /*
   * Önizleme, yayımlanacak metnin AYNISINI gösterir: `sanitizeText` HTML
   * etiketlerini söker, görünmez karakterleri atar ve üç üstü satır sonunu
   * ikiye indirir. Kullanıcı "yazdığım gibi çıkmadı" sürprizini gönderdikten
   * sonra değil, yazarken görmeli (§15.4).
   */
  const cleanTitle = sanitizeText(title, { maxLength: 120 });
  const cleanBody = sanitizeText(body, { multiline: true });
  const changed = cleanTitle !== title.trim() || cleanBody !== body.trim();

  return (
    <>
      <PageMeta
        title="Yeni Konu"
        description="Foruma yeni bir konu aç."
        noIndex
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Forum', to: '/forum' }, { label: 'Yeni Konu' }]}
          title="Yeni Konu Aç"
          description="Yanıt alma ihtimalini en çok artıran şey, sorunu üretebileceğimiz kadar bilgi vermek."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <Field label="Kategori" htmlFor="thread-category">
              <Select
                id="thread-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {forumCategoryOrder.map((id) => (
                  <option key={id} value={id}>
                    {forumCategories[id].name}
                  </option>
                ))}
              </Select>
            </Field>
            {info && (
              <p className="-mt-2 text-[10px] text-faint">{info.description}</p>
            )}

            <Field
              label="Başlık"
              htmlFor="thread-title"
              hint="Somut yazın: “Yardım!” yerine “PHD2 guide hatası meridyen sonrası ikiye katlanıyor”."
            >
              <Input
                id="thread-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sorunu tek cümlede özetleyin"
                maxLength={120}
              />
            </Field>

            <Field label="Mesaj" htmlFor="thread-body">
              <textarea
                id="thread-body"
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  'Ekipman: teleskop, montür, kamera, filtre\n' +
                  'Koşullar: Bortle, ay fazı, seeing\n' +
                  'Denedikleriniz ve sonuç'
                }
                className="w-full resize-y rounded-card border border-border bg-surface-1 px-3 py-2.5 text-[12.5px] leading-[1.7] text-foreground outline-none placeholder:text-faint focus:border-primary"
              />
            </Field>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-[10px] leading-snug text-faint">
                Konu açma, hesap sistemi bağlandığında etkinleşir.
              </p>
              <div className="flex gap-2">
                <ButtonLink to="/forum" size="sm" variant="secondary">
                  Vazgeç
                </ButtonLink>
                <Button type="submit" size="sm" disabled>
                  Konuyu Aç
                </Button>
              </div>
            </div>
          </form>

          <aside className="space-y-4">
            {(cleanTitle || cleanBody) && (
              <Panel
                title="Önizleme"
                status={changed ? 'metin sadeleştirildi' : 'değişiklik yok'}
              >
                {cleanTitle && (
                  <p className="text-[13px] font-medium leading-snug text-foreground">
                    {cleanTitle}
                  </p>
                )}
                {cleanBody && (
                  <p className="mt-2 whitespace-pre-line text-[11.5px] leading-relaxed text-muted-foreground">
                    {cleanBody}
                  </p>
                )}
                {changed && (
                  <p className="mt-2 border-t border-border pt-2 text-[10px] leading-snug text-faint">
                    Biçimlendirme etiketleri ve görünmez karakterler kaldırıldı;
                    forum düz metin kabul eder.
                  </p>
                )}
              </Panel>
            )}

            <Panel title="İyi soru nasıl yazılır">
              <ol className="space-y-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
                <li>
                  <span className="text-foreground">Ekipmanı yazın.</span>{' '}
                  Teleskop, montür, kamera, filtre ve varsa düzleştirici.
                  Sorunların çoğu bu listeden anlaşılıyor.
                </li>
                <li>
                  <span className="text-foreground">Koşulları yazın.</span>{' '}
                  Bortle sınıfı, ay fazı, seeing, sıcaklık ve nem.
                </li>
                <li>
                  <span className="text-foreground">Ne denediğinizi yazın.</span>{' '}
                  Denenmiş ve işe yaramamış şeyleri bilmek, aynı önerilerin
                  tekrar gelmesini engeller.
                </li>
                <li>
                  <span className="text-foreground">Ham veri paylaşın.</span>{' '}
                  İşleme sorularında ekran görüntüsü yerine tek bir ham kare,
                  yanıtın isabetini kat kat artırıyor.
                </li>
              </ol>
            </Panel>
          </aside>
        </div>
      </Container>
    </>
  );
}
