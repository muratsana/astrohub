import type { SVGProps } from 'react';

/**
 * Hafif inline SVG ikon seti. Ana bundle'ı şişirmemek için harici
 * ikon kütüphanesi yerine yalnızca kullanılan ikonlar tutulur.
 * Tümü currentColor kullanır; erişilebilirlik için aria-hidden.
 */
type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export function SparkleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l1.9 5.3L19 10.2l-5.1 1.9L12 17.5l-1.9-5.4L5 10.2l5.1-1.9L12 3z" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

/**
 * SAHA MODU İKONU — karanlığa uyum sağlamış göz.
 *
 * Ay ikonu koyu temayı anlatıyor; saha modu için ikinci bir "gece"
 * sembolü ikisini birbirine karıştırırdı. Saha modunun konusu gecenin
 * kendisi değil, gözün karanlık adaptasyonu — bu yüzden göz.
 */
export function EyeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m21 16-4.5-4.5L7 21" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8" y="8" width="11" height="11" rx="1.5" />
      <path d="M5 15.5V6.5A1.5 1.5 0 0 1 6.5 5h9" />
    </svg>
  );
}

export function MapIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function GraduationIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 4 10 5-10 5L2 9l10-5z" />
      <path d="M6 11v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
    </svg>
  );
}

export function CalculatorIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h.01M12 11h.01M16 11v6M8 15h.01M12 15h.01M8 18h4" />
    </svg>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12 12 20l-8-8V4h8l8 8z" />
      <circle cx="8" cy="8" r="1.4" />
    </svg>
  );
}

export function MountainIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m3 20 6-11 4 6 2-3 6 8H3z" />
      <circle cx="17" cy="6" r="2" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" />
      <path d="M19 3v16" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** Tablo görünümü — üç satırlı ızgara. */
export function TableIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 5h18v14H3z" />
      <path d="M3 10h18" />
      <path d="M3 14.5h18" />
      <path d="M9 5v14" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5z" />
      <path d="M9.5 20.5V14h5v6.5" />
    </svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 22 20H2L12 3.5z" />
      <path d="M12 10v4M12 17h.01" />
    </svg>
  );
}

export function GridIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
    </svg>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M7 4.5v15l13-7.5-13-7.5z" />
    </svg>
  );
}

export function PauseIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <rect x="6" y="4.5" width="4" height="15" rx="0.5" />
      <rect x="14" y="4.5" width="4" height="15" rx="0.5" />
    </svg>
  );
}

export function SkipIcon(props: IconProps) {
  return (
    <svg {...base(props)} fill="currentColor" stroke="none">
      <path d="M6 5v14l10-7L6 5z" />
      <rect x="17" y="5" width="2.5" height="14" rx="0.5" />
    </svg>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z" />
      <path d="M16 9a4 4 0 0 1 0 6" />
    </svg>
  );
}

export function RadioIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="14" r="3" />
      <path d="M4 8.5h16v11H4z" />
      <path d="m8 8 10-4" />
    </svg>
  );
}

/** Astrohub.tv — ekran gövdesi + anten. Radyo ikonuyla aynı çizgi ailesi. */
export function TvIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 8.5h18v11H3z" />
      <path d="m8 8 4-3.5L16 8" />
    </svg>
  );
}

/** Canlı yayın göstergesi — dolu daire; yalnızca yayın açıkken çizilir. */
export function LiveDotIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 5.5H4v11h4v3.5l4-3.5h8v-11z" />
    </svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 3.5 20.5 10 17 11l-1.5 6L12 13.5 6.5 19 12 13.5 8 10l1-3.5 5-3z" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="10" width="15" height="10" rx="1.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/* ── Araç ikonları ───────────────────────────────────────────────────
   Araçlar sayfası bugüne kadar yalnızca numaralı bir listeydi; dokuz
   girişin hepsi aynı görünüyor ve göz aradığını başlıkları okuyarak
   buluyordu. Aşağıdakiler o modüllerin kendi işini anlatıyor: kadraj
   çerçevesi, örnekleme ızgarası, mozaik panelleri, bağlantı zinciri.
   ──────────────────────────────────────────────────────────────────── */

/** Kadraj çerçevesi — FOV hesaplayıcı. */
export function FrameIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 8V4.5A1.5 1.5 0 0 1 4.5 3H8M16 3h3.5A1.5 1.5 0 0 1 21 4.5V8M21 16v3.5a1.5 1.5 0 0 1-1.5 1.5H16M8 21H4.5A1.5 1.5 0 0 1 3 19.5V16" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

/** Örnekleme ızgarası — pixel scale. */
export function PixelIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
      <path d="M9.17 3.5v17M14.83 3.5v17M3.5 9.17h17M3.5 14.83h17" />
      <rect x="9.17" y="9.17" width="5.66" height="5.66" fill="currentColor" stroke="none" opacity="0.45" />
    </svg>
  );
}

/** Bitişik paneller — mozaik planlayıcı. */
export function MosaicIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="8.5" height="7" rx="1" />
      <rect x="12.5" y="4" width="8.5" height="7" rx="1" />
      <rect x="3" y="13" width="8.5" height="7" rx="1" />
      <rect x="12.5" y="13" width="8.5" height="7" rx="1" />
    </svg>
  );
}

/** Bağlantı zinciri — setup uyumluluk kontrolü. */
export function ChainIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M13 6.5 14.6 4.9a3.6 3.6 0 0 1 5.1 5.1L18 11.6" />
      <path d="M11 17.5 9.4 19.1a3.6 3.6 0 0 1-5.1-5.1L6 12.4" />
    </svg>
  );
}

/** Sıralı gece planı — planlayıcı. */
export function RouteIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="6" r="2.2" />
      <circle cx="18" cy="18" r="2.2" />
      <path d="M8.2 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.8" />
    </svg>
  );
}

/*
 * Bildirim zili (Faz 5). Üst çubukta rozetle birlikte duruyor, bu yüzden
 * gövdesi kapalı: 14px'te açık uçlu bir çizim rozetin yanında dağılıyor.
 *
 * Mesaj ve takip için ikon EKLENMEDİ — ikisinin de ikon gerektiren bir
 * yeri yok (mesajlar modül haritasında metin girişi, takip düğmesi
 * etiketli). Kullanılmayan ikon, dosyayı okuyan kişiye var olmayan bir
 * yüzey vaat eder.
 */
export function BellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M18 15.5V11a6 6 0 0 0-12 0v4.5L4.5 18h15L18 15.5z" />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}
