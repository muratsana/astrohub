import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';
import { registerSchema, type RegisterValues } from './schema';
import { Captcha, type CaptchaHandle } from './Captcha';
import { captchaEnabled } from './captchaConfig';
import { SocialAuth } from './GoogleButton';
import { Alert } from '@/components/ui/Alert';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<CaptchaHandle>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);

    if (captchaEnabled && !captchaToken) {
      setFormError('Lütfen güvenlik doğrulamasını tamamlayın.');
      return;
    }

    /*
     * Onay, hesabın açıldığı İŞLEMLE BİRLİKTE yazılıyor: `signUp`
     * bayrağı `raw_user_meta_data` içine koyuyor ve profil
     * tetikleyicisi zaman damgasını SUNUCU saatiyle basıyor. Ayrı bir
     * çağrıyla yazılsaydı, arada onayı olmayan bir hesap penceresi
     * kalırdı.
     */
    const { error } = await signUp(
      values.email,
      values.password,
      captchaToken || undefined,
      true
    );

    if (error) {
      setFormError(error);
      captchaRef.current?.reset();
      return;
    }
    setDone(true);
    setTimeout(() => navigate('/panel'), 1200);
  }

  return (
    <AuthLayout
      title="Üye Ol"
      subtitle="Gökyüzünü keşfet, paylaş, öğren. Tek üyelikle her şey dahil."
      footer={
        <>
          Zaten üye misin?{' '}
          <Link to="/giris" className="font-medium text-primary hover:underline">
            Giriş Yap
          </Link>
        </>
      }
    >
      {done ? (
        <p role="status" className="text-sm text-success">
          Kaydın alındı! E-postanı doğruladıktan sonra giriş yapabilirsin.
        </p>
      ) : (
        <>
        <SocialAuth label="Google ile üye ol" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="E-posta" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="ornek@astrohub.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
          </Field>

          <Field
            label="Şifre"
            htmlFor="password"
            error={errors.password?.message}
            hint="En az 8 karakter"
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
          </Field>

          <Field
            label="Şifre (tekrar)"
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
          >
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
            />
          </Field>

          {/*
            İKİ AYRI KUTU. Tek kutu iki metne birden atıf yapıyordu;
            kullanıcının hangisini onayladığı ayırt edilemiyordu ve
            onay hiçbir yere de yazılmıyordu. Artık ikisi ayrı
            işaretleniyor ve profile zaman damgasıyla kaydediliyor
            (migration 0031).
          */}
          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border bg-surface-1 accent-primary"
              aria-invalid={!!errors.acceptTerms}
              {...register('acceptTerms')}
            />
            <span>
              <Link to="/kullanim-kosullari" className="text-link hover:underline">
                Kullanım Koşulları
              </Link>
              ’nı okudum, onaylıyorum. Yüklediğim fotoğrafları Astrohub’ın
              adımı kaynak göstererek kullanabileceğini kabul ediyorum.
            </span>
          </label>
          {errors.acceptTerms && (
            <Alert variant="text">{errors.acceptTerms.message}</Alert>
          )}

          <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-border bg-surface-1 accent-primary"
              aria-invalid={!!errors.acceptPrivacy}
              {...register('acceptPrivacy')}
            />
            <span>
              <Link to="/kvkk" className="text-link hover:underline">
                KVKK Aydınlatma Metni
              </Link>
              ’ni okudum, kişisel verilerimin metinde açıklandığı şekilde
              işlenmesini kabul ediyorum.
            </span>
          </label>
          {errors.acceptPrivacy && (
            <Alert variant="text">{errors.acceptPrivacy.message}</Alert>
          )}

          <Captcha ref={captchaRef} onToken={setCaptchaToken} />

          {formError && (
            <Alert variant="text">
              {formError}
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Hesap oluşturuluyor…' : 'Üye Ol'}
          </Button>
        </form>
        </>
      )}
    </AuthLayout>
  );
}
