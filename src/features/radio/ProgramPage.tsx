import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { NotFoundPage } from '@/components/NotFoundPage';
import { breadcrumbJsonLd } from '@/lib/seo';
import {
  useProgram,
  useProgramFollow,
  useStation,
} from '@/services/content/radioStation';
import { currentOccurrence, nextOccurrence, weekdayName } from './schedule';

/**
 * PROGRAM DETAYI (§10.2 "program detayları").
 *
 * ═══════════════════════════════════════════════════════════════════════
 * "SONRAKİ YAYIN" YAZIYOR, "CANLI" DEĞİL
 *
 * Bu sayfa bir programa ait; canlılık istasyona ait. Program sayfasında
 * "CANLI" rozeti göstermek, o programın yayında olduğunu iddia etmek
 * olurdu — oysa istasyon ayakta olsa bile o an başka bir program
 * çalıyor olabilir.
 *
 * Rozet yalnızca ÜÇ koşul birden sağlanınca çıkıyor: istasyon ölçülmüş
 * biçimde ayakta, takvimde şu an bir yayın var VE o yayın BU programın.
 * ═══════════════════════════════════════════════════════════════════════
 */
export function ProgramPage() {
  const { slug } = useParams<{ slug: string }>();
  const { program, loading, notFound } = useProgram(slug);
  const { live } = useStation();
  const follow = useProgramFollow(program?.id);

  const suan = useMemo(
    () => (program ? currentOccurrence(program.slots) : null),
    [program]
  );
  const sirada = useMemo(
    () => (program ? nextOccurrence(program.slots) : null),
    [program]
  );

  if (notFound) return <NotFoundPage />;

  if (loading || !program) {
    return (
      <Container className="py-8 sm:py-10">
        <p className="py-10 text-center text-meta text-muted-foreground" role="status">
          Yükleniyor…
        </p>
      </Container>
    );
  }

  /* Üç koşul birden — dosya başındaki gerekçe. */
  const buProgramCanli = live && Boolean(suan);

  return (
    <>
      <PageMeta
        title={`${program.title} — Astrohub Radyo`}
        description={program.summary || program.description.slice(0, 160)}
        image={program.artworkUrl ? { url: program.artworkUrl } : undefined}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Radyo', path: '/radyo' },
          { name: program.title, path: `/radyo/program/${program.slug}` },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Radyo', to: '/radyo' },
            { label: program.title },
          ]}
          title={program.title}
          description={program.summary || undefined}
          actions={
            buProgramCanli ? <Badge tone="success">Şu an yayında</Badge> : undefined
          }
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          <div>
            {program.description && (
              <p className="whitespace-pre-line text-body leading-relaxed text-foreground">
                {program.description}
              </p>
            )}

            {program.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {program.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
            )}

            {program.hosts.length > 0 && (
              <section className="mt-8">
                <h2 className="type-section mb-3 font-semibold text-foreground">
                  Sunanlar
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {program.hosts.map((host) => (
                    <li key={host.id}>
                      <Link
                        to={`/radyo/yayinci/${host.slug}`}
                        className="flex items-center gap-2 rounded-card border border-border bg-surface-1 px-3 py-2 hover:border-primary"
                      >
                        {host.avatarUrl && (
                          <img
                            src={host.avatarUrl}
                            alt=""
                            width={32}
                            height={32}
                            loading="lazy"
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        )}
                        <span className="text-body-sm text-foreground">
                          {host.name}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-3">
            <Panel title="Yayın saatleri" bodyClassName="p-3">
              {program.slots.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">
                  Yayın saati henüz belirlenmedi.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {program.slots.map((slot) => (
                    <li key={slot.id} className="text-body-sm text-foreground">
                      {slot.weekday ? (
                        <>
                          {weekdayName(slot.weekday)}{' '}
                          <span className="tabular">
                            {slot.localTime?.slice(0, 5)}
                          </span>
                        </>
                      ) : slot.airsAt ? (
                        <span className="tabular">
                          {new Date(slot.airsAt).toLocaleString('tr-TR', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      ) : null}
                      <span className="text-meta text-faint">
                        {' · '}
                        {slot.durationMin} dk
                        {slot.isRepeat && ' · tekrar'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {sirada && (
                <p className="mt-3 border-t border-border pt-2 text-meta text-muted-foreground">
                  Sonraki yayın:{' '}
                  <span className="tabular text-foreground">
                    {sirada.start.toLocaleString('tr-TR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </p>
              )}
            </Panel>

            {follow.usable ? (
              <Panel title="Takip" bodyClassName="p-3">
                <Button
                  type="button"
                  size="sm"
                  variant={follow.following ? 'primary' : 'secondary'}
                  className="w-full"
                  disabled={follow.busy}
                  aria-pressed={follow.following}
                  onClick={() => void follow.toggle()}
                >
                  {follow.following ? 'Takip ediliyor' : 'Programı takip et'}
                </Button>

                {/* Takip ETMEK bildirim istemek demek değil: gece yarısı
                    yayını olan bir programı listende tutmak isteyip
                    gece yarısı uyandırılmak istemeyebilirsin. */}
                {follow.following && (
                  <label className="mt-2 flex items-start gap-2 text-body-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={follow.notify}
                      disabled={follow.busy}
                      onChange={(e) => void follow.setNotify(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>Yayın başlayınca bildirim gönder</span>
                  </label>
                )}
              </Panel>
            ) : (
              <Panel title="Takip" bodyClassName="p-3">
                <p className="text-body-sm leading-relaxed text-muted-foreground">
                  Programı takip etmek ve yayın başlayınca haberdar olmak için{' '}
                  <Link to="/giris" className="text-primary hover:underline">
                    giriş yapın
                  </Link>
                  .
                </p>
              </Panel>
            )}
          </aside>
        </div>
      </Container>
    </>
  );
}
