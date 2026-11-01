"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Clock, Globe, Navigation, Phone, Star } from "lucide-react";
import { FoodImage } from "@/components/food-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { neighborhoodOf } from "@/lib/areas";
import { formatHours, openState } from "@/lib/hours";
import {
  googleDirections,
  googleMapsSearch,
  photosFor,
  serviceChips,
  websiteHost,
  websiteHref,
} from "@/lib/places";
import { amenityLabel, categoryLabel } from "@/lib/taxonomy";
import type { GoogleInfo, Place } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex" aria-hidden>
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.min(1, Math.max(0, rating - index));
        return (
          <span key={index} className="relative inline-flex">
            <Star className="size-4 text-white/25" />
            <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="size-4 fill-gold text-gold" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

function priceLabel(price?: number) {
  if (!price) return "";
  return "$".repeat(Math.min(4, price));
}

export function PlaceDetail({ place, onBack }: { place: Place; onBack: () => void }) {
  const stock = photosFor(place);
  const [google, setGoogle] = useState<GoogleInfo | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const hours = useMemo(() => openState(place.h), [place.h]);
  const hourLines = place.h ? formatHours(place.h) : [];
  const { foods, services } = serviceChips(place);
  const label = categoryLabel(place.k, place.m);

  useEffect(() => {
    let cancel = false;
    setGoogle(null);
    setHeroIndex(0);
    const params = new URLSearchParams({
      name: place.n,
      lat: String(place.la),
      lng: String(place.ln),
    });
    fetch(`/api/google?${params.toString()}`)
      .then((response) => response.json())
      .then((data: GoogleInfo) => {
        if (!cancel) setGoogle(data);
      })
      .catch(() => {
        if (!cancel) setGoogle({ enabled: false });
      });
    return () => {
      cancel = true;
    };
  }, [place.i, place.n, place.la, place.ln]);

  const googlePhotos = (google?.photos ?? []).map(
    (name) => `/api/google/photo?name=${encodeURIComponent(name)}`,
  );
  const photos = googlePhotos.length > 0 ? googlePhotos : stock;
  const hero = photos[heroIndex] ?? photos[0];
  const usingGoogle = googlePhotos.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 px-2 pt-2">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to the list">
          <ChevronLeft />
        </Button>
        <p className="text-[11px] tracking-[0.18em] text-cream/50">PLACE</p>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 px-4 pb-6">
          <div className="relative h-52 overflow-hidden rounded-2xl">
            <FoodImage src={hero} alt={`${place.n} food`} className="size-full" />
            <span className="absolute bottom-2 left-2 rounded-full bg-black/65 px-2 py-1 text-[11px] text-cream">
              {usingGoogle ? "Photos from Google" : `Typical ${label.toLowerCase()}`}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {photos.slice(0, 3).map((src, index) => (
              <button
                key={src + index}
                type="button"
                onClick={() => setHeroIndex(index)}
                className={`relative h-16 overflow-hidden rounded-xl ring-offset-2 ring-offset-ink ${
                  heroIndex === index ? "ring-2 ring-gold" : ""
                }`}
                aria-label={`Photo ${index + 1}`}
              >
                <FoodImage src={src} alt="" className="size-full" />
              </button>
            ))}
          </div>

          <div>
            <h2 className="font-serif text-[2rem] leading-none text-cream">{place.n}</h2>
            <p className="mt-2 text-sm text-cream/70">
              {neighborhoodOf(place.la, place.ln)} · {amenityLabel(place.m)}
            </p>
          </div>

          {google?.rating ? (
            <div className="flex items-end gap-3">
              <p className="font-serif text-4xl leading-none text-gold">{google.rating.toFixed(1)}</p>
              <div className="pb-1">
                <Stars rating={google.rating} />
                <p className="mt-1 text-xs text-cream/65">
                  {google.count ? `${google.count.toLocaleString()} Google reviews` : "Google rating"}
                  {priceLabel(google.price) ? ` · ${priceLabel(google.price)}` : ""}
                </p>
              </div>
            </div>
          ) : null}

          <section>
            <h3 className="text-[11px] tracking-[0.16em] text-cream/45">WHAT THEY SERVE</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {foods.map((food) => (
                <Badge key={food}>{food}</Badge>
              ))}
              {services.map((service) => (
                <Badge key={service} variant="outline">
                  {service}
                </Badge>
              ))}
            </div>
          </section>

          {google?.summary ? <p className="text-sm leading-relaxed text-cream/80">{google.summary}</p> : null}

          <section className="space-y-2 text-sm text-cream/80">
            <p>
              {place.a
                ? `${place.a}${place.t ? `, ${place.t}` : ""}`
                : "Address is not listed. Directions still use the map pin."}
            </p>
            <div className="flex items-start gap-2">
              <Clock className="mt-0.5 size-4 shrink-0 text-gold" />
              <div>
                {hours && (
                  <p className={hours.open ? "text-emerald-300" : "text-cream/55"}>
                    {hours.open ? "Open now" : "Closed now"}
                  </p>
                )}
                {hourLines.length > 0 ? (
                  hourLines.map((line) => (
                    <p key={line} className="text-cream/75">
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-cream/55">Hours are not listed</p>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Button asChild>
              <a href={googleDirections(place)} target="_blank" rel="noreferrer">
                <Navigation />
                Directions
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={google?.mapsUri || googleMapsSearch(place)} target="_blank" rel="noreferrer">
                Google Maps
              </a>
            </Button>
            {place.p ? (
              <Button variant="outline" asChild>
                <a href={`tel:${place.p}`}>
                  <Phone />
                  Call
                </a>
              </Button>
            ) : null}
            {place.w ? (
              <Button variant="outline" asChild>
                <a href={websiteHref(place.w)} target="_blank" rel="noreferrer">
                  <Globe />
                  {websiteHost(place.w)}
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
