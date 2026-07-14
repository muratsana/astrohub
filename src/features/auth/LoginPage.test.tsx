import { describe, it, expect } from 'vitest';
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
    // Test ortamında VITE_SUPABASE_* tanımsız → configured=false.
    renderLogin();
    expect(
      screen.getByText(/kimlik doğrulama henüz yapılandırılmadı/i)
    ).toBeInTheDocument();
  });
});
