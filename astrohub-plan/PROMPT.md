# Claude Code Promptları

Bu paketi Astrohub deposunun köküne çıkarın (`astrohub-plan/` klasörü olarak).
Aşağıdaki promptları **sırayla** ve **ayrı oturumlarda** kullanın.

> ⚠️ Planın tamamını tek seferde vermeyin. 16 faz birbirine bağımlıdır;
> hepsini birden vermek yanlış sırada iş yapılmasına yol açar.

---

## 1) Başlangıç — bir kez çalıştırın

```
astrohub-plan/ASTROHUB-YENILEME-PLANI.md dosyasını baştan sona oku.

Bu, Astrohub'ın kapsamlı yenileme planı. Şimdilik HİÇBİR KOD YAZMA.
Yalnızca şunları yap:

1. Planın §1.1'indeki "zaten var olan altyapı" listesini depoyla karşılaştır
   ve doğrula. Listede yanlış ya da eksik gördüğün bir şey varsa söyle.
2. §1.2'deki dört hatayı (H1–H4) depoda teyit et.
3. astrohub-plan/ilerleme.html dosyasını depoda docs/ilerleme.html olarak
   kopyala ve claude.ai artifact olarak yayımla. URL'yi bana bildir.
4. Bana FAZ 0 için somut bir uygulama sırası öner.

Doğrulayamadığın maddeyi tahmin etme, "doğrulanamadı" de.
```

---

## 2) Her faz için — şablon

`<N>` yerine faz numarasını yazın.

```
astrohub-plan/ASTROHUB-YENILEME-PLANI.md dosyasındaki FAZ <N>'i uygula.

KURALLAR
- Yalnızca bu fazın görevlerini yap. Sonraki fazlara geçme.
- §6'daki tekrarlayan kuralların hepsi geçerli: yetki veritabanında zorlanır,
  moderatör silemez, public alan durum sızdırmaz, yönetim işlemleri kayda
  geçer, soft delete varsayılan.
- §1.1'deki "zaten var" listesine bak; orada olan hiçbir şeyi yeniden kurma.
- **Tek doğruluk kaynağı kuralı (§6.8):** aynı içeriğin ikinci bir kaynağını
  (statik dosya, ikinci tablo, ikinci RPC) bırakma. Bir modülü tabloya
  bağladıysan eski kaynağı sil.
- Veritabanı değişikliklerini migration olarak yaz, panelden elle SQL
  çalıştırma.
- Supabase'e yazmadan önce doğru projede olduğunu doğrula: to_regclass ile
  venue_events veya studio_profiles görürsen DUR, orası StageHub.

KODLAMA DIŞI ENGELLER (plan §10)
- Bir görev dış servis hesabı, izin, abonelik ya da sunucu gerektiriyorsa
  O İŞ KOLUNDA DUR. Tahmini kimlik bilgisiyle ilerleme, sahte veriyle
  "geçici" çözüm üretme.
- Panoda o maddeyi "sende" durumuna al.
- Bana ADIM ADIM ne yapmam gerektiğini yaz: nereye gireceğim, hangi hesabı
  açacağım, hangi bilgiyi sana geri getireceğim, ücret varsa ne kadar.
- Sonra engellenmemiş diğer işlere geç — tek engel yüzünden fazı durdurma.

İLERLEME PANOSU
- Bir göreve başlarken docs/ilerleme.html içindeki DURUM bloğunda ilgili
  anahtarı "yapiliyor" yap.
- Bitirdiğinde "tamamlandi" yap, GUNCELLEME alanına tarihi yaz.
- Panoyu AYNI URL'ye yeniden yayımla (Artifact aracına url parametresiyle).
- Kodla bitmeyen madde için "sende" kullan, "tamamlandi" yapma.
- Yapılmamış işi tamamlandı işaretleme.

BİTİRİNCE
- Fazın kabul kriterlerini tek tek kontrol et ve sonucunu bildir.
- Çalıştıramadığın kriteri tahmin etme, "doğrulanmadı" de.
- typecheck, lint, build ve testleri çalıştır; hepsi yeşil olmalı.
- Ne eklediğini, ne kaldırdığını ve hangi dosyalara dokunduğunu tam listele.
```

---

## 3) Sık kullanılacak özel promptlar

### Katalog içe aktarma (FAZ 12.1)

```
astrohub-plan/ASTROHUB-YENILEME-PLANI.md §FAZ 12.1'i oku ve OpenNGC içe
aktarmasını yap.

- Yeni boru hattı YAZMA. 20260807090000_katalog_ice_aktarma.sql zaten
  hazırlık tablosu + toplu eşleştirme sağlıyor; onu kullan.
- "Yalnızca boş alan doldur" kuralını koru — mevcut Türkçe adlar,
  açıklamalar ve editör alanları ezilmemeli.
- Önce KURU ÇALIŞTIRMA raporu üret: kaç kayıt eşleşti, kaç yeni, kaç alan
  dolduruldu. Onayımı almadan yazma.
- Kaynak ve lisans bilgisini (CC-BY-SA-4.0) kayıtlara işle.
- deepskycorner.ch'ye DOKUNMA — telif izni netleşmedi.
```

### Katalog birleştirme (FAZ 14)

```
astrohub-plan/ASTROHUB-YENILEME-PLANI.md §FAZ 14'ü oku ve uygula.

EN ÖNEMLİ UYARI: src/features/targets/data.ts dosyasını SİLME. O dosya 14
ayrı modül tarafından kullanılıyor (sitemap, catalogSync, MosaicPlanner,
Discover, explorer, home/tonight, PhotoDetail, tint, search, Simulator,
sky/Planner, sky/Tonight ve skycatalog'un kendisi). Kaldırılacak olan
yinelenen KULLANICI ARAYÜZÜ, veri kaynağı değil.

Sırayı bozma: önce Gökyüzü Kataloğu'nu tablodan besle, sonra targets/'tan
eksik parçaları taşı, sonra rotaları yönlendir, en son data.ts bağımlılığını
modül modül çöz.

/hedefler ve /hedef/:slug 404 vermemeli — kalıcı yönlendirme kur.
```

### Tekilleştirme (FAZ 15) — bir modül için

```
astrohub-plan/ASTROHUB-YENILEME-PLANI.md §FAZ 15'i oku.

Yalnızca <MODÜL> modülünü statik data.ts'ten veritabanına taşı:
1. data.ts içeriğini tabloya yazacak tek seferlik taşıma üret
2. Sayfayı tablodan okuyacak şekilde çevir
3. Doğrula: aynı içerik görünüyor mu, arama çalışıyor mu
4. data.ts'i SİL
5. O dosyaya bağlı başka modül var mı kontrol et

Başka modüle DOKUNMA. Hepsini birden çevirmek, bir şey bozulduğunda
hangi taşımanın sebep olduğunu belirsizleştirir.

Sıra: news → articles → events → marketplace → clubs → observing-sites
      → photos → equipment → targets (en son, 14 modül bağlı)
```

### Statik içeriği veritabanına taşıma (FAZ 4)

```
astrohub-plan/ASTROHUB-YENILEME-PLANI.md §FAZ 4'ü oku.

Yalnızca HABER içeriğini src/features/*/data.ts dosyalarından
content_entries tablosuna taşı. kind alanını 'haber' yap.
Sayfaları tablodan okuyacak şekilde güncelle, doğrula, sonra ilgili
data.ts'i sil.

Diğer modüllere (yazı, eğitim) DOKUNMA — onlar ayrı adımlar.
Hepsini birden çevirmek, hata olduğunda kaynağını belirsizleştirir.
```

---

## 4) Faz sırası

```
FAZ 0  → FAZ 1  → sonrası
                  ├─ FAZ 2  (kullanıcı yönetimi)
                  ├─ FAZ 3  → FAZ 4 → FAZ 7
                  │         ├─ FAZ 5
                  │         └─ FAZ 8
                  ├─ FAZ 6  (bildirim/mesaj)
                  ├─ FAZ 9  (3,4,6,8 tamamlandıkça)
                  └─ FAZ 13 (Gökyüzü Arşivim)

Bağımsız, hemen başlayabilir:  FAZ 10 · FAZ 11 · FAZ 12
FAZ 12.1 tamamlanınca:         FAZ 14
FAZ 4, 12, 14 ilerledikçe:     FAZ 15  (tekilleştirme — modül modül)
```

**Faz 0 ve 1 sırayla yapılmalı.** İkisi tamamlanmadan diğerlerine geçmeyin —
yetki mimarisi sonraki her fazın önkoşulu.

---

## 5) Ürün kararları

Planın §8.1'inde verilmiş tüm kararlar listeli. **Açık soru kalmadı** —
uygulamaya başlanabilir.

Özet:
- Premium: 30 fotoğraf (standart 5) + Gökyüzü Arşivim
- OpenNGC: atıf vererek içe aktarılacak (CC-BY-SA-4.0 kabul)
- Katalog görselleri: önce topluluk fotoğrafları, sonra açık lisanslı arşivler
- deepskycorner.ch: kullanılmayacak
- Spotify: yalnızca bağlantı gömme
- İlan bitişi: 7 gün ve 1 gün önce bildirim
- Topluluk silme talebi: yalnızca admin görür
- RecordsControl ve ClubControl: yeni panelde yeniden yazılacak

Yeni bir belirsizlik çıkarsa **varsayımla ilerleme** — sor.
