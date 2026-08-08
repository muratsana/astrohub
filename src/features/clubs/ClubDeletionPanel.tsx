import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Field } from '@/components/ui/Field';
import { useAuth } from '@/features/auth/AuthContext';
import {
  beklemede,
  silmeTalebiAc,
  useSilmeDurumu,
  type SilmeTalebi,
} from './clubDeletion';

/**
 * TOPLULUK SAHİBİNİN SİLME KUTUSU (FAZ 6).
 *
 * Sayfada yalnızca SAHİBİNE görünüyor; sahipliği veritabanı söylüyor
 * (`topluluk_silme_durumu` sahip değilse boş dönüyor). Kutu görünmüyorsa
 * ya oturum yok ya da bu kayıt bu kullanıcıya bağlı değil.
 *
 * KUTUNUN SÖYLEDİĞİ ŞEY "SİL" DEĞİL, "TALEP AÇ". Sahip kaydı doğrudan
 * silemiyor: dizindeki bir topluluğun kaybolması yalnızca sahibini değil,
 * o kayda bakan herkesi ilgilendiriyor ve karar yönetimde. Düğmenin adı
 * bu yüzden "Silme talebi gönder" — "Sil" yazsaydı, tıklayan kullanıcı
 * işin bittiğini sanırdı.
 */
export function ClubDeletionPanel({
  slug,
  clubName,
}: {
  slug: string;
  clubName: string;
}) {
  const { user, configured } = useAuth();
  const { durum, hata, yenile } = useSilmeDurumu(
    slug,
    Boolean(configured && user)
  );

  const [gerekce, setGerekce] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [formHatasi, setFormHatasi] = useState<string | null>(null);

  /* Sahip değilse hiçbir şey çizilmiyor — hata durumu dahil. Yetkisiz
     ziyaretçiye "silme talebi" kutusunun VARLIĞINI bile göstermenin
     anlamı yok. */
  if (!durum) return null;

  const talep = durum.talep;
  const acikTalep = beklemede(talep);

  async function gonder() {
    setFormHatasi(null);
    setGonderiliyor(true);
    try {
      await silmeTalebiAc(slug, gerekce);
      setGerekce('');
      yenile();
    } catch (e) {
      setFormHatasi(e instanceof Error ? e.message : 'Talep gönderilemedi');
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <Panel
      title="Topluluk yönetimi"
      status={acikTalep ? 'talep incelemede' : 'sahibisiniz'}
    >
      {hata && <Alert className="mb-3">{hata}</Alert>}

      {talep && <TalepOzeti talep={talep} />}

      {acikTalep ? (
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          Silme talebiniz yönetime iletildi. Karar verildiğinde bildirim
          alacaksınız; o zamana kadar <strong>{clubName}</strong> dizinde
          görünmeye devam eder. Aynı topluluk için ikinci bir talep
          açılamıyor.
        </p>
      ) : (
        <>
          <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
            Kaydı doğrudan silemezsiniz; talebi yönetim karara bağlar. Onay
            çıkarsa topluluk dizinden kaldırılır, ret çıkarsa gerekçesi size
            bildirim olarak gelir.
          </p>

          {formHatasi && <Alert className="mb-3">{formHatasi}</Alert>}

          <Field
            label="Silme gerekçesi"
            htmlFor="silme-gerekcesi"
            hint="Kararı bu metne bakarak verilecek; zorunlu."
          >
            <textarea
              id="silme-gerekcesi"
              value={gerekce}
              rows={3}
              onChange={(e) => setGerekce(e.target.value)}
              placeholder="Örn. topluluk dağıldı, kayıt güncelliğini yitirdi."
              className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed text-foreground outline-none focus:border-primary"
            />
          </Field>

          <div className="mt-3">
            <Button
              size="sm"
              variant="danger"
              disabled={gonderiliyor || !gerekce.trim()}
              onClick={() => void gonder()}
            >
              Silme talebi gönder
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}

/**
 * Geçmiş talebin özeti. Reddedilmiş talepte KARAR NOTU açıkça yazıyor:
 * reddedildiğini görüp sebebini görememek, sahibi aynı talebi ikinci kez
 * açmaya iter.
 */
function TalepOzeti({ talep }: { talep: SilmeTalebi }) {
  const etiket: Record<SilmeTalebi['durum'], string> = {
    pending: 'Sırada',
    in_review: 'İncelemede',
    approved: 'Onaylandı',
    rejected: 'Reddedildi',
    escalated: 'Yönetime iletildi',
    archived: 'Kapatıldı',
  };

  return (
    <div className="mb-3 rounded-card border border-border bg-surface-2 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Badge tone={talep.durum === 'rejected' ? 'danger' : 'primary'}>
          {etiket[talep.durum]}
        </Badge>
        <span className="tabular text-meta text-faint">
          {new Date(talep.olusturuldu).toLocaleDateString('tr-TR')}
        </span>
      </div>
      <p className="mt-1.5 text-meta leading-relaxed text-muted-foreground">
        <span className="text-faint">Gerekçeniz: </span>
        {talep.gerekce}
      </p>
      {talep.kararNotu && (
        <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
          <span className="text-faint">Yönetimin cevabı: </span>
          {talep.kararNotu}
        </p>
      )}
    </div>
  );
}
