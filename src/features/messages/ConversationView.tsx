import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { clockTime, relativeTime } from '@/lib/relativeTime';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import { lowerTr } from '@/lib/text';
import {
  canEditMessage,
  isSeenByPeer,
  setConversationMuted,
  useConversation,
  type Message,
} from '@/services/content/messages';
import { blockUser } from '@/services/content/social';
import { ReportButton } from '@/features/admin/ReportButton';

/**
 * KONUŞMA GÖRÜNÜMÜ.
 *
 * YAZIYOR GÖSTERGESİ VERİTABANINA YAZMIYOR. Realtime `broadcast`
 * kanalıyla uçtan uca gidiyor: her tuş vuruşunda satır yazmak, tabloyu
 * saniyede onlarca satırla doldurup hiçbirini bir daha okumamak olurdu.
 *
 * ÇEVRİMİÇİ / SON GÖRÜLME YOK — bilerek. Realtime "presence" yalnızca AYNI
 * SAYFAYI AÇIK TUTAN kişileri görür; bunu "çevrimiçi" diye yazmak,
 * uygulamayı kullanan ama bu sohbeti açmamış birini çevrimdışı göstermek
 * demekti. Yanlış bir durum göstergesi, hiç göstermemekten kötü. Gerçek
 * bir son görülme, ayrıca bir gizlilik tercihi gerektiriyor (§15) — o
 * tercih tanımlanana kadar bu alan boş kalıyor.
 */

function MessageBubble({
  message,
  mine,
  seen,
  conversationId,
  onEdit,
  onDelete,
}: {
  message: Message;
  mine: boolean;
  /** Karşı taraf bu mesajı okudu mu — yalnızca kendi mesajımda anlamlı. */
  seen: boolean;
  conversationId: string;
  onEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body);

  const editable = user ? canEditMessage(message, user.id) : false;

  if (message.deletedAt) {
    return (
      <li className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
        <span className="rounded-card border border-dashed border-border px-3 py-1.5 text-meta italic text-faint">
          Bu mesaj silindi
        </span>
      </li>
    );
  }

  return (
    <li className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] sm:max-w-[70%]')}>
        <div
          className={cn(
            'rounded-card border px-3 py-2',
            mine
              ? 'border-primary/40 bg-primary/10'
              : 'border-border bg-surface-2'
          )}
        >
          {editing ? (
            <>
              <textarea
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.currentTarget.value)}
                aria-label="Mesajı düzenle"
                className="w-full resize-y rounded-card border border-border bg-surface-1 px-2 py-1.5 text-meta leading-relaxed text-foreground outline-none focus:border-primary"
              />
              <div className="mt-1.5 flex justify-end gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(message.body);
                    setEditing(false);
                  }}
                >
                  Vazgeç
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    onEdit(message.id, draft);
                    setEditing(false);
                  }}
                >
                  Kaydet
                </Button>
              </div>
            </>
          ) : (
            /* `whitespace-pre-wrap`: kullanıcının koyduğu satır sonları
               korunuyor. Metin zaten `sanitizeText`ten geçmiş düz metin;
               HTML olarak yorumlanma ihtimali yok. */
            <p className="whitespace-pre-wrap break-words text-meta leading-relaxed text-foreground">
              {message.body}
            </p>
          )}
        </div>

        <div
          className={cn(
            'mt-1 flex items-center gap-2 text-meta text-faint',
            mine ? 'justify-end' : 'justify-start'
          )}
        >
          <time dateTime={message.createdAt} title={relativeTime(message.createdAt)}>
            {clockTime(message.createdAt)}
          </time>
          {message.editedAt && <span>düzenlendi</span>}
          {/*
            OKUNDU İŞARETİ YALNIZCA KENDİ MESAJIMDA. Karşı tarafın
            mesajının altına "okundu" yazmak, kendi okuma eylemimi ona
            rapor ediyormuş gibi görünürdü; oysa bilgi ters yönde akıyor.
          */}
          {mine && seen && !editing && (
            <span className="text-cold" title="Karşı taraf okudu">
              okundu
            </span>
          )}
          {!mine && (
            /* Raporlama sohbetin içinde: rahatsız edici bir mesajı
               şikâyet etmek için başka bir ekrana gitmek gerekmemeli.
               Metin rapora KOPYALANIYOR (bkz. 0047) — moderatör şikâyet
               edilen cümleyi görüyor, yazışmanın tamamını değil.

               `relative` sarmalayıcı, açılan formun konumlanacağı
               çerçeveyi veriyor: olmasaydı `absolute` form en yakın
               konumlanmış ataya (sayfa kabuğu) yapışırdı. */
            <span className="relative">
              <ReportButton
                targetType="message"
                targetId={message.id}
                targetPath={`/mesajlar/${conversationId}`}
                prefillNote={`Şikâyet edilen mesaj: "${message.body}"`}
                compact
              />
            </span>
          )}
          {mine && !editing && (
            <>
              {/*
                DÜZENLEME DÜĞMESİ PENCERE KAPANINCA KAYBOLUYOR. Sunucu
                on beş dakikadan eskisini reddediyor (0043); düğmeyi açık
                bırakıp kullanıcıya hata mesajı göstermek, yapılabileceğini
                söyleyip sonra vazgeçmek olurdu.
              */}
              {editable && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="transition-colors hover:text-foreground"
                >
                  Düzenle
                </button>
              )}
              <button
                type="button"
                onClick={() => onDelete(message.id)}
                className="transition-colors hover:text-danger"
              >
                Sil
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

export function ConversationView({
  conversationId,
  title,
  otherId,
  otherUsername,
  muted,
}: {
  conversationId: string;
  title: string;
  /** Birebir sohbette karşı taraf; engelleme hedefi. */
  otherId: string | null;
  otherUsername: string | null;
  muted: boolean;
}) {
  const { user } = useAuth();
  const {
    messages,
    loading,
    error,
    sending,
    peerTyping,
    peerReadAt,
    send,
    edit,
    remove,
    announceTyping,
  } = useConversation(conversationId);

  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(muted);
  const endRef = useRef<HTMLDivElement>(null);
  const typingSent = useRef(0);

  useEffect(() => setIsMuted(muted), [muted]);

  /*
   * SOHBET İÇİ ARAMA İSTEMCİDE (§8.2 "Arama").
   *
   * Görünen pencere zaten son 100 mesaj ve tamamı bellekte; sunucuya
   * `ilike` atmak her tuş vuruşunda bir istek demekti. Daha eskisini
   * aramak sayfalama gerektiriyor ve o ayrı bir iş — arama kutusu
   * bulamadığında bunu açıkça yazıyor, sessizce "sonuç yok" demiyor.
   */
  const visible = useMemo(() => {
    const needle = lowerTr(query.trim());
    if (!needle) return messages;
    return messages.filter((m) => lowerTr(m.body).includes(needle));
  }, [messages, query]);

  /* Yeni mesaj gelince en alta kayıyor. `smooth` değil `auto`: sohbet
     açılırken uzun bir kaydırma animasyonu, kullanıcıyı mesajları
     okumadan önce bekletirdi.

     Varlık kontrolü gerçek bir yedek: `scrollIntoView` her ortamda
     tanımlı değil (jsdom'da yok, bazı gömülü görünümlerde kısıtlı) ve
     kaydırma yapılamaması sohbetin çizilmemesi için sebep değil. */
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  function handleTyping(value: string) {
    setDraft(value);
    /* Yayın saniyede bir: her tuş vuruşunda mesaj göndermek kanalı
       gereksiz doldururdu ve gösterge zaten üç saniye açık kalıyor. */
    const now = Date.now();
    if (now - typingSent.current > 1000) {
      typingSent.current = now;
      announceTyping();
    }
  }

  async function handleSend() {
    const value = draft.trim();
    if (!value) return;
    try {
      await send(value);
      setDraft('');
    } catch {
      /* Hata `useConversation` içinde saklandı ve aşağıda gösteriliyor;
         taslak SİLİNMİYOR — gönderilemeyen metni kullanıcıya geri
         yazdırmak, yazdığını kaybettirmek olurdu. */
    }
  }

  return (
    <Panel
      title={title}
      status={peerTyping ? 'yazıyor…' : undefined}
      bodyClassName="px-4 py-3"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
        <Link
          to="/mesajlar"
          className="text-meta text-muted-foreground transition-colors hover:text-foreground lg:hidden"
        >
          ← Tüm sohbetler
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          {otherUsername && (
            <Link
              to={`/profil/${otherUsername}`}
              className="text-meta text-muted-foreground transition-colors hover:text-foreground"
            >
              Profili gör
            </Link>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() =>
              void (async () => {
                setActionError(null);
                const next = !isMuted;
                setIsMuted(next);
                try {
                  await setConversationMuted(conversationId, next);
                } catch (e) {
                  setIsMuted(!next);
                  setActionError(
                    e instanceof Error ? e.message : 'Ayar kaydedilemedi'
                  );
                }
              })()
            }
          >
            {isMuted ? 'Sesi aç' : 'Sessize al'}
          </Button>
          {/*
            ENGELLEME KONUŞMANIN İÇİNDE. Rahatsız edici bir mesaj alan
            kişinin profil sayfasına gidip orada engelleme düğmesi
            araması, tam da rahatsız olduğu anda fazladan iki tıklama
            demekti. Sohbet SİLİNMİYOR: engel kalkarsa geçmiş yerinde.
          */}
          {/*
            HEDEF KATILIMCI SATIRINDAN GELİYOR, MESAJLARDAN DEĞİL.
            Önce "karşı tarafın ilk mesajını bul" deniyordu; karşı taraf
            henüz yazmamışsa engelleme yapılamıyordu — oysa istenmeyen
            bir sohbeti daha ilk mesajdan önce kapatmak tam olarak
            gereken şey.
          */}
          {otherId && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() =>
                void (async () => {
                  setActionError(null);
                  try {
                    await blockUser(otherId);
                    setActionError(
                      'Kullanıcı engellendi. Artık bu sohbete mesaj gelmeyecek.'
                    );
                  } catch (e) {
                    setActionError(
                      e instanceof Error ? e.message : 'Engellenemedi'
                    );
                  }
                })()
              }
            >
              Engelle
            </Button>
          )}
        </div>
      </div>

      {actionError && (
        <Alert tone="info" className="mb-3">
          {actionError}
        </Alert>
      )}

      {messages.length > 0 && (
        <div className="mb-2.5">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Bu sohbette ara"
            aria-label="Bu sohbette ara"
            className="h-8 text-meta"
          />
        </div>
      )}

      <div className="max-h-[26rem] min-h-[12rem] overflow-y-auto">
        {loading && messages.length === 0 ? (
          <p className="py-10 text-center text-meta text-muted-foreground">
            Mesajlar okunuyor…
          </p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-meta leading-relaxed text-muted-foreground">
            Henüz mesaj yok. İlk sen yaz.
          </p>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-meta leading-relaxed text-muted-foreground">
            Son {messages.length} mesajda eşleşme yok. Daha eskisi henüz
            yüklenmedi.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {visible.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                mine={message.senderId === user?.id}
                seen={isSeenByPeer(message, peerReadAt)}
                conversationId={conversationId}
                onEdit={(id, body) => void edit(id, body)}
                onDelete={(id) => void remove(id)}
              />
            ))}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <Alert tone="danger" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mt-3 border-t border-border pt-3">
        <textarea
          rows={2}
          value={draft}
          onChange={(event) => handleTyping(event.currentTarget.value)}
          onKeyDown={(event) => {
            /* Enter gönderir, Shift+Enter satır atlar — sohbet
               kutusunun beklenen davranışı. */
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder="Mesaj yaz…"
          aria-label="Mesaj metni"
          maxLength={4000}
          className="w-full resize-y rounded-card border border-border bg-surface-2 px-3 py-2 text-meta leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-meta text-faint">
            Enter gönderir, Shift+Enter satır atlar.
          </p>
          <Button
            type="button"
            size="sm"
            disabled={sending || draft.trim().length === 0}
            onClick={() => void handleSend()}
          >
            {sending ? 'Gönderiliyor…' : 'Gönder'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
