"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Compass,
  Info,
  Layers,
  LocateFixed,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import { MapView, type MapCommand, type MapCommandInput } from "@/components/map-view";
import { PlaceCard } from "@/components/place-card";
import { PlaceDetail } from "@/components/place-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AREAS, areaById } from "@/lib/areas";
import { boundsOf, inArea, inBounds, milesBetween } from "@/lib/geo";
import { indexPlaces, matchesFilters, parseQuery } from "@/lib/places";
import { categoryById, CHIPS } from "@/lib/taxonomy";
import type { Bounds, Place, PlacesFile } from "@/lib/types";

type View = {
  bounds: Bounds;
  zoom: number;
  lat: number;
  lng: number;
};

function nameRank(name: string, query: string) {
  if (!query) return 0;
  const lower = name.toLowerCase();
  if (lower.startsWith(query)) return -2;
  if (lower.includes(query)) return -1;
  return 0;
}

export function Explorer() {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [basemap, setBasemap] = useState<"aerial" | "streets">("aerial");
  const [tilted, setTilted] = useState(true);
  const [showAllAreas, setShowAllAreas] = useState(false);
  const [listLimit, setListLimit] = useState(60);
  const [about, setAbout] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"peek" | "mid" | "full">("mid");
  const [command, setCommand] = useState<MapCommand | null>(null);
  const commandN = useRef(0);
  const areaLock = useRef<"query" | "picker" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const issue = useCallback((partial: MapCommandInput) => {
    commandN.current += 1;
    setCommand({ ...partial, n: commandN.current } as MapCommand);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let cancel = false;
    fetch("/data/places.json")
      .then((response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<PlacesFile>;
      })
      .then((file) => {
        if (!cancel) setPlaces(indexPlaces(file.places));
      })
      .catch(() => {
        if (!cancel) setError("The Houston food map didn't load.");
      });
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        if (selectedId) setSelectedId(null);
        else if (about) setAbout(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [about, selectedId]);

  const parsed = useMemo(() => parseQuery(query), [query]);
  const activeArea = areaById(areaId);

  const filtered = useMemo(() => {
    if (!places) return [];
    return places.filter((place) =>
      matchesFilters(place, {
        category,
        areaId,
        tokens: parsed.tokens,
      }),
    );
  }, [places, category, areaId, parsed]);

  useEffect(() => {
    if (!places) return;
    const handle = window.setTimeout(() => {
      const next = parseQuery(query);
      if (next.tokens.length === 0 || next.areaId) return;
      if (areaLock.current === "picker" && areaId) return;
      const results = places.filter((place) =>
        matchesFilters(place, { category, areaId: null, tokens: next.tokens }),
      );
      if (results.length === 1) {
        const place = results[0];
        setSelectedId(place.i);
        setSheet("full");
        issue({ kind: "place", lng: place.ln, lat: place.la, zoom: 15.6 });
      } else if (results.length > 1 && results.length <= 12) {
        const bounds = boundsOf(results);
        if (bounds) issue({ kind: "bounds", ...bounds });
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, category, places, areaId, issue]);

  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const source = places ?? [];
    for (const place of source) {
      if (category && !place.c.includes(category)) continue;
      for (const area of AREAS) {
        if (!inArea(place.la, place.ln, area)) continue;
        counts.set(area.id, (counts.get(area.id) ?? 0) + 1);
      }
    }
    return counts;
  }, [places, category]);

  const zoom = view?.zoom ?? 10.7;
  const showAreas = zoom < 11.8 && !activeArea && parsed.tokens.length === 0 && !selectedId;
  const origin = useMemo(() => {
    if (activeArea) return { lat: activeArea.lat, lng: activeArea.lng };
    if (view) return { lat: view.lat, lng: view.lng };
    return null;
  }, [activeArea, view]);

  const ranked = useMemo(() => {
    const pool =
      activeArea || parsed.tokens.length > 0
        ? filtered
        : view
          ? filtered.filter((place) => inBounds(place.la, place.ln, view.bounds))
          : [];
    const lat = origin?.lat ?? 29.76;
    const lng = origin?.lng ?? -95.37;
    const joined = parsed.tokens.join(" ");
    return pool.slice().sort((a, b) => {
      const rank = nameRank(a.n, joined) - nameRank(b.n, joined);
      if (rank !== 0) return rank;
      return milesBetween(lat, lng, a.la, a.ln) - milesBetween(lat, lng, b.la, b.ln);
    });
  }, [filtered, activeArea, parsed.tokens, view, origin]);

  const selected = places?.find((place) => place.i === selectedId) ?? null;
  const categoryMeta = category ? categoryById(category) : null;

  function onQuery(value: string) {
    setQuery(value);
    setListLimit(60);
    const next = parseQuery(value);
    if (next.areaId && next.areaId !== areaId) {
      setAreaId(next.areaId);
      areaLock.current = "query";
      setSelectedId(null);
      issue({ kind: "area", areaId: next.areaId });
    } else if (!next.areaId && areaLock.current === "query") {
      setAreaId(null);
      areaLock.current = null;
    }
  }

  function pickArea(id: string) {
    setAreaId(id);
    areaLock.current = "picker";
    setSelectedId(null);
    setListLimit(60);
    setSheet("mid");
    issue({ kind: "area", areaId: id });
  }

  function selectPlace(id: string) {
    const place = places?.find((item) => item.i === id);
    if (!place) return;
    setSelectedId(id);
    setSheet("full");
    issue({ kind: "place", lng: place.ln, lat: place.la, zoom: 15.6 });
  }

  function clearFilters() {
    setQuery("");
    setCategory(null);
    setAreaId(null);
    areaLock.current = null;
    setSelectedId(null);
    setListLimit(60);
  }

  const sheetHeight = sheet === "peek" ? "8.75rem" : sheet === "mid" ? "48vh" : "86vh";
  const title = selected
    ? selected.n
    : activeArea && categoryMeta
      ? `${categoryMeta.label} in ${activeArea.name}`
      : activeArea
        ? activeArea.name
        : categoryMeta
          ? categoryMeta.label
          : parsed.tokens.length
            ? `“${query.trim()}”`
            : "Where to eat";
  const countLabel = showAreas
    ? `${(places?.length ?? 0).toLocaleString()} places across Houston`
    : `${ranked.length.toLocaleString()} ${ranked.length === 1 ? "place" : "places"}`;

  const areaList = category
    ? AREAS.filter((area) => (areaCounts.get(area.id) ?? 0) > 0).sort(
        (a, b) => (areaCounts.get(b.id) ?? 0) - (areaCounts.get(a.id) ?? 0),
      )
    : (showAllAreas ? AREAS : AREAS.filter((area) => area.featured));

  if (error) {
    return (
      <main className="grid h-dvh place-items-center bg-ink px-6 text-center text-cream">
        <div>
          <p className="font-serif text-4xl">Houston Fusion</p>
          <p className="mt-3 text-cream/70">{error}</p>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative h-dvh overflow-hidden bg-ink text-cream"
      style={{ ["--sheet" as string]: isMobile ? sheetHeight : "0px" }}
    >
      <MapView
        places={filtered}
        selectedId={selectedId}
        selectedAreaId={areaId}
        basemap={basemap}
        command={command}
        onSelectPlace={selectPlace}
        onSelectArea={pickArea}
        onView={setView}
        onNotice={setNotice}
      />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 bg-gradient-to-b from-black/70 via-black/35 to-transparent px-3 pb-8 pt-3">
        <div className="pointer-events-auto flex max-w-3xl flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <span className="font-serif text-xl leading-none">F</span>
              </span>
              <div className="leading-none">
                <p className="text-[10px] tracking-[0.28em] text-cream/70">HOUSTON</p>
                <p className="font-serif text-[1.65rem] italic leading-none">Fusion</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-ink/70"
              onClick={() => setAbout((open) => !open)}
              aria-label="About Houston Fusion"
            >
              <Info />
            </Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-cream/55" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="What are you hungry for?"
              aria-label="Search food, neighborhoods, or restaurants"
              className="h-12 bg-ink/75 pl-11 pr-11"
            />
            {query && (
              <button
                type="button"
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-cream/70 hover:bg-white/10"
                onClick={() => onQuery("")}
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CHIPS.map((chip) => (
              <Button
                key={chip.id}
                size="sm"
                variant={category === chip.id ? "default" : "outline"}
                className="rounded-full bg-ink/70"
                onClick={() => {
                  setCategory((current) => (current === chip.id ? null : chip.id));
                  setSelectedId(null);
                  setListLimit(60);
                  setSheet("mid");
                }}
              >
                {chip.label}
              </Button>
            ))}
          </div>
          {about && (
            <div className="rounded-2xl border border-white/10 bg-ink/90 p-4 text-sm leading-relaxed text-cream/80 shadow-2xl">
              <p className="font-serif text-2xl text-cream">Every place to eat in Houston.</p>
              <p className="mt-2">
                Fly over the city, highlight a neighborhood, or search a craving. Open a place for what it serves, hours, and directions. Google ratings and restaurant photos show up when this site is connected to Google Places.
              </p>
              <p className="mt-3 text-xs text-cream/50">
                Restaurant locations © OpenStreetMap contributors. Food photos are representative of the cuisine unless they come from Google. Imagery © Esri.
              </p>
            </div>
          )}
        </div>
      </header>

      <aside
        className="fixed z-20 flex flex-col overflow-hidden border border-white/10 bg-ink/80 shadow-2xl backdrop-blur-xl max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-3xl max-md:border-b-0 md:bottom-3 md:left-3 md:top-40 md:w-[400px] md:rounded-3xl"
        style={isMobile ? { height: sheetHeight } : undefined}
      >
        <button
          type="button"
          className="mx-auto mt-2 hidden h-1.5 w-12 rounded-full bg-white/25 max-md:block"
          aria-label={sheet === "full" ? "Shrink the list" : "Expand the list"}
          onClick={() => setSheet((current) => (current === "peek" ? "mid" : current === "mid" ? "full" : "mid"))}
        />
        {selected ? (
          <PlaceDetail place={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
              <div className="min-w-0">
                <h1 className="truncate font-serif text-[1.7rem] leading-none">{title}</h1>
                <p className="mt-1 text-sm text-cream/60">
                  {places ? countLabel : "Placing Houston kitchens on the map…"}
                  {activeArea ? ` · ${activeArea.blurb}` : ""}
                </p>
              </div>
              {(query || category || areaId) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-3 pb-4">
                {!places ? (
                  <div className="space-y-2 px-1">
                    {Array.from({ length: 6 }, (_, index) => (
                      <div key={index} className="h-[84px] animate-pulse rounded-2xl bg-white/8" />
                    ))}
                  </div>
                ) : showAreas ? (
                  <>
                    <p className="px-1 pb-3 text-sm text-cream/70">
                      {categoryMeta
                        ? `Zoom in, or open a neighborhood that has ${categoryMeta.label.toLowerCase()}.`
                        : "Start with a neighborhood, then zoom into the block."}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {areaList.map((area) => (
                        <button
                          key={area.id}
                          type="button"
                          onClick={() => pickArea(area.id)}
                          className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left hover:bg-white/10"
                        >
                          <span className="block font-medium">{area.name}</span>
                          <span className="mt-1 block text-xs leading-snug text-cream/60">{area.blurb}</span>
                          <span className="mt-2 block text-xs text-gold">
                            {(areaCounts.get(area.id) ?? 0).toLocaleString()} places
                          </span>
                        </button>
                      ))}
                    </div>
                    {!category && (
                      <Button
                        variant="ghost"
                        className="mt-3 w-full"
                        onClick={() => setShowAllAreas((open) => !open)}
                      >
                        {showAllAreas ? "Show fewer neighborhoods" : "All neighborhoods"}
                      </Button>
                    )}
                  </>
                ) : ranked.length === 0 ? (
                  <div className="px-2 py-8 text-center">
                    <p className="font-serif text-2xl">Nothing on the map for that.</p>
                    <p className="mt-2 text-sm text-cream/65">
                      Try pho, brisket, kolaches, or a neighborhood like Montrose.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {ranked.slice(0, listLimit).map((place) => (
                      <PlaceCard
                        key={place.i}
                        place={place}
                        selected={place.i === selectedId}
                        origin={origin}
                        onSelect={selectPlace}
                      />
                    ))}
                    {ranked.length > listLimit && (
                      <Button
                        variant="outline"
                        className="mt-2 w-full rounded-full"
                        onClick={() => setListLimit((count) => count + 60)}
                      >
                        Show more
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </aside>

      <div className="fixed right-3 z-30 flex flex-col gap-2 max-md:bottom-[calc(var(--sheet)+0.75rem)] md:top-40">
        <Button variant="outline" size="icon" className="rounded-full bg-ink/80" onClick={() => issue({ kind: "zoom", delta: 1 })} aria-label="Zoom in">
          <Plus />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full bg-ink/80" onClick={() => issue({ kind: "zoom", delta: -1 })} aria-label="Zoom out">
          <Minus />
        </Button>
        <Button
          variant={tilted ? "default" : "outline"}
          size="icon"
          className="rounded-full bg-ink/80"
          onClick={() => {
            const next = !tilted;
            setTilted(next);
            issue({ kind: "pitch", pitch: next ? 52 : 0, bearing: next ? -18 : 0 });
          }}
          aria-label={tilted ? "Flatten the map" : "Tilt into an aerial view"}
        >
          <Compass />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-ink/80"
          onClick={() => setBasemap((current) => (current === "aerial" ? "streets" : "aerial"))}
          aria-label={basemap === "aerial" ? "Switch to streets" : "Switch to aerial"}
        >
          <Layers />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-ink/80"
          onClick={() => issue({ kind: "locate" })}
          aria-label="Find my location"
        >
          <LocateFixed />
        </Button>
      </div>

      {notice && (
        <div className="fixed bottom-6 left-1/2 z-40 max-w-sm -translate-x-1/2 rounded-full bg-ink/90 px-4 py-2 text-sm text-cream shadow-xl max-md:bottom-[calc(var(--sheet)+0.75rem)]">
          {notice}
        </div>
      )}

      {(category || activeArea) && !selected && (
        <div className="pointer-events-none fixed left-1/2 top-3 z-20 hidden -translate-x-1/2 md:left-[calc(50%+180px)] md:block">
          <Badge variant="outline" className="bg-ink/75 px-3 py-1 text-sm">
            {categoryMeta?.label}
            {categoryMeta && activeArea ? " · " : ""}
            {activeArea?.name}
          </Badge>
        </div>
      )}
    </main>
  );
}
