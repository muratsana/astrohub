import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { EventInterest } from './EventInterest';
import type { InterestLevel, ReminderRow } from '@/services/content/eventInterest';
import type { AstroEvent } from './types';

/**
 * ETKİNLİK İLGİSİ VE HATIRLATMA ARAYÜZÜ (§9).
 *
 * Ölçülen üç şey: üç durumlu kontrolün gerçekten üç durumu olması,
 * hatırlatma bölümünün ilgi seçilmeden AÇILMAMASI (aksi hâlde kullanıcı
 * farkında olmadan takipçi olurdu — hatırlatma kurmak veritabanında
 * takip demek) ve kurulamayacak seçeneğin pasif gösterilmesi.
 */

let level: InterestLevel = 'yok';
let reminders: ReminderRow[] = [];
const setLevel = vi.fn();
const addReminder = vi.fn().mockResolvedValue(true);
const removeReminder = vi.fn().mockResolvedValue(undefined);

vi.mock('@/services/content/eventInterest', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/content/eventInterest')
  >('@/services/content/eventInterest');
  return {
    ...actual,
    useEventInterest: () => ({
      level,
      usable: true,
      loading: false,
      busy: false,
      error: null,
      setLevel,
    }),
    useReminders: () => ({
      reminders,
      loading: false,
      busy: false,
      error: null,
      add: addReminder,
      remove: removeReminder,
      refresh: vi.fn(),
    }),
    useReminderDefault: () => 'gun' as const,
  };
});

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'ben' }, loading: false, configured: true }),
}));

/* Uzak gelecekte bir etkinlik: bütün hatırlatma seçenekleri açık. */
function makeEvent(overrides: Partial<AstroEvent> = {}): AstroEvent {
  return {
    id: 'etkinlik-1',
    slug: 'geminid-2026-erciyes',
    title: 'Geminid Meteor Yağmuru Kampı',
    type: 'meteor-yagmuru',
    city: 'Kayseri',
    venue: 'Erciyes Yaylası',
    startsAt: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
    free: true,
    camping: true,
    kidsFriendly: false,
    astrophotoFocused: true,
    telescopesProvided: false,
    organizer: { name: 'Kayseri Astronomi Derneği', verified: true },
    description: 'Kamp.',
    program: [],
    observedTargets: [],
    gradient: 'from-slate-900 to-slate-700',
    source: { name: 'Düzenleyici', lastVerifiedAt: '2026-08-01' },
    ...overrides,
  };
}

function renderPanel(event = makeEvent()) {
  return render(
    <MemoryRouter>
      <EventInterest event={event} />
    </MemoryRouter>
  );
}

beforeEach(() => {
  level = 'yok';
  reminders = [];
  vi.clearAllMocks();
});

describe('ilgi kontrolü', () => {
  it('iki düzey de düğme olarak duruyor', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'İlgileniyorum' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Katılacağım' })).toBeTruthy();
  });

  it('seçim RPC düzeyini gönderiyor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Katılacağım' }));
    expect(setLevel).toHaveBeenCalledWith('katilacagim');
  });

  /* Seçili düğmeye ikinci basış vazgeçmek demek — ayrı bir "Vazgeç"
     düğmesi hiçbir şey seçili değilken de duracaktı. */
  it('seçili düzeye tekrar basınca vazgeçiliyor', () => {
    level = 'ilgileniyorum';
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'İlgileniyorum' }));
    expect(setLevel).toHaveBeenCalledWith('yok');
  });

  it('seçili düzey aria-pressed taşıyor', () => {
    level = 'katilacagim';
    renderPanel();
    expect(
      screen.getByRole('button', { name: 'Katılacağım' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: 'İlgileniyorum' }).getAttribute('aria-pressed')
    ).toBe('false');
  });

  it('kontenjan farkı yazılı', () => {
    renderPanel();
    expect(screen.getByText(/kontenjan tüketmez/i)).toBeTruthy();
  });

  it('Astrohub kayıt portalı etkinlik metnini gösteriyor', () => {
    renderPanel(
      makeEvent({
        registrationPortal: {
          enabled: true,
          label: 'Astrohub kayıt portalı',
          note: 'Katılım notları düzenleyiciye iletilir.',
        },
      })
    );
    expect(screen.getByText('Astrohub kayıt portalı')).toBeTruthy();
    expect(screen.getByText(/düzenleyiciye iletilir/i)).toBeTruthy();
  });
});

describe('hatırlatma bölümü', () => {
  it('ilgi seçilmeden görünmüyor', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Hatırlatma kur' })).toBeNull();
  });

  it('ilgi seçilince görünüyor', () => {
    level = 'ilgileniyorum';
    renderPanel();
    expect(screen.getByRole('button', { name: 'Hatırlatma kur' })).toBeTruthy();
  });

  it('yöneticinin önerdiği seçenek ön seçili geliyor', () => {
    level = 'ilgileniyorum';
    renderPanel();
    const select = screen.getByLabelText('Hatırlatma zamanı') as HTMLSelectElement;
    expect(select.value).toBe('gun');
  });

  it('seçilen tür ekleme çağrısına gidiyor', () => {
    level = 'ilgileniyorum';
    renderPanel();
    fireEvent.change(screen.getByLabelText('Hatırlatma zamanı'), {
      target: { value: 'hafta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hatırlatma kur' }));
    expect(addReminder).toHaveBeenCalledWith('hafta', undefined);
  });

  /**
   * §9 "geçmişe hatırlatma kurmayı engelleme" — yarın olan bir etkinlikte
   * "1 hafta önce" seçilebilir görünmemeli. Sunucu da reddediyor; buradaki
   * amaç kullanıcıyı o hataya hiç götürmemek.
   */
  it('zamanı geçmiş seçenek pasif ve sebebi yazılı', () => {
    level = 'ilgileniyorum';
    renderPanel(
      makeEvent({
        startsAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      })
    );
    const option = screen
      .getAllByRole('option')
      .find((o) => o.textContent?.startsWith('1 hafta önce'));
    expect(option?.hasAttribute('disabled')).toBe(true);
    expect(option?.textContent).toContain('Bu zaman geçti.');
  });

  it('kurulu hatırlatma listeleniyor ve kaldırılabiliyor', () => {
    level = 'ilgileniyorum';
    reminders = [
      {
        id: 'h1',
        kind: 'gun',
        customAt: null,
        dueAt: new Date(Date.now() + 89 * 24 * 3600 * 1000).toISOString(),
        sentAt: null,
      },
    ];
    renderPanel();
    /* Etiket hem listede hem seçenek listesinde geçiyor; kurulu satırı
       kanıtlayan şey listedeki kayıt. */
    const row = screen.getByRole('listitem');
    expect(within(row).getByText('1 gün önce')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: '1 gün önce hatırlatmasını kaldır' })
    );
    expect(removeReminder).toHaveBeenCalledWith('h1');
  });

  /* Gönderilmiş hatırlatma olmuş bir olayın kaydı; silme düğmesi yok. */
  it('gönderilmiş hatırlatmanın kaldır düğmesi yok', () => {
    level = 'ilgileniyorum';
    reminders = [
      {
        id: 'h1',
        kind: 'gun',
        customAt: null,
        dueAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        sentAt: new Date().toISOString(),
      },
    ];
    renderPanel();
    expect(screen.getByText(/gönderildi/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /kaldır/i })).toBeNull();
  });

  it('aynı tür ikinci kez kurulamıyor', () => {
    level = 'ilgileniyorum';
    reminders = [
      {
        id: 'h1',
        kind: 'gun',
        customAt: null,
        dueAt: new Date(Date.now() + 89 * 24 * 3600 * 1000).toISOString(),
        sentAt: null,
      },
    ];
    renderPanel();
    expect(screen.getByText('Bu hatırlatma zaten kurulu.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Hatırlatma kur' }).hasAttribute('disabled')
    ).toBe(true);
  });

  it('özel zaman seçilince tarih alanı açılıyor', () => {
    level = 'ilgileniyorum';
    renderPanel();
    fireEvent.change(screen.getByLabelText('Hatırlatma zamanı'), {
      target: { value: 'ozel' },
    });
    expect(screen.getByLabelText('Hatırlatma tarihi ve saati')).toBeTruthy();
  });
});

describe('takvime ekle', () => {
  /* Hesap gerektirmiyor: dosya tarayıcıda üretiliyor, sunucuya gitmiyor. */
  it('ilgi seçilmemişken de duruyor', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /takvime ekle/i })).toBeTruthy();
  });
});
