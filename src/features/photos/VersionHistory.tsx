import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Input';
import {
  versionKindLabels,
  type PhotoVersion,
} from '@/domain/photography/versions';
import {
  totalIntegrationSeconds,
  formatIntegration,
} from '@/domain/photography/integration';
import { VersionCompare } from './VersionCompare';
import { cn } from '@/lib/cn';

/**
 * SÜRÜM GEÇMİŞİ VE KARŞILAŞTIRMA (§8.1).
 *
 * Varsayılan seçim **ilk ve son sürüm**: kullanıcının merak ettiği şey
 * genellikle "başta neydi, şimdi ne oldu". Ara sürümler seçicilerden
 * erişilebilir ama ilk bakışta en büyük farkı gösteriyoruz.
 *
 * Aynı sürüm iki tarafta da seçilirse sürgü anlamsızlaşır; bu durumda
 * karşılaştırma yerine tek bir uyarı gösteriliyor — sürgüyü boş boş
 * çalıştırmak, karşılaştırmanın bozuk olduğu izlenimi veriyor.
 */
export function VersionHistory({ versions }: { versions: PhotoVersion[] }) {
  const [leftId, setLeftId] = useState(versions[0].id);
  const [rightId, setRightId] = useState(versions[versions.length - 1].id);

  const left = versions.find((v) => v.id === leftId) ?? versions[0];
  const right =
    versions.find((v) => v.id === rightId) ?? versions[versions.length - 1];
  const same = left.id === right.id;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-3">
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
          <VersionPicker
            id="version-left"
            label="Sol (önce)"
            value={leftId}
            versions={versions}
            onChange={setLeftId}
          />
          <VersionPicker
            id="version-right"
            label="Sağ (sonra)"
            value={rightId}
            versions={versions}
            onChange={setRightId}
          />
        </div>

        {same ? (
          <p className="rounded-card border border-border bg-surface-1 px-3 py-6 text-center text-[12px] text-muted-foreground">
            Karşılaştırmak için iki farklı sürüm seçin.
          </p>
        ) : (
          <VersionCompare
            before={{
              label: left.label,
              gradient: left.gradient,
              caption: describe(left),
            }}
            after={{
              label: right.label,
              gradient: right.gradient,
              caption: describe(right),
            }}
          />
        )}
      </div>

      <Panel title="Sürüm geçmişi" status={`${versions.length} kayıt`}>
        <ol className="space-y-px">
          {versions.map((version) => {
            const active = version.id === leftId || version.id === rightId;
            return (
              <li
                key={version.id}
                className={cn(
                  'border-b border-border py-2.5 last:border-0',
                  active && 'border-l-2 border-l-primary pl-2'
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-[12.5px] font-medium text-foreground">
                    {version.label}
                  </span>
                  <Badge>{versionKindLabels[version.kind]}</Badge>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                  {version.note}
                </p>
                <p className="tabular mt-1 text-[10px] text-faint">
                  {new Date(version.publishedAt).toLocaleDateString('tr-TR')}
                  {version.exposures && (
                    <>
                      {' · '}
                      {formatIntegration(
                        totalIntegrationSeconds(version.exposures)
                      )}
                    </>
                  )}
                  {version.palette && ` · ${version.palette}`}
                </p>
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

/** Sürgü altındaki tek satırlık künye. */
function describe(version: PhotoVersion): string {
  const parts: string[] = [versionKindLabels[version.kind]];
  if (version.exposures) {
    parts.push(formatIntegration(totalIntegrationSeconds(version.exposures)));
  }
  if (version.palette) parts.push(version.palette);
  return parts.join(' · ');
}

function VersionPicker({
  id,
  label,
  value,
  versions,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  versions: PhotoVersion[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="bg-surface-1 px-3 pb-1 pt-1.5">
      <label htmlFor={id} className="label block">
        {label}
      </label>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 border-0 bg-transparent px-0 text-[12px] focus:bg-transparent"
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
