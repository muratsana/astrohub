# Teknik Mimari Notları

## Thumbnail crop
Minimum metadata: focal_x/focal_y 0..1, zoom, crop_version. Site aspect ratio'ları çok farklıysa named variants JSON kullanılabilir; gereksiz karmaşıklık yaratma.

## Safe derivative replacement
new derivative -> validate -> atomik DB pointer update -> old derivative delete queue -> orphan GC fallback.
Eski dosyayı önce silme.

## Storage örneği
photos/<photo_id>/original/
photos/<photo_id>/web/v<processor>/
photos/<photo_id>/thumb/card/crop-v<version>/
photos/<photo_id>/thumb/home/crop-v<version>/
photos/<photo_id>/annotated/solve-v<version>/
photos/<photo_id>/social/feed/
photos/<photo_id>/social/story/

## Share kit auth
Server-side owner check zorunlu; client isOwner yalnız UI görünürlüğü.

## Capture seasons
Mevcut capture_date -> Season 1 start=end backfill. Yeni range start/end. Exposure rows season FK.

## Garbage collection
Korunan: original_uploaded ve kullanıcı verisi.
Temizlenebilir: superseded thumbnail/social, failed temp, referanssız expired derivative.
Her koşuda dry-run, candidate count, deleted count, reclaimed bytes, errors.
