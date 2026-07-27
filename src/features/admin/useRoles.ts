import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';

/**
 * KULLANICI ROLLERİ (§15.1).
 *
 * Roller `user_roles` tablosundan okunur — JWT metadata'sından DEĞİL.
 * Metadata istemci tarafından değiştirilebilir bir alandır ve "admin mi"
 * sorusunun cevabı asla oradan alınmamalı.
 *
 * BURADAKİ KONTROL YALNIZCA ARAYÜZ İÇİNDİR. Yetkiyi gerçekten zorlayan şey
 * RLS politikalarıdır: rol taşımayan bir kullanıcı `moderation_queue`
 * sorgusundan boş sonuç alır, sayfa "yetkin yok" dese de demese de. Bu ayrım
 * önemli — istemci tarafı kontrolü bir güvenlik sınırı değil, sadece
 * kullanıcıyı boş bir ekranla baş başa bırakmama nezaketidir.
 */

export type AppRole =
  | 'member'
  | 'verified_organizer'
  | 'club_manager'
  | 'content_editor'
  | 'moderator'
  | 'admin';

export const roleLabels: Record<AppRole, string> = {
  member: 'Üye',
  verified_organizer: 'Doğrulanmış Organizatör',
  club_manager: 'Kulüp Yöneticisi',
  content_editor: 'İçerik Editörü',
  moderator: 'Moderatör',
  admin: 'Yönetici',
};

export type RolesStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

export interface RolesState {
  status: RolesStatus;
  roles: AppRole[];
  isAdmin: boolean;
  isModerator: boolean;
  /** Yönetim paneline girebilir mi? */
  canAccessAdmin: boolean;
  error: string | null;
}

const EMPTY: RolesState = {
  status: 'idle',
  roles: [],
  isAdmin: false,
  isModerator: false,
  canAccessAdmin: false,
  error: null,
};

export function useRoles(): RolesState {
  const { user, loading, configured } = useAuth();
  const [state, setState] = useState<RolesState>(EMPTY);

  useEffect(() => {
    if (!configured) {
      setState({ ...EMPTY, status: 'unconfigured' });
      return;
    }
    if (loading) {
      setState({ ...EMPTY, status: 'loading' });
      return;
    }
    if (!user) {
      setState({ ...EMPTY, status: 'ready' });
      return;
    }

    let active = true;
    setState({ ...EMPTY, status: 'loading' });

    const clientPromise = getSupabase();
    if (!clientPromise) {
      setState({ ...EMPTY, status: 'unconfigured' });
      return;
    }

    void clientPromise
      .then((client) =>
        client.from('user_roles').select('role').eq('user_id', user.id)
      )
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setState({ ...EMPTY, status: 'error', error: error.message });
          return;
        }
        const roles = (data ?? []).map((row) => row.role as AppRole);
        const isAdmin = roles.includes('admin');
        const isModerator = roles.includes('moderator');
        setState({
          status: 'ready',
          roles,
          isAdmin,
          isModerator,
          canAccessAdmin: isAdmin || isModerator,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          ...EMPTY,
          status: 'error',
          error: error instanceof Error ? error.message : 'Roller okunamadı',
        });
      });

    return () => {
      active = false;
    };
  }, [user, loading, configured]);

  return state;
}
