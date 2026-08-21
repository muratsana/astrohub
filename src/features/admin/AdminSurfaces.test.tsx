import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { UserControl } from './UserControl';
import { RecordsControl, AuditControl } from './RecordsControl';
import { RECORD_KINDS } from './records';
import { recordStatusLabel } from './records';

/**
 * YÖNETİM YÜZEYLERİ — bağlandı mı, çöküyor mu, ne söylüyor.
 *
 * Test ortamında Supabase yapılandırılmamış: her sorgu "bağlantı
 * yapılandırılmamış" diye düşüyor. Ölçülen şey tam olarak o durum —
 * çünkü bir yönetim panelinin en kötü davranışı, veriye ulaşamadığında
 * BOŞ BİR LİSTE göstermek olur: yönetici "kayıt yok" sanır ve gerçekte
 * bekleyen içerik görülmeden kalır.
 *
 * Gerçek yetki yolu veritabanında ölçüldü (rol taklidiyle, geri alınan
 * bir işlemde): admin arşivleyebiliyor ve rol verebiliyor, yetkisiz
 * kullanıcı başkasının kaydını ne değiştirebiliyor ne silebiliyor,
 * kendine admin rolü veremiyor.
 */

function renderIn(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>
  );
}

describe('UserControl', () => {
  it('çökmeden mount oluyor', () => {
    expect(() => renderIn(<UserControl />)).not.toThrow();
  });

  it('başlığı ve arama alanı var', () => {
    renderIn(<UserControl />);
    expect(screen.getByText('Kullanıcılar')).toBeInTheDocument();
    expect(screen.getByLabelText(/kullanıcı ara/i)).toBeInTheDocument();
  });

  it('e-posta adresi göstermiyor', () => {
    const { container } = renderIn(<UserControl />);
    expect(container.textContent ?? '').not.toMatch(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );
  });

  it('okuma düşerse sebebini yazıyor, boş liste göstermiyor', async () => {
    renderIn(<UserControl />);
    await waitFor(() => {
      expect(screen.getByText(/yapılandırılmamış/i)).toBeInTheDocument();
    });
  });
});

describe('RecordsControl', () => {
  it('çökmeden mount oluyor', () => {
    expect(() => renderIn(<RecordsControl />)).not.toThrow();
  });

  /*
   * Beş türün hepsi sekme olarak çizilmeli: biri düşerse o içerik
   * panelden tamamen görünmez olur ve kimse fark etmez.
   */
  it('beş içerik türünü de sekme olarak veriyor', () => {
    renderIn(<RecordsControl />);
    for (const spec of Object.values(RECORD_KINDS)) {
      expect(
        screen.getByRole('tab', { name: spec.label }),
        spec.label
      ).toBeInTheDocument();
    }
  });

  it('varsayılan sekme fotoğraflar', () => {
    renderIn(<RecordsControl />);
    expect(screen.getByRole('tab', { name: 'Fotoğraflar' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('okuma düşerse sebebini yazıyor', async () => {
    renderIn(<RecordsControl />);
    await waitFor(() => {
      expect(screen.getByText(/yapılandırılmamış/i)).toBeInTheDocument();
    });
  });

  it('durum enumlarını yöneticiye Türkçe gösterir', () => {
    expect(recordStatusLabel('yayinda')).toBe('Yayında');
    expect(recordStatusLabel('yayindan_kaldirildi')).toBe('Yayından kaldırıldı');
    expect(recordStatusLabel('kilitli')).toBe('Kilitli');
  });
});

describe('AuditControl', () => {
  it('çökmeden mount oluyor', () => {
    expect(() => renderIn(<AuditControl />)).not.toThrow();
  });

  /*
   * Değiştirilebilen bir denetim kaydı denetim kaydı değildir. Tabloda
   * admin için yalnızca `select` politikası var; arayüzde de hiçbir
   * eylem düğmesi olmamalı.
   */
  it('salt okunur — hiç eylem düğmesi yok', () => {
    const { container } = renderIn(<AuditControl />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('salt okunur olduğunu yazıyor', () => {
    renderIn(<AuditControl />);
    expect(screen.getByText(/salt okunur/i)).toBeInTheDocument();
  });
});
