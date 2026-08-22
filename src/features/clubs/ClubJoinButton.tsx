import { useState } from 'react';
import { Link } from 'react-router';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import {
  leaveClubMembership,
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
  compact = false,
}: {
  clubSlug: string;
  clubName: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const memberships = useMyClubMemberships(user?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    if (compact) {
      return (
        <ButtonLink to="/giris" size="sm" variant="secondary">
          Katıl
        </ButtonLink>
      );
    }

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
    return (
      <div>
        {!compact && <Badge tone="success">Bu topluluğun üyesisiniz</Badge>}
        <Button
          size="sm"
          variant={compact ? 'secondary' : 'ghost'}
          disabled={busy}
          onClick={() => void ayril()}
          className={compact ? undefined : 'mt-2'}
        >
          {busy ? 'Çıkılıyor…' : 'Çık'}
        </Button>
        {error && (
          <p className="mt-1 text-meta leading-snug text-danger">{error}</p>
        )}
      </div>
    );
  }

  if (mevcut?.status === 'pending') {
    return (
      <div>
        {!compact && <Badge tone="primary">Üyelik isteğiniz onay bekliyor</Badge>}
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => void ayril()}
          className={compact ? undefined : 'mt-2'}
        >
          {busy ? 'İptal ediliyor…' : compact ? 'Bekliyor' : 'İsteği geri çek'}
        </Button>
        {error && (
          <p className="mt-1 text-meta leading-snug text-danger">{error}</p>
        )}
      </div>
    );
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

  async function ayril() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await leaveClubMembership(user.id, clubSlug);
      memberships.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Üyelik güncellenemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button size="sm" disabled={busy} onClick={() => void gonder()}>
        {busy ? 'Gönderiliyor…' : compact ? 'Katıl' : 'Katılma isteği gönder'}
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
