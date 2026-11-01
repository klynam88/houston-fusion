import { milesBetween } from "@/lib/geo";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Cached = { exp: number; value: unknown };
const cache = new Map<string, Cached>();

const PRICE: Record<string, number> = {
  PRICE_LEVEL_FREE: 1,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

function sharesName(left: string, right: string) {
  const stop = new Set(["the", "restaurant", "cafe", "houston", "tx", "and", "bar", "grill"]);
  const words = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stop.has(word));
  const rightWords = new Set(words(right));
  return words(left).some((word) => rightWords.has(word));
}

export async function GET(request: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ enabled: false });

  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ enabled: true, matched: false });
  }

  const cacheKey = `${name.toLowerCase()}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.exp > Date.now()) return NextResponse.json(hit.value);

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.rating,places.userRatingCount,places.photos,places.googleMapsUri,places.editorialSummary,places.priceLevel,places.location",
    },
    body: JSON.stringify({
      textQuery: `${name} Houston`,
      maxResultCount: 3,
      locationBias: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 350,
        },
      },
    }),
  });

  if (!response.ok) {
    const empty = { enabled: true, matched: false };
    return NextResponse.json(empty);
  }

  const payload = (await response.json()) as {
    places?: Array<{
      displayName?: { text?: string };
      rating?: number;
      userRatingCount?: number;
      photos?: Array<{ name?: string }>;
      googleMapsUri?: string;
      editorialSummary?: { text?: string };
      priceLevel?: string;
      location?: { latitude?: number; longitude?: number };
    }>;
  };

  const match = (payload.places ?? []).find((place) => {
    const placeLat = place.location?.latitude;
    const placeLng = place.location?.longitude;
    if (placeLat == null || placeLng == null) return false;
    const miles = milesBetween(lat, lng, placeLat, placeLng);
    const named = sharesName(name, place.displayName?.text ?? "");
    if (miles <= 0.05) return true;
    return named && miles <= 0.35;
  });

  const value = match
    ? {
        enabled: true,
        matched: true,
        rating: match.rating,
        count: match.userRatingCount,
        price: match.priceLevel ? PRICE[match.priceLevel] : undefined,
        summary: match.editorialSummary?.text,
        mapsUri: match.googleMapsUri,
        photos: (match.photos ?? []).map((photo) => photo.name).filter(Boolean).slice(0, 4),
      }
    : { enabled: true, matched: false };

  cache.set(cacheKey, { exp: Date.now() + 10 * 60 * 1000, value });
  return NextResponse.json(value);
}
