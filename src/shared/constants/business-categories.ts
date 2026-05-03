export const businessCategoryOptions = [
  "clothing_footwear",
  "restaurant_fast_food",
  "beauty",
  "corner_store",
  "minimarket",
  "electronics_it",
  "industry_manufacturing",
  "pharmacy_drugstore",
  "pet_store_vet",
  "hardware_construction",
  "stationery_books",
  "liquor_store",
  "hotels_tourism",
  "coffee_shop",
  "bar",
  "transport_logistics",
  "home_goods",
  "bakery_pastry",
  "auto_repair_workshop",
  "marketing_advertising",
  "sporting_goods",
  "gym",
  "tattoos_piercings",
  "repairs_maintenance",
  "educational_services",
  "event_planning",
  "beauty_health",
  "barbershop_beauty_salon",
  "lending_financing",
  "natural_store_supplements",
  "entertainment_leisure",
  "auto_sales",
  "auto_parts_accessories",
  "agricultural_supplies",
  "butcher_shop",
  "deli_charcuterie",
  "wholesale_distributor",
  "accessories_jewelry",
  "gift_store",
] as const;

export type BusinessCategoryOption = (typeof businessCategoryOptions)[number];
export type BusinessNavigationPreset = "generic" | "restaurant" | "retail";
export const legacyBusinessCategoryFallback: BusinessCategoryOption = "corner_store";

const businessCategoryOptionSet = new Set<string>(businessCategoryOptions);

const restaurantCategorySet = new Set<BusinessCategoryOption>([
  "restaurant_fast_food",
  "coffee_shop",
  "bar",
  "bakery_pastry",
  "hotels_tourism",
]);

const retailCategorySet = new Set<BusinessCategoryOption>([
  "corner_store",
  "minimarket",
  "clothing_footwear",
  "beauty",
  "electronics_it",
  "pharmacy_drugstore",
  "hardware_construction",
  "stationery_books",
  "liquor_store",
  "home_goods",
  "butcher_shop",
  "deli_charcuterie",
  "wholesale_distributor",
  "accessories_jewelry",
  "gift_store",
  "natural_store_supplements",
  "sporting_goods",
  "auto_parts_accessories",
  "agricultural_supplies",
]);

export function isBusinessCategoryOption(
  value: string | null | undefined,
): value is BusinessCategoryOption {
  return value !== null && value !== undefined && businessCategoryOptionSet.has(value);
}

export function getBusinessNavigationPreset(
  businessCategory: string | null | undefined,
): BusinessNavigationPreset {
  const resolvedBusinessCategory =
    businessCategory === null || businessCategory === undefined
      ? legacyBusinessCategoryFallback
      : businessCategory;

  if (
    isBusinessCategoryOption(resolvedBusinessCategory) &&
    restaurantCategorySet.has(resolvedBusinessCategory)
  ) {
    return "restaurant";
  }

  if (
    isBusinessCategoryOption(resolvedBusinessCategory) &&
    retailCategorySet.has(resolvedBusinessCategory)
  ) {
    return "retail";
  }

  return "generic";
}
