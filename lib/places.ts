import { AREAS, areaById, neighborhoodOf } from "@/lib/areas";
import { categoryById, categoryLabel, humanCuisine } from "@/lib/taxonomy";
import { FLAG, type Place, type RawPlace } from "@/lib/types";

const STOP = new Set([
  "in",
  "the",
  "near",
  "around",
  "on",
  "at",
  "food",
  "restaurant",
  "restaurants",
  "place",
  "places",
  "eat",
  "to",
  "a",
  "an",
  "for",
  "me",
  "some",
  "of",
  "and",
]);

export function indexPlaces(raw: RawPlace[]): Place[] {
  return raw.map((place) => {
    const search = buildSearch(place);
    return {
      ...place,
      search,
      words: search.split(/[^a-z0-9]+/).filter((word) => word.length > 1),
    };
  });
}

function buildSearch(place: RawPlace) {
  const parts = [place.n, place.a, place.t, place.m, neighborhoodOf(place.la, place.ln), ...place.u];
  for (const id of place.c) {
    const category = categoryById(id);
    if (!category) continue;
    parts.push(category.label, ...category.aliases, ...category.terms);
  }
  return parts.join(" ").toLowerCase();
}

export function tokenMatches(words: string[], token: string) {
  if (token.length <= 2) return words.some((word) => word === token);
  if (token.length <= 4) return words.some((word) => word.startsWith(token));
  return words.some((word) => word.includes(token));
}

const AREA_PHRASES = AREAS.flatMap((area) =>
  area.aliases.map((alias) => ({ id: area.id, alias })),
).sort((a, b) => b.alias.length - a.alias.length);

export function parseQuery(query: string) {
  let text = query.toLowerCase().trim().replace(/\s+/g, " ");
  if (!text) return { areaId: null as string | null, tokens: [] as string[] };
  let areaId: string | null = null;
  for (const phrase of AREA_PHRASES) {
    const escaped = phrase.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|\\s)${escaped}(\\s|$)`);
    if (pattern.test(text)) {
      areaId = phrase.id;
      text = text.replace(pattern, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }
  const tokens = text
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
  return { areaId, tokens };
}

export function matchesFilters(
  place: Place,
  options: { category: string | null; areaId: string | null; tokens: string[] },
) {
  if (options.category && !place.c.includes(options.category)) return false;
  if (options.areaId) {
    const area = areaById(options.areaId);
    if (area) {
      const dx = (place.ln - area.lng) / area.rx;
      const dy = (place.la - area.lat) / area.ry;
      if (dx * dx + dy * dy > 1) return false;
    }
  }
  return options.tokens.every((token) => tokenMatches(place.words, token));
}

export function offerLine(place: Place) {
  const bits: string[] = [categoryLabel(place.k, place.m)];
  for (const id of place.c) {
    if (id === place.k || bits.length >= 3) continue;
    const label = categoryById(id)?.label;
    if (label) bits.push(label);
  }
  if (place.f & FLAG.takeaway) bits.push("Takeout");
  if (place.f & FLAG.delivery) bits.push("Delivery");
  if (place.f & FLAG.outdoor) bits.push("Patio");
  if (place.f & FLAG.drive) bits.push("Drive-through");
  if (place.f & FLAG.vegan) bits.push("Vegan");
  else if (place.f & FLAG.vegetarian) bits.push("Vegetarian");
  return bits.slice(0, 4).join(" · ");
}

export function serviceChips(place: Place) {
  const chips = place.u.map(humanCuisine);
  if (chips.length === 0) chips.push(categoryLabel(place.k, place.m));
  const services: string[] = [];
  if (place.f & FLAG.takeaway) services.push("Takeout");
  if (place.f & FLAG.delivery) services.push("Delivery");
  if (place.f & FLAG.outdoor) services.push("Outdoor seating");
  if (place.f & FLAG.drive) services.push("Drive-through");
  if (place.f & FLAG.vegan) services.push("Vegan options");
  else if (place.f & FLAG.vegetarian) services.push("Vegetarian options");
  return { foods: [...new Set(chips)].slice(0, 6), services };
}

export function photosFor(place: Place) {
  const category = categoryById(place.k) ?? categoryById("other");
  const files = category?.photos ?? [];
  const urls = files.map((file) => `/food/${file}`);
  if (urls.length === 0) return ["/food/photo-1414235077428-338989a2e8c0.jpg"];
  let hash = 0;
  for (const char of place.i) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  const start = hash % urls.length;
  return [...urls.slice(start), ...urls.slice(0, start)];
}

export function websiteHref(url: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function websiteHost(url: string) {
  try {
    return new URL(websiteHref(url)).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function googleMapsSearch(place: Place) {
  const query = [place.n, place.a, place.t || "Houston", "TX"].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleDirections(place: Place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.la},${place.ln}`;
}
