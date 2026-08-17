import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { exportMyData } from '@/services/content/profile';

/**
 * VERİ DIŞA AKTARMA (KVKK m.11).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SİLME VARDI, ALMA YOKTU
 *
 * `account_export_logs` tablosu 0022'den beri duruyordu ve tek satır kod
 * ona dokunmuyordu. Hesap sayfasında "Hesabımı sil" vardı — yani KVKK
 * m.11'in silme hakkı karşılanmış, veri isteme hakkı karşılanmamıştı.
 * Kullanıcı verisini alamadan silmek zorunda kalıyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN DOĞRUDAN İNDİRME
 *
 * Dosya sunucuda üretilip depoya konmuyor: JSON tarayıcıda `Blob`a
 * çevrilip iniyor. Depoya koysaydık, kişisel veri içeren bir dosya
 * bizim tarafımızda beklemeye başlardı ve onu ne kadar süre tutacağımız
 * yeni bir saklama kararı olurdu. En iyi saklama süresi, hiç
 * saklamamak.
 *
 * `URL.revokeObjectURL` ŞART: her indirmede bir nesne URL'i bırakılırsa
 * sekme açık kaldığı sürece JSON bellekte kalır — hem sızıntı hem de
 * kişisel verinin gereksiz yere bellekte durması.
 */
export function DataExportPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function download() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      /* Tarih dosya adında: kullanıcı iki farklı zamanda indirdiğinde
         hangisinin yeni olduğunu dosya adından görmeli. */
      link.download = `astrohub-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Veriler alınamadı.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Verilerimi indir">
      <p className="text-meta leading-relaxed text-muted-foreground">
        Hesabınıza bağlı verilerin tamamını JSON dosyası olarak
        indirebilirsiniz: profiliniz, fotoğraflarınız, ilanlarınız, forum
        iletileriniz, yorumlarınız, gözlem günlüğünüz, ekipmanlarınız ve
        gönderdiğiniz mesajlar.
      </p>
      {/* Kapsamın SINIRI da yazıyor: kullanıcı eksik sandığı bir şeyin
          neden orada olmadığını dosyayı açtıktan sonra aramamalı. */}
      <p className="mt-2 text-meta leading-snug text-faint">
        Başkalarının size gönderdiği mesajlar dosyaya girmez — onlar
        gönderenin verisidir.
      </p>

      {error && (
        <p className="mt-2 text-meta leading-snug text-danger">{error}</p>
      )}
      {done && (
        <p className="mt-2 text-meta leading-snug text-success">
          Dosya indirildi.
        </p>
      )}

      <Button
        className="mt-3"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={() => void download()}
      >
        {busy ? 'Hazırlanıyor…' : 'JSON olarak indir'}
      </Button>
    </Panel>
  );
}
