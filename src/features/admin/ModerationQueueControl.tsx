import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/cn';
import { Input } from '@/components/ui/Input';
import {
  canRemoveContent,
  fetchContentState,
  restoreContent,
  VARSAYILAN_KALDIRMA_GEREKCESI,
  decideClubDeletion,
  durumEtiketi,
  fetchQueue,
  isResolved,
  reasonLabels,
  removeContent,
  resolveItem,
  sendModerationFeedback,
  statusLabels,
  targetLabels,
  type ModerationItem,
  type ModerationStatus,
  type QueueResult,
} from './moderation';

/**
 * ŞİKÂYET KUYRUĞU — karar yüzeyi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU EKRAN NEDEN SONRADAN YAZILDI
 * ══════════════════════════════════════════════════════════════════════
 *
 * `moderation.ts` eksiksiz bir karar katmanı taşıyordu — kuyruk okuma,
 * durum sayımı, karar yazma, içerik kaldırma, topluluk silme talebi,
 * şikâyetçiye geri bildirim — ve on bir export'un HİÇBİRİ çağrılmıyordu.
 * Panelde kuyruğa bakan bir ekran yoktu.
 *
 * Görünen tek iz Genel Bakış'taki "Onay bekleyen" sayacıydı: sayıyı
 * `moderation_queue`'dan okuyor, tıklandığında ise o tabloya hiç
 * dokunmayan içerik onay ekranına götürüyordu. Yani sayaç doğru, varış
 * yeri yanlıştı; kuyrukta bekleyen şikâyet hiçbir yerden görülemiyordu.
 *
 * ── HATALAR YUTULMUYOR ──────────────────────────────────────────────
 *
 * Panelin başka yerlerinde görülen desen burada bilerek tekrarlanmadı:
 * her okuma ve yazma `error` değerini okuyor. "Kuyruk boş" ile "kuyruk
 * okunamadı" ayırt edilemezse moderatör bekleyen şikâyeti olmadığını
 * sanır — bu ekranda en pahalı hata tam olarak budur.
 *
 * ── YETKİ İSTEMCİDE SORULMUYOR ──────────────────────────────────────
 *
 * `moderation.ts`'in kendi notundaki kural korunuyor: yetkiyi RLS verir.
 * Moderatör olmayan biri bu ekranı açarsa kuyruğu boş görür, çünkü
 * sorgu boş döner — burada ikinci bir "yetkili mi" kontrolü yok.
 */

/** Sekmeler. Bekleyen işler solda; kapanmış kayıtlar sağda. */
const TABS: readonly ModerationStatus[] = [
  'pending',
  'in_review',
  'escalated',
  'approved',
  'rejected',
  'archived',
];

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('tr-TR');
}

export function ModerationQueueControl() {
  const { user } = useAuth();
  const [tab, setTab] = useState<ModerationStatus>('pending');
  const [result, setResult] = useState<QueueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const load = useCallback(async (status: ModerationStatus) => {
    setError(null);
    try {
      setResult(await fetchQueue(status));
    } catch (err) {
      /* Okuma düştü: listeyi BOŞ bırakmıyoruz, `null` bırakıyoruz.
         Boş dizi "kuyrukta iş yok" demek olurdu ve hata gizlenirdi. */
      setResult(null);
      setError(err instanceof Error ? err.message : 'Kuyruk okunamadı.');
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  /** Yazma işlerinin ortak sarmalayıcısı: hata yüzeye çıkar, liste tazelenir. */
  const run = useCallback(
    async (islem: () => Promise<void>) => {
      setBusy(true);
      setError(null);
      try {
        await islem();
        await load(tab);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'İşlem tamamlanamadı.');
      } finally {
        setBusy(false);
      }
    },
    [load, tab]
  );

  const karar = (item: ModerationItem, status: ModerationStatus) => {
    if (!user?.id) {
      setError('Karar yazmak için oturum gerekiyor.');
      return;
    }
    void run(() =>
      resolveItem(item.id, status, user.id, undefined, item.target_type)
    );
  };

  /* Açık hüküm panelinin kayıt kimliği; aynı anda tek karar veriliyor. */
  const [hukum, setHukum] = useState<string | null>(null);
  const tazele = useCallback(() => void load(tab), [load, tab]);

  const items = result?.items ?? [];
  const counts = result?.counts;

  return (
    <Panel
      title="Şikâyet kuyruğu"
      status={result ? `${items.length} kayıt` : error ? 'okunamadı' : 'okunuyor…'}
    >
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist">
        {TABS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            onClick={() => setTab(s)}
            className={cn(
              'rounded-card border px-3 py-1.5 text-meta font-medium transition-colors',
              tab === s
                ? 'border-primary text-primary'
                : 'border-border text-muted hover:border-border-strong'
            )}
          >
            {statusLabels[s]}
            {counts && counts[s] > 0 ? ` · ${counts[s]}` : ''}
          </button>
        ))}
      </div>

      {error && <Alert className="mb-3">{error}</Alert>}

      {result && items.length === 0 && !error && (
        <p className="text-meta text-muted">
          Bu durumda kayıt yok.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const talep = item.target_type === 'club_deletion';
          return (
            <li
              key={item.id}
              className="rounded-card border border-border p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge>{targetLabels[item.target_type]}</Badge>
                <Badge>{reasonLabels[item.reason]}</Badge>
                <span className="text-meta text-muted">
                  {durumEtiketi(item)} · {formatDate(item.created_at)}
                </span>
                {/*
                  ŞİKÂYETÇİ GÖRÜNÜYOR.

                  `reported_by` kolonu doluyordu ama hiçbir yerde
                  gösterilmiyordu: aynı kişinin aynı kullanıcıyı beşinci
                  kez bildirmesiyle ilk kez bildirmesi ekranda aynı
                  görünüyordu. Kötü niyetli bildirimi görmenin tek yolu
                  şikâyetçiyi görmek.
                */}
                <span className="ml-auto text-meta text-faint">
                  {item.reporter_username ? (
                    <>
                      Şikâyet eden:{' '}
                      <a
                        href={`/profil/${item.reporter_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        {item.reporter_username}
                      </a>
                    </>
                  ) : item.reported_by ? (
                    'Şikâyet eden: profili silinmiş kullanıcı'
                  ) : (
                    'Şikâyet eden: oturumsuz bildirim'
                  )}
                </span>
              </div>

              {/* Şikâyet notu TAM gösteriliyor: kırpılmış bir gerekçeyle
                  karar verilemez. */}
              {item.note && (
                <p className="mb-2 whitespace-pre-wrap text-body">{item.note}</p>
              )}

              {item.target_path && (
                <a
                  href={item.target_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2 inline-block text-meta text-primary underline"
                >
                  Şikâyet edilen içeriği aç
                </a>
              )}

              {item.resolution_note && (
                <p className="mb-2 text-meta text-muted">
                  Karar notu: {item.resolution_note}
                </p>
              )}

              {/* İçeriğin GERÇEK durumu ve geri alma — kapanmış kayıtta
                  da duruyor, çünkü şikâyetin haksız olduğu sonradan
                  anlaşılabiliyor. */}
              {canRemoveContent(item.target_type) && (
                <IcerikDurumu
                  item={item}
                  busy={busy}
                  yenile={tazele}
                  hataYaz={setError}
                />
              )}

              {/* Haklı bulma ikinci soruyu açıyor: içerik ne olsun? */}
              {!isResolved(item.status) && hukum === item.id && (
                <HukumPaneli
                  item={item}
                  busy={busy}
                  onKapat={() => setHukum(null)}
                  onKarar={(kaldir, gerekce) =>
                    void run(async () => {
                      if (kaldir) {
                        await removeContent(
                          item.target_type,
                          item.target_id,
                          gerekce
                        );
                      }
                      if (!user?.id) throw new Error('Oturum bulunamadı.');
                      await resolveItem(
                        item.id,
                        'rejected',
                        user.id,
                        kaldir
                          ? `Şikâyet haklı — içerik yayından kaldırıldı. ${gerekce}`.trim()
                          : 'Şikâyet haklı — içerik yayında bırakıldı.',
                        item.target_type
                      );
                      setHukum(null);
                    })
                  }
                />
              )}

              {!isResolved(item.status) && (
                <div className="flex flex-wrap gap-2">
                  {talep ? (
                    <>
                      {/* Silme talebi `resolveItem`den geçmiyor: silme,
                          bildirim ve denetim kaydı birlikte
                          `topluluk_silme_karari` içinde. */}
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void run(() => decideClubDeletion(item.id, true))
                        }
                      >
                        Silmeyi onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() =>
                          void run(() =>
                            decideClubDeletion(
                              item.id,
                              false,
                              'Talep reddedildi.'
                            )
                          )
                        }
                      >
                        Talebi reddet
                      </Button>
                    </>
                  ) : (
                    <>
                      {/*
                        "ŞİKÂYET HAKLI" ARTIK TEK BAŞINA KARAR DEĞİL.

                        Eskiden bu düğme kaydı `rejected` yapıyordu ve
                        durum etiketi "Kaldırıldı" diye görünüyordu — ama
                        içeriğe DOKUNMUYORDU. Canlıda tam olarak bu oldu:
                        telif şikâyeti "Kaldırıldı" yazıyordu, fotoğraf
                        yayında duruyordu. Kaldırma düğmesi fotoğraf için
                        zaten hiç çizilmiyordu.

                        Şimdi haklı bulmak ikinci soruyu açıyor: içerik
                        yayından kalksın mı, kalsın mı. Karar ne olursa
                        olsun ikisi birlikte yazılıyor, yani etiket ile
                        gerçek bir daha ayrışmıyor.
                      */}
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          setHukum(hukum === item.id ? null : item.id)
                        }
                      >
                        Şikâyet haklı
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => karar(item, 'approved')}
                      >
                        Şikâyet haksız
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => karar(item, 'in_review')}
                      >
                        İncelemeye al
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => karar(item, 'escalated')}
                      >
                        Yönetime taşı
                      </Button>
                      {/* Konusu kalmamış kayıt `approved` yerine
                          `archived`: denetim günlüğünde "incelendi, haklı
                          bulunmadı" gibi görünmesin. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => karar(item, 'archived')}
                      >
                        Arşivle
                      </Button>
                    </>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setFeedbackFor(
                        feedbackFor === item.id ? null : item.id
                      );
                      setFeedbackText('');
                    }}
                  >
                    Geri bildirim
                  </Button>
                </div>
              )}

              {feedbackFor === item.id && (
                <div className="mt-2 space-y-2">
                  <label
                    className="block text-meta text-muted"
                    htmlFor={`geri-bildirim-${item.id}`}
                  >
                    Şikâyetçiye gönderilecek mesaj
                  </label>
                  <textarea
                    id={`geri-bildirim-${item.id}`}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={3}
                    className="w-full rounded-card border border-border bg-surface p-2 text-body"
                  />
                  <Button
                    size="sm"
                    disabled={busy || !feedbackText.trim()}
                    onClick={() =>
                      void run(async () => {
                        await sendModerationFeedback(item.id, feedbackText);
                        setFeedbackFor(null);
                        setFeedbackText('');
                      })
                    }
                  >
                    Gönder
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}


/**
 * HÜKÜM PANELİ — "şikâyet haklı" dedikten sonraki ikinci soru.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İKİ ADIM
 *
 * Haklı bulmak ile içeriği kaldırmak AYNI KARAR DEĞİL. Telif şikâyeti
 * haklı olabilir ve doğru çözüm kaynağı eklemek olabilir; hakaret
 * şikâyeti haklı olabilir ve içerik yine de kalabilir çünkü tartışmanın
 * bağlamı ona bağlı. Tek düğmenin ikisini birden yapması, moderatörün
 * veremeyeceği bir kararı onun yerine vermek olurdu.
 *
 * Tersi de yaşandı: düğme yalnızca kaydı kapatıyor, içeriğe hiç
 * dokunmuyordu — ve durum etiketi "Kaldırıldı" diyordu. Ekran, olmamış
 * bir şeyi olmuş gibi gösteriyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GEREKÇE KULLANICININ OKUYACAĞI METİN
 *
 * Moderatörün kendine yazdığı not değil: kaldırılan içeriğin YERİNE bu
 * cümle geçiyor. Bu yüzden ayrı bir alan ve varsayılanı hazır — boş
 * bırakılan bir gerekçe, tartışma tablolarında veritabanı kısıtına
 * takılıp ham hata verirdi.
 */
function HukumPaneli({
  item,
  busy,
  onKapat,
  onKarar,
}: {
  item: ModerationItem;
  busy: boolean;
  onKapat: () => void;
  onKarar: (kaldir: boolean, gerekce: string) => void;
}) {
  const [gerekce, setGerekce] = useState(VARSAYILAN_KALDIRMA_GEREKCESI);

  return (
    <div className="mb-2 rounded-card border border-warning/45 bg-warning/8 p-3">
      <p className="text-body-sm font-medium text-foreground">
        Şikâyeti haklı buldunuz. İçerik ne olsun?
      </p>
      <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
        Haklı bulmak içeriği kendiliğinden kaldırmıyor — kararı siz
        veriyorsunuz. İki seçenek de kayda yazılıyor.
      </p>

      <div className="mt-3">
        <label
          className="label block"
          htmlFor={`gerekce-${item.id}`}
        >
          Kaldırma gerekçesi
        </label>
        <p className="mb-1 text-meta leading-snug text-faint">
          Kaldırırsanız içeriğin yerinde bu cümle görünecek. Yayında
          bırakırsanız kullanılmıyor.
        </p>
        <Input
          id={`gerekce-${item.id}`}
          value={gerekce}
          maxLength={300}
          onChange={(e) => setGerekce(e.target.value)}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="danger"
          disabled={busy || !gerekce.trim()}
          onClick={() => onKarar(true, gerekce.trim())}
        >
          Yayından kaldır
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={() => onKarar(false, '')}
        >
          Yayında tut
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={onKapat}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}

/**
 * İÇERİĞİN GERÇEK DURUMU VE GERİ ALMA.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KUYRUK DURUMU İLE İÇERİK DURUMU AYRI ŞEYLER
 *
 * Kayıt "Kaldırıldı" olabilir ve içerik yayında olabilir; tersi de
 * mümkün. Moderatör bunu hiçbir yerden göremiyordu ve ekrana güvenip
 * yanlış karar veriyordu. Bu şerit hedefin tablosuna bakıp gerçeği
 * söylüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GERİ ALMA KAPANMIŞ KAYITTA DA DURUYOR
 *
 * Şikâyetin haksız olduğu çoğu zaman SONRADAN anlaşılıyor — itiraz
 * gelince, kaynak bulununca. Geri almayı yalnızca açık kayıtlarda
 * sunmak, kararı verildikten sonra düzeltilemez yapardı. Tartışma
 * içeriğinde gövde arşivden geri geliyor (`app.tartisma_kaldirma`).
 */
function IcerikDurumu({
  item,
  busy,
  yenile,
  hataYaz,
}: {
  item: ModerationItem;
  busy: boolean;
  yenile: () => void;
  hataYaz: (mesaj: string | null) => void;
}) {
  const [durum, setDurum] = useState<{ found: boolean; removed: boolean } | null>(
    null
  );
  const [calisiyor, setCalisiyor] = useState(false);

  const oku = useCallback(() => {
    let aktif = true;
    fetchContentState(item.target_type, item.target_id)
      .then((d) => {
        if (aktif) setDurum(d);
      })
      .catch(() => {
        /* Okunamayan durum, kararı engellemiyor: şerit "bilinmiyor"
           diyor ve düğmeler gizleniyor — yanlış düğme göstermektense. */
        if (aktif) setDurum(null);
      });
    return () => {
      aktif = false;
    };
  }, [item.target_type, item.target_id]);

  useEffect(oku, [oku]);

  async function geriAl() {
    setCalisiyor(true);
    hataYaz(null);
    try {
      await restoreContent(item.target_type, item.target_id);
      setDurum({ found: true, removed: false });
      yenile();
    } catch (e) {
      hataYaz(e instanceof Error ? e.message : 'Geri alınamadı.');
    } finally {
      setCalisiyor(false);
    }
  }

  if (!durum) return null;

  if (!durum.found) {
    return (
      <p className="mb-2 text-meta text-faint">
        Şikâyet edilen kayıt bulunamadı — kalıcı olarak silinmiş olabilir.
      </p>
    );
  }

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Badge tone={durum.removed ? 'danger' : 'success'}>
        {durum.removed ? 'İçerik yayından kaldırıldı' : 'İçerik yayında'}
      </Badge>
      {durum.removed && (
        <>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || calisiyor}
            onClick={() => void geriAl()}
          >
            {calisiyor ? 'Geri alınıyor…' : 'Yayına geri al'}
          </Button>
          <span className="text-meta text-faint">
            Şikâyet haksız çıktıysa içerik metniyle birlikte geri gelir.
          </span>
        </>
      )}
    </div>
  );
}
