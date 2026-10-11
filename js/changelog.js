// Release notes shown from the version label in the top-right corner. Newest first.
// Every player-visible change bumps VERSION and adds a Turkish entry here (see CLAUDE.md).

export const CHANGELOG = [
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
