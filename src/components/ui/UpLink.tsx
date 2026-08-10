import { useUpNavigation } from '@/app/useUpNavigation';
import { cn } from '@/lib/cn';

/**
 * DETAY SAYFALARININ GERİ DÖNÜŞÜ (§6.7, FAZ 11).
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİ AYRI SORUN, TEK BİLEŞEN
 *
 * Detay sayfalarında geri dönüş bugüne kadar üst rotaya SABİT bir
 * bağlantıydı ("← Yazılar"). Geçmiş boşken doğru çalışıyordu ama
 * geldiğiniz yeri unutuyordu: arama sonucundan, profilden ya da
 * etiket sayfasından gelen ziyaretçi "geri" deyince o listeye değil
 * modülün köküne düşüyordu — ve orada aradığı satır yoktu.
 *
 * `navigate(-1)` ise tersini yapıyor: geldiğiniz yeri biliyor ama
 * paylaşılan bir bağlantıyla açılan sayfada (geçmiş boş) hiçbir şey
 * yapmıyor. Fotoğraf ve etkinlik adresleri paylaşılmak için var, yani
 * bu yol nadir değil.
 *
 * Bileşen ikisini sırayla deniyor: geçmiş varsa geri, yoksa üst rota.
 * Etiket hep üst rotayı yazıyor ("← Yazılar") çünkü kullanıcıya
 * söylenebilecek tek KESİN yer orası — geçmişin nereye gittiğini
 * önceden bilemeyiz ve "Geri" yazan bir düğme hiçbir şey öğretmez.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `<button>`, `<a>` DEĞİL
 *
 * Tıklama hedefi duruma göre değişiyor; `href` yazsaydık orta tıkla
 * açılan sekme etiketle uyuşmayan bir sayfaya giderdi. Yeni sekmede
 * açılması anlamlı olan bağlantı, sayfanın kendi iz (breadcrumb)
 * bağlantılarıdır — bu düğme bir gezinme eylemi.
 */
export function UpLink({
  etiket,
  className,
}: {
  /** Üst rotanın adı — "Yazılar", "Tüm etkinlikler". */
  etiket: string;
  className?: string;
}) {
  const { geriDon } = useUpNavigation();

  return (
    <button
      type="button"
      onClick={geriDon}
      className={cn(
        'label text-muted-foreground transition-colors hover:text-primary',
        className
      )}
    >
      ← {etiket}
    </button>
  );
}
