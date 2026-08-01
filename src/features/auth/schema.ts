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
    /*
     * ALT SINIR 10 KARAKTER, 8 DEĞİL.
     *
     * 8 karakter Supabase'in varsayılanıydı ve varsayılan olduğu için
     * seçilmişti — bir gerekçesi yoktu. Sekiz karakterlik bir şifre
     * bugünkü donanımla çevrimdışı sözlük saldırısına açık; iki karakter
     * eklemek arama uzayını ~4000 kat büyütüyor ve kullanıcıya neredeyse
     * hiçbir şeye mal olmuyor.
     *
     * ÜST SINIR 72: bcrypt girdiyi 72 baytta kesiyor. Daha uzun bir şifre
     * kabul etmek, kullanıcıya sakladığımızdan fazlasını koruduğumuzu
     * söylemek olurdu — 73. karakterden sonrası hiçbir şey değiştirmez.
     * Bayt değil karakter sayıyoruz; Türkçe harfler UTF-8'de 2 bayt, yani
     * 72 karakterlik bir Türkçe şifre sınırı aşabilir. Sınır bilinçli
     * olarak gevşek: kesme sessizce olacağına, kullanıcı biraz erken
     * uyarılsın.
     *
     * Sızmış şifre kontrolü burada DEĞİL: o liste sunucuda (Supabase
     * "leaked password protection"), çünkü istemciye indirilecek bir
     * sızıntı listesi hem devasa hem de her zaman bayat olurdu.
     */
    password: z
      .string()
      .min(10, 'Şifre en az 10 karakter olmalı')
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
