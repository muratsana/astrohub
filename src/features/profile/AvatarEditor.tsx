import { KadrajEditoru } from './KadrajEditoru';
import {
  AVATAR_HEDEF,
  BANNER_ASPECT,
  BANNER_HEDEF,
} from '@/domain/profile/avatar';
import {
  profileAvatarUrl,
  profileBannerUrl,
  removeProfileAvatar,
  removeProfileBanner,
  uploadProfileAvatar,
  uploadProfileBanner,
  type Profile,
} from '@/services/content/profile';

/**
 * PROFİL GÖRSELLERİ — AVATAR VE KAPAK.
 *
 * İkisi de `KadrajEditoru`nun aynı örneği; farkları yalnızca en-boy
 * oranı, hedef ölçü ve hangi alana yazdıkları. Ayrı iki editör yazmak,
 * kullanıcının aynı hareketi iki ayrı kodda yaşaması demekti — birinde
 * düzeltilen bir davranış diğerinde eski kalırdı.
 */

export function AvatarEditor({
  userId,
  profile,
  onDone,
}: {
  userId: string | undefined;
  profile: Profile | null;
  onDone: () => void;
}) {
  const mevcut = profileAvatarUrl(profile?.avatarPath);

  return (
    <KadrajEditoru
      baslik="Profil fotoğrafı"
      aciklama="Fotoğraf kare profil görseline kırpılır. Büyük dosyalar yükleme öncesi otomatik optimize edilir; kaydedilen dosya 5 MB sınırını geçemez. Kesikli daire, fotoğrafın yuvarlak gösterildiği yerlerde görünecek kısmı işaretler."
      enBoy={1}
      hedef={AVATAR_HEDEF}
      mevcutUrl={mevcut}
      onizlemeSinifi="h-36 w-36 rounded-full"
      secEtiketi="Fotoğraf seç"
      degistirEtiketi="Fotoğraf değiştir"
      kaydetEtiketi="Profil fotoğrafı yap"
      silEtiketi="Fotoğrafı sil"
      hazir={Boolean(userId)}
      onKaydet={async (blob) => {
        if (!userId) return;
        await uploadProfileAvatar(userId, blob, profile?.avatarPath);
        onDone();
      }}
      onSil={
        profile?.avatarPath && userId
          ? async () => {
              await removeProfileAvatar(userId, profile.avatarPath);
              onDone();
            }
          : null
      }
    />
  );
}

export function BannerEditor({
  userId,
  profile,
  onDone,
}: {
  userId: string | undefined;
  profile: Profile | null;
  onDone: () => void;
}) {
  const mevcut = profileBannerUrl(profile?.bannerPath);

  return (
    <KadrajEditoru
      baslik="Kapak görseli"
      aciklama="Public profilinizin üst bandı. Kendi karelerinizden biri burada, profil fotoğrafınızın arkasında durur. 3:1 orana kırpılır; sürükleyerek hangi bandın görüneceğini siz seçersiniz."
      enBoy={BANNER_ASPECT}
      hedef={BANNER_HEDEF}
      mevcutUrl={mevcut}
      onizlemeSinifi="h-24 w-72 max-w-full rounded-card"
      secEtiketi="Kapak seç"
      degistirEtiketi="Kapağı değiştir"
      kaydetEtiketi="Kapak yap"
      silEtiketi="Kapağı sil"
      hazir={Boolean(userId)}
      onKaydet={async (blob) => {
        if (!userId) return;
        await uploadProfileBanner(userId, blob, profile?.bannerPath);
        onDone();
      }}
      onSil={
        profile?.bannerPath && userId
          ? async () => {
              await removeProfileBanner(userId, profile.bannerPath);
              onDone();
            }
          : null
      }
    />
  );
}
