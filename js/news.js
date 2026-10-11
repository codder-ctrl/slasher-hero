// Announcements shown on the blog's "Duyurular" tab, newest first. `cover` is either an image
// file in news/ (e.g. 'news/yaz-etkinligi.png') or a scene drawn by icons.coverUrl:
// 'scene:<theme>' with an optional ':<enemy actor>' (e.g. 'scene:volcano:skeleton').
// Pure data: tests check every entry and that image covers exist.

export const NEWS = [
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
