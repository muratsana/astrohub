import { useState } from 'react';
import { useAuth } from './AuthContext';
import { getSupabase } from '@/services/supabase/client';

/**
 * E-POSTA DOĞRULAMA ŞERİDİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DOĞRULAMA ARTIK BİR KAPI
 *
 * `email_confirmed_at` doluyor ve hesap sayfası durumu gösteriyordu —
 * ama hiçbir yaptırımı yoktu: doğrulanmamış bir hesap fotoğraf
 * yükleyebiliyor, ilan verebiliyor, forum konusu açabiliyordu. 0132 ile
 * yaptırım RLS'e taşındı (`app.yazabilir`).
 *
 * Yaptırım veritabanında olunca kullanıcı ham bir hata görür: "new row
 * violates row-level security policy". Bu şerit o boşluğu kapatıyor —
 * `AccountStatusNotice` askı için ne yapıyorsa aynısı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ŞERİT, NEDEN MODAL DEĞİL
 *
 * Doğrulama kullanıcının ELİNDE OLAN bir iş değil: postayı beklemesi,
 * belki spam klasörüne bakması gerekiyor. Ekranı kaplayan bir modal
 * onu, kendi tamamlayamayacağı bir adımda siteden dışarı kilitlerdi.
 * Okumak serbest, yazmak kapalı — askı ile aynı denge.
 *
 * `ProfileSetupGate` MODAL, çünkü orada istenen iki alan tamamen
 * kullanıcının elinde ve bir dakikada bitiyor.
 */
export function EmailVerificationNotice() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sonuc, setSonuc] = useState<string | null>(null);

  if (loading || !user) return null;
  /*
   * `confirmed_at` de kontrol ediliyor: telefonla doğrulanmış hesapta
   * `email_confirmed_at` boş kalabiliyor ve o kullanıcıya doğrulanmamış
   * muamelesi yapmak yanlış olurdu. Hesap sayfası da aynı ikiliyi
   * okuyor — tek bir tanesine bakan bir kontrol, iki ekranın farklı
   * cevap vermesi demekti.
   */
  if (user.email_confirmed_at || user.confirmed_at) return null;

  async function resend() {
    const email = user?.email;
    if (!email) return;
    setBusy(true);
    setSonuc(null);
    try {
      const promise = getSupabase();
      if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
      const supabase = await promise;
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      /*
       * Hata METNİ gösteriliyor, yutulmuyor. En sık dönen hata sıklık
       * sınırı ("For security purposes…") ve kullanıcı bunu görmezse
       * düğmeye basmaya devam eder, postayı beklemez.
       */
      setSonuc(
        error
          ? `Gönderilemedi: ${error.message}`
          : 'Doğrulama bağlantısı yeniden gönderildi.'
      );
    } catch (e) {
      setSonuc(e instanceof Error ? e.message : 'Gönderilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="status"
      className="border-b border-warning/40 bg-warning/10 px-4 py-2.5 text-body-sm text-warning"
    >
      <div className="mx-auto flex max-w-[90rem] flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong>E-posta adresiniz doğrulanmadı.</strong>
        <span className="text-foreground">
          Siteyi gezebilirsiniz ama fotoğraf yükleyemez, ilan açamaz, yorum ve
          forum iletisi yazamazsınız. {user.email} adresine gönderdiğimiz
          bağlantıya tıklayın.
        </span>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy}
          className="underline underline-offset-2 disabled:opacity-60"
        >
          {busy ? 'Gönderiliyor…' : 'Yeniden gönder'}
        </button>
        {sonuc && <span className="text-muted-foreground">{sonuc}</span>}
      </div>
    </div>
  );
}
