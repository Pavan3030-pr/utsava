/** Shared (client + server): maps the AI's free-text vendor category to OpenStreetMap tag filters. */
export type PlaceCategoryKey =
  | "venue" | "catering" | "photography" | "decor" | "beauty" | "jewellery"
  | "attire" | "stay" | "sweets" | "worship" | "print";

export const PLACE_CATEGORIES: Record<PlaceCategoryKey, { label: string; filters: [string, string][] }> = {
  venue: { label: "Venues & banquet halls", filters: [["amenity", "events_venue"], ["amenity", "community_centre"], ["amenity", "banquet_hall"]] },
  catering: { label: "Caterers", filters: [["craft", "caterer"], ["shop", "catering"]] },
  photography: { label: "Photographers", filters: [["craft", "photographer"], ["shop", "photo"]] },
  decor: { label: "Florists & decorators", filters: [["shop", "florist"], ["shop", "party"], ["craft", "decorator"]] },
  beauty: { label: "Salons & makeup", filters: [["shop", "beauty"], ["shop", "hairdresser"]] },
  jewellery: { label: "Jewellers", filters: [["shop", "jewelry"]] },
  attire: { label: "Boutiques & clothing", filters: [["shop", "boutique"], ["shop", "clothes"], ["shop", "fabric"]] },
  stay: { label: "Hotels & guest stays", filters: [["tourism", "hotel"], ["tourism", "guest_house"]] },
  sweets: { label: "Sweets & bakeries", filters: [["shop", "confectionery"], ["shop", "pastry"], ["shop", "bakery"]] },
  worship: { label: "Temples & places of worship", filters: [["amenity", "place_of_worship"]] },
  print: { label: "Printing & invitations", filters: [["shop", "copyshop"], ["craft", "printer"], ["shop", "stationery"]] },
};

const RULES: [RegExp, PlaceCategoryKey][] = [
  [/photo|video|cinema|film|album/i, "photography"],
  [/cater|food|menu|cuisine|chef|meal|buffet/i, "catering"],
  [/venue|hall|banquet|resort|lawn|farmhouse|location/i, "venue"],
  [/decor|flower|floral|mandap|stage|lighting|balloon|theme/i, "decor"],
  [/makeup|make-up|beauty|salon|mehendi|mehndi|henna|hair/i, "beauty"],
  [/jewel|gold|ornament/i, "jewellery"],
  [/cloth|attire|outfit|saree|sari|lehenga|boutique|wardrobe|costume/i, "attire"],
  [/hotel|stay|accommodation|lodging|guest house|rooms/i, "stay"],
  [/sweet|bakery|cake|dessert|mithai/i, "sweets"],
  [/temple|priest|pandit|puja|pooja|ritual|purohit/i, "worship"],
  [/invit|print|card|stationery|signage/i, "print"],
];

/** Returns null for categories OpenStreetMap can't answer well (DJ, transport, …). */
export function categoryKey(category: string | undefined): PlaceCategoryKey | null {
  const c = (category ?? "").trim();
  if (!c) return null;
  for (const [re, key] of RULES) if (re.test(c)) return key;
  return null;
}

export interface PlaceResult {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  lat: number;
  lon: number;
  distanceKm: number;
  mapsUrl: string;
  osmUrl: string;
}
export interface PlacesResponse {
  place: { name: string; lat: number; lon: number };
  category: PlaceCategoryKey;
  label: string;
  results: PlaceResult[];
  attribution: string;
}
