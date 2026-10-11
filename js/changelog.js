// Release notes shown from the version label in the top-right corner. Newest first.
// Every player-visible change bumps VERSION and adds a Turkish entry here (see CLAUDE.md).

export const CHANGELOG = [
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
