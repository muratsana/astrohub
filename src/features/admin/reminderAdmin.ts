import { getSupabase } from '@/services/supabase/client';
import type { ReminderKind } from '@/features/events/reminders';

/**
 * HATIRLATMA TESLİMİ — yönetici tarafı (§9).
 *
 * DÖRT ÇAĞRININ DÖRDÜ DE RPC, DÜZ SORGU DEĞİL. `reminders` tablosunun
 * RLS'i "yalnızca kendi satırın" diyor ve öyle kalmalı: yöneticiye tabloyu
 * açan bir politika eklemek, herkesin hangi etkinliğe ne zaman
 * hatırlatma kurduğunu okunur yapardı. RPC'ler `security definer` ve
 * dönen alanlar sınırlı — istatistikte sayı, hatalı listede etkinlik adı
 * ve hata metni; kimin kurduğu hiçbirinde yok.
 *
 * Yetki kapısı fonksiyonların İÇİNDE (`app.is_admin()`), burada değil:
 * istemcinin insaf ettiği yerde duran bir kontrol, kontrol değildir.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface DeliveryStats {
  bekleyen: number;
  vakti_gelen: number;
  hatali: number;
  gonderilen: number;
  gonderilen_24s: number;
  toplam: number;
}

export async function fetchDeliveryStats(): Promise<DeliveryStats> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('reminder_delivery_stats');
  if (error) throw new Error(error.message);
  return data as DeliveryStats;
}

export interface FailedReminder {
  id: string;
  eventTitle: string;
  eventSlug: string;
  dueAt: string;
  attempts: number;
  lastError: string;
}

export async function fetchFailedReminders(
  pageSize = 50
): Promise<FailedReminder[]> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('failed_reminders', {
    page_size: pageSize,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    eventTitle: row.event_title as string,
    eventSlug: row.event_slug as string,
    dueAt: row.due_at as string,
    attempts: row.attempts as number,
    lastError: row.last_error as string,
  }));
}

/**
 * Yeniden deneme. Gövdesi cron'un çağırdığı `app.deliver_reminder` —
 * yöneticiye ikinci bir gönderim yolu yazsaydık biri düzeltilip diğeri
 * unutulurdu (0050).
 *
 * Dönen `false` "gönderilemedi" demek, "çağrı başarısız" değil: satır
 * bu arada gönderilmiş, etkinlik iptal edilmiş ya da bildirim yine
 * hata vermiş olabilir. Üçünün de doğru cevabı listeyi tazelemek.
 */
export async function retryReminder(id: string): Promise<boolean> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('retry_reminder', { target: id });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export interface ReminderDefaults {
  onerilen: ReminderKind;
  acik_secenekler: ReminderKind[];
}

export async function fetchReminderDefaults(): Promise<ReminderDefaults> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'reminder_defaults')
    .maybeSingle();
  if (error) throw new Error(error.message);

  const value = (data as { value: Partial<ReminderDefaults> } | null)?.value;
  return {
    onerilen: value?.onerilen ?? 'gun',
    acik_secenekler: value?.acik_secenekler ?? [
      'hafta',
      'gun',
      'etkinlik_gunu',
      'ozel',
    ],
  };
}

export async function saveReminderDefault(kind: ReminderKind): Promise<void> {
  const supabase = await client();
  const current = await fetchReminderDefaults();
  /* Yazma RLS'i `app.is_admin()` istiyor; yetkisiz çağrı burada değil
     veritabanında reddediliyor. */
  const { error } = await supabase.from('app_settings').upsert(
    {
      key: 'reminder_defaults',
      value: { ...current, onerilen: kind },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
  if (error) throw new Error(error.message);
}

/**
 * ZORUNLU DUYURU — herkese giden tek bildirim.
 *
 * Fonksiyon `sistem` kategorisinde `announcement` üretiyor ve o kategori
 * kapatılamıyor (0042). Bunun sebebi "yönetici istediğini gönderebilsin"
 * DEĞİL: hesabı, üyeliği, güvenliği ilgilendiren bilgiler kapatılamaz
 * olmalı. Pazarlama bu kapıdan geçmiyor — `marketing_opt_in` ayrı bir
 * alan ve bu fonksiyon ona bakmıyor, çünkü bu fonksiyonla pazarlama
 * gönderilmiyor. Her duyuru `audit_logs`a düşüyor.
 */
export async function broadcastAnnouncement(input: {
  title: string;
  body?: string;
  url?: string;
}): Promise<number> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('broadcast_announcement', {
    title: input.title,
    body: input.body?.trim() ? input.body.trim() : undefined,
    url: input.url?.trim() ? input.url.trim() : undefined,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
