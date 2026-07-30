import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * DURUM MESAJI — hata, uyarı, onay ve bilgi için tek sözleşme.
 *
 * NEDEN VAR: aynı iş 17 yerde 11 FARKLI sınıf kombinasyonuyla yazılmıştı.
 * Punto bile tutmuyordu (`text-sm`, `text-xs`, `text-meta`, `text-body-sm`),
 * bazısı çerçeveli bazısı düz metin, `role="alert"` bazı yerde vardı bazı
 * yerde yoktu. Kullanıcı açısından sonucu şu: aynı ciddiyetteki iki hata
 * iki farklı ağırlıkta görünüyor, ekran okuyucu bazısını duyuruyor
 * bazısını atlıyordu (QA §6.3 "durum bileşenleri tek sözleşme").
 *
 * `role="alert"` HER ZAMAN basılır: bir hata mesajı ekrana geldiyse ekran
 * okuyucu onu duyurmak zorunda. Bunu çağırana bırakmak, unutulduğunda
 * sessiz kalan bir erişilebilirlik hatası üretiyordu.
 *
 * BOŞLUK ÇAĞIRANIN İŞİ. Bileşen kendi margin'ini seçmiyor; `mt-2` mi
 * `mb-3` mü olacağı bulunduğu düzene ait. Aksi hâlde her çağıran
 * `className` ile geri düzeltmek zorunda kalır.
 */

export type AlertTone = 'danger' | 'warning' | 'success' | 'info';

/**
 * `box`: kendi çerçevesi ve zemini olan blok — sayfa/panel düzeyi
 *        bildirimler (sunucu hatası, kaydedildi onayı).
 * `text`: yalnızca renkli metin — form alanının altındaki doğrulama
 *        mesajı gibi zaten bir bağlamın içinde duran durumlar; orada
 *        çerçeve, alanla mesaj arasına ikinci bir kutu sokar.
 */
export type AlertVariant = 'box' | 'text';

const toneClasses: Record<AlertTone, { text: string; box: string }> = {
  danger: { text: 'text-danger', box: 'border-danger/40' },
  warning: { text: 'text-warning', box: 'border-warning/40' },
  success: { text: 'text-success', box: 'border-success/40' },
  info: { text: 'text-cold', box: 'border-cold/40' },
};

export function Alert({
  tone = 'danger',
  variant = 'box',
  children,
  className,
  id,
}: {
  tone?: AlertTone;
  variant?: AlertVariant;
  children: ReactNode;
  /** Yalnızca boşluk/yerleşim için — renk ve punto bileşene ait. */
  className?: string;
  /** `aria-describedby` ile alana bağlamak için (bkz. Field). */
  id?: string;
}) {
  const tones = toneClasses[tone];

  return (
    <p
      id={id}
      role="alert"
      className={cn(
        'text-body-sm leading-snug',
        tones.text,
        variant === 'box' &&
          cn('rounded-card border bg-surface-1 px-3 py-2', tones.box),
        className
      )}
    >
      {children}
    </p>
  );
}
