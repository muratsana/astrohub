import type { SVGProps } from 'react';

/**
 * ASTROHUB LOGO İŞARETİ.
 *
 * Ürünün kendi arayüz motifinden türetildi: her fotoğrafı çerçeveleyen
 * **levha çerçevesi** (ölçü çentikli kare) ve içindeki hedef. Logo böylece
 * dekoratif bir simge değil, ürünün ne yaptığının özeti olur:
 *
 *   kare çerçeve   → kayıt / künye / arşiv
 *   köşe çentikleri→ ölçüm (Bortle, SQM, entegrasyon)
 *   merkezdeki yıldız → gökyüzü
 *   yörüngedeki nokta → topluluk, gözlemci
 *
 * Tek renk (`currentColor`) çalışır; kehribar vurgu isteğe bağlıdır. 16 px'e
 * kadar okunur kalması için çentikler yalnızca `detailed` modda çizilir.
 */
export function LogoMark({
  detailed = true,
  accent = 'currentColor',
  ...props
}: SVGProps<SVGSVGElement> & {
  /** Küçük boyutlarda çentikleri gizle. */
  detailed?: boolean;
  /** Merkez yıldızın rengi. */
  accent?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      {...props}
    >
      {/* Levha çerçevesi */}
      <rect
        x="3"
        y="3"
        width="26"
        height="26"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />

      {/* Ölçü çentikleri — üst ve alt kenarda */}
      {detailed && (
        <g stroke="currentColor" strokeWidth="1.6" opacity="0.55">
          <path d="M10 3v3M16 3v4M22 3v3" />
          <path d="M10 29v-3M16 29v-4M22 29v-3" />
        </g>
      )}

      {/* Merkezdeki dört köşeli yıldız */}
      <path
        d="M16 8.5l1.9 5.6 5.6 1.9-5.6 1.9L16 23.5l-1.9-5.6L8.5 16l5.6-1.9L16 8.5z"
        fill={accent}
      />

      {/* Yörüngedeki gözlemci noktası */}
      <circle cx="23.5" cy="8.5" r="2" fill={accent} opacity="0.9" />
    </svg>
  );
}
