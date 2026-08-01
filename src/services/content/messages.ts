import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { useAuth } from '@/features/auth/AuthContext';
import { sanitizeText } from '@/lib/sanitize';

/**
 * MESAJLAŞMA — istemci tarafı.
 *
 * SOHBET AÇMAK BİR RPC, BİR INSERT DEĞİL. `conversations` tablosunda
 * `authenticated` rolünün ekleme yetkisi yok; sohbet açmanın tek yolu
 * `start_direct_conversation` (0043). Sebep: sohbet açmak tek satır değil,
 * üç satırlık bir bütün (sohbet + iki katılımcı) ve arada engel kontrolü
 * var. İstemciye bıraksaydık ikinci insert düştüğünde katılımcısı olmayan
 * bir sohbet kalırdı.
 *
 * OKUNMAMIŞ SAYISI SOHBET BAŞINA TEK İMLEÇTEN ÇIKIYOR
 * (`conversation_participants.last_read_at`). Mesaj başına "okundu" satırı
 * tutmak, her mesaj için katılımcı sayısı kadar satır demekti.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessageAt: string;
  lastMessage: string | null;
  lastSenderId: string | null;
  unread: number;
  muted: boolean;
  otherId: string | null;
  otherUsername: string | null;
  otherName: string | null;
  otherAvatar: string | null;
}

interface ConversationRow {
  id: string;
  kind: string;
  title: string | null;
  last_message_at: string;
  last_message: string | null;
  last_sender_id: string | null;
  unread: number;
  muted: boolean;
  other_id: string | null;
  other_username: string | null;
  other_name: string | null;
  other_avatar: string | null;
}

function mapConversation(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    lastMessageAt: row.last_message_at,
    lastMessage: row.last_message,
    lastSenderId: row.last_sender_id,
    unread: row.unread ?? 0,
    muted: row.muted,
    otherId: row.other_id,
    otherUsername: row.other_username,
    otherName: row.other_name,
    otherAvatar: row.other_avatar,
  };
}

/** Sohbette gösterilecek ad — profil adı, yoksa kullanıcı adı. */
export function conversationLabel(item: ConversationSummary): string {
  return (
    item.otherName ??
    item.otherUsername ??
    item.title ??
    'Silinmiş kullanıcı'
  );
}

export interface ConversationsState {
  items: ConversationSummary[];
  loading: boolean;
  error: string | null;
  /** Tüm sohbetlerdeki okunmamış toplamı — üst çubuk rozeti. */
  unreadTotal: number;
  refresh: () => void;
}

/**
 * Sohbet listesi.
 *
 * TEK ÇAĞRI. `my_conversations()` sohbeti, karşı tarafı, son mesajı ve
 * okunmamış sayısını birlikte döndürüyor. İstemcide dört ayrı sorguyla
 * kurulsaydı sohbet başına bir istek daha eklenir (N+1) ve liste her
 * açılışta parça parça dolardı.
 */
export function useConversations(): ConversationsState {
  const { user } = useAuth();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((n) => n + 1), []);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!user || !isSupabaseConfigured) {
      setItems([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const supabase = await client();
        const { data, error: readError } = await supabase.rpc('my_conversations');
        if (readError) throw new Error(readError.message);
        if (!active) return;
        setItems(((data as ConversationRow[] | null) ?? []).map(mapConversation));
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Sohbetler okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, tick]);

  /* Yeni mesaj geldiğinde liste kendiliğinden tazeleniyor: sohbet listesi
     bir arşiv değil gelen kutusu, elle yenilenmesi beklenmez. */
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;

    let channel: { unsubscribe: () => void } | null = null;
    let disposed = false;

    void (async () => {
      const supabase = await client();
      if (disposed) return;
      const created = supabase
        .channel(`sohbetler:${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => refreshRef.current()
        )
        .subscribe();
      channel = created as unknown as { unsubscribe: () => void };
    })();

    return () => {
      disposed = true;
      channel?.unsubscribe();
    };
  }, [user]);

  const unreadTotal = items.reduce((sum, item) => sum + item.unread, 0);

  return { items, loading, error, unreadTotal, refresh };
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

interface MessageRow {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    deletedAt: row.deleted_at,
  };
}

/** Mesajın düzenlenebildiği pencere — sunucudaki kuralla aynı (0043). */
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

export function canEditMessage(message: Message, userId: string): boolean {
  return (
    message.senderId === userId &&
    !message.deletedAt &&
    Date.now() - new Date(message.createdAt).getTime() < EDIT_WINDOW_MS
  );
}

export interface ConversationState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  /** Karşı taraf yazıyor mu — realtime yayınından, veritabanından değil. */
  peerTyping: boolean;
  /**
   * Karşı tarafın okuma imleci. Bundan eski kendi mesajlarım "okundu".
   * `null` ise imleç okunamadı (ya da karşı taraf hiç açmadı).
   */
  peerReadAt: string | null;
  send: (body: string) => Promise<void>;
  edit: (id: string, body: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Yazma göstergesini karşı tarafa duyurur. */
  announceTyping: () => void;
}

/**
 * TESLİM/OKUNDU DURUMU (§8.2).
 *
 * "Okundu" ayrı bir tablo değil, KARŞI TARAFIN OKUMA İMLECİ: mesajım
 * onun `last_read_at` damgasından eskiyse okunmuş demektir. Mesaj başına
 * "okundu" satırı tutmak, her mesaj için katılımcı sayısı kadar satır
 * ve her açılışta bir yazma demekti.
 *
 * "TESLİM EDİLDİ" DİYE AYRI BİR DURUM YOK — ve bu bir eksik değil.
 * Mesaj veritabanına yazıldıysa teslim edilmiştir; arada kaybolabileceği
 * bir kuyruk yok. Üç kademeli (gönderildi/teslim/okundu) bir gösterge,
 * ikisi her zaman aynı anda gerçekleşen iki durumu ayrıymış gibi
 * gösterirdi.
 */
export function isSeenByPeer(
  message: Message,
  peerReadAt: string | null
): boolean {
  if (!peerReadAt) return false;
  return new Date(peerReadAt).getTime() >= new Date(message.createdAt).getTime();
}

const MESSAGE_PAGE = 100;

/**
 * Tek sohbetin mesajları.
 *
 * YAZIYOR GÖSTERGESİ VERİTABANINDA DEĞİL. "X yazıyor" bir olay, bir kayıt
 * değil: her tuş vuruşunda satır yazmak tabloyu saniyede onlarca satırla
 * doldurup hiçbirini bir daha okumamak olurdu. Realtime `broadcast`
 * kanalı tam olarak bunun için var — mesaj uçtan uca gidiyor, hiçbir yere
 * yazılmıyor.
 */
export function useConversation(conversationId: string | undefined): ConversationState {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerReadAt, setPeerReadAt] = useState<string | null>(null);

  /* Kanal referansı: hem gelen mesajı hem yazıyor bildirimini taşıyor. */
  const channelRef = useRef<{
    send: (payload: Record<string, unknown>) => void;
    unsubscribe: () => void;
  } | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || !user || !isSupabaseConfigured) {
      setMessages([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const supabase = await client();
        const { data, error: readError } = await supabase
          .from('messages')
          .select('id, sender_id, body, created_at, edited_at, deleted_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: false })
          .limit(MESSAGE_PAGE);
        if (readError) throw new Error(readError.message);
        if (!active) return;
        /* Sorgu yeniden eskiye (indeks o yönde); ekran eskiden yeniye. */
        setMessages(
          ((data as MessageRow[] | null) ?? []).map(mapMessage).reverse()
        );
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Mesajlar okunamadı');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [conversationId, user]);

  /*
   * KARŞI TARAFIN OKUMA İMLECİ. `conversation_participants` politikası
   * katılımcıların birbirinin satırını görmesine izin veriyor (0043), yani
   * bu bilgi ayrı bir RPC gerektirmiyor. Realtime aboneliği imleç
   * ilerlediğinde "okundu" işaretini kendiliğinden düşürüyor.
   */
  useEffect(() => {
    if (!conversationId || !user || !isSupabaseConfigured) {
      setPeerReadAt(null);
      return;
    }

    let active = true;
    let channel: { unsubscribe: () => void } | null = null;

    async function oku() {
      const supabase = await client();
      const { data } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', conversationId as string)
        .neq('user_id', (user as { id: string }).id)
        .order('last_read_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!active) return;
      const row = data as { last_read_at: string } | null;
      /* `-infinity` PostgREST'te bu dizeyle geliyor; tarihe çevrilince
         `Invalid Date` olur ve "okundu" sonsuza dek yanlış çıkardı. */
      const value = row?.last_read_at ?? null;
      setPeerReadAt(value && !value.startsWith('-infinity') ? value : null);
    }

    void (async () => {
      try {
        await oku();
      } catch {
        /* İmleç okunamadıysa "okundu" işareti hiç gösterilmiyor —
           yanlış bir okundu, hiç okundu göstermemekten kötü. */
        if (active) setPeerReadAt(null);
      }

      const supabase = await client();
      if (!active) return;
      const created = supabase
        .channel(`okundu:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversation_participants',
            filter: `conversation_id=eq.${conversationId}`,
          },
          () => {
            void oku().catch(() => undefined);
          }
        )
        .subscribe();
      channel = created as unknown as { unsubscribe: () => void };
    })();

    return () => {
      active = false;
      channel?.unsubscribe();
    };
  }, [conversationId, user]);

  /* Sohbet açıkken okuma imleci ilerliyor: kullanıcı mesajı görüyor,
     listede okunmamış kalması yanlış olurdu. */
  useEffect(() => {
    if (!conversationId || !user || !isSupabaseConfigured) return;
    if (messages.length === 0) return;

    void (async () => {
      try {
        const supabase = await client();
        await supabase
          .from('conversation_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', user.id);
      } catch {
        /* İmleç ilerlemediyse sohbet okunmamış görünmeye devam eder;
           kullanıcı için görünür bir kayıp yok. */
      }
    })();
  }, [conversationId, user, messages.length]);

  useEffect(() => {
    if (!conversationId || !user || !isSupabaseConfigured) return;

    let disposed = false;

    void (async () => {
      const supabase = await client();
      if (disposed) return;

      const channel = supabase
        .channel(`sohbet:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload: RealtimePostgresChangesPayload<MessageRow>) => {
            /* Silme olayında `new` boş geliyor; yumuşak silme zaten
               UPDATE olarak düşüyor, yani buraya yalnızca gövdesi olan
               satırlar ulaşıyor. Yine de tip düzeyinde kontrol ediliyor. */
            const row = payload.new as MessageRow | undefined;
            if (!row?.id) return;
            setMessages((current) => {
              const index = current.findIndex((m) => m.id === row.id);
              if (index === -1) {
                if (payload.eventType !== 'INSERT') return current;
                return [...current, mapMessage(row)];
              }
              const next = [...current];
              next[index] = mapMessage(row);
              return next;
            });
          }
        )
        .on(
          'broadcast',
          { event: 'yaziyor' },
          (payload: { payload?: { from?: string } }) => {
            if (payload.payload?.from === user.id) return;
            setPeerTyping(true);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            /* Üç saniye: karşı taraf yazmayı bıraktığında gösterge kendi
               kendine sönüyor. "Bıraktım" mesajı beklemek, bağlantı
               koptuğunda göstergeyi sonsuza dek açık bırakırdı. */
            typingTimer.current = setTimeout(() => setPeerTyping(false), 3000);
          }
        )
        .subscribe();

      channelRef.current = channel as unknown as {
        send: (payload: Record<string, unknown>) => void;
        unsubscribe: () => void;
      };
    })();

    return () => {
      disposed = true;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      channelRef.current?.unsubscribe();
      channelRef.current = null;
      setPeerTyping(false);
    };
  }, [conversationId, user]);

  const send = useCallback(
    async (body: string) => {
      if (!conversationId || !user) return;
      const clean = sanitizeText(body).trim();
      if (!clean) return;

      setSending(true);
      setError(null);
      try {
        const supabase = await client();
        /*
         * İYİMSER EKLEME YOK. Mesaj metin: iyimser eklenip sonra
         * kaybolan bir mesaj, kullanıcıya "gitti mi gitmedi mi"
         * sorusunu sordurur. Satır dönünce ekleniyor; realtime aynı
         * satırı ikinci kez getirirse kimlik eşleşmesi tekrarı önlüyor.
         */
        const { data, error: writeError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            body: clean,
          })
          .select('id, sender_id, body, created_at, edited_at, deleted_at')
          .single();
        if (writeError) throw new Error(writeError.message);
        const row = data as MessageRow;
        setMessages((current) =>
          current.some((m) => m.id === row.id)
            ? current
            : [...current, mapMessage(row)]
        );
      } catch (e) {
        const raw = e instanceof Error ? e.message : '';
        setError(
          /hızlı mesaj/i.test(raw)
            ? 'Çok hızlı mesaj gönderiyorsunuz, biraz bekleyin.'
            : /gönderemezsiniz|row-level security/i.test(raw)
              ? 'Bu sohbete mesaj gönderemezsiniz.'
              : raw || 'Mesaj gönderilemedi'
        );
        throw e;
      } finally {
        setSending(false);
      }
    },
    [conversationId, user]
  );

  const edit = useCallback(async (id: string, body: string) => {
    const clean = sanitizeText(body).trim();
    if (!clean) return;
    const supabase = await client();
    const { error: writeError } = await supabase
      .from('messages')
      .update({ body: clean })
      .eq('id', id);
    if (writeError) throw new Error(writeError.message);
    setMessages((current) =>
      current.map((m) =>
        m.id === id ? { ...m, body: clean, editedAt: new Date().toISOString() } : m
      )
    );
  }, []);

  const remove = useCallback(async (id: string) => {
    const supabase = await client();
    /* Yumuşak silme: satır kalıyor, gövdesini tetikleyici boşaltıyor.
       Sert silme karşı taraftaki konuşmayı delik deşik ederdi. */
    const { error: writeError } = await supabase
      .from('messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (writeError) throw new Error(writeError.message);
    setMessages((current) =>
      current.map((m) =>
        m.id === id
          ? { ...m, body: '', deletedAt: new Date().toISOString() }
          : m
      )
    );
  }, []);

  const announceTyping = useCallback(() => {
    if (!user) return;
    channelRef.current?.send({
      type: 'broadcast',
      event: 'yaziyor',
      payload: { from: user.id },
    });
  }, [user]);

  return {
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
  };
}

/**
 * Birebir sohbeti açar (varsa mevcut olanı döndürür).
 *
 * Aynı iki kişi için ikinci bir sohbet açılmıyor: kanonik çift anahtarı
 * `direct_key` tekil indeksli (0043). Bu kural olmasaydı mesajların yarısı
 * bir sohbette, yarısı diğerinde kalırdı.
 */
export async function startDirectConversation(otherUserId: string): Promise<string> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('start_direct_conversation', {
    other_user: otherUserId,
  });
  if (error) {
    /* Engel durumunda sunucu hangi tarafın engellediğini söylemiyor;
       istemci de tahmin etmiyor. */
    throw new Error(
      /mesajlaşamazsınız/i.test(error.message)
        ? 'Bu kullanıcıyla mesajlaşamazsınız.'
        : error.message
    );
  }
  return data as string;
}

/** Sohbeti sessize alır ya da sesi geri açar. */
export async function setConversationMuted(
  conversationId: string,
  muted: boolean
): Promise<void> {
  const supabase = await client();
  const { data: session } = await supabase.auth.getUser();
  const me = session.user?.id;
  if (!me) throw new Error('Giriş yapmalısınız.');

  const { error } = await supabase
    .from('conversation_participants')
    .update({ muted })
    .eq('conversation_id', conversationId)
    .eq('user_id', me);
  if (error) throw new Error(error.message);
}
