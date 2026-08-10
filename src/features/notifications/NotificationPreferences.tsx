import { Panel } from '@/components/ui/Panel';
import { Alert } from '@/components/ui/Alert';
import {
  TOGGLEABLE_CATEGORIES,
  useNotificationPreferences,
} from '@/services/content/notifications';

/**
 * BİLDİRİM TERCİHLERİ.
 *
 * LİSTE ÜRETİCİDEN TÜRÜYOR, PLANDAN DEĞİL. Gösterilen sekiz kategori,
 * veritabanında BUGÜN gerçekten bildirim üreten kategoriler — küme
 * `app.notify` çağıran tetikleyiciler taranarak ölçüldü. `ilan` enum'da
 * duruyor ama onu yazan tetikleyici yok (FAZ 8), o yüzden kutusu da yok:
 * hiçbir şeyi değiştirmeyen bir anahtar, kullanıcıya kontrolü olduğu
 * yalanını söylemek olurdu.
 *
 * SİSTEM KATEGORİSİ LİSTEDE YOK. Üyelik bitişi, hesap uyarısı ve
 * yöneticinin doğrudan mesajı kapatılamıyor — sunucu tarafı da kapatmıyor
 * (`app.notification_allowed`). Kapatılamayan bir anahtarı ekranda
 * kapatılabilir göstermek, çalışmayan bir düğme koymaktı. Moderasyon
 * kararı ise artık AYRI ve kapatılabilir bir kategori: kendi bildirdiğin
 * içeriğin sonucunu istememek meşru bir tercih.
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
        Hesabınla ilgili zorunlu bildirimler (üyelik, güvenlik uyarıları ve
        yöneticinin doğrudan mesajı) kapatılamaz. E-posta ve anlık bildirim
        henüz gönderilmiyor; buradaki tercihler site içi bildirimleri yönetir.
      </p>
    </Panel>
  );
}
