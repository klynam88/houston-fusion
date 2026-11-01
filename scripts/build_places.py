#!/usr/bin/env python3
"""Turn Overpass dumps in /tmp/overpass into public/data/places.json."""

from __future__ import annotations

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TAX_PATH = ROOT / "data" / "taxonomy.json"
OUT_PATH = ROOT / "public" / "data" / "places.json"
DUMPS = Path("/tmp/overpass")

AMENITY_FALLBACK = {
    "cafe": "coffee",
    "ice_cream": "bakery",
    "bakery": "bakery",
    "pastry": "bakery",
    "confectionery": "bakery",
    "deli": "sandwich",
    "food_court": "food-hall",
    "fast_food": "quick",
    "restaurant": "other",
}

# Promote a specific category when the name is clearer than the OSM cuisine tag.
NAME_HINTS = [
    ("donut", "bakery"),
    ("doughnut", "bakery"),
    ("kolache", "bakery"),
    ("taqueria", "tex-mex"),
    ("taco", "tex-mex"),
    ("barbecue", "bbq"),
    ("bbq", "bbq"),
    ("pho", "vietnamese"),
    ("banh mi", "vietnamese"),
    ("sushi", "sushi"),
    ("ramen", "sushi"),
    ("pizzeria", "pizza"),
    ("pizza", "pizza"),
    ("burger", "burgers"),
    ("whataburger", "burgers"),
    ("seafood", "seafood"),
    ("crawfish", "seafood"),
    ("oyster", "seafood"),
    ("wing", "chicken"),
    ("bagel", "breakfast"),
    ("ice cream", "bakery"),
    ("steakhouse", "steak"),
    ("pupusa", "latin"),
    ("jollof", "african"),
    ("biryani", "indian"),
    ("dim sum", "chinese"),
]


def load_alias_map() -> dict[str, str]:
    tax = json.loads(TAX_PATH.read_text())
    alias: dict[str, str] = {}
    for cat in tax["categories"]:
        for name in cat["aliases"]:
            alias[name] = cat["id"]
    return alias


def coords(el: dict) -> tuple[float, float] | None:
    if "lat" in el and "lon" in el:
        return float(el["lat"]), float(el["lon"])
    center = el.get("center") or {}
    if "lat" in center and "lon" in center:
        return float(center["lat"]), float(center["lon"])
    return None


def norm_token(value: str) -> str:
    return value.strip().lower().replace(" ", "_")


def flag(tags: dict, *keys: str) -> bool:
    for key in keys:
        val = (tags.get(key) or "").lower()
        if val in {"yes", "only", "limited"}:
            return True
    return False


def website(tags: dict) -> str:
    raw = tags.get("website") or tags.get("contact:website") or tags.get("url") or ""
    raw = raw.strip()
    if raw.startswith("www."):
        return "https://" + raw
    return raw


def address(tags: dict) -> str:
    full = (tags.get("addr:full") or "").strip()
    number = (tags.get("addr:housenumber") or "").strip()
    street = (tags.get("addr:street") or "").strip()
    line = " ".join(part for part in (number, street) if part)
    return line or full


def categories_for(cuisines: list[str], kind: str, alias: dict[str, str]) -> tuple[str, list[str]]:
    found: list[str] = []
    for raw in cuisines:
        cat = alias.get(raw)
        if cat and cat not in found:
            found.append(cat)
    if not found:
        fallback = AMENITY_FALLBACK.get(kind, "other")
        found.append(fallback)
    return found[0], found


def apply_name_hints(name: str, primary: str, cats: list[str]) -> tuple[str, list[str]]:
    lname = name.lower()
    for needle, cat in NAME_HINTS:
        if needle in lname and cat not in cats:
            cats.append(cat)
    if primary in {"other", "quick", "american"}:
        for needle, cat in NAME_HINTS:
            if needle in lname:
                primary = cat
                break
    specific = [cat for cat in cats if cat not in {"other", "quick", "american"}]
    if specific:
        cats = specific
        if primary not in cats:
            primary = cats[0]
    return primary, cats


def richness(place: dict) -> int:
    score = len(place["c"]) + len(place["u"])
    for key in ("a", "h", "p", "w"):
        if place[key]:
            score += 2
    return score


def main() -> None:
    alias = load_alias_map()
    elements: list[dict] = []
    for path in sorted(DUMPS.glob("*.json")):
        try:
            payload = json.loads(path.read_text())
        except json.JSONDecodeError:
            print("skip bad json", path)
            continue
        elements.extend(payload.get("elements") or [])
        print(f"{path.name}: {len(payload.get('elements') or [])}")

    best: dict[str, dict] = {}
    unmatched = Counter()
    for el in elements:
        tags = el.get("tags") or {}
        name = (tags.get("name") or "").strip()
        if len(name) < 2:
            continue
        point = coords(el)
        if not point:
            continue
        lat, lng = point
        if not (29.40 <= lat <= 30.32 and -96.05 <= lng <= -94.80):
            continue
        kind = tags.get("amenity") or tags.get("shop") or "restaurant"
        cuisines = [norm_token(part) for part in (tags.get("cuisine") or "").split(";") if part.strip()]
        for raw in cuisines:
            if raw not in alias:
                unmatched[raw] += 1
        primary, cats = categories_for(cuisines, kind, alias)
        primary, cats = apply_name_hints(name, primary, cats)
        flags = 0
        if flag(tags, "takeaway", "takeaway:only"):
            flags |= 1
        if flag(tags, "delivery"):
            flags |= 2
        if flag(tags, "outdoor_seating"):
            flags |= 4
        if flag(tags, "drive_through"):
            flags |= 8
        if flag(tags, "diet:vegetarian"):
            flags |= 16
        if flag(tags, "diet:vegan"):
            flags |= 32
        place = {
            "i": f"{el.get('type', 'node')}/{el.get('id')}",
            "n": name,
            "la": round(lat, 5),
            "ln": round(lng, 5),
            "k": primary,
            "c": cats,
            "m": kind,
            "a": address(tags),
            "t": (tags.get("addr:city") or "").strip(),
            "h": (tags.get("opening_hours") or "").strip(),
            "p": (tags.get("phone") or tags.get("contact:phone") or "").strip(),
            "w": website(tags),
            "f": flags,
            "u": cuisines[:6],
        }
        key = f"{name.lower()}|{round(lat, 4)}|{round(lng, 4)}"
        current = best.get(key)
        if current is None or richness(place) > richness(current):
            best[key] = place

    places = sorted(best.values(), key=lambda p: (p["n"].lower(), p["i"]))
    counts = Counter(p["k"] for p in places)
    payload = {
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "OpenStreetMap via the Overpass API",
        "count": len(places),
        "places": places,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")))
    print("places", len(places), "bytes", OUT_PATH.stat().st_size)
    print("categories", counts.most_common())
    print("unmatched cuisines", unmatched.most_common(25))
    needles = [
        "ninfa",
        "breakfast klub",
        "uchi",
        "himalaya",
        "truth bbq",
        "crawfish",
        "pondicheri",
        "house of pies",
        "blood bros",
        "torchy",
        "pappadeaux",
        "whataburger",
        "shipleys",
        "shipley",
    ]
    for needle in needles:
        hits = [p["n"] for p in places if needle in p["n"].lower()]
        print(f"  {needle}: {len(hits)} {hits[:4]}")


if __name__ == "__main__":
    main()
