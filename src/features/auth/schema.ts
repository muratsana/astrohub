import { z } from 'zod';

/** Giriş formu doğrulaması (§11.2 React Hook Form + Zod). */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'E-posta gerekli')
    .email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifre gerekli'),
});

export type LoginValues = z.infer<typeof loginSchema>;

/** Kayıt formu doğrulaması. */
export const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'E-posta gerekli')
      .email('Geçerli bir e-posta adresi girin'),
    password: z
      .string()
      .min(8, 'Şifre en az 8 karakter olmalı')
      .max(72, 'Şifre en fazla 72 karakter olabilir'),
    confirmPassword: z.string().min(1, 'Şifre tekrarı gerekli'),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Devam etmek için koşulları onaylayın' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;
