import { useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { relativeTime } from '@/lib/relativeTime';
import { unblockUser, useBlockList } from '@/services/content/social';

/**
 * ENGELLENENLER — hesap ayarlarındaki yönetim kutusu.
 *
 * ENGELLEMEK KOLAY, GERİ ALMAK BULUNABİLİR OLMALI. Engelleme profil ve
 * sohbet içinden tek tıkla yapılıyor; geri almanın yolu yalnızca o kişinin
 * profilini yeniden bulmaktan geçseydi, adını hatırlamayan kullanıcı için
 * karar kalıcı olurdu. Liste hesap ayarlarında duruyor çünkü orası
 * "benim hakkımdaki ayarlar"ın yeri.
 *
 * LİSTE TEK YÖNLÜ. Yalnızca BENİM engellediklerim görünüyor; "beni kim
 * engelledi" diye bir sorgu yok ve RLS de vermiyor (0041).
 *
 * KUTU BOŞKEN DE ÇİZİLİYOR — ve bu bilinçli: kullanıcı "acaba birini
 * engellemiş miydim" diye baktığında "hayır" cevabını görebilmeli.
 * Görünmeyen bir kutu bu soruyu cevapsız bırakırdı.
 */
export function BlockList() {
  const { items, loading, error, refresh } = useBlockList();
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <Panel
      title="Engellenenler"
      status={items.length > 0 ? `${items.length} kişi` : undefined}
    >
      {(error || actionError) && (
        <Alert tone="danger" className="mb-3">
          {actionError ?? error}
        </Alert>
      )}

      {loading && items.length === 0 ? (
        <p className="text-meta text-muted-foreground">Liste okunuyor…</p>
      ) : items.length === 0 ? (
        <p className="text-meta leading-relaxed text-muted-foreground">
          Kimseyi engellemedin. Engellediğin kişiler sana mesaj gönderemez,
          seni takip edemez ve senden bildirim almaz.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="min-w-0">
                <span className="block truncate text-caption text-foreground">
                  {item.displayName ?? item.username ?? 'Silinmiş kullanıcı'}
                </span>
                <span className="mt-0.5 block text-meta text-muted-foreground">
                  {item.username && (
                    <>
                      <Link
                        to={`/profil/${item.username}`}
                        className="transition-colors hover:text-foreground"
                      >
                        @{item.username}
                      </Link>
                      {' · '}
                    </>
                  )}
                  {relativeTime(item.createdAt)} engellendi
                </span>
              </span>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy === item.id}
                onClick={() =>
                  void (async () => {
                    setBusy(item.id);
                    setActionError(null);
                    try {
                      await unblockUser(item.id);
                      refresh();
                    } catch (e) {
                      setActionError(
                        e instanceof Error ? e.message : 'Engel kaldırılamadı'
                      );
                    } finally {
                      setBusy(null);
                    }
                  })()
                }
              >
                Engeli kaldır
              </Button>
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && (
        <p className="mt-3 border-t border-border pt-3 text-meta leading-relaxed text-muted-foreground">
          Engeli kaldırmak eski takip ilişkisini geri getirmez — engelleme
          takibi iki yönde de kopardığı için yeniden kurulması gerekir.
        </p>
      )}
    </Panel>
  );
}
