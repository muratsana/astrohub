import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  readStoredEntries,
  clearStorageItem,
  clearAllStorage,
  hasConsentRequiredItems,
  purposeLabels,
  type StorageItem,
} from './storage';

/**
 * ÇEREZ VE DEPOLAMA TERCİHLERİ (§15.7).
 *
 * Sayfa iki iş yapıyor: tarayıcıda **gerçekten ne saklandığını** göstermek
 * ve silmeyi tek tıka indirmek. Liste, envanterden değil `localStorage`'ın
 * kendisinden okunuyor — "şunu saklıyoruz" yazıp saklamamak da, saklayıp
 * yazmamak kadar yanlış bilgi olurdu.
 *
 * Rıza kutusu yalnızca rıza gerektiren bir kayıt varsa görünür. Şu an yok:
 * izleme çerezi kullanılmıyor ve olmayan bir izleme için onay istemek
 * kullanıcıyı yanıltmak olur.
 */
export function CookiePreferencesPage() {
  // Silme işleminden sonra listeyi tazelemek için sayaç.
  const [revision, setRevision] = useState(0);
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const entries = readStoredEntries();

  function removeItem(item: StorageItem) {
    clearStorageItem(item);
    setLastCleared(item.label);
    setRevision((r) => r + 1);
  }

  function removeAll() {
    const count = clearAllStorage();
    setLastCleared(`${count} kayıt`);
    setRevision((r) => r + 1);
  }

  const storedCount = entries.filter((e) => e.keys.length > 0).length;

  return (
    <>
      <PageMeta
        title="Çerez ve Depolama Tercihleri"
        description="Astrohub'ın tarayıcınızda sakladığı verilerin tam listesi, ne işe yaradıkları ve tek tıkla silme."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Çerez Tercihleri', path: '/cerezler' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Çerez Tercihleri' },
          ]}
          title="Çerez ve Depolama Tercihleri"
          description="Astrohub tarayıcınızda ne saklıyor, neden saklıyor ve nasıl silersiniz. Liste tarayıcınızın gerçek içeriğinden okunur."
          meta={`${storedCount} / ${entries.length} kayıt mevcut`}
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <Panel title="Saklanan veriler" status={`${storedCount} aktif`}>
              <ul key={revision}>
                {entries.map(({ item, keys }) => (
                  <li
                    key={item.key}
                    className="border-b border-border py-3 first:pt-0 last:border-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {item.label}
                        </span>
                        <Badge
                          tone={item.purpose === 'analitik' ? 'warning' : 'muted'}
                        >
                          {purposeLabels[item.purpose]}
                        </Badge>
                      </span>

                      {keys.length > 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(item)}
                        >
                          Sil
                        </Button>
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-faint">
                          saklanmıyor
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>

                    <p className="tabular mt-1 text-[10px] text-faint">
                      {keys.length > 0
                        ? keys.join(', ')
                        : `${item.key}${item.prefix ? '*' : ''}`}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Tümünü sil">
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Astrohub'ın yazdığı tüm kayıtları siler. Tema, konum ve görünüm
                tercihleriniz varsayılana döner; hesabınıza ya da sunucudaki
                verilerinize dokunmaz.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button variant="danger" size="sm" onClick={removeAll}>
                  Tüm Yerel Verileri Sil
                </Button>
                {lastCleared && (
                  <span role="status" className="text-[11.5px] text-success">
                    Silindi: {lastCleared}
                  </span>
                )}
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel title="Neden çerez uyarısı görmüyorsunuz?">
              <div className="space-y-2 text-[12px] leading-relaxed text-muted-foreground">
                <p>
                  Astrohub <strong className="text-foreground">izleme çerezi
                  kullanmıyor</strong>. Reklam ağı, üçüncü parti analitik ve
                  parmak izi çıkarma yok.
                </p>
                <p>
                  Saklanan her şey sizin kendi tercihiniz ve tarayıcınızın
                  yerel deposunda kalıyor; sunucuya gönderilmiyor.
                </p>
                <p>
                  KVKK ve ePrivacy açık rızayı zorunlu olmayan çerezler için
                  ister. Olmayan bir izleme için onay kutusu göstermek, size
                  bilgi vermek değil, yanıltmak olurdu.
                </p>
                {hasConsentRequiredItems() && (
                  <p className="text-warning">
                    Rıza gerektiren bir kayıt eklendi; yukarıdaki listede
                    işaretli.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Dış servisler">
              <div className="space-y-2 text-[12px] leading-relaxed text-muted-foreground">
                <p>
                  Hava ve seeing verisi{' '}
                  <span className="text-foreground">Open-Meteo</span>'dan
                  alınır. İstek sırasında yaklaşık koordinatınız o servise
                  iletilir; çerez yazılmaz.
                </p>
                <p>
                  Radyo modülünde Spotify parçaları gömülü oynatıcıda çalar.
                  Bir Spotify parçası başlatmadıkça bu çerçeve yüklenmez.
                </p>
              </div>
            </Panel>

            <Panel title="İlgili sayfalar">
              <ul className="space-y-1.5 text-[12px]">
                <li>
                  <Link
                    to="/kvkk"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    KVKK Aydınlatma Metni →
                  </Link>
                </li>
                <li>
                  <Link
                    to="/kullanim-kosullari"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Kullanım Koşulları →
                  </Link>
                </li>
              </ul>
            </Panel>
          </div>
        </div>
      </Container>
    </>
  );
}
