import { allNavItems } from '@/app/navigation';
import { searchAll, normalize, type SearchDoc } from './index';

/**
 * KOMUT PALETİ İNDEKSİ (§16.1 + navigasyon).
 *
 * Palet üç işi birden yapar:
 *
 *   GİT    modül haritasındaki her sayfaya doğrudan gider
 *   ARAÇ   hesaplayıcı ve mod komutlarını çalıştırır
 *   İÇERİK fotoğraf, hedef, etkinlik, nokta, ekipman… arar
 *
 * Üst menüde açılır menü olmadığı için "GİT" bölümü keşfin ana yoludur:
 * palet boşken bile en sık kullanılan sayfalar listelenir.
 */

export type CommandKind = 'git' | 'arac' | 'icerik';

export interface Command {
  id: string;
  kind: CommandKind;
  title: string;
  subtitle: string;
  /** Gidilecek yol. Eylem komutlarında boş bırakılır. */
  to?: string;
  /** Yol yerine çalıştırılacak eylem (tema değiştirme gibi). */
  action?: CommandAction;
  soon?: boolean;
  keywords: string[];
}

/**
 * Tema artık üç kademeli, bu yüzden palette tek bir "aç/kapat" komutu
 * yok: üç mod da doğrudan seçilebiliyor. Paletin işi hızlandırmak —
 * aradığı moda ulaşmak için düğmeye iki kez basmak gerekmemeli.
 */
export type CommandAction = 'tema-acik' | 'tema-koyu' | 'tema-saha';

export const commandKindLabels: Record<CommandKind, string> = {
  git: 'Git',
  arac: 'Araç ve mod',
  icerik: 'İçerik',
};

/** Sonuçların gösterim sırası. */
export const commandKindOrder: CommandKind[] = ['git', 'arac', 'icerik'];

/** Modül haritasından türetilen gezinme komutları. */
const navCommands: Command[] = allNavItems().map((item) => ({
  id: `git:${item.to}:${item.label}`,
  kind: 'git',
  title: item.label,
  subtitle: item.description ?? item.to,
  to: item.to,
  soon: item.soon,
  keywords: [item.label, item.to, ...(item.keywords ?? [])],
}));

/** Sayfa değil, doğrudan bir eylem çalıştıran komutlar. */
const actionCommands: Command[] = [
  {
    id: 'arac:tema-acik',
    kind: 'arac',
    title: 'Açık temaya geç',
    subtitle: 'Gündüz masası — kâğıt zemin, grafit metin',
    action: 'tema-acik',
    keywords: ['açık', 'light', 'gündüz', 'tema', 'beyaz'],
  },
  {
    id: 'arac:tema-koyu',
    kind: 'arac',
    title: 'Koyu temaya geç',
    subtitle: 'Varsayılan — grafit zemin, kehribar aksan',
    action: 'tema-koyu',
    keywords: ['koyu', 'dark', 'gece', 'tema', 'siyah'],
  },
  {
    id: 'arac:tema-saha',
    kind: 'arac',
    title: 'Saha moduna geç',
    subtitle: 'Karanlık adaptasyonunu koruyan kırmızı arayüz',
    action: 'tema-saha',
    keywords: ['saha', 'kırmızı', 'gece modu', 'tema', 'dark adaptation'],
  },
  {
    id: 'arac:fov',
    kind: 'arac',
    title: 'FOV hesapla',
    subtitle: 'Teleskop + kamera için görüş alanı ve pixel scale',
    to: '/araclar/fov',
    keywords: ['fov', 'görüş alanı', 'pixel scale', 'hesapla', 'örnekleme'],
  },
  {
    id: 'arac:kayit-ac',
    kind: 'arac',
    title: 'Fotoğraf yükle',
    subtitle: 'Astrofotoğraf yükleme sihirbazını başlat',
    to: '/galeri/yukle',
    keywords: ['yükle', 'kayıt', 'yeni', 'upload'],
  },
];

/** Palet boşken gösterilen kısayollar — keşfin ilk basamağı. */
export const defaultCommands: Command[] = [
  ...actionCommands.filter((c) => c.id !== 'arac:saha-modu'),
  ...navCommands.filter((c) =>
    ['/bu-gece', '/galeri', '/etkinlikler', '/saha'].includes(
      c.to ?? ''
    )
  ),
  ...actionCommands.filter((c) => c.id === 'arac:saha-modu'),
];

const staticCommands = [...navCommands, ...actionCommands];

/** Önceden normalize edilmiş eşleşme metinleri. */
const commandHaystack = new Map(
  staticCommands.map((c) => [
    c.id,
    normalize([c.title, c.subtitle, ...c.keywords].join(' ')),
  ])
);

function commandScore(command: Command, terms: string[]): number {
  const hay = commandHaystack.get(command.id) ?? '';
  const title = normalize(command.title);

  let total = 0;
  for (const term of terms) {
    if (title.startsWith(term)) total += 6;
    else if (title.includes(term)) total += 4;
    else if (hay.includes(term)) total += 1;
    else return 0;
  }
  return total;
}

/** Bir içerik sonucunu komut biçimine çevirir. */
function toCommand(doc: SearchDoc, groupLabel: string): Command {
  return {
    id: doc.id,
    kind: 'icerik',
    title: doc.title,
    subtitle: `${groupLabel} · ${doc.subtitle}`,
    to: doc.to,
    keywords: doc.keywords,
  };
}

export interface CommandGroup {
  kind: CommandKind;
  label: string;
  items: Command[];
}

/**
 * Sorguyu çalıştırır. Boş sorguda varsayılan kısayollar döner; doluysa
 * gezinme + eylem komutları ile içerik sonuçları birlikte gruplanır.
 */
/**
 * Kapalı bölümlerin adres önekleri (§13.2).
 *
 * Palet kapalı bir bölüme götürmemeli: `radyo_acik` kapalıyken "radyo"
 * yazan kullanıcıyı, girer girmez "bu bölüm kapalı" diyen bir sayfaya
 * göndermek, hiç sonuç göstermemekten kötü.
 *
 * Süzme PUANLAMADAN SONRA: haystack modül yüklenirken bir kez kuruluyor
 * ve bayraklar ondan sonra geliyor. Sonradan süzmek birkaç komutu boşuna
 * puanlamak demek — ölçülemeyecek kadar küçük bir maliyet, karşılığında
 * indeksin bayraktan bağımsız kalması.
 */
function gizliMi(command: Command, prefixes: readonly string[]): boolean {
  const yol = command.to;
  if (!yol) return false;
  return prefixes.some((ön) => yol === ön || yol.startsWith(`${ön}/`));
}

export function runCommandSearch(
  query: string,
  hiddenPrefixes: readonly string[] = []
): CommandGroup[] {
  const terms = normalize(query).split(' ').filter(Boolean);
  const gorunur = (liste: Command[]) =>
    hiddenPrefixes.length === 0
      ? liste
      : liste.filter((c) => !gizliMi(c, hiddenPrefixes));

  if (terms.length === 0) {
    return [
      { kind: 'git', label: 'Sık kullanılan', items: gorunur(defaultCommands) },
    ];
  }

  const matched = gorunur(staticCommands)
    .map((c) => ({ command: c, score: commandScore(c, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.command);

  // İçerik araması mevcut indeksi yeniden kullanır (§16.1).
  const content = searchAll(query, { limitPerCategory: 3 }).flatMap((group) =>
    group.items.map((doc) => toCommand(doc, group.label))
  );

  const groups: CommandGroup[] = [
    {
      kind: 'git',
      label: commandKindLabels.git,
      items: matched.filter((c) => c.kind === 'git').slice(0, 6),
    },
    {
      kind: 'arac',
      label: commandKindLabels.arac,
      items: matched.filter((c) => c.kind === 'arac').slice(0, 4),
    },
    { kind: 'icerik', label: commandKindLabels.icerik, items: content },
  ];

  return groups.filter((g) => g.items.length > 0);
}

/** Gruplanmış komutları klavye gezinmesi için düz listeye indirger. */
export function flattenCommands(groups: CommandGroup[]): Command[] {
  return groups.flatMap((g) => g.items);
}
