import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useFormDraft } from './useFormDraft';
import { taslakOku, taslakYaz } from './formDraft';

/**
 * FORM TASLAĞI STANDARDI (X07) — hook kayıt formundan çıkarılan deseni
 * yeniden kullanılabilir kılıyor: mount'ta yükle, değişimde otomatik
 * kaydet (gizli alan ayıklanmış), clear ile sil.
 */
type Deneme = {
  email: string;
  password: string;
};

afterEach(() => {
  taslakYaz('deneme', {});
});

function kur(over: Partial<Deneme> = {}) {
  return renderHook(() => {
    const form = useForm<Deneme>({
      defaultValues: { email: '', password: '', ...over },
    });
    const draft = useFormDraft<Deneme>({
      key: 'deneme',
      watch: form.watch,
      reset: form.reset,
      exclude: ['password'],
    });
    return { form, draft };
  });
}

describe('useFormDraft (X07)', () => {
  it('mount\'ta var olan taslağı forma yükler', () => {
    taslakYaz('deneme', { email: 'a@b.c' });
    const { result } = kur();
    expect(result.current.form.getValues('email')).toBe('a@b.c');
  });

  it('değişimde otomatik kaydeder, gizli alanı ayıklar', () => {
    const { result } = kur();
    result.current.form.setValue('email', 'x@y.z');
    result.current.form.setValue('password', 'gizli123');
    const taslak = taslakOku<Deneme>('deneme');
    expect(taslak?.email).toBe('x@y.z');
    // Şifre taslağa ASLA yazılmaz (D14 mantığının form karşılığı).
    expect(taslak?.password).toBeUndefined();
  });

  it('clear taslağı siler', () => {
    taslakYaz('deneme', { email: 'a@b.c' });
    const { result } = kur();
    result.current.draft.clear();
    expect(taslakOku('deneme')).toBeNull();
  });
});
