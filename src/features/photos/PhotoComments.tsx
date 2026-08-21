import { useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { usePhotoComments } from '@/services/content/engagement';
import type { AstroPhoto } from './types';
import { Alert } from '@/components/ui/Alert';
import { useFlag } from '@/features/site/SiteConfigContext';
import { FlagClosedNote } from '@/features/site/FlagClosedNote';
import { ReportButton } from '@/features/admin/ReportButton';
import { RemovedNotice } from '@/features/admin/RemovedNotice';
import { profileAvatarUrl } from '@/services/content/profile';

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
  /* `yorumlar_acik` yalnızca YENİ yorumu kapatıyor; bayrağın kendi
     açıklaması da bunu söylüyor ("mevcutlar durur"). Listeyi de
     gizleseydik kapatma işlemi geriye dönük bir silme gibi görünürdü. */
  const yorumlarAcik = useFlag('yorumlar_acik');

  async function send() {
    await thread.send(draft);
    setDraft('');
  }

  return (
    <Panel
      title="Yorumlar"
      status={
        thread.loading ? 'yükleniyor…' : `${thread.comments.length} yorum`
      }
    >
      {thread.comments.length === 0 && !thread.loading && (
        <p className="py-3 text-center text-body-sm text-muted-foreground">
          Henüz yorum yok.
        </p>
      )}

      <ul>
        {thread.comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentUsername={thread.currentUsername}
            photoSlug={photo.slug}
            onRemove={thread.remove}
          />
        ))}
      </ul>

      {thread.error && (
        <Alert variant="text" className="mt-2">
          {thread.error}
        </Alert>
      )}

      {!yorumlarAcik ? (
        <FlagClosedNote className="mt-3">
          Yorumlar şu an kapalı; yeni yorum yazılamıyor.
        </FlagClosedNote>
      ) : thread.canWrite ? (
        <div className="mt-3 border-t border-border pt-3">
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Yorum metni"
            placeholder="Künyeye dair bir sorunuz ya da öneriniz varsa yazın."
            className="w-full resize-y rounded-card border border-border bg-surface-2 px-3 py-2 text-meta leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
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

type Comment = ReturnType<typeof usePhotoComments>['comments'][number];

function CommentItem({
  comment,
  currentUsername,
  photoSlug,
  onRemove,
}: {
  comment: Comment;
  currentUsername: string | null;
  photoSlug: string;
  onRemove: (id: string) => Promise<void>;
}) {
  const avatarUrl = profileAvatarUrl(comment.author.avatarPath);
  const initial = comment.author.displayName
    .slice(0, 1)
    .toLocaleUpperCase('tr-TR');

  return (
    <li className="border-b border-border py-3 last:border-0">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3">
        <Link
          to={`/profil/${comment.author.username}`}
          className="mt-0.5 block h-9 w-9 overflow-hidden rounded-full border border-border bg-surface-2"
          aria-label={`${comment.author.displayName} profilini aç`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-full w-full place-items-center text-body-sm font-medium text-muted-foreground"
            >
              {initial}
            </span>
          )}
        </Link>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              to={`/profil/${comment.author.username}`}
              className="text-meta font-medium text-foreground hover:text-primary"
            >
              {comment.author.displayName}
            </Link>
            <time
              dateTime={comment.createdAt}
              className="tabular text-meta text-faint"
            >
              {formatCommentDateTime(comment.createdAt)}
            </time>
            {/* Kaldırılmış yorumda ne "Sil" ne şikâyet var: silinecek
                metin kalmadı, şikâyet edilecek olan da. Satırın eylem
                yeri boş kalıyor — kaldırma kutusu zaten durumu söylüyor. */}
            {comment.removalReason ? null : comment.author.username ===
              currentUsername ? (
              <button
                type="button"
                onClick={() => void onRemove(comment.id)}
                className="ml-auto text-meta text-faint transition-colors hover:text-danger"
              >
                Sil
              </button>
            ) : (
              /*
                ŞİKÂYET KENDİ YORUMUNDA GÖRÜNMÜYOR. Kendi yorumunu
                şikâyet etmek bir işe yaramıyor ve satırdaki tek eylem
                yeri "Sil" ile paylaşılıyor — ikisi birden gösterilseydi
                kullanıcı kendi yorumunu şikâyet edip moderatörü boşuna
                meşgul edebilirdi.

                Yorumun kendi adresi yok; moderatör fotoğrafın sayfasına
                gidiyor ve yorumu orada görüyor.
              */
              <ReportButton
                compact
                targetType="comment"
                targetId={comment.id}
                targetPath={`/fotograf/${photoSlug}`}
                className="ml-auto"
              />
            )}
          </div>
          {comment.removalReason ? (
            <RemovedNotice reason={comment.removalReason} className="mt-1" />
          ) : (
            <p className="mt-1 whitespace-pre-line text-body-sm leading-relaxed text-muted-foreground">
              {comment.body}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function formatCommentDateTime(value: string): string {
  return new Date(value).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
