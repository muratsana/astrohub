import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { useTvFollow } from '@/services/content/tv';
import type { Broadcast } from './types';

/**
 * YAYIN TAKİBİ (§11.1 "yayını takip etme", "hatırlatma", "canlı yayın
 * bildirimi").
 *
 * ÜÇÜ TEK SATIR — radyodaki program takibiyle aynı gerekçe (0051/0055).
 * Takip eden kişi favorilemiştir ve yayın başlayınca haber alır;
 * `notify` ayrı bir bayrak çünkü "listemde dursun ama beni uyandırma"
 * geçerli bir tercih. Gece yarısı yayını olan bir programı takip etmek,
 * gece yarısı bildirim istemek demek değil.
 *
 * TOHUM YAYINDA GÖSTERİLMİYOR. `Broadcast.id` yalnızca veritabanından
 * gelen kayıtlarda var; tohum bir yayını takip etmek yabancı anahtar
 * hatası verirdi. Basılınca hata veren bir düğme, düğme değildir.
 */
export function TvFollow({ broadcast }: { broadcast: Broadcast }) {
  const { user } = useAuth();
  const follow = useTvFollow(broadcast.id);

  if (!broadcast.id) return null;

  if (!user) {
    return (
      <Panel title="Takip" bodyClassName="p-3">
        <p className="text-body-sm leading-relaxed text-muted-foreground">
          Yayını takip etmek ve başladığında haberdar olmak için{' '}
          <Link to="/giris" className="text-primary hover:underline">
            giriş yapın
          </Link>
          .
        </p>
      </Panel>
    );
  }

  return (
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
        {follow.following ? 'Takip ediliyor' : 'Yayını takip et'}
      </Button>

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
  );
}
