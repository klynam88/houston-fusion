# Houston Fusion

An aerial map of Houston for finding food. Search a craving, a neighborhood, or a restaurant name, then open a place for what it serves, hours, and directions.

The map opens over the city. Zoom in, or pick a neighborhood such as Montrose, Chinatown, the Heights, or the Energy Corridor. Cuisine chips cover Tex-Mex, BBQ, Vietnamese, seafood, and the rest of the city's tables. Every dot is a real restaurant, cafe, bakery, or other place that serves food.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## Google ratings and photos

Restaurant locations come from OpenStreetMap. Food thumbnails are cuisine photos, labeled as such, until a Google Places key is added. With a key, opening a place loads its Google rating, review count, price, and photos when Google has a matching listing nearby.

1. In Google Cloud, enable **Places API (New)**.
2. Copy `.env.example` to `.env.local`.
3. Set `GOOGLE_PLACES_API_KEY`.
4. Restart the dev server.

Ratings are requested only when you open a place, and only kept when the Google result sits on the same spot.

## Data

`public/data/places.json` is a snapshot of Houston-area restaurants, cafes, bakeries, and fast food from the Overpass API. Coverage runs from Katy and the Energy Corridor through downtown, out to The Woodlands, Sugar Land, Pearland, and Pasadena. Clear Lake is the thin spot in this snapshot.

Refresh it, after placing new Overpass dumps in `/tmp/overpass`, with:

```bash
npm run places
```

The query lives in `scripts/build_places.py`.

## Credits

Restaurant locations © OpenStreetMap contributors. Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community. Cuisine photography is from Unsplash.
