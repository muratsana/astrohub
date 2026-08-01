import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { NotFoundPage } from './NotFoundPage';

/**
 * Router hata sınırı. Bir route yüklenirken ya da render edilirken hata
 * olursa tüm uygulamanın boş ekrana düşmesini engeller.
 *
 * Kod bölme ile birlikte önemi artar: ağ kesintisinde bir chunk indirilemezse
 * kullanıcı burada anlaşılır bir mesaj ve yeniden deneme yolu görür.
 *
 * Hatanın ham metni bilerek gösterilir. Teknik bir kitleye hitap eden bir
 * üründe "bir şeyler ters gitti" tek başına hiçbir işe yaramaz; kullanıcı
 * mesajı kopyalayıp bildirebilmeli.
 */
export function RouteError() {
  const error = useRouteError();

  // 404 yanıtları ayrı bir deneyim; hata ekranı gösterilmez.
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : null;

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-danger/30 pb-6">
          <Badge tone="danger">Hata</Badge>
          <h1 className="mt-3 type-page-sm text-foreground">
            Sayfa Yüklenemedi
          </h1>
          <p className="mt-2 max-w-[70ch] text-meta leading-relaxed text-muted-foreground">
            Bu sayfa yüklenirken beklenmeyen bir hata oluştu. Bağlantınızı
            kontrol edip yenilemeyi deneyin.
          </p>
        </div>

        {detail && (
          <div className="mt-4 rounded-card border border-border bg-surface-1 px-3 py-2.5">
            <p className="label">Hata çıktısı</p>
            <p className="tabular mt-1 break-words text-meta leading-relaxed text-danger">
              {detail}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => window.location.reload()}>
            Sayfayı Yenile
          </Button>
          <ButtonLink to="/" variant="secondary" size="sm">
            Ana Sayfa
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
