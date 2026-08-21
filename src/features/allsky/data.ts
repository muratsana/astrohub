export interface AllskyCamera {
  id: string;
  slug: string;
  title: string;
  pageUrl: string;
  imageUrl: string;
  location: string;
  owner: string;
  camera: string;
  lens: string;
  refreshSeconds: number;
  position: number;
  enabled: boolean;
  notes: string;
}

export const allskySeed: AllskyCamera[] = [
  {
    id: 'ozdens-beypazari',
    slug: 'ozdens-beypazari',
    title: 'Ozdens ALLSKY CAM',
    pageUrl: 'https://www.ozdensobs.com/allsky/index.php',
    imageUrl: 'https://www.ozdensobs.com/allsky/image.jpg',
    location: 'Ankara, Beypazarı',
    owner: 'Emre OZDEN',
    camera: 'ZWOASI676MC',
    lens: '2.1 mm',
    refreshSeconds: 5,
    position: 1,
    enabled: true,
    notes: 'Beypazarı all-sky kamera yayını.',
  },
];
