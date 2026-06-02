/**
 * useRevenueCat — wraps react-native-purchases for iOS subscriptions.
 *
 * On web this is a no-op (subscriptions are iOS/Android only).
 * Call `purchase(productId)` to trigger the native payment sheet.
 * After a successful purchase the `plan` in Firestore is updated via
 * a Firebase Function (or directly from the RevenueCat webhook).
 */
import { useState, useEffect, useCallback } from "react";
import { Platform, Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { RC_API_KEY_IOS, PRODUCT_IDS } from "@/lib/purchases";

export type RCProduct = {
  productIdentifier: string;
  priceString: string;
  price: number;
  title: string;
  description: string;
};

export type RCState = {
  ready: boolean;
  products: Record<string, RCProduct>;
  purchasing: boolean;
  restoring: boolean;
  purchase: (productId: string) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
};

const NO_OP: RCState = {
  ready: false,
  products: {},
  purchasing: false,
  restoring: false,
  purchase: async () => false,
  restorePurchases: async () => {},
};

let Purchases: any = null;
if (Platform.OS !== "web") {
  Purchases = require("react-native-purchases").default;
}

export function useRevenueCat(): RCState {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Record<string, RCProduct>>({});
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!Purchases || !user) return;

    async function init() {
      try {
        Purchases.configure({ apiKey: RC_API_KEY_IOS, appUserID: user.uid });
        const offerings = await Purchases.getOfferings();
        const current = offerings.current;
        if (!current) return;

        const productMap: Record<string, RCProduct> = {};
        for (const pkg of current.availablePackages ?? []) {
          const p = pkg.product;
          productMap[p.productIdentifier] = {
            productIdentifier: p.productIdentifier,
            priceString: p.priceString,
            price: p.price,
            title: p.title,
            description: p.description,
          };
        }
        setProducts(productMap);
        setReady(true);
      } catch (err: any) {
        console.warn("RevenueCat init error:", err?.message ?? err);
        setReady(true); // still show UI, purchase will fail gracefully
      }
    }

    init();
  }, [user]);

  const purchase = useCallback(async (productId: string): Promise<boolean> => {
    if (!Purchases) return false;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchaseStoreProduct(
        products[productId] ?? { productIdentifier: productId }
      );
      // RevenueCat webhook → Firebase Function updates Firestore plan automatically.
      // usePlan() listener will pick up the change in real-time.
      console.log("Purchase success, entitlements:", Object.keys(customerInfo.entitlements.active));
      return true;
    } catch (err: any) {
      if (!err.userCancelled) {
        Alert.alert("Purchase failed", err.message ?? "Please try again.");
      }
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [products]);

  const restorePurchases = useCallback(async () => {
    if (!Purchases) return;
    setRestoring(true);
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      const active = Object.keys(customerInfo.entitlements.active);
      if (active.length > 0) {
        Alert.alert("Purchases Restored", `Active: ${active.join(", ")}`);
      } else {
        Alert.alert("Nothing to Restore", "No active subscriptions found for this Apple ID.");
      }
    } catch (err: any) {
      Alert.alert("Restore failed", err.message ?? "Please try again.");
    } finally {
      setRestoring(false);
    }
  }, []);

  if (Platform.OS === "web") return NO_OP;

  return { ready, products, purchasing, restoring, purchase, restorePurchases };
}
