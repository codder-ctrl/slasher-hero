// Release notes shown from the version label in the top-right corner. Newest first.
// Every player-visible change bumps VERSION and adds a Turkish entry here (see CLAUDE.md).

export const CHANGELOG = [
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
