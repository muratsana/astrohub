import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { useRoles, roleLabels } from './useRoles';
import { BroadcastControl } from './BroadcastControl';
import { ReminderControl } from './ReminderControl';
import { RadioControl } from './RadioControl';
import { TvControl } from './TvControl';
import { CatalogControl } from './CatalogControl';
import { SiteControl } from './SiteControl';
import { FeaturedControl } from './FeaturedControl';
import { ContentControl } from './ContentControl';
import { PhotoWeekAdminControl } from './PhotoWeekAdminControl';
import { ClubControl } from './ClubControl';
import { EquipmentDataControl } from './EquipmentDataControl';
import { SpecImportControl } from './SpecImportControl';
import { UserControl } from './UserControl';
import { RecordsControl, AuditControl } from './RecordsControl';
import { CommentsControl } from './CommentsControl';
import { ForumCategories } from './ForumCategories';
import type { EntryKind } from '@/services/content/entries';
import {
  fetchDashboard,
  type DashboardStats,
  type RecordKind,
} from './records';
import {
  AlertIcon,
  BookIcon,
  GridIcon,
  HomeIcon,
  ListIcon,
  PlayIcon,
  TagIcon,
  UserIcon,
} from '@/components/ui/icons';
import {
  canRemoveContent,
  decideClubDeletion,
  durumEtiketi,
  fetchQueue,
  isResolved,
  removeContent,
  resolveItem,
  sendModerationFeedback,
  targetLabels,
  statusLabels,
  reasonLabels,
  type ModerationItem,
  type ModerationStatus,
  type QueueResult,
} from './moderation';
import { cn } from '@/lib/cn';
import { useIsNarrow } from '@/components/ui/useIsNarrow';

/**
 * YÖNETİM PANELİ (§13).
 *
 * YETKİ NEREDE ZORLANIYOR: veritabanında. Bu sayfadaki rol kontrolü
 * kullanıcıyı boş bir ekranla baş başa bırakmamak içindir; yetkisiz biri
 * adres çubuğuna `/admin` yazsa bile `moderation_queue` sorgusu RLS
 * yüzünden boş döner. İstemci kontrolünü güvenlik sınırı sanmak, bu tür
 * panellerde en sık yapılan hatadır — bu yüzden ekranda da yazıyor.
 *
 * Sayfa dört durumu ayrı ayrı karşılar ve hiçbirini diğerinin arkasına
 * saklamaz: kurulum yok / giriş yok / yetki yok / hazır. "Bir şeyler ters
 * gitti" demek, dördünü tek kutuya tıkıp kullanıcıyı çıkmazda bırakmaktır.
 */

const statusTone: Record<
  ModerationStatus,
  'muted' | 'primary' | 'success' | 'danger' | 'warning'
> = {
  pending: 'primary',
  in_review: 'warning',
  approved: 'success',
  rejected: 'danger',
  escalated: 'warning',
  /* Arşiv bir hüküm değil: ne "haklıydı" ne "haksızdı". Rengi de
     hüküm bildirmiyor. */
  archived: 'muted',
};

export function AdminPage() {
  const { user, configured, loading } = useAuth();
  const roles = useRoles();

  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const bolum = getBolum(location.pathname, params.get('bolum'));
  const contentKind = getContentKind(params.get('kind'));
  const recordKind = getRecordKind(location.pathname, params.get('record'));
  const targetSlug = params.get('slug');

  const setBolum = (id: BolumId) => {
    const path = BOLUM_PATHS[id];
    if (path) {
      navigate(path, { replace: true });
      return;
    }
    setParams(id === 'ozet' ? {} : { bolum: id }, { replace: true });
  };

  const [filter, setFilter] = useState<ModerationStatus | 'hepsi'>('pending');
  const [queue, setQueue] = useState<QueueResult | null>(null);
  /* Gösterge sayıları kuyruktan AYRI: kuyruk ilk 100 kaydı çekiyor ve
     ondan hesaplanan sayı 100'ü aşan bir sistemde yanlış olurdu. */
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!roles.canAccessAdmin) return;
    setQueueError(null);
    fetchQueue(filter === 'hepsi' ? undefined : filter)
      .then(setQueue)
      .catch((error: unknown) =>
        setQueueError(
          error instanceof Error ? error.message : 'Kuyruk okunamadı'
        )
      );
  }, [filter, roles.canAccessAdmin]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!roles.canAccessAdmin) return;
    fetchDashboard()
      .then(setDashboard)
      .catch(() => {
        /* Gösterge okunamazsa panelin geri kalanı çalışsın: kartlar
           "—" gösterir, moderasyon kuyruğu kendi yolundan gelir. */
      });
  }, [roles.canAccessAdmin]);

  /*
    KARAR NOTU SATIR BAŞINA TUTULUYOR.

    Tek bir `note` durumu olsaydı, bir kayda not yazıp başka bir kaydı
    kapatan moderatör yanlış notu yanlış karara iliştirirdi. Anahtar
    kuyruk kimliği.
  */
  const [notes, setNotes] = useState<Record<string, string>>({});

  /*
    HER EYLEM AYNI DEFTERİ TUTUYOR.

    Karar, arşiv, silme talebi ve geri bildirim dört ayrı çağrı ama
    sonrasında yapılacak iş aynı: not kutusunu temizle, kuyruğu yeniden
    oku, hatayı ekrana taşı. Tek yerde durmazsa biri unutulur ve ekranda
    kalan eski not bir sonraki karara iliştirilirdi.
  */
  const uygula = async (item: ModerationItem, calisma: () => Promise<void>) => {
    if (!user) return;
    setBusy(true);
    try {
      await calisma();
      setNotes((n) => {
        const kalan = { ...n };
        delete kalan[item.id];
        return kalan;
      });
      load();
    } catch (error) {
      setQueueError(
        error instanceof Error ? error.message : 'İşlem uygulanamadı'
      );
    } finally {
      setBusy(false);
    }
  };

  /* Silme talebinin kararı ayrı RPC'den geçiyor: topluluğun kaldırılması,
     sahibine giden bildirim ve denetim kaydı orada tek işlemde. */
  const talepKarari = (item: ModerationItem, onay: boolean) =>
    uygula(item, () => decideClubDeletion(item.id, onay, notes[item.id]));

  /* Karar vermeden soru sormak: kaydın durumuna dokunmuyor. */
  const geriBildirim = (item: ModerationItem) =>
    uygula(item, () => sendModerationFeedback(item.id, notes[item.id] ?? ''));

  const act = async (
    item: ModerationItem,
    status: ModerationStatus,
    note?: string
  ) => {
    if (!user) return;
    setBusy(true);
    try {
      /*
        İÇERİK ÖNCE KALDIRILIYOR, KUYRUK SONRA KAPANIYOR.

        Sıra tersine olsaydı ve kaldırma hata verseydi (yetki, ağ, silinmiş
        satır) kuyrukta "kaldırıldı" yazan ama sitede duran bir içerik
        kalırdı — kuyruğa bakan hiç kimse bunu fark edemezdi. Bu sırayla
        en kötü ihtimalde kayıt açık kalıyor: moderatör tekrar deniyor.

        Kaldırmayı uygulayamadığımız hedeflerde (fotoğraf, ilan, profil…)
        karar yine kaydediliyor; içerik ilgili panelden yürütülüyor.
      */
      if (status === 'rejected' && canRemoveContent(item.target_type)) {
        await removeContent(item.target_type, item.target_id);
      }
      await resolveItem(
        item.id,
        status,
        user.id,
        note?.trim() || undefined,
        item.target_type
      );
      /* Kararı verilen kaydın notu temizleniyor: satır listeden düşse
         de durum sözlüğünde kalırsa aynı kimlik yeniden görünürse eski
         metinle geri gelir. */
      setNotes((n) => {
        const kalan = { ...n };
        delete kalan[item.id];
        return kalan;
      });
      load();
    } catch (error) {
      setQueueError(
        error instanceof Error ? error.message : 'İşlem uygulanamadı'
      );
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <PageHeader
      breadcrumb={[{ label: 'Ana Sayfa', to: '/' }, { label: 'Yönetim' }]}
      title="Yönetim Paneli"
      description="Moderasyon kuyruğu ve içerik yönetimi. Yetki veritabanındaki rol tablosundan okunur; bu ekrandaki kontrol yalnızca arayüz içindir."
      actions={
        roles.roles.length > 0 && (
          <>
            {roles.roles.map((role) => (
              <Badge key={role} tone={role === 'admin' ? 'primary' : 'cold'}>
                {roleLabels[role]}
              </Badge>
            ))}
          </>
        )
      }
    />
  );

  /* ── Durum 1: Supabase kurulu değil ── */
  if (!configured || roles.status === 'unconfigured') {
    return (
      <Shell header={header} active={bolum} onChange={setBolum}>
        <EmptyState
          message="Veritabanı bağlantısı yapılandırılmamış"
          hint="Yönetim paneli Supabase'e bağlanır. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY tanımlandığında kuyruk buradan okunacak."
        />
      </Shell>
    );
  }

  /* ── Durum 2: oturum yok ── */
  if (loading || roles.status === 'loading') {
    return (
      <Shell header={header} active={bolum} onChange={setBolum}>
        <p
          className="py-10 text-center text-meta text-muted-foreground"
          role="status"
        >
          Yetkiler kontrol ediliyor…
        </p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell header={header} active={bolum} onChange={setBolum}>
        <EmptyState
          message="Bu sayfa için giriş gerekli"
          hint="Yönetim paneli yalnızca moderatör ve yönetici rolüne sahip hesaplara açıktır."
          action={
            <ButtonLink to="/giris" size="sm">
              Giriş Yap
            </ButtonLink>
          }
        />
      </Shell>
    );
  }

  /* ── Durum 3: yetki yok ── */
  if (!roles.canAccessAdmin) {
    return (
      <Shell header={header} active={bolum} onChange={setBolum}>
        <EmptyState
          message="Bu hesapta yönetim yetkisi yok"
          hint="Moderasyon kuyruğuna yalnızca moderatör ve yönetici rolleri erişebilir. Yetki talebi için topluluk yönetimiyle iletişime geçin."
          action={
            <ButtonLink to="/panel" size="sm" variant="secondary">
              Üye Paneli
            </ButtonLink>
          }
        />
        {roles.error && (
          <p className="mt-3 text-center text-meta text-danger">
            {roles.error}
          </p>
        )}
      </Shell>
    );
  }

  /* ── Durum 4: hazır ── */
  const counts = queue?.counts;

  return (
    <Shell header={header} active={bolum} onChange={setBolum}>
      {bolum === 'ozet' && (
        <AdminOverview
          dashboard={dashboard}
          roleNames={roles.roles.map((r) => roleLabels[r])}
          isAdmin={roles.isAdmin}
          onChange={setBolum}
        />
      )}

      {bolum === 'moderasyon' && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                'pending',
                'in_review',
                'escalated',
                'approved',
                'rejected',
                'archived',
              ] as ModerationStatus[]
            ).map((status) => (
              <Readout
                key={status}
                label={statusLabels[status]}
                value={counts ? counts[status] : '—'}
                tone={status === 'pending' ? 'primary' : 'muted'}
              />
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="tabular label" role="status">
              {queue ? `${queue.items.length} kayıt` : 'yükleniyor…'}
            </p>
            <div className="flex items-center gap-2">
              <label htmlFor="queue-filter" className="sr-only">
                Durum filtresi
              </label>
              <Select
                id="queue-filter"
                value={filter}
                onChange={(e) =>
                  setFilter(e.target.value as ModerationStatus | 'hepsi')
                }
                width="auto"
                className="h-8 text-meta"
              >
                <option value="hepsi">Tüm durumlar</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                variant="secondary"
                onClick={load}
                disabled={busy}
              >
                Yenile
              </Button>
            </div>
          </div>

          {queueError && (
            <p className="mb-3 rounded-card border border-danger/40 bg-surface-1 px-3 py-2 text-body-sm text-danger">
              {queueError}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Panel
              title="Kuyruk"
              status={filter === 'hepsi' ? 'tümü' : statusLabels[filter]}
            >
              {!queue ? (
                <p className="py-6 text-center text-meta text-muted-foreground">
                  Kuyruk okunuyor…
                </p>
              ) : queue.items.length === 0 ? (
                <p className="py-6 text-center text-meta leading-relaxed text-muted-foreground">
                  Bu filtrede kayıt yok. Kuyruk boşsa moderasyon bekleyen içerik
                  yok demektir; yetkiniz eksikse de aynı görünür — RLS yetkisiz
                  sorguya boş sonuç döndürür.
                </p>
              ) : (
                <ul>
                  {queue.items.map((item) => (
                    <li
                      key={item.id}
                      className="border-b border-border py-3 first:pt-0 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge tone={statusTone[item.status]}>
                            {durumEtiketi(item)}
                          </Badge>
                          <span className="text-caption font-medium text-foreground">
                            {targetLabels[item.target_type]}
                          </span>
                          {/* Talepte şikâyet sebebi yok; kayıt türü zaten
                              "silme talebi" diyor, yanına "Diğer" yazmak
                              anlamsız bir sütun doldurmaktı. */}
                          {item.target_type !== 'club_deletion' && (
                            <span className="text-meta text-muted-foreground">
                              {reasonLabels[item.reason]}
                            </span>
                          )}
                        </span>
                        <span className="tabular text-meta text-faint">
                          {new Date(item.created_at).toLocaleString('tr-TR')}
                        </span>
                      </div>

                      {item.note && (
                        <p className="mt-1 text-body-sm leading-relaxed text-muted-foreground">
                          {item.target_type === 'club_deletion' && (
                            <span className="text-faint">
                              Sahibinin gerekçesi:{' '}
                            </span>
                          )}
                          {item.note}
                        </p>
                      )}

                      {/*
                        ÇÖZÜLMÜŞ KAYITTA KARAR NOTU GÖRÜNÜR, kutu değil.
                        Karar verildikten sonra notu değiştirmek, denetim
                        kaydındaki metinle satırdaki metnin ayrışması
                        demek olurdu.
                      */}
                      {item.resolution_note && isResolved(item.status) && (
                        <p className="mt-1 rounded-card border border-border bg-surface-2 px-2.5 py-1.5 text-meta leading-relaxed text-muted-foreground">
                          <span className="text-faint">
                            {item.target_type === 'club_deletion'
                              ? 'Sahibine iletilen gerekçe: '
                              : 'Karar notu: '}
                          </span>
                          {item.resolution_note}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {item.target_path && (
                          <Link
                            to={item.target_path}
                            className="text-meta text-primary hover:underline"
                          >
                            {item.target_type === 'club_deletion'
                              ? 'Topluluğa git →'
                              : 'İçeriğe git →'}
                          </Link>
                        )}
                        {!isResolved(item.status) && (
                          <>
                            {/*
                              TEK KUTU, ÜÇ İŞ.

                              Şikâyette karar notu (isteğe bağlı), silme
                              talebinde ret gerekçesi (zorunlu), her ikisinde
                              "Soru sor" mesajı. Ayrı ayrı üç kutu koymak,
                              aynı anda ikisini doldurup hangisinin gittiğini
                              bilmemek demekti — metin tek, nereye gideceğini
                              basılan düğme söylüyor.

                              Karar notu şikâyette zorunlu değil: apaçık spam
                              için not yazdırmak kuyruğu yavaşlatır ve
                              moderatör "spam" yazıp geçer — zorunluluk boş
                              metni engellemez, anlamsız metni üretir.
                            */}
                            <Input
                              value={notes[item.id] ?? ''}
                              onChange={(e) =>
                                setNotes((n) => ({
                                  ...n,
                                  [item.id]: e.target.value,
                                }))
                              }
                              placeholder={
                                item.target_type === 'club_deletion'
                                  ? 'Ret gerekçesi (sahibine iletilir)'
                                  : 'Karar notu (isteğe bağlı)'
                              }
                              aria-label={
                                item.target_type === 'club_deletion'
                                  ? 'Ret gerekçesi'
                                  : 'Karar notu'
                              }
                              className="h-8 min-w-[12rem] flex-1 text-meta"
                            />

                            {item.target_type === 'club_deletion' ? (
                              <>
                                {/*
                                  DÜĞME ADLARI TALEBİN DİLİNDE.

                                  Kuyruğun `approved`/`rejected` değerleri
                                  şikâyette İÇERİK hakkında konuşuyor
                                  ("kalsın"/"kalksın"), talepte TALEP
                                  hakkında ve tam tersi okunuyor: onay,
                                  topluluğun kaldırılması demek. Aynı
                                  düğmeleri kullansaydık admin "İçerik
                                  kalsın" diyerek topluluğu SİLERDİ.
                                */}
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() => void talepKarari(item, true)}
                                >
                                  Silmeyi onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy || !notes[item.id]?.trim()}
                                  onClick={() => void talepKarari(item, false)}
                                >
                                  Talebi reddet
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={() => void act(item, 'in_review')}
                                >
                                  Üzerime al
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={busy}
                                  onClick={() =>
                                    void act(item, 'approved', notes[item.id])
                                  }
                                >
                                  İçerik kalsın
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  disabled={busy}
                                  onClick={() =>
                                    void act(item, 'rejected', notes[item.id])
                                  }
                                >
                                  Kaldır
                                </Button>
                                {/*
                                  ARŞİV: yinelenen ya da konusu kalmamış
                                  kayıt için. İçerik hakkında hüküm
                                  vermiyor — bugüne kadar bu kayıtlar
                                  "İçerik kalsın" ile kapatılıyor ve
                                  denetim günlüğünde incelenmiş gibi
                                  görünüyorlardı.
                                */}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() =>
                                    void act(item, 'archived', notes[item.id])
                                  }
                                >
                                  Arşivle
                                </Button>
                              </>
                            )}

                            {/*
                              KARAR VERMEDEN SORMAK.

                              "Etkinlik kayıtlarınız ne olsun?" diye sormak
                              kaydı kapatmak değil: bu düğme yalnızca
                              bildirim gönderiyor, durum yerinde kalıyor.
                            */}
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={busy || !notes[item.id]?.trim()}
                              onClick={() => void geriBildirim(item)}
                            >
                              Soru sor
                            </Button>
                          </>
                        )}
                      </div>

                      {/*
                        DÜĞMENİN NE YAPTIĞI YAZIYOR.

                        "Kaldır" iki farklı şey yapıyor: kaldırabildiğimiz
                        hedeflerde metni gerçekten kaldırıyor, diğerlerinde
                        yalnızca kararı kaydediyor. Aradaki farkı
                        söylemeseydik moderatör ikinci durumda işin
                        bittiğini sanır ve içerik yayında kalırdı.
                      */}
                      {!isResolved(item.status) && (
                        <p className="mt-1.5 text-meta leading-relaxed text-faint">
                          {item.target_type === 'club_deletion'
                            ? '"Silmeyi onayla" topluluğu dizinden kaldırır ve sahibine bildirim gider; ret gerekçesi de sahibine iletilir.'
                            : canRemoveContent(item.target_type)
                              ? '"Kaldır" metni siteden kaldırır ve yerinde kural açıklaması bırakır; özgün metin arşivde saklanır.'
                              : `"Kaldır" yalnızca bu kaydı kapatır. ${targetLabels[item.target_type]} içeriği ilgili panelden kaldırılır.`}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div className="space-y-4">
              <Panel title="Yetki ve sınırlar">
                <SpecList>
                  <SpecRow
                    label="Rolleriniz"
                    value={
                      roles.roles.map((r) => roleLabels[r]).join(', ') || 'yok'
                    }
                    tone="primary"
                  />
                  <SpecRow
                    label="Kuyruk okuma"
                    value={roles.canAccessAdmin ? 'açık' : 'kapalı'}
                  />
                  <SpecRow
                    label="Kayıt silme"
                    value={roles.isAdmin ? 'açık (yönetici)' : 'kapalı'}
                    tone="muted"
                  />
                  <SpecRow
                    label="Denetim günlüğü"
                    value={roles.isAdmin ? 'okunabilir' : 'yalnızca yönetici'}
                    tone="muted"
                  />
                </SpecList>
                <p className="mt-3 text-meta leading-snug text-faint">
                  Bu satırlar RLS politikalarının aynasıdır. Arayüz bir düğmeyi
                  gizlese bile asıl engel veritabanındadır; tersi de doğru —
                  gizlenmiş bir düğme yetki vermez.
                </p>
              </Panel>

              <Panel title="Kuyruk nasıl doluyor?">
                <p className="text-body-sm leading-relaxed text-muted-foreground">
                  Kayıtlar kullanıcı raporlarından ve otomatik kontrollerden
                  gelir. Rapor eden kullanıcı kendi raporunu kuyrukta göremez:
                  raporlayanın kuyruğu izleyebilmesi, hedef kullanıcının kimin
                  şikâyet ettiğini çıkarmasına ve misilleme zincirine kapı açar.
                  Sonuç, bildirim kanalından iletilir.
                </p>
              </Panel>
            </div>
          </div>
        </>
      )}

      {/*
        İÇERİK — sitenin okunan/yayımlanan malzemesi.

        Haber ve yazılar üstte, kayıtlar altta: önce içerik yazılır,
        sonra yayımlanmış olan denetlenir. Forum konusu bu sekmede YOK,
        kendi bölümünde — aynı kaydı iki yerden yönetmek, biri
        güncellenirken diğerinin eski kalması demekti.
      */}
      {bolum === 'icerik' && (
        <div className="space-y-4">
          <ContentControl
            canWrite={roles.isAdmin}
            initialKind={contentKind}
            initialSlug={targetSlug}
          />
          <PhotoWeekAdminControl canWrite={roles.isAdmin} />
          <RecordsControl
            kinds={['photo', 'listing', 'event', 'site']}
            initialKind={recordKind}
            targetSlug={targetSlug}
          />
          {/* Kulüp dizini burada, "kayıtlar"ın içinde değil: dizin
              EDİTORYAL bir kaynak — sahibi, durumu ve moderasyon kuyruğu
              olan kullanıcı kayıtlarıyla aynı ekrana sıkıştırmak, orada
              anlamı olmayan sütunlar taşımak olurdu. */}
          <ClubControl canWrite={roles.isAdmin} />
          <CommentsControl kinds={['photoComment', 'siteReview']} />
        </div>
      )}

      {/*
        KULLANICILAR — hesaplar ve onlara dokunan her şey.

        Denetim kaydı burada, ayrı bir sekmede değil: "bu rolü kim
        verdi" sorusu her zaman bir kullanıcı satırına bakarken
        soruluyor. Ayrı sekmede olsaydı iki ekran arasında gidip gelmek
        gerekirdi.
      */}
      {bolum === 'kullanicilar' && roles.isAdmin && (
        <div className="space-y-4">
          <UserControl />
          <AuditControl />
        </div>
      )}
      {bolum === 'kullanicilar' && !roles.isAdmin && (
        <Panel title="Kullanıcılar">
          <p className="py-4 text-center text-body-sm text-muted-foreground">
            Kullanıcı yönetimi yalnızca yöneticilere açık. Moderatör rolüyle
            içerik ve forum bölümlerini kullanabilirsiniz.
          </p>
        </Panel>
      )}

      {/*
        FORUM — konu ve gönderi birlikte.

        Tabloya göre bölseydik konu "içerik", gönderi "yorum" sekmesine
        düşerdi; oysa foruma bakan biri ikisini birlikte düşünüyor:
        konuyu kilitlemek mi yoksa tek bir gönderiyi kaldırmak mı
        yeterli, bu karar ikisini yan yana görmeyi gerektiriyor.
      */}
      {bolum === 'forum' && (
        <div className="space-y-4">
          {/* Kategoriler üstte: forumun iskeleti, içerikten önce gelir. */}
          <ForumCategories canWrite={roles.isAdmin} />
          <RecordsControl kinds={['thread']} title="Forum konuları" />
          <CommentsControl kinds={['forumPost']} />
        </div>
      )}

      {/* ANA SAYFA — bugün ne görünsün. */}
      {bolum === 'anasayfa' && <FeaturedControl canWrite={roles.isAdmin} />}

      {/* "Ana sayfa" ile "Site yönetimi" AYRI sekmeler ve ayrı işler:
          ilki hangi İÇERİĞİN öne çıkacağını seçiyor (öne çıkan fotoğraf,
          haber), ikincisi ana sayfanın YAPISINI yönetiyor (modül açık mı,
          hangi sırada, kaç öğe). Tek sekmede birleştirilseydi "bu
          fotoğrafı öne çıkar" ile "galeri modülünü kapat" yan yana
          dururdu ve ikincisi birincisini görünmez kılardı. */}
      {bolum === 'site' && <SiteControl canWrite={roles.isAdmin} />}

      {/* Yayın kayıtları ile istasyon/kanal ayarları aynı görev merkezinde. */}
      {bolum === 'yayin' && (
        <div className="space-y-4">
          <BroadcastControl />
          <div className="grid gap-4 xl:grid-cols-2">
            <RadioControl canWrite={roles.isAdmin} />
            <TvControl canWrite={roles.isAdmin} />
          </div>
        </div>
      )}

      {/*
        HATIRLATMA — sitenin kullanıcılara ne gönderdiği.

        Teslim sayıları, hatalı işler ve yeniden deneme aynı ekranda:
        hatayı görüp yeniden denemek için sekme değiştirmek gerekmiyor.
        Zorunlu duyuru da burada, çünkü o da bir gönderim kanalı.
      */}
      {bolum === 'hatirlatma' && <ReminderControl canWrite={roles.isAdmin} />}

      {bolum === 'audit' && <AuditControl />}

      {/*
        KATALOG — sürüm başına bir kez yapılan işler.

        Üçü aynı sırayla: senkronizasyon neyin geldiğini, rapor neyin
        eksik olduğunu, içe aktarma o eksiği doldurmanın yolunu
        söylüyor.
      */}
      {bolum === 'katalog' && (
        <div className="space-y-4">
          <CatalogControl canWrite={roles.isAdmin} />
          <EquipmentDataControl canWrite={roles.isAdmin} />
          <SpecImportControl canWrite={roles.isAdmin} />
        </div>
      )}
    </Shell>
  );
}

const ADMIN_NAV = [
  {
    label: 'İş Akışı',
    items: [
      { id: 'ozet', label: 'Genel Bakış', path: '/admin', icon: HomeIcon },
      {
        id: 'moderasyon',
        label: 'Moderasyon',
        path: '/admin/moderation',
        icon: AlertIcon,
      },
    ],
  },
  {
    label: 'İçerik',
    items: [
      {
        id: 'icerik',
        label: 'İçerik ve Kayıtlar',
        path: '/admin/content',
        icon: BookIcon,
      },
      {
        id: 'anasayfa',
        label: 'Anasayfa',
        path: '/admin/home',
        icon: GridIcon,
      },
      { id: 'forum', label: 'Forum', path: '/admin/forum', icon: ListIcon },
    ],
  },
  {
    label: 'Operasyon',
    items: [
      {
        id: 'kullanicilar',
        label: 'Kullanıcılar',
        path: '/admin/users',
        icon: UserIcon,
      },
      {
        id: 'yayin',
        label: 'Yayın Merkezi',
        path: '/admin/broadcast',
        icon: PlayIcon,
      },
      {
        id: 'hatirlatma',
        label: 'Bildirim Merkezi',
        path: '/admin/notifications',
        icon: AlertIcon,
      },
    ],
  },
  {
    label: 'Platform',
    items: [
      {
        id: 'site',
        label: 'Site Yapısı',
        path: '/admin/site-settings',
        icon: GridIcon,
      },
      {
        id: 'katalog',
        label: 'Katalog ve Araçlar',
        path: '/admin/catalog',
        icon: TagIcon,
      },
      {
        id: 'audit',
        label: 'Denetim Kaydı',
        path: '/admin/audit',
        icon: ListIcon,
      },
    ],
  },
] as const;

type AdminNavItem = (typeof ADMIN_NAV)[number]['items'][number];

const BOLUMLER: readonly AdminNavItem[] = ADMIN_NAV.flatMap(
  (group): readonly AdminNavItem[] => group.items
);

type BolumId = (typeof BOLUMLER)[number]['id'];

const BOLUM_PATHS = Object.fromEntries(
  BOLUMLER.map((b) => [b.id, b.path])
) as Record<BolumId, string>;

/** Eski derin bağlantılar görünür menüyü çoğaltmadan görev merkezlerine düşer. */
const ROUTE_ALIASES: Record<string, BolumId> = {
  '/admin/gallery': 'icerik',
  '/admin/news': 'icerik',
  '/admin/articles': 'icerik',
  '/admin/events': 'icerik',
  '/admin/listings': 'icerik',
  '/admin/sites': 'icerik',
  '/admin/media': 'icerik',
  '/admin/radio': 'yayin',
  '/admin/tv': 'yayin',
  '/admin/corporate': 'site',
  '/admin/integrations': 'site',
  '/admin/settings': 'site',
  '/admin/tools': 'katalog',
  '/admin/import-jobs': 'katalog',
};

function isBolum(value: string | null): value is BolumId {
  return BOLUMLER.some((b) => b.id === value);
}

function getBolum(pathname: string, queryBolum: string | null): BolumId {
  const normalized = pathname.replace(/\/+$/, '');
  const alias = ROUTE_ALIASES[normalized];
  if (alias) return alias;
  const fromPath = Object.entries(BOLUM_PATHS).find(
    ([, path]) => normalized === path
  )?.[0];
  if (fromPath && isBolum(fromPath)) return fromPath;
  return isBolum(queryBolum) ? queryBolum : 'ozet';
}

function getContentKind(value: string | null): EntryKind {
  return value === 'yazi' ? 'yazi' : 'haber';
}

function getRecordKind(
  pathname: string,
  value: string | null
): RecordKind | undefined {
  if (
    value === 'photo' ||
    value === 'listing' ||
    value === 'event' ||
    value === 'site'
  ) {
    return value;
  }
  const normalized = pathname.replace(/\/+$/, '');
  if (normalized === '/admin/events') return 'event';
  if (normalized === '/admin/listings') return 'listing';
  if (normalized === '/admin/sites') return 'site';
  return undefined;
}

function AdminSidebar({
  active,
  onChange,
}: {
  active: BolumId;
  onChange: (id: BolumId) => void;
}) {
  const narrow = useIsNarrow('(max-width: 1023px)');

  if (narrow) {
    return (
      <aside className="rounded-card border border-border-strong bg-surface-1/85 p-3 shadow-overlay">
        <label
          htmlFor="admin-section"
          className="label mb-1.5 block text-primary"
        >
          Yönetim bölümü
        </label>
        <Select
          id="admin-section"
          value={active}
          onChange={(event) => onChange(event.target.value as BolumId)}
          className="h-11 w-full bg-background text-body-sm font-medium"
        >
          {ADMIN_NAV.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </aside>
    );
  }

  return (
    <aside className="rounded-card border border-border-strong bg-surface-1/85 p-2 shadow-overlay lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
      <div className="px-2 py-2">
        <p className="text-caption font-semibold text-foreground">
          AstroHub Yönetim
        </p>
        <p className="mt-0.5 text-meta text-muted-foreground">
          İçerik, yayın ve sistem yüzeyleri
        </p>
      </div>
      <nav aria-label="Yönetim bölümleri" className="mt-1 space-y-3">
        {ADMIN_NAV.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[0.64rem] font-semibold uppercase tracking-[0.08em] text-faint">
              {group.label}
            </p>
            <div className="grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const selected = active === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => onChange(item.id)}
                    className={cn(
                      'flex min-h-9 w-full items-center gap-2 rounded-card border px-2.5 text-left text-body-sm font-medium transition-colors',
                      selected
                        ? 'border-primary/55 bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function AdminOverview({
  dashboard,
  roleNames,
  isAdmin,
  onChange,
}: {
  dashboard: DashboardStats | null;
  roleNames: string[];
  isAdmin: boolean;
  onChange: (id: BolumId) => void;
}) {
  /* Değer yoksa "—": sıfır göstermek "hiç yok" demek olurdu ve okunamayan
     bir sayıyla gerçekten sıfır olan bir sayı aynı görünürdü. */
  const d = (v: number | undefined) => (dashboard ? (v ?? 0) : '—');

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Panel
        title="Yönetim özeti"
        status={dashboard ? 'canlı' : 'yükleniyor…'}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout
            label="Bekleyen moderasyon"
            value={d(dashboard?.moderasyonBekleyen)}
            tone="primary"
          />
          <Readout label="Toplam üye" value={d(dashboard?.kullaniciToplam)} />
          <Readout
            label="7 günde yeni"
            value={d(dashboard?.kullaniciYeni7g)}
            tone="cold"
          />
          <Readout
            label="Askı/yasak"
            value={d(dashboard?.kullaniciAskida)}
            /* `Readout` uyarı tonu taşımıyor; dikkat çekmesi gereken
               sıfırdan büyük değer `primary` ile öne çıkıyor. */
            tone={dashboard && dashboard.kullaniciAskida > 0 ? 'primary' : 'muted'}
          />
          <Readout label="Taslak içerik" value={d(dashboard?.icerikTaslak)} />
          <Readout label="Yayındaki içerik" value={d(dashboard?.icerikYayinda)} />
          <Readout
            label="Bekleyen fotoğraf"
            value={d(dashboard?.fotografBekleyen)}
          />
          <Readout
            label="Silme talebi"
            value={d(dashboard?.silmeTalebi)}
            tone={dashboard && dashboard.silmeTalebi > 0 ? 'primary' : 'muted'}
          />
        </div>

        {/*
          BUGÜNKÜ HAREKET SAYISI kartlarla değil metinle: sıfır olduğunda
          bir kart "0" göstermek "bugün hiçbir şey yapılmadı" bilgisini
          gereğinden fazla vurgular. Cümle içinde geçmesi yeterli.
        */}
        <p className="mt-2 text-meta text-muted-foreground">
          Bugün {d(dashboard?.auditBugun)} yönetim hareketi kaydedildi.
        </p>

        {/*
          SON HAREKETLER — sayılar "ne kadar", bu liste "ne oldu".
          Aynı RPC çağrısından geliyor; ayrı bir istek yok.

          Boş liste HİÇ ÇİZİLMİYOR: "son hareketler" başlığı altında boş
          bir kutu, verinin gelmediği izlenimini verirdi. Kayıt yoksa
          bölüm de yok.
        */}
        {dashboard && dashboard.sonHareketler.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="label mb-1.5">Son hareketler</p>
            <ul className="space-y-px">
              {dashboard.sonHareketler.slice(0, 8).map((h, i) => (
                <li
                  key={`${h.zaman}-${i}`}
                  className="flex flex-wrap items-baseline gap-x-2 text-meta"
                >
                  <span className="tabular text-faint">
                    {new Date(h.zaman).toLocaleString('tr-TR')}
                  </span>
                  <span className="text-foreground">{h.eylem}</span>
                  {h.kim && <span className="text-primary">@{h.kim}</span>}
                  {h.hedef && (
                    <span className="text-muted-foreground">{h.hedef}</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onChange('audit')}
              className="mt-1.5 text-meta text-primary hover:underline"
            >
              Tüm denetim kaydı →
            </button>
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          <OverviewButton
            label="Moderasyon kuyruğu"
            detail="Raporlar ve otomatik kontroller"
            onClick={() => onChange('moderasyon')}
          />
          <OverviewButton
            label="İçerik ve kayıtlar"
            detail="Haber, yazı ve topluluk kayıtları"
            onClick={() => onChange('icerik')}
          />
          <OverviewButton
            label="Ana sayfa"
            detail="Öne çıkan içerik seçimi"
            onClick={() => onChange('anasayfa')}
          />
          <OverviewButton
            label="Site yapısı"
            detail="Menü, hero, modüller ve ayarlar"
            onClick={() => onChange('site')}
          />
          <OverviewButton
            label="Yayın merkezi"
            detail="Radyo ve TV yayın akışı"
            onClick={() => onChange('yayin')}
          />
          <OverviewButton
            label="Katalog ve araçlar"
            detail="Hedef ve ekipman verisi"
            onClick={() => onChange('katalog')}
          />
        </div>
      </Panel>

      <Panel title="Yetki durumu">
        <SpecList>
          <SpecRow
            label="Rol"
            value={roleNames.length > 0 ? roleNames.join(', ') : 'yok'}
            tone="primary"
          />
          <SpecRow
            label="Yazma yetkisi"
            value={isAdmin ? 'açık' : 'moderasyonla sınırlı'}
            tone={isAdmin ? 'primary' : 'muted'}
          />
          <SpecRow
            label="Kullanıcı yönetimi"
            value={isAdmin ? 'açık' : 'kapalı'}
            tone="muted"
          />
        </SpecList>
        <p className="mt-3 text-meta leading-relaxed text-muted-foreground">
          Özet ekranı yalnızca var olan panel yüzeylerine kısa yol verir; yetki
          sınırı her işlemde yine veritabanı politikalarıyla uygulanır.
        </p>
      </Panel>
    </div>
  );
}

function OverviewButton({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-card border border-border bg-surface-1 px-3.5 py-3 text-left transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span className="block text-body-sm font-semibold text-foreground">
        {label}
      </span>
      <span className="mt-0.5 block text-meta text-muted-foreground">
        {detail}
      </span>
    </button>
  );
}

function Shell({
  header,
  children,
  active,
  onChange,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
  active: BolumId;
  onChange: (id: BolumId) => void;
}) {
  return (
    <>
      <PageMeta
        title="Yönetim Paneli"
        description="Moderasyon kuyruğu ve içerik yönetimi."
        noIndex
      />
      {/*
        OKUMA GENİŞLİĞİ SINIRI (H3). Eskiden `max-w-none` idi ve içerik
        ekran genişliğince yayılıyordu. Geniş bir tablo artık sayfa
        gövdesini değil kendi kutusunu kaydırıyor — bunu sağlayan
        `<main>` üzerindeki `min-w-0`: ızgara sütununun içeriğe göre
        büyümesini kesiyor, taşan blok kendi `overflow-x` kutusunda
        kalıyor.
      */}
      <Container className={cn('max-w-admin py-6 sm:py-8')}>
        <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)]">
          <AdminSidebar active={active} onChange={onChange} />
          <main className="min-w-0">
            <div className="mb-4 rounded-card border border-border bg-background/70 p-3 shadow-overlay">
              {header}
            </div>
            {children}
          </main>
        </div>
      </Container>
    </>
  );
}
