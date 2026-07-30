import { useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { usePhotoComments } from '@/services/content/engagement';
import type { AstroPhoto } from './types';
import { Alert } from '@/components/ui/Alert';

/**
 * FOTOĞRAF YORUMLARI.
 *
 * Yorum iyimser eklenmiyor: gönderim başarılıysa liste yeniden çekiliyor.
 * İyimser eklenip sonra kaybolan bir yorum, kullanıcıya "yazdım mı
 * yazmadım mı" sorusunu sordurur — beğeninin aksine, metin geri
 * alınamaz bir emek.
 *
 * Tohum kayıtlarda veritabanı kimliği yok; bölüm o durumda yorumun neden
 * yazılamadığını söylüyor. Boş bir yorum kutusu göstermek, gönderdikten
 * sonra hata almaktan iyi değil.
 */
export function PhotoComments({ photo }: { photo: AstroPhoto }) {
  const thread = usePhotoComments(photo.id);
  const [draft, setDraft] = useState('');

  async function send() {
    await thread.send(draft);
    setDraft('');
  }

  return (
    <Panel
      title="Yorumlar"
      status={thread.loading ? 'yükleniyor…' : `${thread.comments.length} yorum`}
    >
      {thread.comments.length === 0 && !thread.loading && (
        <p className="py-3 text-center text-body-sm text-muted-foreground">
          Henüz yorum yok.
        </p>
      )}

      <ul>
        {thread.comments.map((comment) => (
          <li
            key={comment.id}
            className="border-b border-border py-2.5 last:border-0"
          >
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <Link
                to={`/profil/${comment.author.username}`}
                className="text-[12px] font-medium text-foreground hover:text-primary"
              >
                {comment.author.displayName}
              </Link>
              <span className="tabular text-meta text-faint">
                {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
              </span>
              {comment.author.username === thread.currentUsername && (
                <button
                  type="button"
                  onClick={() => void thread.remove(comment.id)}
                  className="ml-auto text-meta text-faint transition-colors hover:text-danger"
                >
                  Sil
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
              {comment.body}
            </p>
          </li>
        ))}
      </ul>

      {thread.error && (
        <Alert variant="text" className="mt-2">
          {thread.error}
        </Alert>
      )}

      {thread.canWrite ? (
        <div className="mt-3 border-t border-border pt-3">
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Yorum metni"
            placeholder="Künyeye dair bir sorunuz ya da öneriniz varsa yazın."
            className="w-full resize-y rounded-card border border-border bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              disabled={thread.busy || draft.trim().length < 2}
              onClick={() => void send()}
            >
              {thread.busy ? 'Gönderiliyor…' : 'Yorum yap'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-border pt-3 text-meta text-muted-foreground">
          {photo.id ? (
            <>
              Yorum yazmak için{' '}
              <Link to="/giris" className="text-primary hover:underline">
                giriş yapın
              </Link>
              .
            </>
          ) : (
            'Bu kayıt örnek içerik; yorum yalnızca yüklenmiş fotoğraflara yazılabilir.'
          )}
        </p>
      )}
    </Panel>
  );
}
