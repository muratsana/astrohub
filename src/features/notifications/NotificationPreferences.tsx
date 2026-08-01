import { Panel } from '@/components/ui/Panel';
import { Alert } from '@/components/ui/Alert';
import {
  TOGGLEABLE_CATEGORIES,
  useNotificationPreferences,
} from '@/services/content/notifications';

/**
 * BİLDİRİM TERCİHLERİ.
 *
 * DÖRT ANAHTAR VAR, ON SEÇENEK DEĞİL. §8.13 on maddelik bir liste
 * sayıyor ("şehrimde yeni etkinlik", "takip edilen hedef görünür
 * durumda"…) ama o maddelerin çoğunu üretecek tetikleyici henüz yok —
 * hatırlatma tablosu Faz 6'da, yayın bildirimi radyo/TV programına bağlı.
 * On kutu gösterip yedisinin hiçbir şeyi değiştirmemesi, kullanıcıya
 * kontrolü olduğu yalanını söylemek olurdu. Gösterilen dört kategori,
 * BUGÜN gerçekten bildirim üreten kategoriler; liste tetikleyici
 * eklendikçe genişleyecek.
 *
 * SİSTEM KATEGORİSİ LİSTEDE YOK. Üyelik bitişi, moderasyon kararı ve
 * hesap uyarısı kapatılamıyor — sunucu tarafı da kapatmıyor
 * (`app.notification_allowed`). Kapatılamayan bir anahtarı ekranda
 * kapatılabilir göstermek, çalışmayan bir düğme koymaktı.
 *
 * E-POSTA VE PUSH DA YOK. `notification_preferences` tablosunda
 * `email_enabled` ve `push_enabled` kolonları duruyor ama gönderen bir
 * boru hattı yok (e-posta sağlayıcısı kararı bekliyor — TOPARLAMA §11).
 * Kolonu ekrana çıkarmak, açıldığında hiçbir e-posta gelmeyen bir düğme
 * olurdu; kutu yerine bunun neden orada olmadığını yazıyoruz.
 */
export function NotificationPreferences() {
  const { categories, loading, error, saving, toggle } =
    useNotificationPreferences();

  return (
    <Panel
      title="Bildirim tercihleri"
      status={saving ? 'kaydediliyor…' : undefined}
    >
      {error && (
        <Alert tone="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <ul className="divide-y divide-border">
        {TOGGLEABLE_CATEGORIES.map((item) => {
          const enabled = categories[item.key] !== false;
          return (
            <li
              key={item.key}
              className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <label
                htmlFor={`bildirim-${item.key}`}
                className="min-w-0 cursor-pointer"
              >
                <span className="block text-caption text-foreground">
                  {item.label}
                </span>
                <span className="mt-0.5 block text-meta leading-relaxed text-muted-foreground">
                  {item.hint}
                </span>
              </label>

              {/*
                Onay kutusu, özel bir anahtar bileşeni değil: klavye,
                ekran okuyucu ve form davranışı bedava geliyor. Görsel
                dil sitenin geri kalanıyla uyumlu olsun diye yalnızca
                boyut ve renk ayarlanıyor.
              */}
              <input
                id={`bildirim-${item.key}`}
                type="checkbox"
                checked={enabled}
                disabled={loading || saving}
                onChange={(event) =>
                  void toggle(item.key, event.currentTarget.checked)
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)] disabled:opacity-45"
              />
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-meta leading-relaxed text-muted-foreground">
        Hesabınla ilgili zorunlu bildirimler (moderasyon kararı, üyelik ve
        güvenlik uyarıları) kapatılamaz. E-posta ve anlık bildirim henüz
        gönderilmiyor; buradaki tercihler site içi bildirimleri yönetir.
      </p>
    </Panel>
  );
}
