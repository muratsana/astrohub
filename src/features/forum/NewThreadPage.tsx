import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import {
  forumCategories,
  forumCategoryOrder,
  forumLabelLimit,
  forumLabelOrder,
  forumLabels,
  type ForumCategoryId,
  type ForumLabelId,
} from './types';
import { cn } from '@/lib/cn';
import { sanitizeText } from '@/lib/sanitize';
import { useAuth } from '@/features/auth/AuthContext';
import { createThread } from '@/services/content/forum';
import { Alert } from '@/components/ui/Alert';
import { ForumImagePicker } from './ForumImagePicker';

/**
 * YENİ KONU FORMU.
 *
 * Gönderim `forum_threads` tablosuna yazıyor; RLS yalnızca kendi adına
 * konu açmaya izin veriyor. Oturum yoksa form dolduruluyor ama gönderim
 * girişe yönlendiriyor — yazdıklarını kaybettirmemek için form
 * temizlenmiyor.
 *
 * Kategori seçimi ve "iyi soru" yönlendirmesi ürünün parçası; sonradan
 * eklenen bir yardım metnini kimse okumuyor.
 */
export function NewThreadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [category, setCategory] = useState<string>(forumCategoryOrder[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [labels, setLabels] = useState<ForumLabelId[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!user) {
      navigate('/giris');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const slug = await createThread({
        title,
        body,
        category: category as ForumCategoryId,
        labels,
        authorId: user.id,
        imageFile,
      });
      await queryClient.invalidateQueries({ queryKey: ['katalog', 'forum'] });
      navigate(`/forum/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Konu açılamadı');
    } finally {
      setBusy(false);
    }
  }

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
          breadcrumb={[
            { label: 'Forum', to: '/forum' },
            { label: 'Yeni Konu' },
          ]}
          title="Yeni Konu Aç"
          description="Yanıt alma ihtimalini en çok artıran şey, sorunu üretebileceğimiz kadar bilgi vermek."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
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
              <p className="-mt-2 text-meta text-faint">{info.description}</p>
            )}

            {/*
              ROZET SEÇİMİ — çoklu ama SINIRLI.

              Serbest metin etiket yerine sabit bir set var çünkü
              süzgecin işe yaraması buna bağlı: herkesin kendi yazdığı
              etiket, hiçbir şeyi bir araya getirmez. Sınır (`forumLabelLimit`)
              ise şu yüzden: her konuya altı rozetin de takılması hâlinde
              rozet hiçbir şeyi ayırt etmez olurdu.

              `Field` KULLANILMADI: o bileşen `<label htmlFor>` üretip tek
              bir kontrolü işaret ediyor. Burada işaret edilecek tek kontrol
              yok — altı düğmeden oluşan bir grup var ve ekran okuyucuya
              bunu söyleyen şey `role="group"`.
            */}
            <div className="space-y-1.5">
              <span id="thread-labels-label" className="label block">
                Rozetler <span className="text-faint">(isteğe bağlı)</span>
              </span>
              <div
                role="group"
                aria-labelledby="thread-labels-label"
                className="flex flex-wrap gap-1.5"
              >
                {forumLabelOrder.map((id) => {
                  const secili = labels.includes(id);
                  const dolu = labels.length >= forumLabelLimit;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={secili}
                      title={forumLabels[id].description}
                      disabled={!secili && dolu}
                      onClick={() =>
                        setLabels((mevcut) =>
                          mevcut.includes(id)
                            ? mevcut.filter((x) => x !== id)
                            : mevcut.length < forumLabelLimit
                              ? [...mevcut, id]
                              : mevcut
                        )
                      }
                      className={cn(
                        'rounded-card border px-2.5 py-1 text-meta font-medium transition-colors',
                        secili
                          ? 'border-primary bg-primary/12 text-primary'
                          : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
                        !secili && dolu && 'cursor-not-allowed opacity-45'
                      )}
                    >
                      {forumLabels[id].name}
                    </button>
                  );
                })}
              </div>
              <p className="text-meta text-faint">
                Konunun türünü seçin — en çok {forumLabelLimit} tane.
                Rozetler forumda süzgeç olarak kullanılıyor.
              </p>
            </div>

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
                className="w-full resize-y rounded-card border border-border bg-surface-1 px-3 py-2.5 text-caption leading-[1.7] text-foreground outline-none placeholder:text-faint focus:border-primary"
              />
            </Field>

            <ForumImagePicker
              id="thread-image"
              file={imageFile}
              onChange={setImageFile}
              disabled={busy}
            />

            {error && <Alert variant="text">{error}</Alert>}

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-meta leading-snug text-faint">
                {user
                  ? 'Konu düz metin olarak yayımlanır; biçimlendirme etiketleri kaldırılır.'
                  : 'Konu açmak için giriş yapmanız gerekiyor — yazdıklarınız formda kalır.'}
              </p>
              <div className="flex gap-2">
                <ButtonLink to="/forum" size="sm" variant="secondary">
                  Vazgeç
                </ButtonLink>
                <Button type="submit" size="sm" disabled={busy}>
                  {busy ? 'Açılıyor…' : user ? 'Konuyu Aç' : 'Giriş yap ve aç'}
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
                  <p className="text-body-sm font-medium leading-snug text-foreground">
                    {cleanTitle}
                  </p>
                )}
                {cleanBody && (
                  <p className="mt-2 whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
                    {cleanBody}
                  </p>
                )}
                {changed && (
                  <p className="mt-2 border-t border-border pt-2 text-meta leading-snug text-faint">
                    Biçimlendirme etiketleri ve görünmez karakterler kaldırıldı;
                    forum düz metin kabul eder.
                  </p>
                )}
              </Panel>
            )}

            <Panel title="İyi soru nasıl yazılır">
              <ol className="space-y-2.5 text-body-sm leading-relaxed text-muted-foreground">
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
                  <span className="text-foreground">
                    Ne denediğinizi yazın.
                  </span>{' '}
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
