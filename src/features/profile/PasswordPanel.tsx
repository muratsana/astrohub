import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { changeOwnPassword, MIN_PASSWORD_LENGTH } from '@/services/content/profile';

/**
 * ŞİFRE DEĞİŞTİRME.
 *
 * Hesap sayfasında yoktu: şifresini değiştirmek isteyen kullanıcının tek
 * yolu çıkıp "şifremi unuttum" akışına girmekti. Gerekçe ve "eski şifre
 * neden sorulmuyor" kararı `changeOwnPassword` başında yazılı.
 *
 * KENDİ DURUMUNU TAŞIYOR. Hesap sayfası zaten on beş parça durum
 * tutuyor; şifre alanlarını da oraya eklemek, ilgisiz bir formun
 * hatasının profil kaydetme mesajıyla aynı kutuda görünmesi demekti.
 */
export function PasswordPanel() {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = repeat.length > 0 && password !== repeat;
  const ready = password.length >= MIN_PASSWORD_LENGTH && password === repeat;

  async function submit() {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await changeOwnPassword(password);
      setPassword('');
      setRepeat('');
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Şifre değiştirilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Şifre">
      <div className="grid gap-3">
        <Field
          label="Yeni şifre"
          htmlFor="p-password"
          hint={`En az ${MIN_PASSWORD_LENGTH} karakter.`}
        >
          <Input
            id="p-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Yeni şifre (tekrar)" htmlFor="p-password2">
          <Input
            id="p-password2"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </Field>
      </div>

      {/* Uyarılar YAZARKEN çıkıyor, gönderdikten sonra değil: kullanıcı
          formu doldurup düğmenin neden kapalı olduğunu aramamalı. */}
      {tooShort && (
        <p className="mt-2 text-meta leading-snug text-warning">
          Şifre en az {MIN_PASSWORD_LENGTH} karakter olmalı.
        </p>
      )}
      {mismatch && (
        <p className="mt-2 text-meta leading-snug text-warning">
          İki alan aynı değil.
        </p>
      )}
      {error && (
        <p className="mt-2 text-meta leading-snug text-danger">{error}</p>
      )}
      {done && (
        <p className="mt-2 text-meta leading-snug text-success">
          Şifreniz değiştirildi. Diğer cihazlardaki oturumlar açık kalır —
          kapatmak için yukarıdaki “Tüm cihazlardan çıkış” düğmesini kullanın.
        </p>
      )}

      <Button
        className="mt-3"
        size="sm"
        disabled={!ready || busy}
        onClick={() => void submit()}
      >
        {busy ? 'Değiştiriliyor…' : 'Şifreyi değiştir'}
      </Button>
    </Panel>
  );
}
