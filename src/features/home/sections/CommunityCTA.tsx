import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';

/**
 * Topluluk ve kulüp çağrısı (§7.1). Bir bölümde en fazla bir ana CTA (§6.6).
 */
export function CommunityCTA() {
  return (
    <section className="pt-16 sm:pt-20">
      <Container>
        <div className="relative overflow-hidden rounded-card border border-border bg-surface-1 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(60% 120% at 50% 0%, rgba(244,184,47,0.18), transparent 70%)',
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
              Topluluğa katıl, gökyüzünü birlikte keşfedelim
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Tek üyelikle 50 astrofotoğraf yayımla, etkinliklere katıl, kamp
              noktalarını keşfet ve ekipmanını toplulukla paylaş.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink to="/kayit" size="lg">
                Üye Ol
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
