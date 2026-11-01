"use client";

import { useMemo } from "react";
import { FoodImage } from "@/components/food-image";
import { neighborhoodOf } from "@/lib/areas";
import { formatMiles, milesBetween } from "@/lib/geo";
import { openState } from "@/lib/hours";
import { offerLine, photosFor } from "@/lib/places";
import { categoryLabel } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import type { Place } from "@/lib/types";

export function PlaceCard({
  place,
  selected,
  origin,
  onSelect,
}: {
  place: Place;
  selected: boolean;
  origin: { lat: number; lng: number } | null;
  onSelect: (id: string) => void;
}) {
  const photo = photosFor(place)[0];
  const label = categoryLabel(place.k, place.m);
  const hours = useMemo(() => openState(place.h), [place.h]);
  const miles = origin ? milesBetween(origin.lat, origin.lng, place.la, place.ln) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(place.i)}
      className={cn(
        "flex w-full gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-white/8",
        selected && "bg-white/10 ring-1 ring-primary/80",
      )}
    >
      <span className="relative size-[76px] shrink-0 overflow-hidden rounded-xl">
        <FoodImage src={photo} alt="" className="size-full" />
        <span className="absolute bottom-1 left-1 max-w-[68px] truncate rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-cream">
          {label}
        </span>
      </span>
      <span className="min-w-0 flex-1 py-0.5">
        <span className="block truncate font-medium text-cream">{place.n}</span>
        <span className="mt-0.5 block truncate text-sm text-cream/70">{offerLine(place)}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-cream/55">
          <span>{neighborhoodOf(place.la, place.ln)}</span>
          {miles !== null && <span>{formatMiles(miles)}</span>}
          {hours && (
            <span className={hours.open ? "text-emerald-300" : "text-cream/45"}>
              {hours.open ? "Open" : "Closed"}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
