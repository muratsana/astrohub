import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { AdminPage } from './AdminPage';
import { CommentsControl } from './CommentsControl';
import { RecordsControl } from './RecordsControl';

/**
 * YÖNETİM PANELİ — sekmeli düzen.
 *
 * Test ortamında Supabase yapılandırılmamış, yani panel "kurulum yok"
 * durumunda. Sekme çubuğunun o durumda da doğru davranması ölçülüyor
 * ayrı ayrı: bölümlerin İÇERİĞİ zaten kendi testlerinde ölçülü, buradaki
 * konu YAPININ kendisi.
 */

function renderAt(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AdminPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('AdminPage · sekme yapısı', () => {
  it('çökmeden mount oluyor', () => {
    expect(() => renderAt()).not.toThrow();
  });

  /*
   * Panel yapılandırma yokken sekmeleri çizmiyor ve bu doğru: gösterecek
   * hiçbir şey yokken yedi sekme sunmak, hepsi boş çıkan bir gezinti
   * demekti. Ölçülen şey o durumda da sebebin yazılı olması.
   */
  it('kurulum yokken sekme yerine sebebi gösteriyor', () => {
    renderAt();
    expect(
      screen.queryByRole('tablist', { name: /yönetim bölümleri/i })
    ).not.toBeInTheDocument();
    /* Sebep YAZILI olmalı: sekmelerin yokluğunu sessizce geçmek,
       yöneticiye "panel bozuk" dedirtir. */
    expect(
      screen.getByText(/veritabanı bağlantısı yapılandırılmamış/i)
    ).toBeInTheDocument();
  });
});

/**
 * SEKME İÇERİKLERİNİN AYRIŞMASI.
 *
 * Sekmeli düzenin asıl riski aynı kaydın iki yerden yönetilmesi: biri
 * güncellenirken diğeri eski kalır ve yönetici hangisinin doğru olduğunu
 * bilemez. Forum konusu "İçerik" sekmesinden çıkarıldı; bu testler o
 * ayrımı sabitliyor.
 */
function renderIn(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('bölüm ayrımı', () => {
  it('içerik sekmesi forum konusunu listelemiyor', () => {
    renderIn(<RecordsControl kinds={['photo', 'listing', 'event', 'site']} />);
    expect(screen.queryByRole('tab', { name: 'Forum konuları' })).toBeNull();
    /* Diğer dördü duruyor — ayrım forum'u çıkarmakla sınırlı. */
    expect(screen.getByRole('tab', { name: 'Fotoğraflar' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Etkinlikler' })).toBeInTheDocument();
  });

  it('forum sekmesi yalnızca konuları taşıyor', () => {
    renderIn(<RecordsControl kinds={['thread']} title="Forum konuları" />);
    /* Tek tür varsa iç sekme çubuğu hiç çizilmiyor — tek seçenekli bir
       sekme çubuğu, seçim varmış izlenimi verir. */
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('forum gönderileri kendi yüzeyinde', () => {
    renderIn(<CommentsControl kinds={['forumPost']} />);
    expect(screen.getByText('Kullanıcı metinleri')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('içerik sekmesindeki metinler foruma karışmıyor', () => {
    renderIn(<CommentsControl kinds={['photoComment', 'siteReview']} />);
    expect(
      screen.getByRole('tab', { name: 'Fotoğraf yorumları' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: 'Forum gönderileri' })
    ).toBeNull();
  });
});

describe('CommentsControl · moderasyon duruşu', () => {
  /*
   * Metin KIRPILMIYOR. İki satırda kesilen bir önizleme, hakaretin
   * üçüncü satırda olduğu bir yorumu temiz gösterir.
   */
  it('metnin tam gösterildiğini yazıyor', () => {
    renderIn(<CommentsControl />);
    expect(screen.getByText(/tam/i)).toBeInTheDocument();
  });

  it('düzenleme olmadığını yazıyor', () => {
    renderIn(<CommentsControl />);
    expect(screen.getByText(/düzeltilmez/i)).toBeInTheDocument();
  });

  it('üç metin türünü de sekme olarak veriyor', () => {
    renderIn(<CommentsControl />);
    for (const ad of [
      'Fotoğraf yorumları',
      'Forum gönderileri',
      'Saha yorumları',
    ]) {
      expect(screen.getByRole('tab', { name: ad }), ad).toBeInTheDocument();
    }
  });

  it('okuma düşerse sebebini yazıyor', async () => {
    renderIn(<CommentsControl />);
    expect(await screen.findByText(/yapılandırılmamış/i)).toBeInTheDocument();
  });
});

describe('RecordsControl · tek tür', () => {
  it('tek tür verilince o türü açıyor', () => {
    renderIn(<RecordsControl kinds={['event']} title="Etkinlikler" />);
    expect(screen.getByText('Etkinlikler')).toBeInTheDocument();
  });

  it('başlık dışarıdan verilebiliyor', () => {
    renderIn(<RecordsControl kinds={['site']} title="Saha kayıtları" />);
    expect(screen.getByText('Saha kayıtları')).toBeInTheDocument();
  });
});
