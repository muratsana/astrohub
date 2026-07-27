import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';

/**
 * MANİFESTO ŞERİDİ — "Astrohub nedir" sorusunun cevabı.
 *
 * Ana sayfa "bu gece" ve kayıt akışıyla açıldığı için ürün mesajı üçüncü
 * bölüme, tek bir şeride sıkışır. Kısa, iddialı, tek CTA (§6.6).
 */
export function ManifestoStrip() {
  return (
    <section className="border-y border-border bg-surface-1">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="label mb-4 text-cold">
              Gözlem kayıt sistemi · sürüm 1.0
            </p>
            <h2 className="text-[34px] leading-[1.02] text-foreground sm:text-[44px]">
              Her karenin
              <br />
              bir <span className="text-primary">künyesi</span> var.
            </h2>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <ButtonLink to="/fotograflar/yukle">Kayıt aç</ButtonLink>
              <ButtonLink to="/fotograflar" variant="secondary">
                Arşivi tara
              </ButtonLink>
            </div>
          </div>

          <div className="space-y-4 text-[13px] leading-relaxed text-muted-foreground lg:pt-9">
            <p>
              Astrohub bir galeri değil, bir çekim günlüğü. Yüklediğin her kare
              hedefi, optiği, filtresi, alt poz süresi, kalibrasyonu ve gökyüzü
              koşullarıyla birlikte kayda geçer.
            </p>
            <p>
              Böylece sonucu üreten koşullar tekrar edilebilir olur: bir
              fotoğrafa bakan kişi onu nasıl elde edeceğini de görür.
            </p>
            <dl className="grid grid-cols-3 gap-px border border-border bg-border">
              {[
                ['Kayıt', '2 418'],
                ['Entegrasyon', '9 260 sa'],
                ['Nokta', '147'],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface-1 px-3 py-3">
                  <dt className="label">{label}</dt>
                  <dd className="tabular mt-1 font-display text-[22px] font-bold leading-none text-foreground">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
