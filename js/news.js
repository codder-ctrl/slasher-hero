// Announcements shown on the blog's "Duyurular" tab, newest first. `cover` is either an image
// file in news/ (e.g. 'news/yaz-etkinligi.png') or a scene drawn by icons.coverUrl:
// 'scene:<theme>' with an optional ':<enemy actor>' (e.g. 'scene:volcano:skeleton').
// Pure data: tests check every entry and that image covers exist.

export const NEWS = [
  {
    id: 'zone-bosses-all',
    date: '2026-10-12',
    title: 'Çöl, Buz ve Volkan bossları geldi',
    cover: 'scene:desert:scorpionKing',
    body: [
      'Kızıl Çöl’ün sonunda taçlı Akrep Kral kuyruğunu kaldırıp zehirli iğnesini fırlatıyor. Buz Diyarı’nda boynuzlu Yeti kocaman buz kütleleri savuruyor. Volkan’da ise lav gölünden yükselen Lav Yılanı yerden lav fışkırtıyor.',
      'Böylece her bölgenin son bölümünde kendine özel bir boss var. Saldırılarını 5 hızlı dokunuşla kesmeyi unutma!',
    ],
  },
  {
    id: 'mega-bosses-all',
    date: '2026-10-12',
    title: 'Dört yeni mega boss!',
    cover: 'scene:dragonlair:blackDragon',
    body: [
      'Haritanın kalan dört diyarı açıldı. Batık Liman’da korsan şapkalı Kraken dokunaçlarını savuruyor, Dev Dağı’nın zirvesinde Tepegöz kaya fırlatıyor.',
      'Lanetli Kale’de Lich Kral lanetli kafatasları yağdırıyor, Ejder Yuvası’nda ise altın yığınlarının üstünde Kara Ejderha seni bekliyor.',
      'Son iki boss ilk zaferde Efsanevi eşya veriyor; kupalarıyla altın, can, kritik ve tüm hasarın kalıcı olarak artar. İyi şanslar!',
    ],
  },
  {
    id: 'mega-bosses',
    date: '2026-10-12',
    title: 'Mega Bosslar uyandı!',
    cover: 'scene:labyrinth:minotaur',
    body: [
      'Menüdeki yeni Harita, ana yolculuktan ayrı arenalara açılıyor. Her diyarı dev bir mega boss yönetiyor: 100. bölümü geçince Taş Labirent’te Minotor, 200. bölümü geçince Zehirli Yuva’da Örümcek Kraliçe seni bekliyor. Dört diyar daha yolda!',
      'Mega savaşlar 60 saniye sürer. Boss canı azaldıkça öfkelenir, daha sık ve daha sert vurur. Saldırılarını 5 hızlı dokunuşla kesmeyi unutma. Her gün 3 Boss Anahtarın var; yenilirsen anahtar geri gelir, bir bossu ilk kez yenince de 1 anahtar hediye.',
      'İlk zafer bol elmas, Destansı bir eşya ve kalıcı bir kupa getirir. Sonraki zaferlerde boss bir seviye güçlenir ve giderek artan altın verir.',
      'Ayrıca Yeşil Çayır, Karanlık Orman ve Kristal Mağara’nın son bölümlerinde artık kendine özel bosslar var: Goblin Şef, Kadim Ağaç ve Kristal Golem.',
    ],
  },
  {
    id: 'launch',
    date: '2026-10-11',
    title: 'Slasher Hero yayında!',
    cover: 'scene:meadow:slime',
    body: [
      'Piksel Savaşçı büyüdü: aynı kahraman, aynı maceralar, baştan çizilmiş masal kitabı dünyasında.',
      'Her karakter ve bölge artık vektör çizim; telefonda da tablette de keskin. Kılıç savuruşları, darbe efektleri ve bölgelere özel müzik seni bekliyor.',
      'Görüşlerini bekliyoruz. İyi savaşlar!',
    ],
  },
];
