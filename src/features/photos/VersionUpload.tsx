import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import {
  versionKindLabels,
  type VersionKind,
} from '@/domain/photography/versions';
import { uploadVersion } from '@/services/photos/versions';
import type { AstroPhoto } from './types';

/**
 * REVİZYON YÜKLEME — yalnızca kaydın sahibine görünür.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAHİPLİK KİMLİKLE SORULUYOR, KULLANICI ADIYLA DEĞİL
 *
 * `photo.user.username` profil tablosundan gelen bir GÖRÜNTÜ adı; oturum
 * ise `auth.users.id` taşıyor. Adla karşılaştırmak, kullanıcı adını
 * değiştiren ya da profili henüz oluşmamış birinde sessizce yanlış cevap
 * verirdi. Zaten asıl sınır RLS'te (`photo_versions_write_own`);
 * buradaki kontrol yalnızca reddedilecek bir formu hiç göstermemek için.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN "YENİ FOTOĞRAF" DEĞİL
 *
 * Aynı gecenin ikinci işlemesi yeni bir fotoğraf değil. Ayrı yüklenirse
 * galeride aynı kare iki kez görünür, kota iki birim yer (§4.2 tam
 * tersini söylüyor) ve "hangisi güncel" sorusunun cevabı kalmaz.
 */
export function VersionUpload({
  photo,
  onUploaded,
}: {
  photo: AstroPhoto;
  onUploaded: () => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState<VersionKind>('revize-isleme');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isOwner = Boolean(user && photo.ownerId && user.id === photo.ownerId);
  if (!isOwner || !photo.id) return null;

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Bir görsel seçin.');
      return;
    }
    if (label.trim().length === 0) {
      setError('Sürüm adı boş olamaz — listede ayırt edilemez.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await uploadVersion({
        photoId: photo.id!,
        userId: user!.id,
        file,
        label: label.trim(),
        kind,
        note: note.trim(),
        palette: photo.palette,
      });
      setLabel('');
      setNote('');
      if (fileRef.current) fileRef.current.value = '';
      setOpen(false);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sürüm yüklenemedi');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        + İşleme revizyonu ekle
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-card border border-border bg-surface-1 p-4">
      <p className="text-body-sm font-semibold text-foreground">
        Yeni işleme sürümü
      </p>
      <p className="text-meta leading-relaxed text-muted-foreground">
        Aynı kaydın farklı bir işlemesi. Kotanda <strong>ayrı fotoğraf
        sayılmaz</strong>; galeride tek kart olarak kalır ve sürgüde
        öncekilerle karşılaştırılabilir.
      </p>

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-1 block">Sürüm adı</span>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="v2 — yeni yıldız azaltma"
            maxLength={80}
          />
        </label>

        <label className="block">
          <span className="label mb-1 block">Ne değişti</span>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as VersionKind)}
          >
            {(Object.keys(versionKindLabels) as VersionKind[]).map((k) => (
              <option key={k} value={k}>
                {versionKindLabels[k]}
              </option>
            ))}
          </Select>
        </label>
      </div>

      <label className="block">
        <span className="label mb-1 block">Not (tek cümle)</span>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Gradyan temizliği ve daha yumuşak yıldızlar."
          maxLength={200}
        />
      </label>

      <label className="block">
        <span className="label mb-1 block">Görsel</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="block w-full text-meta text-muted-foreground file:mr-3 file:rounded-card file:border file:border-border file:bg-surface-2 file:px-3 file:py-1.5 file:text-meta file:text-foreground"
        />
        {/*
          Arşiv kopyası ALINMIYOR ve bunu söylemek gerekiyor: kullanıcı
          ana fotoğrafta ham dosyanın saklandığını biliyor, sürümde de
          saklandığını varsayabilir.
        */}
        <span className="mt-1 block text-meta text-faint">
          Sürümlerde arşiv kopyası tutulmuyor — yalnızca gösterim kopyası
          (en uzun kenar 2048 px) saklanır.
        </span>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Yükleniyor…' : 'Sürümü ekle'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
