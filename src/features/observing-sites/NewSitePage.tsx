import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { useLocationContext } from '@/features/location/LocationContext';
import {
  createSiteContribution,
  validateSiteContribution,
  type NewSiteInput,
} from '@/services/content/sites';

export function NewSitePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { location } = useLocationContext();
  const [name, setName] = useState('');
  const [region, setRegion] = useState(location.label);
  const [latitude, setLatitude] = useState(String(location.latitude));
  const [longitude, setLongitude] = useState(String(location.longitude));
  const [bortle, setBortle] = useState('4');
  const [sqm, setSqm] = useState('');
  const [altitude, setAltitude] = useState('');
  const [description, setDescription] = useState('');
  const [tentArea, setTentArea] = useState(false);
  const [caravanOk, setCaravanOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input: NewSiteInput = {
    userId: user?.id ?? '',
    name,
    region,
    latitude: Number(latitude),
    longitude: Number(longitude),
    bortle: Number(bortle),
    sqm: sqm ? Number(sqm) : undefined,
    altitude: altitude ? Number(altitude) : undefined,
    description,
    tentArea,
    caravanOk,
  };
  const problem = validateSiteContribution(input);

  async function submit() {
    if (!user) {
      navigate('/giris');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createSiteContribution({ ...input, userId: user.id });
      navigate('/saha');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Saha noktası gönderilemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Saha Noktası Ekle"
        description="Karanlık gökyüzü gözlem noktası önerin; kayıt admin onayından sonra yayımlanır."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Saha', to: '/saha' },
            { label: 'Saha Noktası Ekle' },
          ]}
          title="Saha Noktası Ekle"
          description="Nokta yaklaşık koordinatla kaydedilir ve admin onayından sonra haritada görünür."
        />

        <Panel title="Saha bilgileri">
          {error && <Alert className="mb-3">{error}</Alert>}
          {!user && (
            <Alert className="mb-3">
              Göndermek için giriş yapmanız gerekir. Formu doldurabilirsiniz;
              gönderirken giriş sayfasına yönlendirileceksiniz.
            </Alert>
          )}

          <div className="grid gap-3">
            <Field label="Saha adı" htmlFor="site-name">
              <Input
                id="site-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Konum / il" htmlFor="site-region">
              <Input
                id="site-region"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Yaklaşık enlem" htmlFor="site-lat">
                <Input
                  id="site-lat"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
              </Field>
              <Field label="Yaklaşık boylam" htmlFor="site-lon">
                <Input
                  id="site-lon"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Bortle" htmlFor="site-bortle">
                <Input
                  id="site-bortle"
                  type="number"
                  min={1}
                  max={9}
                  value={bortle}
                  onChange={(e) => setBortle(e.target.value)}
                />
              </Field>
              <Field label="SQM" htmlFor="site-sqm" hint="Opsiyonel">
                <Input
                  id="site-sqm"
                  inputMode="decimal"
                  value={sqm}
                  onChange={(e) => setSqm(e.target.value)}
                />
              </Field>
              <Field label="Rakım" htmlFor="site-alt" hint="metre">
                <Input
                  id="site-alt"
                  type="number"
                  min={0}
                  value={altitude}
                  onChange={(e) => setAltitude(e.target.value)}
                />
              </Field>
            </div>
            <Field label="Açıklama" htmlFor="site-description">
              <textarea
                id="site-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-32 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary focus:bg-surface-2"
              />
            </Field>
            <div className="flex flex-wrap gap-3 text-body-sm text-muted-foreground">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tentArea}
                  onChange={(e) => setTentArea(e.target.checked)}
                />
                Çadır alanı var
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={caravanOk}
                  onChange={(e) => setCaravanOk(e.target.checked)}
                />
                Karavan uygun
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => void submit()}
                disabled={busy || Boolean(problem)}
              >
                Onaya gönder
              </Button>
              <ButtonLink to="/saha" variant="secondary">
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
