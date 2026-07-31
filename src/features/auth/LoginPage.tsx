import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';
import { loginSchema, type LoginValues } from './schema';
import { Captcha, type CaptchaHandle } from './Captcha';
import { captchaEnabled } from './captchaConfig';
import { SocialAuth } from './GoogleButton';
import { Alert } from '@/components/ui/Alert';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const captchaRef = useRef<CaptchaHandle>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);

    if (captchaEnabled && !captchaToken) {
      setFormError('Lütfen güvenlik doğrulamasını tamamlayın.');
      return;
    }

    const { error } = await signIn(
      values.email,
      values.password,
      captchaToken || undefined
    );

    if (error) {
      setFormError(error);
      /* Token tek kullanımlık: başarısız denemeden sonra aynı token'la
         tekrar denemek sunucuda reddediliyor ve kullanıcı sebebini
         anlamadan ikinci bir hata alıyordu. */
      captchaRef.current?.reset();
      return;
    }
    navigate('/panel');
  }

  return (
    <AuthLayout
      title="Giriş Yap"
      subtitle="Astrohub hesabınla gökyüzünü keşfetmeye devam et."
      footer={
        <>
          Hesabın yok mu?{' '}
          <Link to="/kayit" className="font-medium text-primary hover:underline">
            Üye Ol
          </Link>
        </>
      }
    >
      <SocialAuth />

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

        <Field label="Şifre" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </Field>

        <Captcha ref={captchaRef} onToken={setCaptchaToken} />

        {formError && (
          <Alert variant="text">
            {formError}
          </Alert>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
        </Button>
      </form>
    </AuthLayout>
  );
}
