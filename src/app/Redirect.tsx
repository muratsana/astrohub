import { Navigate, useLocation, useParams } from 'react-router';

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
 * Sorgu dizesini KORUYARAK yönlendirir.
 *
 * `RedirectTo` yalnızca yolu taşır; paylaşılan bir plan bağlantısında
 * (`/planlayici?h=m31-andromeda:90&y=30`) bu, planın kendisini silmek
 * demekti — kullanıcı boş bir planlayıcıya düşerdi. Adres değişen ama
 * durumu sorguda taşıyan rotalarda bu sürüm kullanılmalı.
 */
export function RedirectKeepQuery({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={`${to}${search}${hash}`} replace />;
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
