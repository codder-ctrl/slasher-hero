# Slasher Hero — Devam Özeti

Oynanış planının iki parçası da tamamlandı. Ayrıntılı mimari ve kurallar `CLAUDE.md` dosyasında.

- **Parça 1 (v0.3.0):** kombo, boss saldırıları (uyarı, kesme, sersemletme), can ve savunma (`hasar × 100/(100+zırh)`), boss kalkanları, Hazine Goblini, elit ve zırhlı düşmanlar, günlük görevler ve başarımlar.
- **Parça 2 (v0.4.0):** ekipman (3 yuva, 4 nadirlik, yükseltme ve parçalama, sandık), Ruh Ağacı (9 düğüm), zindan sinerjileri, 10 katta bir sandık, çevrimdışı zindan, pet yetenekleri.

## Sıradaki büyük işler (ilk listenin 9–11. maddeleri)

1. **Dünya haritası ve bölüm sonu bossları:** Her bölgenin sonunda özel çizilmiş büyük bir boss ve bölgeleri gösteren bir harita ekranı.
2. **Etkinlikler:** Sezonluk temalı bölgeler ve süreli ödüller. Duyurular (`js/news.js`) ve Posta (`MAIL`) buna hazır.
3. **Lider tablosu:** Çevrimiçi bir sunucu gerektirir (Supabase/Firebase gibi). Hesabı kullanıcının açması gerekir; oyuncu adı, skor gönderme ve hile kontrolü yapılmalı.

## Çalışma kuralları

- Arayüz ve kullanıcıyla konuşma Türkçe.
- Her sürüm için:
  - `js/changelog.js` notu ve `package.json` sürümü
  - `npm test`
  - dengeye dokunulduysa `node tools/sim.js`
- Bitince kullanıcıya yeni halin özeti verilir, 1–10 puan istenir ve kendi puanlarını verirsin: akıcılık, grafik, efekt, ses, oynanış.
- GitHub'a yükleme (`main` = canlı sürüm) yalnızca kullanıcı onay verince yapılır.
