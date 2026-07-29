/**
 * Basit className birleştirici. Falsy değerleri eler.
 * (Harici bağımlılık olmadan clsx benzeri temel davranış.)
 *
 * DİKKAT — ÇAKIŞMAYI ÇÖZMEZ. Bu `tailwind-merge` değil; sınıfları yalnızca
 * birleştirir. Aynı CSS özelliğini yazan iki sınıf (`text-muted-foreground`
 * ile `text-primary`, `border-border` ile `border-primary/45`) ikisi birden
 * class niteliğinde kalır ve kazananı SINIF SIRASI DEĞİL, derlenmiş
 * stil dosyasındaki sıra belirler. Sonuç kararlıdır ama tahmin edilemez:
 * yazdığınız son sınıfın uygulanacağı garantisi yoktur.
 *
 * Pratik kural: bir bileşen kendi rengini yazıyorsa (`Badge` `tone` ile
 * yapıyor), dışarıdan çakışan bir renk sınıfı GEÇİRİLMEZ. Taban sınıfları
 * renksiz tutup rengi tek kaynaktan vermek doğru desen —
 * `features/forum/LabelChip.tsx` bunun örneği.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
