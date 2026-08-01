import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { NotFoundPage } from '@/components/NotFoundPage';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useRadioHost } from '@/services/content/radioStation';

/**
 * YAYINCI PROFİLİ (§10.2 "yayıncı profilleri").
 *
 * ASKIYA ALINMIŞ YAYINCININ SAYFASI DURUYOR VE BUNU SÖYLÜYOR.
 * `suspended_at` yayın YETKİSİNİ kaldırıyor, künyeyi değil (0051):
 * geçmiş programların sunucusunu silmek, o programların künyesini
 * boşaltmak olurdu. Sayfa "şu an yayın yapmıyor" diyor — kişiyi yok
 * saymıyor, ama yayında sanılmasına da izin vermiyor.
 *
 * ASKIYA ALMA SEBEBİ YAZILMIYOR. "Neden askıda" sorusunun cevabı
 * kişiyle yönetim arasındadır; herkese açık bir profilde yazması,
 * disiplin kararını ilan etmek olurdu.
 */
export function HostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { host, loading, notFound } = useRadioHost(slug);

  if (notFound) return <NotFoundPage />;

  if (loading || !host) {
    return (
      <Container className="py-8 sm:py-10">
        <p className="py-10 text-center text-meta text-muted-foreground" role="status">
          Yükleniyor…
        </p>
      </Container>
    );
  }

  return (
    <>
      <PageMeta
        title={`${host.name} — Astrohub Radyo`}
        description={host.bio.slice(0, 160) || `${host.name} — Astrohub Radyo yayıncısı.`}
        image={host.avatarUrl ? { url: host.avatarUrl } : undefined}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
          { name: host.name, path: `/radyo/yayinci/${host.slug}` },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Radyo', to: '/radyo' },
            { label: host.name },
          ]}
          title={host.name}
          actions={
            host.suspended ? (
              <Badge tone="muted">Şu an yayın yapmıyor</Badge>
            ) : undefined
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div>
            {host.avatarUrl && (
              <img
                src={host.avatarUrl}
                alt=""
                width={96}
                height={96}
                className="mb-4 h-24 w-24 rounded-full object-cover"
              />
            )}
            {host.bio ? (
              <p className="whitespace-pre-line text-body leading-relaxed text-foreground">
                {host.bio}
              </p>
            ) : (
              <p className="text-body-sm text-muted-foreground">
                Bu yayıncı için henüz bir tanıtım yazısı yok.
              </p>
            )}
          </div>

          <aside>
            <Panel title="Programları" bodyClassName="p-3">
              {host.programs.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">
                  Yayımlanmış programı yok.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {host.programs.map((program) => (
                    <li key={program.slug}>
                      <Link
                        to={`/radyo/program/${program.slug}`}
                        className="text-body-sm text-primary hover:underline"
                      >
                        {program.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </aside>
        </div>
      </Container>
    </>
  );
}
