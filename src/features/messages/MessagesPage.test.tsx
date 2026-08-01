import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { MessagesPage } from './MessagesPage';
import type {
  ConversationSummary,
  Message,
} from '@/services/content/messages';

/**
 * MESAJLAŞMA — OTURUM AÇIKKEN.
 *
 * Önizleme derlemesinde Supabase kurulmadığı için bu ekranın dolu hâli
 * hiçbir görsel denetimde görünmüyor. Burada ölçülen dört şey:
 * listenin çizimi, silinen mesajın gövdesiz gösterimi, düzenleme
 * penceresinin kapanması ve Enter'ın mesajı göndermesi.
 */

const send = vi.fn().mockResolvedValue(undefined);
const edit = vi.fn().mockResolvedValue(undefined);
const remove = vi.fn().mockResolvedValue(undefined);

const ME = 'ben';
const OTEKI = 'oteki';

let conversations: ConversationSummary[] = [];
let messages: Message[] = [];
let peerReadAt: string | null = null;

vi.mock('@/services/content/messages', async () => {
  const actual =
    await vi.importActual<typeof import('@/services/content/messages')>(
      '@/services/content/messages'
    );
  return {
    ...actual,
    useConversations: () => ({
      items: conversations,
      loading: false,
      error: null,
      unreadTotal: conversations.reduce((n, c) => n + c.unread, 0),
      refresh: vi.fn(),
    }),
    useConversation: () => ({
      messages,
      loading: false,
      error: null,
      sending: false,
      peerTyping: false,
      peerReadAt,
      send,
      edit,
      remove,
      announceTyping: vi.fn(),
    }),
    setConversationMuted: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: ME, email: 'ben@astrohub.test' },
    loading: false,
    configured: true,
  }),
}));

vi.mock('@/services/content/social', () => ({
  blockUser: vi.fn().mockResolvedValue(undefined),
}));

function conversation(over: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: 'sohbet-1',
    title: null,
    lastMessageAt: new Date().toISOString(),
    lastMessage: 'Merhaba',
    lastSenderId: OTEKI,
    unread: 2,
    muted: false,
    otherId: OTEKI,
    otherUsername: 'ayse',
    otherName: 'Ayşe Yıldız',
    otherAvatar: null,
    ...over,
  };
}

function message(over: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    senderId: OTEKI,
    body: 'Teleskop hâlâ satılık mı?',
    createdAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
    ...over,
  };
}

function renderPage(path = '/mesajlar') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/mesajlar" element={<MessagesPage />} />
        <Route path="/mesajlar/:id" element={<MessagesPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  conversations = [];
  messages = [];
  peerReadAt = null;
});

describe('sohbet listesi', () => {
  it('karşı tarafın adıyla çizer', () => {
    conversations = [conversation()];
    renderPage();
    expect(screen.getByText('Ayşe Yıldız')).toBeInTheDocument();
  });

  it('okunmamış sayısını gösterir', () => {
    conversations = [conversation({ unread: 3 })];
    renderPage();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  /* Silinen mesajın gövdesi boş string geliyor (0043 yumuşak silme);
     listede boş satır yerine ne olduğunu yazıyoruz. */
  it('silinmiş son mesajı boş satır olarak bırakmaz', () => {
    conversations = [conversation({ lastMessage: '' })];
    renderPage();
    expect(screen.getByText('Mesaj silindi')).toBeInTheDocument();
  });

  it('arama karşı tarafın adına göre süzer', () => {
    conversations = [
      conversation({ id: 's1', otherName: 'Ayşe Yıldız' }),
      conversation({ id: 's2', otherName: 'Mehmet Kaya' }),
    ];
    renderPage();
    fireEvent.change(screen.getByLabelText('Sohbetlerde ara'), {
      target: { value: 'mehmet' },
    });
    expect(screen.queryByText('Ayşe Yıldız')).toBeNull();
    expect(screen.getByText('Mehmet Kaya')).toBeInTheDocument();
  });

  it('sohbet yokken nereden başlanacağını söyler', () => {
    renderPage();
    expect(screen.getByText(/Bir ilan sayfasından/)).toBeInTheDocument();
  });
});

describe('konuşma', () => {
  it('mesajları çizer', () => {
    conversations = [conversation()];
    messages = [message()];
    renderPage('/mesajlar/sohbet-1');
    expect(screen.getByText('Teleskop hâlâ satılık mı?')).toBeInTheDocument();
  });

  it('silinmiş mesajın gövdesini göstermez', () => {
    conversations = [conversation()];
    messages = [
      message({ body: '', deletedAt: new Date().toISOString() }),
    ];
    renderPage('/mesajlar/sohbet-1');
    expect(screen.getByText('Bu mesaj silindi')).toBeInTheDocument();
  });

  /*
   * ASIL KORUNAN DAVRANIŞ. Sunucu on beş dakikadan eskisini reddediyor;
   * düğmeyi açık bırakıp hata göstermek, yapılabileceğini söyleyip sonra
   * vazgeçmek olurdu.
   */
  it('düzenleme düğmesi yalnızca pencere açıkken görünür', () => {
    conversations = [conversation()];
    messages = [
      message({ id: 'yeni', senderId: ME, body: 'Yeni mesaj' }),
      message({
        id: 'eski',
        senderId: ME,
        body: 'Eski mesaj',
        createdAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      }),
    ];
    renderPage('/mesajlar/sohbet-1');
    /* İki mesaj da bana ait; düzenlenebilir olan yalnızca biri. */
    expect(screen.getAllByRole('button', { name: 'Sil' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Düzenle' })).toHaveLength(1);
  });

  /* Engelleme hedefi katılımcı satırından geliyor: karşı taraf henüz
     yazmamışken de sohbeti kapatabilmek gerekiyor. */
  it('karşı taraf hiç yazmadan da engellenebiliyor', () => {
    conversations = [conversation()];
    messages = [];
    renderPage('/mesajlar/sohbet-1');
    expect(screen.getByRole('button', { name: 'Engelle' })).toBeInTheDocument();
  });

  it('karşı tarafın mesajında düzenleme/silme sunulmaz', () => {
    conversations = [conversation()];
    messages = [message({ senderId: OTEKI })];
    renderPage('/mesajlar/sohbet-1');
    expect(screen.queryByRole('button', { name: 'Sil' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Düzenle' })).toBeNull();
  });

  it('Enter mesajı gönderir, Shift+Enter göndermez', async () => {
    conversations = [conversation()];
    renderPage('/mesajlar/sohbet-1');
    const box = screen.getByLabelText('Mesaj metni');

    fireEvent.change(box, { target: { value: 'Evet, duruyor' } });
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true });
    expect(send).not.toHaveBeenCalled();

    fireEvent.keyDown(box, { key: 'Enter' });
    await waitFor(() => expect(send).toHaveBeenCalledWith('Evet, duruyor'));
  });

  it('boş mesaj gönderilemiyor', () => {
    conversations = [conversation()];
    renderPage('/mesajlar/sohbet-1');
    expect(screen.getByRole('button', { name: 'Gönder' })).toBeDisabled();
  });
});

describe('okundu durumu', () => {
  /*
   * "Okundu" ayrı bir tablo değil, karşı tarafın okuma imleci: mesajım
   * onun `last_read_at` damgasından eskiyse okunmuş demektir.
   */
  it('karşı tarafın imleci geçtiyse kendi mesajım okundu görünür', () => {
    conversations = [conversation()];
    messages = [
      message({
        senderId: ME,
        body: 'Bendeki mesaj',
        createdAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    ];
    peerReadAt = new Date().toISOString();
    renderPage('/mesajlar/sohbet-1');
    expect(screen.getByText('okundu')).toBeInTheDocument();
  });

  it('imleç mesajdan eskiyse okundu yazmaz', () => {
    conversations = [conversation()];
    messages = [message({ senderId: ME, body: 'Yeni mesaj' })];
    peerReadAt = new Date(Date.now() - 60_000).toISOString();
    renderPage('/mesajlar/sohbet-1');
    expect(screen.queryByText('okundu')).toBeNull();
  });

  /* Karşı tarafın mesajının altına "okundu" yazmak, kendi okuma eylemimi
     ona rapor ediyormuş gibi görünürdü; bilgi ters yönde akıyor. */
  it('karşı tarafın mesajında okundu göstergesi yok', () => {
    conversations = [conversation()];
    messages = [
      message({
        senderId: OTEKI,
        createdAt: new Date(Date.now() - 60_000).toISOString(),
      }),
    ];
    peerReadAt = new Date().toISOString();
    renderPage('/mesajlar/sohbet-1');
    expect(screen.queryByText('okundu')).toBeNull();
  });
});

describe('sohbet içi arama', () => {
  it('eşleşmeyen mesajı gizler', () => {
    conversations = [conversation()];
    messages = [
      message({ id: 'a', body: 'Teleskop satılık mı' }),
      message({ id: 'b', body: 'Montür de var' }),
    ];
    renderPage('/mesajlar/sohbet-1');

    fireEvent.change(screen.getByLabelText('Bu sohbette ara'), {
      target: { value: 'montür' },
    });
    expect(screen.queryByText('Teleskop satılık mı')).toBeNull();
    expect(screen.getByText('Montür de var')).toBeInTheDocument();
  });

  /* Aramanın kapsamı sınırlı ve bunu SÖYLÜYOR: sessizce "sonuç yok"
     demek, kullanıcıya aramanın tüm geçmişi taradığını düşündürürdü. */
  it('sonuç yokken aramanın kapsamını yazar', () => {
    conversations = [conversation()];
    messages = [message({ body: 'Teleskop satılık mı' })];
    renderPage('/mesajlar/sohbet-1');

    fireEvent.change(screen.getByLabelText('Bu sohbette ara'), {
      target: { value: 'kamera' },
    });
    expect(screen.getByText(/Daha eskisi henüz/)).toBeInTheDocument();
  });
});

describe('mesaj raporlama', () => {
  it('karşı tarafın mesajında bildir düğmesi var, kendiminkinde yok', () => {
    conversations = [conversation()];
    messages = [
      message({ id: 'onun', senderId: OTEKI }),
      message({ id: 'benim', senderId: ME, body: 'Benim mesajım' }),
    ];
    renderPage('/mesajlar/sohbet-1');
    expect(screen.getAllByRole('button', { name: 'Bildir' })).toHaveLength(1);
  });
});
