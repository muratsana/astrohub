import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { slugify } from '@/lib/slug';
import {
  fetchCategories,
  upsertCategory,
  type Kategori,
} from './forumCategories';

/**
 * FORUM KATEGORİLERİ — forumun iskeleti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `records.ts`E EKLENMEDİ
 *
 * `records.ts` KAYIT yönetiyor: kullanıcının ürettiği, durumu olan,
 * moderasyondan geçen şeyler. Kategori bunların hiçbiri değil — o bir
 * YAPILANDIRMA. Durumu yok, sahibi yok, moderasyonu yok; tek soru
 * "hangi başlıklar var ve hangi sırada".
 *
 * Aynı bileşene sıkıştırmak, orada anlamı olmayan bir durum sütunu ve
 * sahip alanı taşımak demekti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KİMLİK ELLE YAZILMIYOR, ADDAN TÜRÜYOR
 *
 * `forum_categories.id` bir metin ve adreste görünüyor (`/forum/genel`).
 * Elle yazılabilseydi Türkçe karakterli ya da boşluklu bir kimlik
 * girilebilir, adres yüzde kodlamasına dönüşürdü. Ad değişse bile kimlik
 * SABİT kalıyor — kategori adını düzeltmek, o kategoriye verilmiş bütün
 * bağlantıları kırmamalı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SİLME YOK
 *
 * Kategori silmek, altındaki konuları sahipsiz bırakır (`category_id`
 * yabancı anahtarı). Bir kategoriyi kullanımdan kaldırmanın doğru yolu
 * onu listenin sonuna almak; silmek gerekiyorsa önce konuların
 * taşınması gerekir ve o iş bu ekranın işi değil.
 */

export function ForumCategories({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<Kategori[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [ad, setAd] = useState('');
  const [aciklama, setAciklama] = useState('');

  const load = useCallback(() => {
    setError(null);
    fetchCategories()
      .then(setItems)
      .catch((e: unknown) => {
        setItems([]);
        setError(e instanceof Error ? e.message : 'Kategoriler okunamadı');
      });
  }, []);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Sırayı bir basamak değiştirir.
   *
   * İKİ SATIR BİRDEN YAZILIYOR: yalnızca birini kaydırmak, iki
   * kategorinin aynı `position` değerini almasına ve sıralamanın
   * rastgeleleşmesine yol açardı.
   */
  async function tasi(index: number, yon: -1 | 1) {
    if (!items) return;
    const komsu = index + yon;
    if (komsu < 0 || komsu >= items.length) return;

    const a = items[index];
    const b = items[komsu];
    await run(async () => {
      await upsertCategory({
        id: a.id,
        name: a.name,
        description: a.description ?? '',
        position: b.position,
      });
      await upsertCategory({
        id: b.id,
        name: b.name,
        description: b.description ?? '',
        position: a.position,
      });
    });
  }

  async function ekle() {
    const id = slugify(ad);
    if (!id) {
      setError('Kategori adı en az bir harf içermeli.');
      return;
    }
    if (items?.some((k) => k.id === id)) {
      setError(`"${id}" kimliği zaten kullanılıyor.`);
      return;
    }
    await run(async () => {
      await upsertCategory({
        id,
        name: ad.trim(),
        description: aciklama.trim(),
        position: (items?.length ?? 0) + 1,
      });
      setAd('');
      setAciklama('');
      setOpen(false);
    });
  }

  return (
    <Panel
      title="Forum kategorileri"
      status={items ? `${items.length} kategori` : 'okunuyor…'}
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Kategori kimliği adres çubuğunda görünür (<code>/forum/genel</code>) ve
        addan türetilir — ad değişse bile <strong className="text-foreground">
        kimlik sabit kalır</strong>, böylece verilmiş bağlantılar kırılmaz.
        Silme yok: bir kategoriyi kaldırmak altındaki konuları sahipsiz
        bırakır, kullanımdan çıkarmak için listenin sonuna alın.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      {items && items.length === 0 && !error && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          Henüz kategori yok.
        </p>
      )}

      <ul className="mb-3">
        {(items ?? []).map((k, i) => (
          <li
            key={k.id}
            className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0"
          >
            <span className="tabular w-6 text-meta text-faint">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-foreground">
                {k.name}
              </span>
              <span className="block truncate text-meta text-faint">
                {k.id}
                {k.description && ` · ${k.description}`}
              </span>
            </span>

            {canWrite && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy || i === 0}
                  aria-label={`${k.name} yukarı`}
                  onClick={() => void tasi(i, -1)}
                >
                  ↑
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy || i === (items?.length ?? 0) - 1}
                  aria-label={`${k.name} aşağı`}
                  onClick={() => void tasi(i, 1)}
                >
                  ↓
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>

      {canWrite &&
        (open ? (
          <div className="space-y-2 rounded-card border border-border bg-surface-2 p-3">
            <label className="block">
              <span className="label mb-1 block">Kategori adı</span>
              <Input
                value={ad}
                onChange={(e) => setAd(e.target.value)}
                placeholder="Gözlem Raporları"
                maxLength={80}
                className="h-8 text-[12px]"
              />
              {ad.trim() && (
                <span className="mt-1 block text-meta text-faint">
                  kimlik: <code>{slugify(ad) || '—'}</code>
                </span>
              )}
            </label>
            <label className="block">
              <span className="label mb-1 block">Açıklama</span>
              <Input
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                placeholder="Tek cümlelik tanım"
                maxLength={300}
                className="h-8 text-[12px]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => void ekle()}>
                Ekle
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
              >
                Vazgeç
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            + Kategori ekle
          </Button>
        ))}
    </Panel>
  );
}
