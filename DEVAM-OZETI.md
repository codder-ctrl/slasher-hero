# Slasher Hero — Devam Özeti (yeni oturum için)

Son güncelleme: 2026-10-11. Canlı sürüm: **v0.7.0**.

## Proje

- **Klasör:** `D:\GitRepo\9_Project_Claude\slasher-hero`
- **Repo:** `codder-ctrl/slasher-hero` (herkese açık). `main` dalı = canlı sürüm.
- **Canlı adres:** https://codder-ctrl.github.io/slasher-hero/ (GitHub Pages, her `main` push'unda yayınlanır).
- **Ne:** Piksel Savaşçı'nın (`../piksel-savasci`) yüksek grafikli devamı. Telefon öncelikli tıklama ve gelişim oyunu.
  - Kingdom Rush tarzı vektör çizim, iskelet animasyonu ve sentezlenmiş ses ve müzik.
  - Build adımı ve bağımlılık yok.
  - Arayüz Türkçe.
- **Ayrıntılar:** Mimari, kurallar ve test ipuçları `CLAUDE.md` dosyasında; her işe başlamadan oku.

## Sürüm geçmişi (kısa)

- **0.1.0:** Vektör grafiklerle ilk sürüm (kahraman, 5 düşman, 6 pet, 12 yoldaş, 6 bölge), efektler, sesler ve bölge müzikleri.
- **0.2.0:** Sağ üstte menü düğmesi ve kare baloncuk:
  - Günlük Giriş (7 günlük seri)
  - Posta (hoş geldin hediyesi 100 elmas; başlangıç elması 0)
  - Lider Tablosu ("Çok yakında...", sunucu gerekiyor)
  - Blog (yama notları ve kapak resimli duyurular)
  - Ayarlar (eski Menü sekmesi)
- **0.3.0:**
  - Kombo
  - Boss ve elit saldırıları: uyarı, dokunarak kesme, sersemletme
  - Kahraman canı (Dayanıklılık) ve zırhı (Demir Zırh, `hasar × 100/(100+zırh)`)
  - 10. bölüm boss kalkanları
  - Hazine Goblini, elit ve zırhlı düşmanlar
  - Günlük görevler ve başarımlar
  - `tools/sim.js` denge simülasyonu
- **0.4.0:**
  - Ekipman: 3 yuva, 4 nadirlik, yükseltme ve parçalama, sandık; kahramanın görünüşüne yansıyor
  - Ruh Ağacı (9 düğüm)
  - Zindan: sinerjiler, 10 katta bir sandık, çevrimdışı ilerleme
  - Pet yetenekleri
  - Önbellek düzeltmesi: servis worker oyun dosyalarını `no-cache` ile alıyor
- **0.5.0:**
  - Saldırı kesme 1,4 saniyede 5 dokunuşa indi
  - Ayrı Ekipman ekranı: kahraman ortada, eşya kartı alttan açılıyor
  - Eşya kilidi, Otomatik parçala, Zayıfları parçala
  - Simgeli kompakt özellikler (sıra: saldırı, can, sonra diğerleri)
  - İki parmakla ve çift dokunuşla yakınlaştırma kapatıldı

- **0.5.1:** Kullanıcının 0.5.0 telefon geri bildirimi (kullanıcının puanı: 9/10).
  - Çanta, sağ üstte menü düğmesinin altında kendi düğmesine taşındı (krem renkli çanta simgesi; daha iyi eşya varsa "!").
  - Kahraman sekmesindeki Ekipman kartı kaldırıldı.
  - Güç özeti tek ince satır oldu: simge ve değer yan yana, dokununca adı yazar.
  - Ekipman ekranında kahraman daha büyük ve daha yukarıda; kılıcın ucu artık kesilmiyor (`PORTRAIT_SHIFT`).

- **0.6.0:**
  - Bölüm bossları (ana oyun): Goblin Şef (Çayır), Kadim Ağaç (Orman), Kristal Golem (Mağara) — `js/bosses.js`. Gökten iniş, kükreme, özel saldırılar; ilk zafer +25 elmas. Çöl/Buz/Volkan bölüm bossları **sonra** çizilecek (kullanıcı seçti).
  - **Mega Boss Haritası** (kullanıcının isteğiyle yeniden tasarlandı: harita ana yolun kopyası değil, ayrı savaş alanı):
    - 6 diyar, her 100 bölümde bir mega boss açılır (en iyi bölüm 100'ü geçince Minotor, 200 → Örümcek Kraliçe; Kraken 300, Tepegöz 400, Lich Kral 500, Kara Ejderha 600 "yakında").
    - Ana oyundaki 100. bölümde gelmezler; sadece haritadan, Boss Anahtarı ile (günde 3, +1 = 30 elmas). Kullanıcının isteği: yenilince (ya da çıkınca) anahtar iade, ilk zaferde +1 anahtar.
    - 60 sn, 3 evre (öfkelenir), ayrı arenalar (Taş Labirent, Zehirli Yuva). "Arenadan çık" düğmesi.
    - İlk zafer çok ödül (elmas + Destansı eşya + kalıcı kupa), tekrar zaferler daha az (kullanıcının isteği) ama boss ve kupa seviye atlar.
    - Denge: `node tools/sim.js --mega` → ilk turda ~110. bölümde Minotor Sv.1 ≈ 55 sn.
- **0.7.0:** Kalan 4 mega boss ve arenaları: Kraken (Batık Liman, dokunaç kırbacı), Tepegöz (Dev Dağı, kaya fırlatma), Lich Kral (Lanetli Kale, kafatası büyüsü, ilk zafer Efsanevi), Kara Ejderha (Ejder Yuvası, ateş, ilk zafer Efsanevi). Kullanıcı 0.6.0 için: "güzel olmuş, sorun görmedim".

## Kullanıcının puanları (v0.1 sonrası)

Akıcılık 9, grafik 8, efektler 8, ses 9, oynanış 7. Kullanıcı stili ve sesleri sevdi; oynanış geliştirmeleri bunun üzerine yapıldı.

## Kullanıcıyla çalışma şekli

- Her cevaba **"Selam"** ile başla. Açıklamalar Türkçe ve oyuncu diliyle olsun; kullanıcı kod okumuyor.
- Büyük işlerde sıra:
  1. Plan
  2. Uygulama (gerekirse parçalara böl ve devam özeti yaz)
  3. Kullanıcıya özet ve 1–10 puan isteği
  4. Kendi puanların: akıcılık, grafik, efektler, ses, oynanış ve gelişme
- **GitHub'a yükleme yalnızca kullanıcı "yükle" deyince yapılır.** Kullanıcı genelde "evet yükle, telefonda deneyeceğim" der. Yüklemeden sonra Pages derlemesini bekle ve canlı sürümü kontrol et.
- Her oyuncunun göreceği değişiklik için:
  - `js/changelog.js` notu (Türkçe, oyuncuya yönelik)
  - `package.json` sürümü (yeni özellik minor, düzeltme patch)
  - `npm test`
- Dengeye dokunulursa `node tools/sim.js` senaryolarını çalıştır: `--share 0.15`, `--taps 2`, `--skip vitality,armor`, `--no-gear`, `--logic ../piksel-savasci/js/logic.js`.
- Tarayıcı testi: `.claude/launch.json` içindeki `slasher-hero` (port 8003), telefon boyutu (mobile). `CLAUDE.md` içindeki `window.slasher` kancası ve `MessageChannel` döngüsü notlarını kullan. Gizli panelde kare döngüsü durur; ekran görüntüsü öncesi döngüyü duraklat.

## Bilinen ödünleşimler ve notlar

- **Saldırı kesme:** 5 dokunuşta saniyede 5 kez sürekli dokunan oyuncu saldırıları farkında olmadan keser. Can ve zırh daha çok az dokunan ya da oyunu açık bırakan oyuncu için önemli.
- **Ekipman dengesi:** Ekipman 4 saatlik ilerlemeyi ~90'dan ~100. bölüme taşıyor; orta oyun belirgin hızlı (80. bölüm ~22 dk).
- **Lider tablosu:** Gerçek bir tablo için çevrimiçi sunucu gerekir (Supabase/Firebase gibi). Hesabı kullanıcının açması, oyuncu adı, skor gönderme ve hile kontrolü gerekiyor; şimdilik "Çok yakında...".
- **Sesler:** Yalnızca sentezle üretiliyor; kulakla ayarlanmadı.

## Sıradaki adaylar (kullanıcı henüz seçmedi)

1. **Çöl/Buz/Volkan bölüm bossları** (ana oyunda, Akrep Kral, Yeti ve bir volkan bossu).
2. **Sezonluk etkinlikler:** Duyurular (`js/news.js`) ve Posta (`MAIL`) buna hazır.
3. **Lider tablosu:** Sunucu kurulumu gerekiyor.
4. **Kullanıcının telefonda 0.5.1'i denedikten sonra vereceği geri bildirim.**
