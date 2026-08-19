import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import {
  useCollectionsManager,
  type CollectionPhoto,
  type PhotoCollection,
} from '@/services/content/collections';

type CollectionPhotoSort =
  | 'eklenme'
  | 'baslik'
  | 'baslik-desc'
  | 'kullanici'
  | 'kullanici-desc'
  | 'palet'
  | 'palet-desc'
  | 'fov'
  | 'fov-desc'
  | 'filtre'
  | 'filtre-desc';

type CollectionPhotoRow = CollectionPhoto & { collectionId: string };

export function CollectionsPanel() {
  const store = useCollectionsManager();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<CollectionPhotoSort>('eklenme');
  const setCollectionSort = (value: string) =>
    setSort(value as CollectionPhotoSort);

  async function create() {
    const id = await store.create(newName);
    if (id) setNewName('');
  }

  async function rename(collection: PhotoCollection) {
    await store.rename(
      collection.id,
      editing[collection.id] ?? collection.name
    );
    setEditing((value) => {
      const next = { ...value };
      delete next[collection.id];
      return next;
    });
  }

  const columns = useMemo<Column<CollectionPhotoRow>[]>(
    () => [
      {
        key: 'baslik',
        header: 'Fotoğraf',
        cell: (photo) => photo.title,
        alwaysVisible: true,
        sort: { asc: 'baslik', desc: 'baslik-desc' },
      },
      {
        key: 'kullanici',
        header: 'Çeken',
        cell: (photo) => (
          <Link
            to={`/profil/${photo.username}`}
            className="font-medium text-foreground transition-colors hover:text-primary hover:underline"
          >
            @{photo.username}
          </Link>
        ),
        sort: { asc: 'kullanici', desc: 'kullanici-desc' },
      },
      {
        key: 'palet',
        header: 'Palet',
        cell: (photo) => photo.palette,
        sort: { asc: 'palet', desc: 'palet-desc' },
      },
      {
        key: 'fov',
        header: 'FOV',
        cell: formatFov,
        sort: { asc: 'fov', desc: 'fov-desc' },
      },
      {
        key: 'filtre',
        header: 'Filtreler',
        cell: (photo) => photo.filters,
        sort: { asc: 'filtre', desc: 'filtre-desc' },
      },
      {
        key: 'eklenme',
        header: 'Eklenme',
        cell: (photo) => new Date(photo.addedAt).toLocaleDateString('tr-TR'),
        sort: { desc: 'eklenme' },
      },
      {
        key: 'tasi',
        header: 'Koleksiyon',
        cell: (photo) => (
          <select
            aria-label={`${photo.title} fotoğrafını taşı`}
            value={photo.collectionId}
            disabled={store.busy}
            onChange={(event) =>
              void store.movePhoto(photo.photoId, event.target.value)
            }
            className="h-9 w-full min-w-40 rounded-card border border-border bg-surface-1 px-2 text-meta text-foreground outline-none focus:border-primary"
          >
            {store.collections.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        ),
      },
      {
        key: 'islem',
        header: 'İşlem',
        cell: (photo) => (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={store.busy}
            onClick={() => void store.removePhoto(photo.photoId)}
          >
            Kaldır
          </Button>
        ),
      },
    ],
    [store]
  );

  if (!store.canManage) {
    return (
      <Panel title="Koleksiyonlarım">
        <p className="text-body-sm text-muted-foreground">
          Koleksiyon yönetimi için giriş yapın.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Koleksiyonlarım"
      status={
        store.loading ? 'yükleniyor…' : `${store.collections.length} koleksiyon`
      }
    >
      <div className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Field
            label="Yeni koleksiyon"
            htmlFor="collection-name"
            hint="Örnek: Kuyrukluyıldızlar, Dar bant referansları, İlham panosu."
          >
            <Input
              id="collection-name"
              value={newName}
              maxLength={60}
              placeholder="Koleksiyon adı"
              onChange={(event) => setNewName(event.target.value)}
            />
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => void create()}
              disabled={store.busy || !newName.trim()}
              className="w-full sm:w-auto"
            >
              Oluştur
            </Button>
          </div>
        </div>

        {store.error && (
          <p className="rounded-card border border-danger/45 bg-surface-2 px-3 py-2 text-body-sm text-danger">
            {store.error}
          </p>
        )}

        {store.loading ? (
          <p className="text-body-sm text-muted-foreground">
            Koleksiyonlar yükleniyor…
          </p>
        ) : store.collections.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            Henüz koleksiyon yok. Fotoğraf detayından ya da buradan ilk
            koleksiyonunuzu oluşturabilirsiniz.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {store.collections.map((collection) => (
              <section
                key={collection.id}
                className="py-4 first:pt-0 last:pb-0"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-body font-semibold text-foreground">
                        {collection.name}
                      </h3>
                      <Badge tone="muted">
                        {collection.photos.length} fotoğraf
                      </Badge>
                      {!collection.isPublic && (
                        <Badge tone="warning">Gizli</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-meta text-muted-foreground">
                      Bir fotoğraf yalnızca bir koleksiyonda durur; taşıma
                      işlemi eski koleksiyondan otomatik kaldırır.
                    </p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto] md:w-[520px]">
                    <Input
                      aria-label={`${collection.name} adını düzenle`}
                      value={editing[collection.id] ?? collection.name}
                      maxLength={60}
                      onChange={(event) =>
                        setEditing((value) => ({
                          ...value,
                          [collection.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={
                        store.busy ||
                        !(editing[collection.id] ?? collection.name).trim() ||
                        (editing[collection.id] ?? collection.name) ===
                          collection.name
                      }
                      onClick={() => void rename(collection)}
                    >
                      Güncelle
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      disabled={store.busy}
                      onClick={() => void store.removeCollection(collection.id)}
                    >
                      Sil
                    </Button>
                  </div>
                </div>

                {collection.photos.length === 0 ? (
                  <p className="mt-3 rounded-card border border-border bg-surface-2 px-3 py-2 text-meta text-muted-foreground">
                    Bu koleksiyon boş.
                  </p>
                ) : (
                  <DataTable
                    className="mt-3"
                    caption={`${collection.name} fotoğrafları`}
                    columns={columns}
                    rows={sortPhotos(
                      collection.photos.map((photo) => ({
                        ...photo,
                        collectionId: collection.id,
                      })),
                      sort
                    )}
                    rowKey={(photo) => photo.photoId}
                    rowHref={(photo) => `/fotograf/${photo.slug}`}
                    sort={{ value: sort, onChange: setCollectionSort }}
                  />
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function sortPhotos(
  photos: CollectionPhotoRow[],
  sort: CollectionPhotoSort
): CollectionPhotoRow[] {
  const rows = [...photos];
  const cmpText = (a: string, b: string) => a.localeCompare(b, 'tr');
  const fov = (photo: CollectionPhotoRow) =>
    (photo.fovWidthDeg ?? 0) * (photo.fovHeightDeg ?? 0);

  return rows.sort((a, b) => {
    switch (sort) {
      case 'baslik':
        return cmpText(a.title, b.title);
      case 'baslik-desc':
        return cmpText(b.title, a.title);
      case 'kullanici':
        return cmpText(a.username, b.username);
      case 'kullanici-desc':
        return cmpText(b.username, a.username);
      case 'palet':
        return cmpText(a.palette, b.palette);
      case 'palet-desc':
        return cmpText(b.palette, a.palette);
      case 'fov':
        return fov(a) - fov(b);
      case 'fov-desc':
        return fov(b) - fov(a);
      case 'filtre':
        return cmpText(a.filters, b.filters);
      case 'filtre-desc':
        return cmpText(b.filters, a.filters);
      case 'eklenme':
      default:
        return b.addedAt.localeCompare(a.addedAt) || cmpText(a.title, b.title);
    }
  });
}

function formatFov(photo: CollectionPhoto): string {
  if (!photo.fovWidthDeg || !photo.fovHeightDeg) return '—';
  return `${photo.fovWidthDeg.toFixed(2)}° × ${photo.fovHeightDeg.toFixed(2)}°`;
}
