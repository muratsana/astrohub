import { Button } from '@/components/ui/Button';
import { useRoles } from '@/features/admin/useRoles';
import { downloadText } from '@/lib/download';
import { csvFileName, toCsv, type CsvColumn } from '@/lib/csv';

/**
 * CSV DIŞA AKTARMA — "yalnızca yetkili admin için" (Faz 4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÜĞME YÖNETİCİ DEĞİLSE HİÇ ÇİZİLMİYOR
 *
 * Devre dışı bir düğme göstermek de mümkündü ve yapılmadı: sıradan
 * kullanıcıya erişemeyeceği bir yetenek göstermek, ona ürünün eksik
 * olduğunu düşündürür. Bileşen `null` dönüyor — kişisel facet'ler ve
 * kaydedilmiş görünümlerle aynı kural.
 *
 * BU BİR YETKİ KONTROLÜ DEĞİL, ARAYÜZ KARARI. Gerçek koruma
 * veritabanında: dışa aktarılan satırlar zaten RLS'in kullanıcıya
 * verdiği satırlar. Düğmeyi gizlemek veriyi gizlemiyor; veriyi RLS
 * gizliyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SÜZÜLMÜŞ LİSTE DIŞA AKTARILIYOR, TAMAMI DEĞİL
 *
 * Yönetici ekranda ne görüyorsa onu indiriyor. "Hepsini indir" ayrı bir
 * ihtiyaç ve ayrı bir karar: sayfalama sunucuya taşındığında (bkz.
 * `query.ts` başlığı) ekrandaki liste ile tablodaki liste ayrışacak ve
 * o gün hangisinin indirileceği açıkça seçilmeli. Bugün ikisi aynı ve
 * ekrandakini indirmek şaşırtmayan davranış.
 */
export function CsvExportButton<T>({
  module,
  rows,
  columns,
}: {
  /** Dosya adına giren modül anahtarı (`galeri`, `ilanlar`…). */
  module: string;
  /** Ekranda görünen (süzülmüş) satırlar. */
  rows: readonly T[];
  columns: CsvColumn<T>[];
}) {
  const roles = useRoles();
  if (!roles.isAdmin) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={rows.length === 0}
      title={
        rows.length === 0
          ? 'Dışa aktarılacak kayıt yok'
          : `${rows.length} kayıt CSV olarak inecek`
      }
      onClick={() =>
        downloadText(
          csvFileName(module),
          toCsv(rows, columns),
          'text/csv;charset=utf-8'
        )
      }
    >
      CSV indir
    </Button>
  );
}
