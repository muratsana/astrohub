import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { AlertIcon } from '@/components/ui/icons';
import { NotFoundPage } from './NotFoundPage';

/**
 * Router hata sınırı. Bir route yüklenirken ya da render edilirken hata
 * olursa tüm uygulamanın boş ekrana düşmesini engeller.
 *
 * Kod bölme ile birlikte önemi artar: ağ kesintisinde bir chunk indirilemezse
 * kullanıcı burada anlaşılır bir mesaj ve yeniden deneme yolu görür.
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
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="mb-4 rounded-full border border-danger/30 bg-danger/10 p-4 text-danger">
        <AlertIcon className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Bir şeyler ters gitti
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        Bu sayfa yüklenirken beklenmeyen bir hata oluştu. Bağlantınızı kontrol
        edip sayfayı yenilemeyi deneyin.
      </p>
      {detail && (
        <p className="mt-4 max-w-lg break-words rounded-card border border-border bg-surface-1 px-4 py-2 text-xs text-muted-foreground">
          {detail}
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Sayfayı yenile
        </button>
        <ButtonLink to="/" variant="secondary">
          Ana sayfaya dön
        </ButtonLink>
      </div>
    </Container>
  );
}
