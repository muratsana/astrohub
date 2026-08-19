import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import {
  useCollectionsManager,
  type PhotoCollection,
} from '@/services/content/collections';

export function CollectionsPanel() {
  const store = useCollectionsManager();
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Record<string, string>>({});

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
                  <ul className="mt-3 divide-y divide-border rounded-card border border-border bg-surface-2">
                    {collection.photos.map((photo) => (
                      <li
                        key={photo.photoId}
                        className="grid gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
                      >
                        <div className="min-w-0">
                          <Link
                            to={`/fotograf/${photo.slug}`}
                            className="block truncate text-body-sm font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {photo.title}
                          </Link>
                          <p className="text-meta text-muted-foreground">
                            {new Date(photo.addedAt).toLocaleDateString(
                              'tr-TR'
                            )}
                          </p>
                        </div>
                        <select
                          aria-label={`${photo.title} fotoğrafını taşı`}
                          value={collection.id}
                          disabled={store.busy}
                          onChange={(event) =>
                            void store.movePhoto(
                              photo.photoId,
                              event.target.value
                            )
                          }
                          className="h-9 rounded-card border border-border bg-surface-1 px-2 text-meta text-foreground outline-none focus:border-primary"
                        >
                          {store.collections.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={store.busy}
                          onClick={() => void store.removePhoto(photo.photoId)}
                        >
                          Kaldır
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}
