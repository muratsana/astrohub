import type { ForumThread } from './types';

/**
 * Forumda yerel örnek konu yok.
 *
 * Ana başlıklar `types.ts` içinde kalır; konu ve mesajlar yalnızca
 * veritabanındaki gerçek kullanıcılardan gelir. Supabase kapalıyken forum
 * temiz bir kategori kapısı olarak açılır, sahte kullanıcı veya mock mesaj
 * göstermez.
 */
export const forumThreads: ForumThread[] = [];
