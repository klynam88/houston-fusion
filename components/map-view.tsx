"use client";

import { useEffect, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  setWorkerUrl,
  type ExpressionSpecification,
  type FilterSpecification,
  type GeoJSONSource,
  type MapMouseEvent,
  type MapSourceDataEvent,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl("/maplibre-gl-worker.js");
import { AREAS, areaById, areasGeoJSON } from "@/lib/areas";
import { CATEGORIES, categoryLabel } from "@/lib/taxonomy";
import type { Bounds, Place } from "@/lib/types";

export type MapCommandInput =
  | { kind: "place"; lng: number; lat: number; zoom: number }
  | { kind: "area"; areaId: string }
  | { kind: "bounds"; west: number; south: number; east: number; north: number }
  | { kind: "pitch"; pitch: number; bearing: number }
  | { kind: "zoom"; delta: number }
  | { kind: "locate" };

export type MapCommand = MapCommandInput & { n: number };

type ViewState = {
  bounds: Bounds;
  zoom: number;
  lat: number;
  lng: number;
};

const STYLE = {
  version: 8,
  sources: {
    satellite: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
      maxzoom: 19,
    },
    streets: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Map © Esri",
      maxzoom: 19,
    },
    roads: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
    reference: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: "satellite", type: "raster", source: "satellite" },
    { id: "streets", type: "raster", source: "streets", layout: { visibility: "none" } },
    { id: "roads", type: "raster", source: "roads", paint: { "raster-opacity": 0.72 } },
    { id: "reference", type: "raster", source: "reference", paint: { "raster-opacity": 0.92 } },
  ],
};

const COLOR_EXPR = [
  "match",
  ["get", "k"],
  ...CATEGORIES.flatMap((category) => [category.id, category.color]),
  "#f7d6b8",
] as unknown as ExpressionSpecification;

function cameraPadding() {
  const mobile = window.innerWidth < 768;
  if (mobile) {
    return { top: 150, bottom: Math.round(window.innerHeight * 0.46), left: 16, right: 16 };
  }
  return { top: 148, bottom: 28, left: 440, right: 72 };
}

function placesGeoJSON(places: Place[]) {
  return {
    type: "FeatureCollection" as const,
    features: places.map((place) => ({
      type: "Feature" as const,
      id: place.i,
      properties: { i: place.i, n: place.n, k: place.k },
      geometry: { type: "Point" as const, coordinates: [place.ln, place.la] as [number, number] },
    })),
  };
}

export function MapView({
  places,
  selectedId,
  selectedAreaId,
  basemap,
  command,
  onSelectPlace,
  onSelectArea,
  onView,
  onNotice,
}: {
  places: Place[];
  selectedId: string | null;
  selectedAreaId: string | null;
  basemap: "aerial" | "streets";
  command: MapCommand | null;
  onSelectPlace: (id: string) => void;
  onSelectArea: (id: string) => void;
  onView: (view: ViewState) => void;
  onNotice: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const placesRef = useRef(places);
  const selectedRef = useRef(selectedId);
  const areaRef = useRef(selectedAreaId);
  const handlers = useRef({ onSelectPlace, onSelectArea, onView, onNotice });
  const clusterMarkers = useRef(new Map<number, Marker>());
  const areaMarkers = useRef(new Map<string, Marker>());
  const placeMarker = useRef<Marker | null>(null);
  const hoverArea = useRef<string | null>(null);

  placesRef.current = places;
  selectedRef.current = selectedId;
  areaRef.current = selectedAreaId;
  handlers.current = { onSelectPlace, onSelectArea, onView, onNotice };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = new MapLibreMap({
      container,
      style: STYLE as StyleSpecification,
      center: [-95.46, 29.77],
      zoom: 10.7,
      pitch: 52,
      bearing: -18,
      minZoom: 9,
      maxZoom: 18,
      maxBounds: [
        [-96.25, 29.22],
        [-94.6, 30.48],
      ],
      attributionControl: false,
    });
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");
    mapRef.current = map;

    const emitView = () => {
      const bounds = map.getBounds();
      const center = map.getCenter();
      handlers.current.onView({
        bounds: {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        },
        zoom: map.getZoom(),
        lat: center.lat,
        lng: center.lng,
      });
      syncAreaLabels(map);
    };

    const refreshClusters = () => {
      if (!map.getSource("places")) return;
      const features = map.querySourceFeatures("places");
      const seen = new Set<number>();
      for (const feature of features) {
        const props = feature.properties;
        if (!props || !props.cluster) continue;
        const id = Number(props.cluster_id);
        if (seen.has(id)) continue;
        seen.add(id);
        const geometry = feature.geometry;
        if (geometry.type !== "Point") continue;
        const coords = geometry.coordinates as [number, number];
        const count = Number(props.point_count);
        let marker = clusterMarkers.current.get(id);
        if (!marker) {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "cluster-pin";
          button.addEventListener("click", (event) => {
            event.stopPropagation();
            const clusterId = Number(button.dataset.id);
            const lng = Number(button.dataset.lng);
            const lat = Number(button.dataset.lat);
            const source = map.getSource("places") as GeoJSONSource | undefined;
            if (!source) return;
            source
              .getClusterExpansionZoom(clusterId)
              .then((zoom) => {
                map.easeTo({
                  center: [lng, lat],
                  zoom,
                  duration: 550,
                  padding: cameraPadding(),
                });
              })
              .catch(() => undefined);
          });
          marker = new Marker({ element: button }).setLngLat(coords).addTo(map);
          clusterMarkers.current.set(id, marker);
        }
        const element = marker.getElement();
        element.dataset.id = String(id);
        element.dataset.lng = String(coords[0]);
        element.dataset.lat = String(coords[1]);
        element.textContent = count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : String(count);
        element.setAttribute("aria-label", `${count} places. Zoom in.`);
        marker.setLngLat(coords);
      }
      for (const [id, marker] of clusterMarkers.current) {
        if (!seen.has(id)) {
          marker.remove();
          clusterMarkers.current.delete(id);
        }
      }
    };

    const syncAreaLabels = (current: MapLibreMap) => {
      const zoom = current.getZoom();
      for (const [id, marker] of areaMarkers.current) {
        const element = marker.getElement();
        const active = id === areaRef.current;
        element.style.display = zoom < 12.3 || active ? "block" : "none";
        element.classList.toggle("is-active", active);
      }
    };

    map.on("load", () => {
      map.setPadding(cameraPadding());
      map.addSource("areas", {
        type: "geojson",
        data: areasGeoJSON(),
        promoteId: "id",
      });
      map.addSource("places", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 15,
      });
      map.addLayer({
        id: "area-fill",
        type: "fill",
        source: "areas",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#ff4d2e",
            ["boolean", ["feature-state", "hover"], false],
            "#e7b15a",
            "#fff7ea",
          ],
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.28,
              ["boolean", ["feature-state", "hover"], false],
              0.16,
              0.05,
            ],
            13.2,
            [
              "case",
              ["boolean", ["feature-state", "selected"], false],
              0.22,
              ["boolean", ["feature-state", "hover"], false],
              0.12,
              0,
            ],
          ],
        },
      });
      map.addLayer({
        id: "area-line",
        type: "line",
        source: "areas",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "selected"], false],
            "#ffc7a8",
            "rgba(255,247,234,0.55)",
          ],
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 2.4, 1],
          "line-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            ["case", ["boolean", ["feature-state", "selected"], false], 0.95, 0.5],
            13,
            ["case", ["boolean", ["feature-state", "selected"], false], 0.95, 0],
          ],
        },
      });
      map.addLayer({
        id: "places-hit",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 15, 16],
          "circle-opacity": 0,
        },
      });
      map.addLayer({
        id: "places-circle",
        type: "circle",
        source: "places",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 13, 5.5, 16, 8],
          "circle-color": COLOR_EXPR,
          "circle-stroke-width": 1.25,
          "circle-stroke-color": "rgba(20,12,8,0.85)",
          "circle-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "places-selected",
        type: "circle",
        source: "places",
        filter: ["==", ["get", "i"], ""],
        paint: {
          "circle-radius": 16,
          "circle-color": "rgba(255,77,46,0.2)",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ff4d2e",
        },
      });

      for (const area of AREAS) {
        const element = document.createElement("div");
        element.className = "area-label";
        element.textContent = area.name;
        const marker = new Marker({ element, anchor: "center" })
          .setLngLat([area.lng, area.lat])
          .addTo(map);
        areaMarkers.current.set(area.id, marker);
      }

      setReady(true);
      const source = map.getSource("places") as GeoJSONSource;
      source.setData(placesGeoJSON(placesRef.current));
      emitView();
      map.once("idle", refreshClusters);
    });

    map.on("click", (event: MapMouseEvent) => {
      const placesHit = map.queryRenderedFeatures(event.point, { layers: ["places-hit"] });
      if (placesHit.length > 0) {
        const id = placesHit[0].properties?.i;
        if (id) handlers.current.onSelectPlace(String(id));
        return;
      }
      const areasHit = map.queryRenderedFeatures(event.point, { layers: ["area-fill"] });
      if (areasHit.length > 0) {
        const best = [...areasHit].sort(
          (a, b) => Number(a.properties?.rank ?? 99) - Number(b.properties?.rank ?? 99),
        )[0];
        const id = best.properties?.id;
        if (id) handlers.current.onSelectArea(String(id));
      }
    });

    map.on("mousemove", (event: MapMouseEvent) => {
      const fine = window.matchMedia("(pointer: fine)").matches;
      const hits = map.queryRenderedFeatures(event.point, { layers: ["places-hit"] });
      map.getCanvas().style.cursor = hits.length ? "pointer" : "";
      const tip = document.getElementById("place-tip");
      if (tip && fine && hits.length > 0) {
        const name = String(hits[0].properties?.n ?? "");
        const label = categoryLabel(String(hits[0].properties?.k ?? "other"));
        tip.textContent = `${name} · ${label}`;
        tip.style.display = "block";
        tip.style.left = `${event.point.x}px`;
        tip.style.top = `${event.point.y}px`;
      } else if (tip) {
        tip.style.display = "none";
      }

      const areaHits = map.queryRenderedFeatures(event.point, { layers: ["area-fill"] });
      const next = areaHits[0]?.properties?.id ? String(areaHits[0].properties.id) : null;
      if (next === hoverArea.current) return;
      if (hoverArea.current) {
        map.setFeatureState(
          { source: "areas", id: hoverArea.current },
          { hover: false, selected: hoverArea.current === areaRef.current },
        );
      }
      hoverArea.current = next;
      if (next) {
        map.setFeatureState(
          { source: "areas", id: next },
          { hover: true, selected: next === areaRef.current },
        );
      }
    });

    map.on("mouseout", () => {
      const tip = document.getElementById("place-tip");
      if (tip) tip.style.display = "none";
    });

    map.on("moveend", () => {
      emitView();
      refreshClusters();
    });
    map.on("sourcedata", (event: MapSourceDataEvent) => {
      if (event.sourceId === "places" && event.isSourceLoaded) refreshClusters();
    });
    map.on("resize", () => map.setPadding(cameraPadding()));

    const clusters = clusterMarkers.current;
    const areaMarks = areaMarkers.current;
    return () => {
      for (const marker of clusters.values()) marker.remove();
      clusters.clear();
      for (const marker of areaMarks.values()) marker.remove();
      areaMarks.clear();
      placeMarker.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const source = map.getSource("places") as GeoJSONSource | undefined;
    source?.setData(placesGeoJSON(places));
  }, [places, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setFilter("places-selected", ["==", ["get", "i"], selectedId ?? ""] as FilterSpecification);
    const place = places.find((item) => item.i === selectedId);
    placeMarker.current?.remove();
    placeMarker.current = null;
    if (!place) return;
    const element = document.createElement("div");
    element.className = "place-label";
    element.textContent = place.n;
    placeMarker.current = new Marker({ element, anchor: "bottom", offset: [0, -10] })
      .setLngLat([place.ln, place.la])
      .addTo(map);
  }, [selectedId, places, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    for (const area of AREAS) {
      map.setFeatureState(
        { source: "areas", id: area.id },
        { selected: area.id === selectedAreaId, hover: area.id === hoverArea.current },
      );
      const marker = areaMarkers.current.get(area.id);
      if (!marker) continue;
      const element = marker.getElement();
      const active = area.id === selectedAreaId;
      element.classList.toggle("is-active", active);
      element.style.display = map.getZoom() < 12.3 || active ? "block" : "none";
    }
  }, [selectedAreaId, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const aerial = basemap === "aerial";
    map.setLayoutProperty("satellite", "visibility", aerial ? "visible" : "none");
    map.setLayoutProperty("roads", "visibility", aerial ? "visible" : "none");
    map.setLayoutProperty("reference", "visibility", aerial ? "visible" : "none");
    map.setLayoutProperty("streets", "visibility", aerial ? "none" : "visible");
  }, [basemap, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !command || !ready) return;
    const padding = cameraPadding();
    if (command.kind === "place") {
      map.flyTo({
        center: [command.lng, command.lat],
        zoom: Math.max(map.getZoom(), command.zoom),
        padding,
        essential: true,
        speed: 1.15,
      });
    } else if (command.kind === "area") {
      const area = areaById(command.areaId);
      if (!area) return;
      map.fitBounds(
        [
          [area.lng - area.rx, area.lat - area.ry],
          [area.lng + area.rx, area.lat + area.ry],
        ],
        { padding, maxZoom: 14, pitch: map.getPitch(), bearing: map.getBearing(), duration: 900 },
      );
    } else if (command.kind === "bounds") {
      map.fitBounds(
        [
          [command.west, command.south],
          [command.east, command.north],
        ],
        { padding, maxZoom: 15, pitch: map.getPitch(), bearing: map.getBearing(), duration: 900 },
      );
    } else if (command.kind === "pitch") {
      map.easeTo({ pitch: command.pitch, bearing: command.bearing, duration: 700, padding });
    } else if (command.kind === "zoom") {
      map.easeTo({ zoom: map.getZoom() + command.delta, duration: 250, padding });
    } else if (command.kind === "locate") {
      if (!navigator.geolocation) {
        handlers.current.onNotice("Location isn't available in this browser.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (latitude < 29.3 || latitude > 30.4 || longitude < -96.15 || longitude > -94.7) {
            handlers.current.onNotice("You're outside Houston, so the map stays on the city.");
            return;
          }
          map.flyTo({
            center: [longitude, latitude],
            zoom: Math.max(map.getZoom(), 14),
            pitch: 50,
            padding,
            essential: true,
          });
        },
        () => handlers.current.onNotice("Location isn't available in this browser."),
        { enableHighAccuracy: false, timeout: 8000 },
      );
    }
  }, [command, ready]);

  return (
    <>
      <div ref={containerRef} className="h-full w-full" />
      <div id="place-tip" className="place-tip" />
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_140px_rgba(0,0,0,0.35)]" />
    </>
  );
}
