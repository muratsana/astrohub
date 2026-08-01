import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from './AuthContext';
import { CONSENT_VERSION } from './consent';
import { recordConsent } from '@/services/content/profile';
import { useMyProfile } from '@/services/content/profile';

/**
 * GİRİŞ SONRASI ONAY EKRANI.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KAYIT FORMU YETMİYOR
 *
 * Onay kutuları kayıt formunda duruyor ama o formdan geçmeyen iki
 * kullanıcı sınıfı var:
 *
 *   1. GOOGLE İLE GİRENLER. OAuth akışı tarayıcıyı doğrudan Google'a
 *      yönlendiriyor ve geri döndüğünde hesap açılmış oluyor — arada
 *      bizim gösterebileceğimiz bir ekran yok. Google butonu giriş
 *      sayfasında da duruyor, yani "kayıt formuna onay kutusu koyduk"
 *      demek bu yolu kapatmıyor.
 *   2. 0031 ÖNCESİNDE AÇILMIŞ HESAPLAR. Onayları alınmıştı ama
 *      hiçbir yere yazılmamıştı; kayıt bulunmadığı için ispat da yok.
 *
 * Bu yüzden kapı KAYITTA değil, OTURUMDA duruyor: profilinde onay
 * kaydı olmayan herkes — nasıl girdiğinden bağımsız — bir kez bu
 * ekranı görüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ENGELLEYİCİ, AMA HAPSEDİCİ DEĞİL
 *
 * Ekran içeriği örtüyor çünkü onay alınmadan kişisel veri işleyen bir
 * arayüz sunmak istemiyoruz. Ama "çıkış yap" her zaman açık: onay
 * vermek istemeyen kullanıcı hesabından çıkabilmeli, ekranda kilitli
 * kalmamalı. Onay vermemek bir seçenek olmalı — aksi hâlde "rıza"
 * değil dayatma olur.
 *
 * Profil daha yüklenmediyse HİÇBİR ŞEY gösterilmiyor: yükleme
 * sırasında ekranı bir saniyeliğine kaplamak, onayı zaten vermiş
 * kullanıcıya her girişte yanıp sönen bir engel gibi görünürdü.
 */
export function ConsentGate() {
  const { user, signOut } = useAuth();
  const profile = useMyProfile(user?.id);

  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!user) return null;
  // Profil henüz yüklenmediyse ekranı kaplamıyoruz (bkz. üstteki not).
  if (profile.loading || !profile.profile) return null;
  if (profile.profile.termsAcceptedAt || done) return null;

  async function confirm() {
    setSaving(true);
    setError(null);
    const message = await recordConsent(CONSENT_VERSION);
    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    /*
     * Yerel bayrak: profil kancasını yeniden çalıştırmak yerine ekranı
     * hemen kaldırıyoruz. Sunucu yazması başarılı döndü; kullanıcıyı
     * bir ağ turu daha bekletmenin karşılığı yok.
     */
    setDone(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-card border border-border-strong bg-surface-1 p-6">
        <h2 id="consent-title" className="type-panel font-bold text-foreground">
          Devam etmeden önce
        </h2>
        <p className="mt-2 text-body-sm leading-relaxed text-muted-foreground">
          Hesabınız için kullanım koşulları ve KVKK aydınlatma metni onayı
          kayıtlarımızda görünmüyor. Devam etmek için ikisini de onaylayın.
        </p>

        <div className="mt-5 space-y-3">
          <label className="flex items-start gap-2.5 text-body-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border bg-surface-2 accent-primary"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span>
              <Link
                to="/kullanim-kosullari"
                target="_blank"
                className="text-cold underline underline-offset-2"
              >
                Kullanım Koşulları
              </Link>
              ’nı okudum, onaylıyorum. Yüklediğim fotoğrafları Astrohub’ın
              adımı kaynak göstererek kullanabileceğini kabul ediyorum.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-body-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border bg-surface-2 accent-primary"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
            />
            <span>
              <Link
                to="/kvkk"
                target="_blank"
                className="text-cold underline underline-offset-2"
              >
                KVKK Aydınlatma Metni
              </Link>
              ’ni okudum, kişisel verilerimin metinde açıklandığı şekilde
              işlenmesini kabul ediyorum.
            </span>
          </label>
        </div>

        {error && (
          <div className="mt-4">
            <Alert variant="text">{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void confirm()}
            disabled={!terms || !privacy || saving}
          >
            {saving ? 'Kaydediliyor…' : 'Onaylıyorum, devam et'}
          </Button>
          {/*
            Vazgeçme yolu her zaman açık. Onay vermeden çıkamayan bir
            ekran, rızayı rıza olmaktan çıkarır.
          */}
          <Button variant="ghost" onClick={() => void signOut()}>
            Çıkış yap
          </Button>
        </div>
      </div>
    </div>
  );
}
