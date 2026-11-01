import taxonomyFile from "@/data/taxonomy.json";

export type Category = {
  id: string;
  label: string;
  color: string;
  chip: boolean;
  aliases: string[];
  terms: string[];
  photos: string[];
};

export const CATEGORIES = taxonomyFile.categories as Category[];

const byId = new Map(CATEGORIES.map((category) => [category.id, category]));

export function categoryById(id: string) {
  return byId.get(id);
}

export function categoryLabel(id: string, amenity?: string) {
  if (id === "other") {
    if (amenity === "fast_food") return "Quick service";
    if (amenity === "cafe") return "Cafe";
    return "Restaurant";
  }
  return byId.get(id)?.label ?? "Restaurant";
}

export const CHIPS = CATEGORIES.filter((category) => category.chip);

const AMENITY_LABEL: Record<string, string> = {
  restaurant: "Restaurant",
  fast_food: "Quick service",
  cafe: "Cafe",
  ice_cream: "Ice cream",
  food_court: "Food hall",
  bakery: "Bakery",
  pastry: "Pastry shop",
  deli: "Deli",
  confectionery: "Sweet shop",
};

export function amenityLabel(amenity: string) {
  return AMENITY_LABEL[amenity] ?? "Place to eat";
}

const CUISINE_LABEL: Record<string, string> = {
  "tex-mex": "Tex-Mex",
  tex_mex: "Tex-Mex",
  bbq: "BBQ",
  pho: "Pho",
  coffee_shop: "Coffee",
  steak_house: "Steakhouse",
  soul_food: "Soul food",
  ice_cream: "Ice cream",
  dim_sum: "Dim sum",
  bubble_tea: "Bubble tea",
  fried_chicken: "Fried chicken",
  middle_eastern: "Middle Eastern",
  latin_american: "Latin American",
  banh_mi: "Banh mi",
  hot_pot: "Hot pot",
  po_boy: "Po' boy",
  "po-boy": "Po' boy",
};

export function humanCuisine(raw: string) {
  if (CUISINE_LABEL[raw]) return CUISINE_LABEL[raw];
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
