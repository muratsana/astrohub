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
    /*
     * İKİ AYRI ONAY, TEK KUTU DEĞİL.
     *
     * Kullanım koşulları bir SÖZLEŞME, KVKK aydınlatma metni bir
     * BİLGİLENDİRME. Hukuken ayrı şeyler ve ayrı ayrı onaylanmaları
     * gerekiyor; tek kutuya sıkıştırmak kullanıcının hangisine onay
     * verdiğini ayırt edilemez hâle getiriyordu.
     */
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Kullanım koşullarını onaylayın' }),
    }),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: 'KVKK aydınlatma metnini onaylayın' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

export type RegisterValues = z.infer<typeof registerSchema>;
