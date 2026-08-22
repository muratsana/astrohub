import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { LocationTypeahead } from '@/components/ui/LocationTypeahead';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import {
  createEventContribution,
  validateEventContribution,
  type NewEventInput,
} from '@/services/content/events';
import { eventTypeLabels, type EventType } from './types';

export function NewEventPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const organizerName = params.get('ad')?.trim() ?? '';
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('halk-gozlemi');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [venue, setVenue] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [description, setDescription] = useState('');
  const [free, setFree] = useState(true);
  const [camping, setCamping] = useState(false);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input: NewEventInput = {
    userId: user?.id ?? '',
    organizerName,
    title,
    type,
    city,
    district: district || undefined,
    venue,
    startsAt,
    endsAt: endsAt || undefined,
    description,
    free,
    camping,
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
  };
  const problem = validateEventContribution(input);

  async function submit() {
    if (!user) {
      navigate('/giris');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createEventContribution({ ...input, userId: user.id });
      navigate('/etkinlikler');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Etkinlik gönderilemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Etkinlik Ekle"
        description="Astronomi etkinliği önerin; kayıt admin onayından sonra yayımlanır."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Etkinlikler', to: '/etkinlikler' },
            { label: 'Etkinlik Ekle' },
          ]}
          title="Etkinlik Ekle"
          description="Etkinlik taslak olarak kaydedilir ve admin onayından sonra yayına alınır."
        />

        <Panel title="Etkinlik bilgileri">
          {error && <Alert className="mb-3">{error}</Alert>}
          {!user && (
            <Alert className="mb-3">
              Göndermek için giriş yapmanız gerekir. Formu doldurabilirsiniz;
              gönderirken giriş sayfasına yönlendirileceksiniz.
            </Alert>
          )}

          <div className="grid gap-3">
            {organizerName && (
              <Field label="Organizatör" htmlFor="event-organizer">
                <Input id="event-organizer" value={organizerName} readOnly />
              </Field>
            )}
            <Field label="Etkinlik adı" htmlFor="event-title">
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tür" htmlFor="event-type">
                <Select
                  id="event-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as EventType)}
                >
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Konum (il / ilçe)" htmlFor="event-location">
                {/*
                  SERBEST METİNDİ, sonra iki açılır liste oldu, şimdi tek
                  kutu. `allowProvinceOnly` açık: çevrim içi ya da il
                  geneli bir etkinliğin ilçesi yok.
                */}
                <LocationTypeahead
                  id="event-location"
                  city={city}
                  district={district}
                  onSelect={(secim) => {
                    setCity(secim.city);
                    setDistrict(secim.district);
                  }}
                  onClear={() => {
                    setCity('');
                    setDistrict('');
                  }}
                  allowProvinceOnly
                />
              </Field>
            </div>
            <Field label="Mekan" htmlFor="event-venue">
              <Input
                id="event-venue"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlangıç" htmlFor="event-start">
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </Field>
              <Field label="Bitiş" htmlFor="event-end">
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Açıklama" htmlFor="event-description">
              <textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-32 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary focus:bg-surface-2"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Enlem" htmlFor="event-lat" hint="Opsiyonel">
                <Input
                  id="event-lat"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </Field>
              <Field label="Boylam" htmlFor="event-lon" hint="Opsiyonel">
                <Input
                  id="event-lon"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-3 text-body-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={free}
                  onChange={(e) => setFree(e.target.checked)}
                />
                Ücretsiz
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={camping}
                  onChange={(e) => setCamping(e.target.checked)}
                />
                Kamp imkanı
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void submit()}
                disabled={busy || Boolean(problem)}
              >
                Onaya gönder
              </Button>
              <ButtonLink to="/etkinlikler" variant="secondary">
                Vazgeç
              </ButtonLink>
              {problem && (
                <span className="self-center text-meta text-muted-foreground">
                  {problem}
                </span>
              )}
            </div>
          </div>
        </Panel>
      </Container>
    </>
  );
}
