export type RawPlace = {
  i: string;
  n: string;
  la: number;
  ln: number;
  k: string;
  c: string[];
  m: string;
  a: string;
  t: string;
  h: string;
  p: string;
  w: string;
  f: number;
  u: string[];
};

export type Place = RawPlace & {
  search: string;
  words: string[];
};

export type PlacesFile = {
  generatedAt: string;
  source: string;
  count: number;
  places: RawPlace[];
};

export type Bounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type GoogleInfo = {
  enabled: boolean;
  matched?: boolean;
  rating?: number;
  count?: number;
  price?: number;
  summary?: string;
  mapsUri?: string;
  photos?: string[];
};

export const FLAG = {
  takeaway: 1,
  delivery: 2,
  outdoor: 4,
  drive: 8,
  vegetarian: 16,
  vegan: 32,
} as const;
