import { Navigate, useParams } from 'react-router-dom';

/**
 * Kalıcı yönlendirme yardımcıları.
 *
 * Modül adları değiştiğinde (Fotoğraflar → Galeri, Eğitim → Yazılar,
 * İkinci El → İlanlar, Harita → Saha) eski adresler ölü bağlantıya
 * dönüşmemeli: dış siteler, yer imleri ve arama motoru indeksi eski
 * yolları taşımaya devam eder.
 *
 * `replace` kullanılır ki geri tuşu kullanıcıyı yönlendirme döngüsüne
 * sokmasın.
 */

/** Sabit bir adrese yönlendirir. */
export function RedirectTo({ to }: { to: string }) {
  return <Navigate to={to} replace />;
}

/**
 * Parametreli yönlendirme: `/gozlem-noktasi/:slug` → `/saha/:slug`.
 * Şablondaki `:slug` yerine geçerli parametre konur.
 */
export function RedirectParam({
  to,
  param = 'slug',
}: {
  /** Hedef şablon, ör. `/saha/:slug` */
  to: string;
  param?: string;
}) {
  const params = useParams();
  const value = params[param];
  // Parametre yoksa şablonun kök bölümüne düş.
  const target = value
    ? to.replace(`:${param}`, value)
    : to.split('/:')[0];
  return <Navigate to={target} replace />;
}
