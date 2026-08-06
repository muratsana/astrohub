# Eski dalların incelemesi — 6 Ağustos 2026

Depoda `main` dışında üç dal duruyor. Bu belge, onlarda ne olduğunu ve
`main`'e göre neyin eksik kaldığını ölçerek çıkarır.

İnceleme tabanı: `main` = `2575049` (PR #17 birleştikten sonra).

---

## 1. Temel bulgu: ortak geçmiş yok

```
git merge-base origin/main origin/agent/smart-single-toolbar
→ fatal: no merge base
```

| Dal | Commit | Kök commit | `main`'e göre farklı dosya |
|---|---|---|---|
| `main` | 50 | `a3482d4` · 2026-08-04 | — |
| `agent/smart-single-toolbar` | 259 | `3f1ad01` · 2026-07-28 | 134 |
| `agent/astrohub-gui-unification` | 259 | `3f1ad01` · 2026-07-28 | 134 |
| `claude/githubdan-project-audit-sbker0` | 258 | `3f1ad01` · 2026-07-28 | 134 |

`main` bir noktada sıfırdan yeniden yazılmış. Üç dal eski geçmişe ait ve
yeni `main` ile **hiçbir ortak atası yok**. Bu yüzden "merge et" bir
birleştirme değil, iki ilgisiz ağacı `--allow-unrelated-histories` ile
zorla yapıştırmak olurdu: 134 dosyada çatışma çıkar ve hangi tarafın
kazandığına göre canlı site bozulur.

**Üç dal birbirinin devamı değil, ortak bir gövdenin üç ucu:**

- `agent/smart-single-toolbar` — gövde + PR #15 + "smart single toolbar"
- `agent/astrohub-gui-unification` — gövde + arayüz bütünleme + haftalık
  dış servis sağlık kontrolü
- `claude/githubdan-project-audit-sbker0` — gövde + `docs/AUDIT-VE-GELISTIRME-2026-08-03.md`

Karşılaştırmalarda uç olarak `agent/smart-single-toolbar` alındı; diğer
ikisinin kendine özel katkısı ayrıca kontrol edildi.

---

## 2. Yapısal olarak `main` önde

Ölçülenler:

| Alan | Sonuç |
|---|---|
| `package.json` | **Birebir aynı** — eski dalda olup `main`'de olmayan bağımlılık yok |
| `supabase/migrations` | eski 80 · `main` 88 · yalnızca eskide olan migration **yok** |
| `scripts/` | Yalnızca eskide olan betik **yok** (`check-external.mjs` dâhil `main`'de var) |
| `.github/workflows` | Yalnızca eskide olan iş akışı **yok** (`external-health.yml` dâhil) |
| Rotalar | Yalnızca eskide olan **tek** rota: `/akis`. `main`'de eskide olmayan 14 rota var |

"Smart single toolbar" işi de `main`'de: `ToolBar.tsx` ve
`ActiveFilters.tsx` satır satır aynı, `ModuleToolbar` ve `FilterBar` ise
`main`'de **daha ileri** (eskideki `compact` boolean'ı yerine üç kademeli
`FilterDensityContext`, `showResultCount` seçeneği). Yani o dalın adını
taşıyan iş kaybolmamış, üstüne yazılmış.

---

## 3. Gerçekten eksik olanlar

### 3.1 `/akis` — etkinlik akışı (yalnızca eski dalda)

`src/features/activity/ActivityPage.tsx` + `src/services/content/activity.ts`
(+ testi). Fotoğraf / ilan / forum konusu olaylarını tek akışta gösteren,
`/profil/:username` bağlantılı bir sayfa. `main`'de dosyaları da rotası da
yok.

### 3.2 `EventsPage.tsx` — etkinlik liste görünümü (yalnızca eski dalda)

Eski dalda `/etkinlikler` bu sayfaydı ve `/etkinlikler/harita` ayrı bir
rotaydı. `main`'de tersi: `/etkinlikler` doğrudan `EventMapPage`,
`/etkinlikler/harita` ona yönlendiriyor. Liste görünümüyle birlikte giden
şeyler: `EventCalendar` (takvim görünümü), `eventsSpec` (faset süzme +
sıralama), `RangeFilter`, `ViewToggle`.

### 3.3 Forum: rozet ve çözülmemiş süzgeci

`main`'de rozet **altyapısı var, arayüzü yok**:

| Parça | `main` | Eski dal |
|---|---|---|
| `forumLabels` / `forumLabelOrder` / `forumLabelLimit` (`types.ts`) | var | var |
| `LabelChip.tsx` bileşeni | var ama **hiçbir yerde çizilmiyor** | `ForumPage` + `ThreadPage` |
| `services/content/forum.ts` rozet normalleştirme + kayıt | var | var |
| Yeni konu formunda rozet seçici | **yok** (`labels: []` sabit) | var (en çok 3 rozet) |
| `forumSpec` `rozet` faseti | **yok** | var |
| `forumSpec` `cozulmemis` faseti | **yok** | var |
| `ForumDensity` / `forumDensities` | tanımlı ama **kullanılmıyor** | yoğunluk düğmesi |

Sonuç: `filterThreads` hâlâ `onlyUnsolved` parametresini destekliyor,
`types.ts` arama sözlüğüne rozet adlarını katıyor — ama kullanıcı rozet
takamıyor ve rozete/çözülmemişe göre süzemiyor.

### 3.4 Saha listesi: arama, sıralama ve paylaşılabilir süzgeç

`main`'in `SitesPage`'i harita merkezli yeni bir tasarım (579 satır,
eskisi 328) ve daha zengin — ama süzgeç durumu artık yerel `useState`'te.
Eskide `useExplorer` + `sitesSpec` vardı; bunun pratik farkı:

- metin araması ("Saha adı, bölge veya yol erişimi") **yok**
- sıralama seçenekleri **yok**
- seçim adres çubuğuna yazılmıyor → **paylaşılabilir liste bağlantısı yok**

`sitesSpec.ts` `main`'de duruyor ama yalnızca kendi testi anıyor.

### 3.5 Galeri: CSV dışa aktarma ve kayıtlı görünümler

`CsvExportButton.tsx` ve `SavedViewsMenu.tsx` `main`'de mevcut,
**hiçbir yerden import edilmiyor**. Eski dalda ikisi de `GalleryPage`
içindeydi.

### 3.6 `docs/AUDIT-VE-GELISTIRME-2026-08-03.md`

`claude/githubdan-project-audit-sbker0` dalına özel proje denetimi ve
geliştirme planı. `main`'de yok. Kod değil, belge.

---

## 4. `main`'de bağlanmamış duran modüller — özet

Aşağıdakiler `main`'de var, derleniyor, ama hiçbir üretim dosyası
kullanmıyor. Hepsi eski dalda bağlıydı; yani kaybolan şey modülün kendisi
değil, **bağlantısı**.

| Modül | Eski dalda kullanan |
|---|---|
| `features/events/EventCalendar.tsx` | `EventsPage.tsx` |
| `features/events/eventsSpec.ts` | `EventsPage.tsx` |
| `features/explorer/CsvExportButton.tsx` | `GalleryPage.tsx` |
| `features/explorer/SavedViewsMenu.tsx` | `GalleryPage.tsx` |
| `features/forum/LabelChip.tsx` | `ForumPage.tsx`, `ThreadPage.tsx` |
| `features/observing-sites/sitesSpec.ts` | `SitesPage.tsx` |

Şunlar eski dalda da bağlı değildi, yani bu tablonun dışında:
`home/sections/DarkSkyStrip.tsx`, `services/object-storage/supabaseAdapter.ts`,
`features/targets/grouping.ts`.

---

## 5. İncelemede çıkan ayrı bir kusur

Denetimin B7 maddesi (`Input`/`Select` genişliğinin `className` ile
verilemeyeceği) `width` prop'uyla çözüldü ama beş çağrı yeri
dönüştürülmüştü. Tarama, aynı desenin **altı yerde daha** durduğunu
gösteriyor:

```
src/features/admin/AdminPage.tsx            className="h-8 w-auto text-meta"
src/features/sky/TonightPage.tsx            className="h-8 w-auto text-meta"   (×2)
src/features/clubs/FacilitiesPage.tsx       className="h-8 w-auto text-meta"
src/features/observing-sites/SitesPage.tsx  className="h-8 w-auto text-meta"   (×2)
```

`w-auto` taban `w-full` ile çakışıyor ve kaybediyor: seçiciler daraltılmak
istendikleri hâlde satırın tamamına yayılıyor. (`min-w-*` kullanan yerler
sorunlu değil — `min-width` ile `width` çakışmaz.)

---

## 6. Öneri

1. **Üç dalı merge etmeyin.** Ortak geçmişleri olmadığı için sonuç
   birleştirme değil, üzerine yazma olur.
2. Yukarıdaki §3 maddelerinden istenenler, yeni `main` üstünde **yeniden
   yazılarak** getirilmeli — eski dosyalar `git show <dal>:<yol>` ile
   okunup referans alınabilir. Bunların çoğu için `main`'de zaten yarısı
   duruyor (bileşen var, bağlantısı yok), yani iş küçük.
3. Dallar bu belgedeki kayıt alındıktan sonra silinebilir; geçmiş
   GitHub'da kalır ve bu belge nereye bakılacağını söyler.
