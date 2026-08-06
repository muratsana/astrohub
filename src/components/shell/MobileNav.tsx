import { NavLink } from 'react-router';
import { mobileNav } from '@/app/navigation';
import {
  ImageIcon,
  CalendarIcon,
  MapIcon,
  HomeIcon,
  PlusIcon,
  MenuIcon,
  UsersIcon,
  NewsIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Alt çubuk ikonları — `mobileNav` içindeki HER giriş burada olmalı.
 *
 * Eskiden yalnızca dört yol eşleniyordu ve `mobileNav` değiştiğinde
 * (Saha çıkıp Topluluklar + Haberler girdiğinde) iki hücre birden
 * `HomeIcon` yedeğine düşüyordu: çubukta yan yana iki özdeş ev simgesi
 * duruyordu ve ikisi de "ana sayfa" demek değildi.
 *
 * `/saha` eşlemesi duruyor: yol hâlâ var ve alt çubuğa geri alınırsa
 * ikonu hazır olsun.
 */
const iconFor: Record<string, typeof ImageIcon> = {
  '/': HomeIcon,
  '/galeri': ImageIcon,
  '/etkinlikler': CalendarIcon,
  '/topluluklar': UsersIcon,
  '/haberler': NewsIcon,
  '/saha': MapIcon,
};

/**
 * MOBİL ALT NAVİGASYON (§5.3) — terminal dilinde.
 *
 * Köşeli, hairline üst çizgili, büyük harf mono etiketler. Dört ana giriş,
 * ortada kehribar "+" kayıt aksiyonu, sağda modül haritasını açan düğme.
 *
 * Çekmecenin kendisi `NavDrawer`'a taşındı: aynı harita masaüstünde de
 * (üst menü `xl` altına düştüğünde) açılıyor, iki kopya tutmanın anlamı yok.
 */
export function MobileNav({ onOpenNav }: { onOpenNav: () => void }) {
  const left = mobileNav.slice(0, 2);
  const right = mobileNav.slice(2);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-background lg:hidden"
      aria-label="Mobil navigasyon"
    >
      <div className="mx-auto flex max-w-md items-stretch">
        {left.map((item) => (
          <MobileNavLink key={item.to} to={item.to} label={item.label} />
        ))}

        {/* Ortadaki kayıt aksiyonu (§5.3) */}
        <NavLink
          to="/galeri/yukle"
          aria-label="Fotoğraf yükle"
          className="flex flex-1 items-center justify-center py-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-card bg-primary text-primary-foreground">
            <PlusIcon className="h-4.5 w-4.5" />
          </span>
        </NavLink>

        {right.map((item) => (
          <MobileNavLink key={item.to} to={item.to} label={item.label} />
        ))}

        <button
          type="button"
          onClick={onOpenNav}
          className="flex flex-1 flex-col items-center gap-1 border-l border-border py-2 text-meta tracking-[0.02em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <MenuIcon className="h-4.5 w-4.5" />
          Daha
        </button>
      </div>
    </nav>
  );
}

function MobileNavLink({ to, label }: { to: string; label: string }) {
  const Icon = iconFor[to] ?? HomeIcon;
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-1 border-l border-border py-2 text-meta tracking-[0.02em] transition-colors first:border-l-0',
          isActive
            ? 'text-primary shadow-[inset_0_2px_0_var(--color-primary)]'
            : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      <Icon className="h-4.5 w-4.5" />
      {label}
    </NavLink>
  );
}
