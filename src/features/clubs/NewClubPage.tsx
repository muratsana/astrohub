import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { cities as turkeyCities } from '@/features/location/cities';
import {
  clubKindLabels,
  clubTopicLabels,
  clubTopicOrder,
  type ClubKind,
  type ClubTopic,
} from './data';
import {
  CLUB_PHOTO_LIMIT,
  createClubSubmission,
  validateClubDraft,
  type ClubDraft,
} from '@/services/clubs/submission';

function blankDraft(): ClubDraft {
  return {
    name: '',
    kind: 'dernek',
    city: 'İstanbul',
    foundedOn: '',
    place: '',
    topics: [],
    summary: '',
    contactEmail: '',
    website: '',
    socialUrl: '',
    whatsappUrl: '',
    publicEvents: true,
    sharedEquipment: false,
  };
}

export function NewClubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<ClubDraft>(() => blankDraft());
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const problem = validateClubDraft(draft, photos);

  const set = <K extends keyof ClubDraft>(key: K, value: ClubDraft[K]) =>
    setDraft({ ...draft, [key]: value });

  function toggleTopic(topic: ClubTopic) {
    set(
      'topics',
      draft.topics.includes(topic)
        ? draft.topics.filter((t) => t !== topic)
        : [...draft.topics, topic]
    );
  }

  async function submit() {
    if (!user) {
      navigate('/giris');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createClubSubmission({ ...draft, userId: user.id, photos });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Topluluk gönderilemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Topluluğunu Ekle"
        description="Astronomi kulübünüzü veya gözlem topluluğunuzu Astrohub dizinine gönderin."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Topluluklar', to: '/topluluklar' },
            { label: 'Topluluğunu ekle' },
          ]}
          title="Topluluğunu Ekle"
          description="Gönderimler admin onayından sonra topluluk dizininde yayımlanır. Maksimum 3 fotoğraf eklenebilir."
        />

        <Panel title={done ? 'Gönderim alındı' : 'Topluluk bilgileri'}>
          {done ? (
            <div className="space-y-3">
              <Alert>
                Topluluk kaydı admin onayına gönderildi. Onaylandıktan sonra
                topluluklar sayfasında görünecek.
              </Alert>
              <ButtonLink to="/topluluklar" variant="secondary">
                Topluluklara dön
              </ButtonLink>
            </div>
          ) : (
            <>
              {error && <Alert className="mb-3">{error}</Alert>}
              {!user && (
                <Alert className="mb-3">
                  Göndermek için giriş yapmanız gerekir. Formu
                  doldurabilirsiniz; gönderirken giriş sayfasına
                  yönlendirileceksiniz.
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Topluluk adı" htmlFor="club-name">
                  <Input
                    id="club-name"
                    value={draft.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </Field>
                <Field label="Tür" htmlFor="club-kind">
                  <Select
                    id="club-kind"
                    value={draft.kind}
                    onChange={(e) => set('kind', e.target.value as ClubKind)}
                  >
                    {Object.entries(clubKindLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="İl" htmlFor="club-city">
                  <Select
                    id="club-city"
                    value={draft.city}
                    onChange={(e) => set('city', e.target.value)}
                  >
                    {turkeyCities.map((city) => (
                      <option key={city.id} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Kuruluş tarihi" htmlFor="club-founded">
                  <Input
                    id="club-founded"
                    type="date"
                    value={draft.foundedOn}
                    onChange={(e) => set('foundedOn', e.target.value)}
                  />
                </Field>
                <Field label="Kuruluş / merkez yeri" htmlFor="club-place">
                  <Input
                    id="club-place"
                    value={draft.place}
                    onChange={(e) => set('place', e.target.value)}
                  />
                </Field>
                <Field label="İletişim e-postası" htmlFor="club-email">
                  <Input
                    id="club-email"
                    type="email"
                    value={draft.contactEmail}
                    onChange={(e) => set('contactEmail', e.target.value)}
                  />
                </Field>
                <Field label="Web sayfası" htmlFor="club-web" hint="Opsiyonel">
                  <Input
                    id="club-web"
                    placeholder="https://..."
                    value={draft.website}
                    onChange={(e) => set('website', e.target.value)}
                  />
                </Field>
                <Field
                  label="Sosyal medya"
                  htmlFor="club-social"
                  hint="Opsiyonel"
                >
                  <Input
                    id="club-social"
                    placeholder="https://..."
                    value={draft.socialUrl}
                    onChange={(e) => set('socialUrl', e.target.value)}
                  />
                </Field>
                <Field
                  label="WhatsApp grubu"
                  htmlFor="club-whatsapp"
                  hint="Opsiyonel"
                >
                  <Input
                    id="club-whatsapp"
                    placeholder="https://chat.whatsapp.com/..."
                    value={draft.whatsappUrl}
                    onChange={(e) => set('whatsappUrl', e.target.value)}
                  />
                </Field>
                <Field
                  label="Fotoğraflar"
                  htmlFor="club-photos"
                  hint={`En fazla ${CLUB_PHOTO_LIMIT} fotoğraf · JPEG, PNG veya WebP`}
                >
                  <Input
                    id="club-photos"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={(e) =>
                      setPhotos(
                        Array.from(e.target.files ?? []).slice(
                          0,
                          CLUB_PHOTO_LIMIT
                        )
                      )
                    }
                  />
                  {photos.length > 0 && (
                    <p className="mt-1 text-meta text-faint">
                      {photos.length} fotoğraf seçildi.
                    </p>
                  )}
                </Field>

                <div className="sm:col-span-2">
                  <span className="label mb-2 block">Konular</span>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {clubTopicOrder.map((topic) => (
                      <label
                        key={topic}
                        className="flex items-center gap-2 rounded-card border border-border px-2 py-2 text-meta text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={draft.topics.includes(topic)}
                          onChange={() => toggleTopic(topic)}
                        />
                        {clubTopicLabels[topic]}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Açıklama" htmlFor="club-summary">
                    <textarea
                      id="club-summary"
                      value={draft.summary}
                      onChange={(e) => set('summary', e.target.value)}
                      className="min-h-32 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary focus:bg-surface-2"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-3 text-body-sm text-muted-foreground sm:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.publicEvents}
                      onChange={(e) => set('publicEvents', e.target.checked)}
                    />
                    Halka açık etkinlik yapıyor
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.sharedEquipment}
                      onChange={(e) => set('sharedEquipment', e.target.checked)}
                    />
                    Ortak ekipman sunuyor
                  </label>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button disabled={busy || Boolean(problem)} onClick={submit}>
                  Onaya gönder
                </Button>
                <ButtonLink to="/topluluklar" variant="ghost">
                  Vazgeç
                </ButtonLink>
                {problem && (
                  <span className="text-meta text-warning">{problem}</span>
                )}
              </div>
            </>
          )}
        </Panel>
      </Container>
    </>
  );
}
