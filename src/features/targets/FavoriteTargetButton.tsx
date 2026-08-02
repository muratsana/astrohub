import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useTargetFavorites } from './favorites';

/**
 * HEDEFİ FAVORİLE / ÇIKAR (§14.1).
 *
 * ══════════════════════════════════════════════════════════════════════
 * OTURUM YOKSA DÜĞME HİÇ ÇİZİLMİYOR
 *
 * "Giriş yapın" diyen devre dışı bir düğme koymadık. Basılamayan bir
 * düğme, kullanıcıya önce bir engel gösterip sonra ne yapacağını
 * anlatmak demek; oysa hedef sayfasının işi hedefi anlatmak. Oturum
 * açıldığında düğme kendiliğinden beliriyor.
 *
 * Aynı sebeple Supabase yapılandırılmamış derlemede de yok: orada
 * favori kaydedilecek bir yer yok.
 *
 * ══════════════════════════════════════════════════════════════════════
 * HATA GÖRÜNÜR — SESSİZ BAŞARISIZLIK YOK
 *
 * `favorites.ts` iyimser güncelleme yapıyor ve hata durumunda geri
 * alıyor. Geri alma tek başına yeterli değil: düğme eski hâline dönerken
 * kullanıcı ne olduğunu anlamaz, "bastım ama olmadı" der. Hata metni
 * düğmenin altında duruyor.
 */
export function FavoriteTargetButton({ slug }: { slug: string }) {
  const { slugs, toggle, available, loading, error } = useTargetFavorites();

  if (!available) return null;

  const favori = slugs.has(slug);

  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant={favori ? 'primary' : 'secondary'}
        disabled={loading}
        /* `aria-pressed`: bu bir aç/kapa düğmesi, ayrı bir eylem değil.
           Ekran okuyucu durumu böyle duyuruyor. */
        aria-pressed={favori}
        onClick={() => void toggle(slug)}
      >
        {favori ? '★ Favorilerimde' : '☆ Favorilere ekle'}
      </Button>

      {error && (
        <Alert tone="danger" variant="text" className="mt-1.5">
          {error}
        </Alert>
      )}
    </div>
  );
}
