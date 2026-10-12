// Release notes shown from the version label in the top-right corner. Newest first.
// Every player-visible change bumps VERSION and adds a Turkish entry here (see CLAUDE.md).

export const CHANGELOG = [
  {
    version: '0.8.0',
    date: '2026-10-12',
    notes: [
      'Üç yeni bölüm bossu: Kızıl Çöl’ün sonunda Akrep Kral (zehirli iğne), Buz Diyarı’nda Yeti (buz kütlesi fırlatır), Volkan’da lav gölünden yükselen Lav Yılanı (yerden lav fışkırtır).',
      'Artık her bölgenin son bölümünde kendine özel çizilmiş bir boss var. Hepsi gökten iner, kükrer ve ilk zaferde +25 elmas verir; 60. bölümden sonra yeni renklerle döner.',
    ],
  },
  {
    version: '0.7.1',
    date: '2026-10-12',
    notes: [
      'Mega boss kupaları artık sadece ilk zaferde verilir ve sabit bir yüzde ekler (örneğin Boğa Boynuzu +%25 dokunuş hasarı). Aynı bossu tekrar tekrar yenmek kupayı büyütmez.',
      'Tekrar zaferler yalnızca altın verir. Boss her zaferde bir seviye güçlenir, altın ödülü de onunla birlikte büyür.',
      'Haritada ödüller artık sembollerle gösteriliyor.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-10-12',
    notes: [
      'Haritanın tüm diyarları açıldı! Dört yeni mega boss ve kendi arenaları:',
      'Kraken (Batık Liman, 300. bölümden sonra): korsan şapkalı dev ahtapot, dokunaçla kırbaçlar. Kupası: altın.',
      'Tepegöz (Dev Dağı, 400): bulutların üstündeki tek gözlü dev, kaya fırlatır. Kupası: can.',
      'Lich Kral (Lanetli Kale, 500): uçan iskelet kral, lanetli kafatası büyüleri atar. Kupası: kritik çarpanı. İlk zaferde Efsanevi eşya!',
      'Kara Ejderha (Ejder Yuvası, 600): ateş püskürten son boss. Kupası: tüm hasar. İlk zaferde Efsanevi eşya!',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-10-12',
    notes: [
      'YENİ: Mega Boss Haritası (menüde). Ana yolculuktan ayrı arenalarda dev bosslar: 100. bölümü geçince Minotor (Taş Labirent), 200. bölümü geçince Örümcek Kraliçe (Zehirli Yuva). Dört diyar daha yakında.',
      'Mega savaş 60 saniye sürer ve 3 evrelidir: boss canı azaldıkça öfkelenir, daha sık ve sert vurur. Saldırıları yine 5 hızlı dokunuşla kesilir. İstersen "Arenadan çık" ile ayrılabilirsin.',
      'Her gün 3 Boss Anahtarı; fazlası 30 elmas. Yenilirsen ya da arenadan çıkarsan anahtarın geri gelir; bir bossu ilk kez yenince 1 anahtar hediye.',
      'İlk zafer: bol elmas, Destansı eşya ve kalıcı bir kupa (Minotor: dokunuş hasarı, Örümcek Kraliçe: pet hasarı). Sonraki zaferler daha az öder ama bossu ve kupasını bir seviye büyütür.',
      'Bölüm bossları: Yeşil Çayır, Karanlık Orman ve Kristal Mağara’nın son bölümlerinde artık özel çizilmiş bosslar var (Goblin Şef, Kadim Ağaç, Kristal Golem). Gökten inerler, kendi saldırılarıyla vururlar; ilk zafer +25 elmas.',
    ],
  },
  {
    version: '0.5.1',
    date: '2026-10-11',
    notes: [
      'Çanta artık sağ üstte, menünün hemen altında kendi düğmesinde. Dokununca Ekipman ekranı açılır; çantada daha iyi bir eşya varsa düğmede ünlem belirir.',
      'Kahraman sekmesindeki büyük Ekipman kutusu kaldırıldı, güçlendirmeler daha yukarıda.',
      'Güç özeti tek ince satıra indi: simge ve değer yan yana. Bir simgeye dokununca ne olduğu yazar.',
      'Ekipman ekranında kahraman daha büyük ve daha yukarıda; kılıcının ucu artık kesilmiyor.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-10-11',
    notes: [
      'Boss saldırısını kesmek kolaylaştı: 1.4 saniyede 5 dokunuş yeterli.',
      'Yeni Ekipman ekranı: ortada kahramanın, etrafında yuvalar, altında çanta. Eşyaya dokununca eşya kartı açılır.',
      'Eşya kilidi: kilitli eşyalar asla parçalanmaz.',
      'Otomatik parçala: açıkken, takılı olandan zayıf yeni eşyalar düşer düşmez kristale döner. "Zayıfları parçala" ile çantayı tek dokunuşla temizle.',
      'Özellikler artık küçük simgelerle kısa ve net. Sıra: saldırı, can, sonra diğerleri.',
      'Düzeltme: iki parmakla yakınlaştırma ve çift dokunuşla büyütme kapatıldı.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-10-11',
    notes: [
      'Ekipman: silah, kask ve tılsım yuvaları. Eşyalar Sıradan\'dan Efsanevi\'ye 4 nadirlikte gelir; kristalle 20. seviyeye kadar yükselt ya da parçalayıp kristale çevir.',
      'Eşyalar bossu ilk kez yenince, bazen tekrar yenince ve zindanın her 10. katında açılan sandıktan düşer. 60 elmasla sandık da açabilirsin.',
      'Takılı kılıç ve kask kahramanın görünüşünü değiştirir: nadir eşyalar parlar!',
      'Ruh Ağacı: her Yeniden Doğuş ruh puanı verir. Savaş, Servet ve Zaman kollarında 9 kalıcı geliştirme (örneğin doğuştan sonra ileri bölümden başlamak).',
      'Zindan: oyun kapalıyken de savaşmaya devam eder. Takım sinerjileri (Kale, Denge, Büyü Ustaları, Avcı Sürüsü) ve her 10 katta bir sandık.',
      'Pet yetenekleri: Köpek havlayıp sersemletir, Kedi kritik şansı verir, Robot lazer atar, Drone altın bulur, Ejderha alev püskürtür, Anka bayılan kahramanı bir kez kaldırır. Evrimleştikçe güçlenir.',
      'Mevcut ruh taşların ruh puanı olarak hesabına eklendi.',
      'Düzeltme: güncellemeden hemen sonra eski ve yeni oyun dosyalarının karışması engellendi.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-11',
    notes: [
      'Kombo: hızlı dokunuşlar kombo sayacını doldurur. 10, 25, 50 ve 100 komboda dokunuş hasarın artar.',
      'Bosslar artık saldırıyor! Kırmızı "!" çıkınca hızlıca dokun: saldırıyı keser, bossu sersemletir ve ekstra hasar verirsin.',
      'Kahramanın canı ve savunması var: Dayanıklılık canını, Demir Zırh savunmanı artırır. Bayılırsan boss savaşını kaybedersin.',
      'Her 10. bölümün bossu kalkanla gelir. Kalkanı dokunuşlarla kır; pet kalkana az işler.',
      'Yeni düşmanlar: altın çuvallı Hazine Goblini (kaçmadan yakala!), saldıran Elit düşmanlar ve sadece kritik vuruşlarla tam hasar alan Zırhlı düşmanlar.',
      'Görevler: her gün 3 yeni görev ve bonus sandığı. Başarımlar: kademeli kalıcı hedefler, elmas ödüllü.',
    ],
  },
  {
    version: '0.2.0',
    date: '2026-10-11',
    notes: [
      'Yeni menü: sağ üstteki sürüm yazısının altındaki düğmeden Günlük Giriş, Posta, Lider Tablosu, Blog ve Ayarlar açılır.',
      'Günlük giriş: her gün ödül topla. Seriyi bozmadan 7 güne ulaş; altın ödülü ilerledikçe büyür, 7. gün elmas da var.',
      'Posta kutusu: yeni kahramanlara 100 elmaslık hoş geldin hediyesi postadan gelir.',
      'Blog: yama notlarını sürüm sürüm oku, duyuruları takip et.',
      'Lider tablosu çok yakında.',
      'Savaş Narası yeteneğinin simgesi pet mamasıyla değişti.',
      'Düzeltme: Yeniden Doğuş artık yeteneklerin bekleme sürelerini de sıfırlıyor.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-11',
    notes: [
      'Slasher Hero ilk sürüm: Piksel Savaşçı\'nın oynanışı, baştan çizilmiş masal kitabı grafikleriyle.',
      'Tüm karakterler, düşmanlar, petler ve bölgeler vektör çizim: her ekranda ve büyütünce de keskin.',
      'İskelet animasyonu: kahraman üç farklı kılıç savuruşuyla saldırır, düşmanlar darbe alınca sarsılır ve "puf" diye yok olur.',
      'Kılıç izi, darbe yıldızları, kritik vuruşta ekran sarsıntısı ve kısa duraklama, zıplayan altınlar.',
      'Yeni sesler ve her bölgeye özel arka plan müziği (Menü\'den kapatılabilir).',
    ],
  },
];

export const VERSION = CHANGELOG[0].version;
