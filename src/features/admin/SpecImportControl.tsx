import { useMemo, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  applySpecImport,
  parseSpecTable,
  type ImportOutcome,
} from './specImport';
import { cn } from '@/lib/cn';

/**
 * TOPLU TEKNİK VERİ İÇE AKTARMA — panel arayüzü.
 *
 * Piyasa listesinden 972 model geldi ama listede tek bir sayısal alan
 * yok. Bunları tek tek girmek yüzlerce saat; tahminle doldurmak yasak
 * çünkü uyumluluk motoru tam olarak o değerlerle hesap yapıyor. Bu
 * ekran aradaki yolu açıyor.
 *
 * ÖNİZLEME ZORUNLU BİR ADIM, kolaylık değil. Yanlış sütun eşlemesi
 * (ör. "Odak" sütununun açıklık sanılması) ancak sonuca bakınca fark
 * ediliyor ve yazıldıktan sonra geri almanın yolu yok. Bu yüzden
 * "Yaz" düğmesi ayrıştırma yapılmadan etkin olmuyor.
 *
 * SORUNLU SATIRLAR GİZLENMİYOR. "412 satırdan 380'i yazıldı" demek,
 * kalan 32'nin nereye gittiğini sormayı gerektirir; her satır kendi
 * numarası ve gerekçesiyle listeleniyor.
 */
export function SpecImportControl({ canWrite }: { canWrite: boolean }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* Ayrıştırma her tuşta değil, yalnızca metin değişince yapılıyor —
     ama yine de saf ve ucuz olduğu için `useMemo` yetiyor. */
  const parsed = useMemo(() => parseSpecTable(text), [text]);

  const problemRows = parsed.rows.filter((r) => r.problems.length > 0);

  async function apply() {
    setBusy(true);
    setError(null);
    setOutcome(null);
    try {
      setOutcome(await applySpecImport(parsed.rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İçe aktarma başarısız');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Teknik veri içe aktarma"
      status={
        parsed.rows.length > 0 ? (
          <span className="tabular text-meta text-faint">
            {parsed.clean}/{parsed.rows.length} satır hazır
          </span>
        ) : undefined
      }
    >
      <p className="mb-3 text-body-sm leading-relaxed text-muted-foreground">
        Üretici sayfasından ya da bir tablodan kopyaladığınız satırları
        yapıştırın. İlk satır başlık olmalı. Eşleşme için{' '}
        <span className="tabular text-foreground">slug</span> ya da{' '}
        <span className="tabular text-foreground">marka + model</span>{' '}
        sütunu gerekir. <span className="text-foreground">Boş hücre
        yazılmaz</span> — bir alanı silmek için bu ekran kullanılmaz.
      </p>

      {/* Kabul edilen başlıkları örneklemek, sütun eşlemesini denemeyle
          bulmayı gereksiz kılıyor. */}
      <pre className="mb-3 overflow-x-auto rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed text-muted-foreground">
{`slug	Odak (mm)	Açıklık (mm)	Görüntü çemberi	Çıkış
askar-fra400	400	72	44	M48x0.75`}
      </pre>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        spellCheck={false}
        placeholder="Başlık satırı ve veriyi buraya yapıştırın…"
        className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 font-mono text-meta leading-relaxed text-foreground outline-none transition-colors focus:border-primary"
      />

      {parsed.rows.length > 0 && (
        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {parsed.columns.map((column) => (
              <Badge key={column} tone="cold">
                {column}
              </Badge>
            ))}
            {parsed.ignoredHeaders.map((header) => (
              <Badge key={header} tone="muted">
                {header} · yok sayıldı
              </Badge>
            ))}
          </div>

          {parsed.ignoredHeaders.length > 0 && (
            <p className="text-meta leading-snug text-faint">
              Tanınmayan başlıklar yazılmaz. Doğru sütun adları için
              yukarıdaki örneğe bakın.
            </p>
          )}

          {problemRows.length > 0 && (
            <div className="rounded-card border border-warning/40 bg-surface-2 px-2.5 py-2">
              <p className="mb-1 text-meta text-warning">
                {problemRows.length} satır yazılmayacak:
              </p>
              <ul className="max-h-40 space-y-0.5 overflow-y-auto text-meta leading-snug text-muted-foreground">
                {problemRows.slice(0, 40).map((row) => (
                  <li key={row.line}>
                    <span className="tabular text-faint">satır {row.line}</span>{' '}
                    — {row.problems.join(' · ')}
                  </li>
                ))}
                {problemRows.length > 40 && (
                  <li className="text-faint">
                    …ve {problemRows.length - 40} satır daha
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          onClick={apply}
          disabled={!canWrite || busy || parsed.clean === 0}
          size="sm"
        >
          {busy
            ? 'Yazılıyor…'
            : `${parsed.clean} satırı yaz`}
        </Button>
        {text && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setText('');
              setOutcome(null);
            }}
            disabled={busy}
          >
            Temizle
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-card border border-danger/45 bg-surface-2 px-2.5 py-2 text-meta text-danger">
          {error}
        </p>
      )}

      {outcome && (
        <div className="mt-3 rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta leading-relaxed">
          <p className="text-success">{outcome.updated} kayıt güncellendi.</p>
          {outcome.unmatched.length > 0 && (
            <div className="mt-1.5">
              <p className="text-warning">
                {outcome.unmatched.length} satırın katalogda karşılığı
                bulunamadı:
              </p>
              <ul className="mt-0.5 max-h-32 space-y-0.5 overflow-y-auto text-meta text-muted-foreground">
                {outcome.unmatched.slice(0, 30).map((row) => (
                  <li key={row.line} className="tabular">
                    satır {row.line} · {row.slug ?? `${row.brand} ${row.model}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {outcome.errors.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-meta text-danger">
              {outcome.errors.slice(0, 10).map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          {/*
            Güven seviyesi neden yükseltilmedi: değer tek bir dosyadan
            geldi ve ikinci bir kaynakla karşılaştırılmadı. 'dogrulanmis'
            saymak, yapılmamış bir doğrulamayı yapılmış göstermek olurdu.
          */}
          <p className={cn('mt-1.5 text-meta leading-snug text-faint')}>
            Yazılan kayıtlar "tek-kaynak" güven seviyesiyle işaretlendi.
            İkinci bir kaynakla doğruladığınızda eksik veri raporundan
            yükseltebilirsiniz.
          </p>
        </div>
      )}

      {!canWrite && (
        <p className="mt-2 text-meta text-faint">
          Yazmak için yönetici rolü gerekir; yetkiyi RLS politikası zorlar.
        </p>
      )}
    </Panel>
  );
}
