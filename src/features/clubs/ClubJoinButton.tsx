import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import {
  requestClubMembership,
  useMyClubMemberships,
} from '@/services/content/profileCommunities';

/**
 * TOPLULUĞA KATILMA İSTEĞİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖZELLİK VARDI, YOLU YOKTU
 *
 * `requestClubMembership` ve `club_membership_requests` tablosu
 * çalışıyordu — ama tek giriş HESAP SAYFASININ profil sekmesindeki
 * açılır listeydi. Yani kullanıcı bir topluluğun sayfasına gelip
 * "katılmak istiyorum" dediğinde önce hesabına gitmesi, sonra listeden o
 * topluluğu bulması gerekiyordu. Kulüp sayfasında yalnızca DIŞ katılım
 * bağlantısı görünüyordu ve o da her toplulukta yok.
 *
 * Eksik olan özellik değil, düğmeydi: canlıda sıfır üyelik isteği
 * olmasının sebebi bu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DURUM GÖSTERİLİYOR, TEKRAR SORULMUYOR
 *
 * İstek beklemedeyse ya da onaylandıysa düğme yerine durum yazıyor.
 * Aksi hâlde kullanıcı aynı isteği tekrar tekrar gönderir ve
 * yöneticinin kuyruğu aynı kişinin kopyalarıyla dolardı — `upsert`
 * bunu veritabanında zaten engelliyor ama arayüzün sessiz kalması
 * "gitmedi mi" sorusunu doğururdu.
 *
 * REDDEDİLMİŞ İSTEK YENİDEN GÖNDERİLEBİLİYOR: koşullar değişmiş
 * olabilir ve kalıcı bir kapı, itiraz yolu olmayan bir ret demekti.
 */
export function ClubJoinButton({
  clubSlug,
  clubName,
}: {
  clubSlug: string;
  clubName: string;
}) {
  const { user } = useAuth();
  const memberships = useMyClubMemberships(user?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <p className="text-meta leading-relaxed text-muted-foreground">
        <Link to="/giris" className="text-primary hover:underline">
          Giriş yaparsanız
        </Link>{' '}
        {clubName} topluluğuna katılma isteği gönderebilirsiniz.
      </p>
    );
  }

  /* Yükleme bitmeden düğme çizilmiyor: bekleyen isteği olan kullanıcıya
     bir an "Katılma isteği gönder" göstermek, ona zaten yaptığı işi
     yeniden yaptırmaya davet olurdu. */
  if (memberships.loading) return null;

  const mevcut = memberships.memberships.find((m) => m.clubSlug === clubSlug);

  if (mevcut?.status === 'approved') {
    return <Badge tone="success">Bu topluluğun üyesisiniz</Badge>;
  }

  if (mevcut?.status === 'pending') {
    return <Badge tone="primary">Üyelik isteğiniz onay bekliyor</Badge>;
  }

  async function gonder() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await requestClubMembership(user.id, clubSlug);
      memberships.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İstek gönderilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button size="sm" disabled={busy} onClick={() => void gonder()}>
        {busy ? 'Gönderiliyor…' : 'Katılma isteği gönder'}
      </Button>
      {mevcut?.status === 'rejected' && (
        <p className="mt-1 text-meta leading-snug text-muted-foreground">
          Önceki isteğiniz onaylanmamıştı; yeniden gönderebilirsiniz.
        </p>
      )}
      {error && (
        <p className="mt-1 text-meta leading-snug text-danger">{error}</p>
      )}
    </div>
  );
}
