import { areaScore, ellipseRing, inArea, type Area } from "@/lib/geo";

export type { Area };

export const AREAS: Area[] = [
  { id: "downtown", name: "Downtown", blurb: "Steakhouses, diners, and lunch counters", lat: 29.758, lng: -95.367, rx: 0.016, ry: 0.013, aliases: ["downtown", "downtown houston"], featured: true },
  { id: "midtown", name: "Midtown", blurb: "Patios, late plates, and the light rail", lat: 29.741, lng: -95.376, rx: 0.014, ry: 0.012, aliases: ["midtown"], featured: true },
  { id: "montrose", name: "Montrose", blurb: "The city's most crowded tables", lat: 29.745, lng: -95.392, rx: 0.02, ry: 0.017, aliases: ["montrose"], featured: true },
  { id: "heights", name: "The Heights", blurb: "Smoked meats, bakeries, and shaded patios", lat: 29.803, lng: -95.399, rx: 0.02, ry: 0.024, aliases: ["the heights", "heights", "houston heights"], featured: true },
  { id: "washington", name: "Washington Ave", blurb: "A long strip of patios and late kitchens", lat: 29.77, lng: -95.402, rx: 0.02, ry: 0.008, aliases: ["washington ave", "washington avenue"], featured: true },
  { id: "rice-military", name: "Rice Military", blurb: "Low buildings and neighborhood restaurants", lat: 29.764, lng: -95.415, rx: 0.012, ry: 0.01, aliases: ["rice military"] },
  { id: "sawyer", name: "Sawyer Yards", blurb: "Warehouses, coffee, and creative-district bites", lat: 29.77, lng: -95.386, rx: 0.01, ry: 0.008, aliases: ["sawyer yards", "sawyer"] },
  { id: "eado", name: "EaDo", blurb: "Stadium-side kitchens east of downtown", lat: 29.747, lng: -95.346, rx: 0.012, ry: 0.01, aliases: ["eado", "ea do", "east downtown"], featured: true },
  { id: "east-end", name: "East End", blurb: "Navigation, tamales, and original Tex-Mex", lat: 29.752, lng: -95.322, rx: 0.028, ry: 0.016, aliases: ["east end"], featured: true },
  { id: "second-ward", name: "Second Ward", blurb: "Old East End blocks and family kitchens", lat: 29.756, lng: -95.341, rx: 0.012, ry: 0.01, aliases: ["second ward"] },
  { id: "third-ward", name: "Third Ward", blurb: "Soul food, bakeries, and neighborhood cafes", lat: 29.73, lng: -95.355, rx: 0.018, ry: 0.014, aliases: ["third ward"] },
  { id: "fifth-ward", name: "Fifth Ward", blurb: "Historic kitchens north of Buffalo Bayou", lat: 29.776, lng: -95.339, rx: 0.016, ry: 0.012, aliases: ["fifth ward"] },
  { id: "northside", name: "Near Northside", blurb: "Taquerias and bakeries above downtown", lat: 29.79, lng: -95.362, rx: 0.016, ry: 0.014, aliases: ["near northside", "northside"] },
  { id: "museum", name: "Museum District", blurb: "Lunch between the museums and Hermann Park", lat: 29.726, lng: -95.389, rx: 0.016, ry: 0.011, aliases: ["museum district"], featured: true },
  { id: "rice-village", name: "Rice Village", blurb: "A walkable cluster of cafes and small rooms", lat: 29.717, lng: -95.416, rx: 0.012, ry: 0.009, aliases: ["rice village", "the village"], featured: true },
  { id: "west-u", name: "West University", blurb: "Neighborhood cafes south of the Village", lat: 29.717, lng: -95.434, rx: 0.016, ry: 0.011, aliases: ["west university", "west u", "westu"] },
  { id: "upper-kirby", name: "Upper Kirby", blurb: "Busy dining rooms along Kirby", lat: 29.734, lng: -95.419, rx: 0.014, ry: 0.011, aliases: ["upper kirby"], featured: true },
  { id: "river-oaks", name: "River Oaks", blurb: "Long lunches and dressed-up dining rooms", lat: 29.756, lng: -95.434, rx: 0.02, ry: 0.014, aliases: ["river oaks"], featured: true },
  { id: "greenway", name: "Greenway", blurb: "Plaza restaurants between Kirby and 59", lat: 29.731, lng: -95.432, rx: 0.012, ry: 0.009, aliases: ["greenway", "greenway plaza"] },
  { id: "galleria", name: "Galleria", blurb: "Hotel dining, steakhouses, and the mall", lat: 29.738, lng: -95.468, rx: 0.022, ry: 0.016, aliases: ["galleria", "uptown"], featured: true },
  { id: "memorial", name: "Memorial", blurb: "Neighborhood spots west of the loop", lat: 29.772, lng: -95.51, rx: 0.028, ry: 0.016, aliases: ["memorial"], featured: true },
  { id: "memorial-city", name: "Memorial City", blurb: "The mall, the hospitals, and the food around them", lat: 29.781, lng: -95.546, rx: 0.016, ry: 0.012, aliases: ["memorial city"] },
  { id: "energy", name: "Energy Corridor", blurb: "West Houston offices and the restaurants that feed them", lat: 29.778, lng: -95.64, rx: 0.04, ry: 0.02, aliases: ["energy corridor"], featured: true },
  { id: "spring-branch", name: "Spring Branch", blurb: "A wide west-side mix of family restaurants", lat: 29.806, lng: -95.52, rx: 0.03, ry: 0.016, aliases: ["spring branch"] },
  { id: "garden-oaks", name: "Garden Oaks", blurb: "Quiet north-side blocks and corner cafes", lat: 29.818, lng: -95.428, rx: 0.016, ry: 0.012, aliases: ["garden oaks"] },
  { id: "oak-forest", name: "Oak Forest", blurb: "Neighborhood dining toward 43rd and Ella", lat: 29.83, lng: -95.4, rx: 0.018, ry: 0.014, aliases: ["oak forest"] },
  { id: "medical", name: "Medical Center", blurb: "Fast meals and long shifts around the hospitals", lat: 29.708, lng: -95.399, rx: 0.02, ry: 0.016, aliases: ["medical center", "texas medical center", "tmc"], featured: true },
  { id: "meyerland", name: "Meyerland", blurb: "Delis, bakeries, and family restaurants", lat: 29.686, lng: -95.462, rx: 0.02, ry: 0.014, aliases: ["meyerland"] },
  { id: "bellaire", name: "Bellaire", blurb: "The city of Bellaire and its neighborhood tables", lat: 29.705, lng: -95.458, rx: 0.016, ry: 0.012, aliases: ["bellaire"] },
  { id: "chinatown", name: "Chinatown", blurb: "Bellaire Boulevard, from pho to hot pot", lat: 29.704, lng: -95.55, rx: 0.042, ry: 0.01, aliases: ["chinatown", "bellaire boulevard"], featured: true },
  { id: "hillcroft", name: "Hillcroft", blurb: "The Mahatma Gandhi District: Indian, Pakistani, Afghan", lat: 29.71, lng: -95.492, rx: 0.018, ry: 0.014, aliases: ["hillcroft", "gandhi district", "mahatma gandhi"], featured: true },
  { id: "sharpstown", name: "Sharpstown", blurb: "A dense international stretch inside the Beltway", lat: 29.712, lng: -95.52, rx: 0.02, ry: 0.014, aliases: ["sharpstown"] },
  { id: "gulfton", name: "Gulfton", blurb: "Central American kitchens and neighborhood cafes", lat: 29.718, lng: -95.488, rx: 0.016, ry: 0.012, aliases: ["gulfton"] },
  { id: "alief", name: "Alief", blurb: "West-side dining rooms from a dozen countries", lat: 29.711, lng: -95.596, rx: 0.024, ry: 0.016, aliases: ["alief"] },
  { id: "westchase", name: "Westchase", blurb: "Office parks and the restaurants along them", lat: 29.735, lng: -95.565, rx: 0.02, ry: 0.014, aliases: ["westchase"] },
  { id: "katy", name: "Katy", blurb: "The far west suburbs, from BBQ to boba", lat: 29.786, lng: -95.824, rx: 0.055, ry: 0.035, aliases: ["katy"], featured: true },
  { id: "cypress", name: "Cypress", blurb: "Northwest suburb kitchens and new plazas", lat: 29.969, lng: -95.697, rx: 0.04, ry: 0.028, aliases: ["cypress"] },
  { id: "sugar-land", name: "Sugar Land", blurb: "Southwest suburbs and Town Square", lat: 29.599, lng: -95.622, rx: 0.045, ry: 0.03, aliases: ["sugar land", "sugarland"], featured: true },
  { id: "missouri-city", name: "Missouri City", blurb: "South of the city, toward the Fort Bend line", lat: 29.582, lng: -95.537, rx: 0.03, ry: 0.02, aliases: ["missouri city"] },
  { id: "stafford", name: "Stafford", blurb: "A pocket of restaurants between Houston and Sugar Land", lat: 29.616, lng: -95.559, rx: 0.018, ry: 0.014, aliases: ["stafford"] },
  { id: "pearland", name: "Pearland", blurb: "South of the loop, BBQ included", lat: 29.564, lng: -95.286, rx: 0.04, ry: 0.028, aliases: ["pearland"] },
  { id: "pasadena", name: "Pasadena", blurb: "East of the ship channel", lat: 29.691, lng: -95.21, rx: 0.035, ry: 0.022, aliases: ["pasadena"] },
  { id: "clear-lake", name: "Clear Lake", blurb: "NASA, the lake, and the kitchens around them", lat: 29.56, lng: -95.09, rx: 0.04, ry: 0.025, aliases: ["clear lake", "nasa", "league city"] },
  { id: "woodlands", name: "The Woodlands", blurb: "Town Center and the restaurants under the pines", lat: 30.165, lng: -95.461, rx: 0.05, ry: 0.035, aliases: ["the woodlands", "woodlands"], featured: true },
  { id: "spring", name: "Spring", blurb: "North of the Beltway, Old Town included", lat: 30.08, lng: -95.417, rx: 0.035, ry: 0.025, aliases: ["old town spring", "spring"] },
  { id: "humble", name: "Humble", blurb: "Northeast Houston, toward the airport", lat: 29.998, lng: -95.262, rx: 0.03, ry: 0.022, aliases: ["humble"] },
];

const byId = new Map(AREAS.map((area) => [area.id, area]));

export function areaById(id: string | null | undefined) {
  if (!id) return null;
  return byId.get(id) ?? null;
}

export function areaFor(lat: number, lng: number) {
  let best: { area: Area; score: number } | null = null;
  for (const area of AREAS) {
    const score = areaScore(lat, lng, area);
    if (score <= 1 && (!best || score < best.score)) best = { area, score };
  }
  return best?.area ?? null;
}

export function neighborhoodOf(lat: number, lng: number) {
  const inside = areaFor(lat, lng);
  if (inside) return inside.name;
  let best: { area: Area; score: number } | null = null;
  for (const area of AREAS) {
    const score = areaScore(lat, lng, area);
    if (!best || score < best.score) best = { area, score };
  }
  if (best && best.score < 1.8) return best.area.name;
  return "Houston";
}

export function areasGeoJSON() {
  return {
    type: "FeatureCollection" as const,
    features: AREAS.map((area) => ({
      type: "Feature" as const,
      id: area.id,
      properties: {
        id: area.id,
        name: area.name,
        rank: area.rx * area.ry,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [ellipseRing(area)],
      },
    })),
  };
}

export function placeInArea(lat: number, lng: number, area: Area) {
  return inArea(lat, lng, area);
}
