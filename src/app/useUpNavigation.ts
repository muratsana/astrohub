import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { upRoute } from './upRoute';

/**
 * "Geri" düğmesinin davranışı: geçmiş varsa geri, yoksa yukarı.
 *
 * `window.history.state?.idx` React Router'ın bu oturumda kaç adım
 * ilerlediğini söylüyor. Sıfır ise kullanıcı bu sayfaya DOĞRUDAN geldi
 * (paylaşılan bağlantı, yeni sekme, yer imi) ve `navigate(-1)` onu
 * siteden çıkarır ya da hiçbir şey yapmaz. O durumda adresten türeyen
 * üst rotaya gidiyoruz.
 *
 * `idx` okunamıyorsa (eski tarayıcı, farklı geçmiş yığını) güvenli
 * taraf üst rota: yanlış yere gitmek yerine bilinen bir yere gitmek.
 */
export function useUpNavigation(): { geriDon: () => void; ustRota: string } {
  const navigate = useNavigate();
  const location = useLocation();
  const ustRota = upRoute(location.pathname);

  const geriDon = useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate(ustRota);
  }, [navigate, ustRota]);

  return { geriDon, ustRota };
}
