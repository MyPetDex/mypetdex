import { View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import Purchases, { PurchasesPackage, PurchasesOffering } from "react-native-purchases";

const BRAND = "#4486F4";
const BG = "#F4F6FB";
const TEXT = "#0F172A";
const TEXT2 = "#64748B";

export default function SubscriptionScreen() {
  const { user } = useAuth();
  const { plan } = usePlan();
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [offering, setOffering] = useState<PurchasesOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    Purchases.getOfferings()
      .then(o => setOffering(o.current))
      .catch(e => console.error("Offerings error:", e))
      .finally(() => setLoading(false));
  }, []);

  function getPackage(id: string): PurchasesPackage | null {
    return offering?.availablePackages.find(p => p.identifier === id) ?? null;
  }

  function getPrice(id: string): string {
    return getPackage(id)?.product.priceString ?? "—";
  }

  function hasFreeTrial(id: string): boolean {
    return !!(getPackage(id)?.product.introPrice);
  }

  async function handlePurchase(packageId: string) {
    const pkg = getPackage(packageId);
    if (!pkg || !user) return;
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      let newPlan = "free";
      if (customerInfo.entitlements.active["family"]) newPlan = "family";
      else if (customerInfo.entitlements.active["plus"]) newPlan = "plus";
      await setDoc(doc(db, "users", user.uid), { plan: newPlan }, { merge: true });
      Alert.alert(
        `Welcome to MyPetDex ${newPlan === "family" ? "Family" : "Plus"}! 🎉`,
        "Your subscription is now active.",
        [{ text: "Let's go!", onPress: () => router.back() }]
      );
    } catch (e: any) {
      if (!e.userCancelled) Alert.alert("Purchase Failed", e.message || "Please try again.");
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (!user) return;
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      let newPlan = "free";
      if (customerInfo.entitlements.active["family"]) newPlan = "family";
      else if (customerInfo.entitlements.active["plus"]) newPlan = "plus";
      await setDoc(doc(db, "users", user.uid), { plan: newPlan }, { merge: true });
      Alert.alert(
        newPlan !== "free" ? "Restored!" : "No Active Subscription",
        newPlan !== "free" ? `Your ${newPlan} plan has been restored.` : "No previous subscription found on this Apple ID."
      );
    } catch (e: any) {
      Alert.alert("Restore Failed", e.message || "Please try again.");
    } finally {
      setRestoring(false);
    }
  }

  const plusId = billing === "monthly" ? "$rc_monthly" : "$rc_annual";
  const familyId = billing === "monthly" ? "family_monthly" : "family_yearly";

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Unlock MyPetDex</Text>
        <Text style={styles.headerSub}>Start your 1-month free trial — cancel anytime.</Text>
      </View>

      <View style={styles.toggleRow}>
        {(["monthly", "yearly"] as const).map(b => (
          <Pressable key={b} style={[styles.toggleBtn, billing === b && styles.toggleBtnActive]} onPress={() => setBilling(b)}>
            <Text style={[styles.toggleText, billing === b && styles.toggleTextActive]}>
              {b.charAt(0).toUpperCase() + b.slice(1)}
            </Text>
            {b === "yearly" && <View style={styles.saveBadge}><Text style={styles.saveBadgeText}>Save ~20%</Text></View>}
          </Pressable>
        ))}
      </View>

      {/* Plus Plan */}
      <View style={[styles.planCard, plan === "plus" && styles.planCardCurrent]}>
        <View style={styles.trialBadge}><Text style={styles.trialBadgeText}>🎁 1 Month Free Trial</Text></View>
        <View style={styles.planRow}>
          <Text style={styles.planName}>Plus</Text>
          <View>
            <Text style={styles.planPrice}>{getPrice(plusId)}</Text>
            <Text style={styles.planPeriod}>per {billing === "monthly" ? "month" : "year"}</Text>
          </View>
        </View>
        {["Up to 3 pets", "AI pet assistant", "Personalized recipes", "Shopping deals"].map(f => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        {plan === "plus" ? (
          <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>✓ Current Plan</Text></View>
        ) : (
          <Pressable style={[styles.planBtn, (purchasing || plan === "family") && styles.disabled]} onPress={() => handlePurchase(plusId)} disabled={purchasing || plan === "family"}>
            <Text style={styles.planBtnText}>{purchasing ? "Processing…" : "Start Free Trial"}</Text>
          </Pressable>
        )}
      </View>

      {/* Family Plan */}
      <View style={[styles.planCard, styles.planCardFamily, plan === "family" && styles.planCardCurrent]}>
        <View style={styles.bestValueBadge}><Text style={styles.bestValueText}>⭐ Best Value</Text></View>
        <View style={styles.trialBadge}><Text style={styles.trialBadgeText}>🎁 1 Month Free Trial</Text></View>
        <View style={styles.planRow}>
          <Text style={styles.planName}>Family</Text>
          <View>
            <Text style={styles.planPrice}>{getPrice(familyId)}</Text>
            <Text style={styles.planPeriod}>per {billing === "monthly" ? "month" : "year"}</Text>
          </View>
        </View>
        {["Unlimited pets", "AI pet assistant", "Personalized recipes", "Shopping deals"].map(f => (
          <View key={f} style={styles.featureRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.featureText}>{f}</Text>
          </View>
        ))}
        {plan === "family" ? (
          <View style={styles.currentBadge}><Text style={styles.currentBadgeText}>✓ Current Plan</Text></View>
        ) : (
          <Pressable style={[styles.planBtn, purchasing && styles.disabled]} onPress={() => handlePurchase(familyId)} disabled={purchasing}>
            <Text style={styles.planBtnText}>{purchasing ? "Processing…" : "Start Free Trial"}</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.freeNote}>Free plan: 1 pet, reminders & services — always free.</Text>
      <Pressable onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
        <Text style={styles.restoreText}>{restoring ? "Restoring…" : "Restore Purchases"}</Text>
      </Pressable>
      <Text style={styles.legal}>
        Payment charged to your Apple ID at confirmation. Subscription renews automatically unless cancelled at least 24 hours before the end of the current period. Manage in Settings → Apple ID → Subscriptions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48, gap: 16 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG },
  header: { alignItems: "center", paddingVertical: 8 },
  headerTitle: { fontSize: 26, fontWeight: "800", color: TEXT, textAlign: "center" },
  headerSub: { fontSize: 14, color: TEXT2, textAlign: "center", marginTop: 6, lineHeight: 20 },
  toggleRow: { flexDirection: "row", backgroundColor: "#E8ECF8", borderRadius: 14, padding: 4, gap: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  toggleBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: "600", color: TEXT2 },
  toggleTextActive: { color: TEXT },
  saveBadge: { backgroundColor: "#D1FAE5", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saveBadgeText: { fontSize: 10, fontWeight: "700", color: "#065F46" },
  planCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2, borderWidth: 2, borderColor: "transparent" },
  planCardFamily: { borderColor: BRAND + "40" },
  planCardCurrent: { borderColor: BRAND },
  trialBadge: { backgroundColor: "#EEF2FF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  trialBadgeText: { fontSize: 12, fontWeight: "700", color: BRAND },
  bestValueBadge: { backgroundColor: "#FEF3C7", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  bestValueText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  planRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontSize: 22, fontWeight: "800", color: TEXT },
  planPrice: { fontSize: 20, fontWeight: "800", color: BRAND, textAlign: "right" },
  planPeriod: { fontSize: 12, color: TEXT2, textAlign: "right" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  check: { fontSize: 14, color: BRAND, fontWeight: "700" },
  featureText: { fontSize: 14, color: TEXT },
  planBtn: { backgroundColor: BRAND, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  disabled: { opacity: 0.5 },
  planBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  currentBadge: { backgroundColor: "#D1FAE5", borderRadius: 14, padding: 14, alignItems: "center", marginTop: 4 },
  currentBadgeText: { fontSize: 15, fontWeight: "700", color: "#065F46" },
  freeNote: { fontSize: 13, color: TEXT2, textAlign: "center" },
  restoreBtn: { alignItems: "center", padding: 12 },
  restoreText: { fontSize: 14, color: BRAND, fontWeight: "600" },
  legal: { fontSize: 11, color: "#94A3B8", textAlign: "center", lineHeight: 16 },
});
