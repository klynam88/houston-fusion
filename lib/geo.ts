import type { Bounds } from "@/lib/types";

export type Area = {
  id: string;
  name: string;
  blurb: string;
  lat: number;
  lng: number;
  rx: number;
  ry: number;
  aliases: string[];
  featured?: boolean;
};

export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earth = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a1 = (lat1 * Math.PI) / 180;
  const a2 = (lat2 * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a1) * Math.cos(a2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatMiles(miles: number) {
  if (miles < 0.1) return "nearby";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function inArea(lat: number, lng: number, area: Area) {
  const dx = (lng - area.lng) / area.rx;
  const dy = (lat - area.lat) / area.ry;
  return dx * dx + dy * dy <= 1;
}

export function areaScore(lat: number, lng: number, area: Area) {
  const dx = (lng - area.lng) / area.rx;
  const dy = (lat - area.lat) / area.ry;
  return dx * dx + dy * dy;
}

export function ellipseRing(area: Area, steps = 48) {
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    ring.push([area.lng + Math.cos(t) * area.rx, area.lat + Math.sin(t) * area.ry]);
  }
  return ring;
}

export function boundsOf(points: { la: number; ln: number }[]): Bounds | null {
  if (points.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const point of points) {
    west = Math.min(west, point.ln);
    east = Math.max(east, point.ln);
    south = Math.min(south, point.la);
    north = Math.max(north, point.la);
  }
  if (west === east) {
    west -= 0.01;
    east += 0.01;
  }
  if (south === north) {
    south -= 0.01;
    north += 0.01;
  }
  return { west, south, east, north };
}

export function inBounds(lat: number, lng: number, bounds: Bounds) {
  return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
}
