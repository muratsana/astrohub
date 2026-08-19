import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FollowLists } from '@/features/profile/ProfileShowcase';
import { useAuth } from '@/features/auth/AuthContext';
import {
  blockUser,
  unblockUser,
  useFollow,
  useIsBlocked,
  type FollowState,
} from '@/services/content/social';
import { MessageButton } from './MessageButton';

/**
 * PROFİL EYLEM ŞERİDİ — takip, mesaj, engelle.
 *
 * ÜÇÜ BİR ARADA ÇÜNKÜ ÜÇÜ AYNI KARARIN DERECELERİ: bu kişiyle daha çok
 * ilgilen, bu kişiyle konuş, bu kişiyi hiç görme. Ayrı yerlere dağıtmak,
 * rahatsız edici bir profille karşılaşan kullanıcıyı engelleme düğmesini
 * aramaya zorlardı.
 *
 * ENGELLİYKEN TAKİP VE MESAJ GÖSTERİLMİYOR. İkisi de sunucuda
 * reddediliyor (RLS `with check` ve `start_direct_conversation`);
 * ekranda bırakmak, basıldığında hata verecek düğmeler bırakmak olurdu.
 *
 * KARŞI TARAFIN BENİ ENGELLEYİP ENGELLEMEDİĞİ OKUNAMIYOR — okunmamalı
 * da (0041). O durumda düğmeler görünüyor, basınca sunucu "bu kullanıcıyla
 * mesajlaşamazsınız" diyor ve hangi tarafın engellediği söylenmiyor.
 */
export function UserActions({
  targetUserId,
  displayName,
  follow: disaridan,
  showFollowLists = true,
}: {
  targetUserId: string | undefined;
  displayName: string;
  /**
   * Takip durumu dışarıdan verilebilir.
   *
   * Profil sayfası takipçi sayısını başlıkta gösteriyor ve bunun için
   * `useFollow`u zaten çağırıyor. Buranın ikinci kez çağırması, her
   * profil açılışında aynı iki sayımı boşuna tekrarlamak olurdu.
   */
  follow?: FollowState;
  showFollowLists?: boolean;
}) {
  const { user } = useAuth();
  /* Dışarıdan durum geldiyse kendi sorgumuzu KURMUYORUZ: `undefined`
     hedefle çağrılan kanca ağa hiç çıkmıyor. Kancayı koşullu çağırmak
     React kurallarını çiğnerdi; hedefi boşaltmak aynı sonucu kurallara
     uyarak veriyor. */
  const kendi = useFollow(disaridan ? undefined : targetUserId);
  const follow = disaridan ?? kendi;
  const { blocked, refresh: refreshBlock } = useIsBlocked(targetUserId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Kendi profilinde eylem şeridi yok: kendini takip etmek, kendine mesaj
     atmak ve kendini engellemek üçü de anlamsız. */
  if (!targetUserId || (user && user.id === targetUserId)) return null;

  async function toggleBlock() {
    if (!targetUserId) return;
    setBusy(true);
    setError(null);
    try {
      if (blocked) {
        await unblockUser(targetUserId);
      } else {
        await blockUser(targetUserId);
      }
      refreshBlock();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem tamamlanamadı');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {!blocked && follow.canFollow && (
          <Button
            type="button"
            size="sm"
            variant={follow.following ? 'secondary' : 'primary'}
            disabled={follow.busy}
            onClick={() => void follow.toggle()}
          >
            {follow.following ? 'Takibi bırak' : 'Takip et'}
          </Button>
        )}

        {!blocked && <MessageButton targetUserId={targetUserId} />}

        {user && (
          <Button
            type="button"
            size="sm"
            variant={blocked ? 'secondary' : 'ghost'}
            disabled={busy}
            onClick={() => void toggleBlock()}
          >
            {blocked ? 'Engeli kaldır' : 'Engelle'}
          </Button>
        )}
      </div>

      {/*
        SAYAÇLAR AYNI KANCADAN, AYRI BİR BİLEŞENDEN DEĞİL. Başlığa koymak
        için ikinci bir `useFollow` çağırmak, aynı sayfada aynı iki sorguyu
        (sayaç RPC'si + takip durumu) iki kez çalıştırmak olurdu.

        SAYAÇLAR ARTIK TIKLANABİLİR. Düz metin olduklarında kullanıcı "12
        takipçi" görüyor ve kimler olduğunu öğrenemiyordu — sayı bir
        çıkmazdı. Liste yalnızca açıldığında çekiliyor.
      */}
      {showFollowLists && (
        <div className="mt-2">
          <FollowLists
            userId={targetUserId}
            followers={follow.followers}
            following={follow.followingCount}
          />
        </div>
      )}

      {blocked && (
        <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
          {displayName} engellendi: birbirinize mesaj gönderemez ve takip
          edemezsiniz. Engeli kaldırsan bile takip kendiliğinden geri gelmez.
        </p>
      )}

      {(error || follow.error) && (
        <Alert variant="text" className="mt-2">
          {error ?? follow.error}
        </Alert>
      )}
    </div>
  );
}
