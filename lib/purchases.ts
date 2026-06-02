/**
 * RevenueCat / In-App Purchase configuration
 *
 * Product IDs must match exactly what you create in:
 *   • App Store Connect → Your App → Subscriptions
 *   • RevenueCat Dashboard → Products
 *
 * Entitlement IDs are configured in RevenueCat Dashboard → Entitlements
 */

export const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "REVENUECAT_IOS_KEY_HERE";

/** App Store Connect subscription product IDs */
export const PRODUCT_IDS = {
  plus_monthly:   "mypetdex_plus_monthly",
  plus_yearly:    "mypetdex_plus_yearly",
  family_monthly: "mypetdex_family_monthly",
  family_yearly:  "mypetdex_family_yearly",
} as const;

/** RevenueCat entitlement identifiers */
export const ENTITLEMENTS = {
  plus:   "plus",
  family: "family",
} as const;

/** Monthly prices shown in UI (must match App Store Connect pricing) */
export const PRICES = {
  plus_monthly:   2.99,
  plus_yearly:    23.99,   // ~$2.00/mo  (33% off)
  family_monthly: 4.99,
  family_yearly:  39.99,   // ~$3.33/mo  (33% off)
} as const;
