import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from './AuthContext';

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  it('başlık ve alanları gösterir', () => {
    renderLogin();
    expect(
      screen.getByRole('heading', { name: /giriş yap/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/e-posta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/şifre/i)).toBeInTheDocument();
  });

  it('boş gönderimde doğrulama hatası gösterir', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /giriş yap/i }));
    await waitFor(() => {
      expect(screen.getByText(/e-posta gerekli/i)).toBeInTheDocument();
    });
  });

  it('Supabase yapılandırılmadığında kurulum uyarısı gösterir', () => {
    // VITE_SUPABASE_* vitest.config.ts'te boşa sabitlenmiştir; bu yüzden
    // geliştiricinin .env dosyası olsa da olmasa da configured=false.
    renderLogin();
    expect(
      screen.getByText(/kimlik doğrulama henüz yapılandırılmadı/i)
    ).toBeInTheDocument();
  });
});

describe('LoginPage — Supabase yapılandırılmışken', () => {
  // Yapılandırma modül düzeyinde bir sabit olduğu için ortam değişkeni
  // değiştirmek yetmez; modülün kendisi taklit edilir.
  beforeEach(() => {
    vi.doMock('@/services/supabase/client', () => ({
      isSupabaseConfigured: true,
      // İstemci kurulmadan da bağlam çalışmalı: sağlayıcı null'ı zaten
      // "yükleme bitti" olarak ele alır.
      getSupabase: () => null,
      requireSupabase: async () => {
        throw new Error('testte kullanılmaz');
      },
    }));
  });

  afterEach(() => {
    vi.doUnmock('@/services/supabase/client');
    vi.resetModules();
  });

  it('kurulum uyarısını göstermez', async () => {
    vi.resetModules();
    const { LoginPage: Page } = await import('./LoginPage');
    const { AuthProvider: Provider } = await import('./AuthContext');

    render(
      <MemoryRouter>
        <Provider>
          <Page />
        </Provider>
      </MemoryRouter>
    );

    expect(
      screen.queryByText(/kimlik doğrulama henüz yapılandırılmadı/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /giriş yap/i })
    ).toBeInTheDocument();
  });
});
