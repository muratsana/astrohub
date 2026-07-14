import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { AuthLayout } from './AuthLayout';
import { useAuth } from './AuthContext';
import { registerSchema, type RegisterValues } from './schema';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);
    const { error } = await signUp(values.email, values.password);
    if (error) {
      setFormError(error);
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
              </Link>{' '}
              ve{' '}
              <Link to="/kvkk" className="text-link hover:underline">
                KVKK Aydınlatma Metni
              </Link>
              ’ni okudum, onaylıyorum.
            </span>
          </label>
          {errors.acceptTerms && (
            <p role="alert" className="text-xs text-danger">
              {errors.acceptTerms.message}
            </p>
          )}

          {formError && (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
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
      )}
    </AuthLayout>
  );
}
