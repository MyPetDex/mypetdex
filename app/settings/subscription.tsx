import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { usePlan } from "@/hooks/usePlan";
import { useRevenueCat } from "@/hooks/useRevenueCat";
import { useAuth } from "@/contexts/AuthContext";
import { PRICES, PRODUCT_IDS } from "@/lib/purchases";

const BRAND = "#4486F4";
const GOLD  = "#F59E0B";
const GREEN = "#22C55E";

// ─── Plan card data ───────────────────────────────────────────────────────────
type BillingCycle = "monthly" | "yearly";

interface PlanInfo {
  key: "free" | "plus" | "family";
  name: string;
  tagline: string;
  color: string;
  emoji: string;
  monthlyId: string | null;
  yearlyId: string | null;
  features: string[];
  maxPets: string;
}

const PLANS: PlanInfo[] = [
  {
    key: "free",
    name: "Free",
    tagline: "Perfect for getting started",
    color: "#6B7280",
    emoji: "🐾",
    monthlyId: null,
    yearlyId: null,
    features: ["1 pet profile", "Health records & vaccines", "Medication reminders", "Vet contact storage"],
    maxPets: "1 pet",
  },
  {
    key: "plus",
    name: "Plus",
    tagline: "For dedicated pet parents",
    color: BRAND,
    emoji: "⭐",
    monthlyId: PRODUCT_IDS.plus_monthly,
    yearlyId: PRODUCT_IDS.plus_yearly,
    features: ["Up to 3 pet profiles", "AI Health Assistant", "Smart recipe generator", "Priority support", "Everything in Free"],
    maxPets: "3 pets",
  },
  {
    key: "family",
    name: "Family",
    tagline: "For multi-pet households",
    color: GOLD,
    emoji: "👑",
    monthlyId: PRODUCT_IDS.family_monthly,
    yearlyId: PRODUCT_IDS.family_yearly,
    features: ["Unlimited pet profiles", "AI Health Assistant", "Smart recipe generator", "Family sharing (coming soon)", "Priority support", "Everything in Plus"],
    maxPets: "Unlimited pets",
  },
];

// ─── Price helpers ────────────────────────────────────────────────────────────
function displayPrice(plan: PlanInfo, cycle: BillingCycle, rcProducts: Record<string, any>): string {
  if (!plan.monthlyId) return "Free";
  const id = cycle === "monthly" ? plan.monthlyId : plan.yearlyId!;
  const rcProduct = rcProducts[id];
  if (rcProduct) return rcProduct.priceString + (cycle === "monthly" ? "/mo" : "/yr");
  // Fallback to hardcoded prices
  const price = cycle === "monthly"
    ? (plan.key === "plus" ? PRICES.plus_monthly : PRICES.family_monthly)
    : (plan.key === "plus" ? PRICES.plus_yearly  : PRICES.family_yearly);
  return `$${price.toFixed(2)}${cycle === "monthly" ? "/mo" : "/yr"}`;
}

function monthlyEquivalent(plan: PlanInfo, rcProducts: Record<string, any>): string {
  if (!plan.yearlyId) return "";
  const rcProduct = rcProducts[plan.yearlyId];
  const yearlyPrice = rcProduct?.price
    ?? (plan.key === "plus" ? PRICES.plus_yearly : PRICES.family_yearly);
  return `$${(yearlyPrice / 12).toFixed(2)}/mo`;
}

function savingsPercent(plan: PlanInfo): number {
  const monthly = plan.key === "plus" ? PRICES.plus_monthly : PRICES.family_monthly;
  const yearly  = plan.key === "plus" ? PRICES.plus_yearly  : PRICES.family_yearly;
  return Math.round((1 - yearly / (monthly * 12)) * 100);
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { isDemoMode } = useAuth();
  const { plan: currentPlan, loading: planLoading } = usePlan();
  const { products, purchasing, restoring, purchase, restorePurchases, ready } = useRevenueCat();
  const [billing, setBilling] = useState<BillingCycle>("yearly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  async function handleSubscribe(plan: PlanInfo) {
    if (isDemoMode) {
      Alert.alert("Demo Mode", "Create a free account to subscribe.");
      return;
    }
    if (!plan.monthlyId) return; // free tier

    const productId = billing === "monthly" ? plan.monthlyId : plan.yearlyId!;
    setSelectedPlan(productId);
    const ok = await purchase(productId);
    if (ok) {
      Alert.alert("Welcome to " + plan.name + "! 🎉", "Your subscription is now active.");
      router.back();
    }
    setSelectedPlan(null);
  }

  if (planLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BRAND} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Choose Your Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🐾</Text>
          <Text style={styles.heroTitle}>Upgrade MyPetDex</Text>
          <Text style={styles.heroSub}>Give your pets the care they deserve</Text>
        </View>

        {/* Billing toggle */}
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleBtn, billing === "monthly" && styles.toggleActive]}
            onPress={() => setBilling("monthly")}
          >
            <Text style={[styles.toggleText, billing === "monthly" && styles.toggleTextActive]}>Monthly</Text>
          </Pressable>
          <Pressable
            style={[styles.toggleBtn, billing === "yearly" && styles.toggleActive]}
            onPress={() => setBilling("yearly")}
          >
            <Text style={[styles.toggleText, billing === "yearly" && styles.toggleTextActive]}>Yearly</Text>
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save 33%</Text>
            </View>
          </Pressable>
        </View>

        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isCurrentPlan = plan.key === currentPlan;
          const isPopular = plan.key === "plus";
          const productId = billing === "monthly" ? plan.monthlyId : plan.yearlyId;
          const isBuying = purchasing && selectedPlan === productId;

          return (
            <View
              key={plan.key}
              style={[
                styles.card,
                isCurrentPlan && styles.cardCurrent,
                isPopular && styles.cardPopular,
              ]}
            >
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}
              {isCurrentPlan && (
                <View style={[styles.currentBadge, { backgroundColor: plan.color + "22" }]}>
                  <Text style={[styles.currentText, { color: plan.color }]}>✓ Your Current Plan</Text>
                </View>
              )}

              {/* Card header */}
              <View style={styles.cardHeader}>
                <View style={[styles.planIcon, { backgroundColor: plan.color + "18" }]}>
                  <Text style={styles.planEmoji}>{plan.emoji}</Text>
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>
                </View>
                <View style={styles.priceBlock}>
                  <Text style={[styles.priceMain, { color: plan.color }]}>
                    {displayPrice(plan, billing, products)}
                  </Text>
                  {billing === "yearly" && plan.monthlyId && (
                    <Text style={styles.priceEq}>{monthlyEquivalent(plan, products)} equiv.</Text>
                  )}
                </View>
              </View>

              {/* Yearly savings note */}
              {billing === "yearly" && plan.monthlyId && (
                <View style={[styles.savingsRow, { backgroundColor: GREEN + "15" }]}>
                  <Text style={[styles.savingsRowText, { color: GREEN }]}>
                    🎉 You save {savingsPercent(plan)}% vs monthly — {displayPrice(plan, "yearly", products)} billed once a year
                  </Text>
                </View>
              )}

              {/* Features */}
              <View style={styles.features}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={[styles.featureCheck, { color: plan.color }]}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              {isCurrentPlan ? (
                <View style={[styles.ctaBtn, { backgroundColor: plan.color + "22" }]}>
                  <Text style={[styles.ctaBtnText, { color: plan.color }]}>Active Plan</Text>
                </View>
              ) : plan.key === "free" ? (
                currentPlan !== "free" ? null : (
                  <View style={[styles.ctaBtn, { backgroundColor: "#F3F4F6" }]}>
                    <Text style={[styles.ctaBtnText, { color: "#9CA3AF" }]}>Your current plan</Text>
                  </View>
                )
              ) : (
                <Pressable
                  style={[styles.ctaBtn, { backgroundColor: plan.color }, (purchasing || restoring) && { opacity: 0.7 }]}
                  onPress={() => handleSubscribe(plan)}
                  disabled={purchasing || restoring}
                >
                  {isBuying
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[styles.ctaBtnText, { color: "#fff" }]}>
                        {Platform.OS === "web" ? "Subscribe" : `Subscribe with Apple`}
                      </Text>
                  }
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Comparison table */}
        <View style={styles.compareSection}>
          <Text style={styles.compareTitle}>Compare Plans</Text>
          <View style={styles.compareTable}>
            <CompareRow label="Pet profiles"   free="1"   plus="3"  family="∞"  />
            <CompareRow label="Health records" free="✓"   plus="✓"  family="✓"  />
            <CompareRow label="Reminders"      free="✓"   plus="✓"  family="✓"  />
            <CompareRow label="AI Assistant"   free="✗"   plus="✓"  family="✓"  highlight />
            <CompareRow label="Recipe AI"      free="✗"   plus="✓"  family="✓"  highlight />
            <CompareRow label="Family sharing" free="✗"   plus="✗"  family="Soon" />
          </View>
        </View>

        {/* Restore + footer */}
        <Pressable
          style={styles.restoreBtn}
          onPress={restorePurchases}
          disabled={restoring || purchasing}
        >
          {restoring
            ? <ActivityIndicator color={BRAND} size="small" />
            : <Text style={styles.restoreText}>Restore Purchases</Text>
          }
        </Pressable>

        <Text style={styles.legalText}>
          Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.
          Manage or cancel anytime in your iPhone Settings → Apple ID → Subscriptions.
          {"\n\n"}
          By subscribing you agree to our{" "}
          <Text style={styles.legalLink}>Terms of Service</Text>
          {" "}and{" "}
          <Text style={styles.legalLink}>Privacy Policy</Text>.
        </Text>
      </ScrollView>
    </View>
  );
}

// ─── Compare row component ────────────────────────────────────────────────────
function CompareRow({
  label, free, plus, family, highlight,
}: {
  label: string; free: string; plus: string; family: string; highlight?: boolean;
}) {
  return (
    <View style={[styles.compareRow, highlight && styles.compareRowHighlight]}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={[styles.compareCell, free === "✗" && styles.compareCellNo]}>{free}</Text>
      <Text style={[styles.compareCell, plus  === "✗" && styles.compareCellNo, plus !== "✗" && plus !== "✓" && { color: BRAND }]}>{plus}</Text>
      <Text style={[styles.compareCell, family === "✗" && styles.compareCellNo, family !== "✗" && family !== "✓" && { color: GOLD }]}>{family}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: "#F8FAFF" },
  center:       { flex: 1, alignItems: "center", justifyContent: "center" },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#fff", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#E5E7EB" },
  backBtn:      { width: 40, alignItems: "flex-start" },
  backArrow:    { fontSize: 28, color: BRAND, fontWeight: "300" },
  headerTitle:  { fontSize: 17, fontWeight: "700", color: "#1F2937" },

  scroll:        { flex: 1 },
  scrollContent: { padding: 20, gap: 16 },

  hero:       { alignItems: "center", paddingVertical: 12 },
  heroEmoji:  { fontSize: 40, marginBottom: 8 },
  heroTitle:  { fontSize: 24, fontWeight: "800", color: "#1F2937" },
  heroSub:    { fontSize: 14, color: "#6B7280", marginTop: 4 },

  toggleRow:        { flexDirection: "row", backgroundColor: "#E5E7EB", borderRadius: 12, padding: 4 },
  toggleBtn:        { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 9, flexDirection: "row", justifyContent: "center", gap: 6 },
  toggleActive:     { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  toggleText:       { fontSize: 14, fontWeight: "600", color: "#6B7280" },
  toggleTextActive: { color: "#1F2937" },
  savingsBadge:     { backgroundColor: GREEN, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  savingsText:      { fontSize: 10, fontWeight: "700", color: "#fff" },

  card:            { backgroundColor: "#fff", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3, overflow: "hidden" },
  cardCurrent:     { borderWidth: 2, borderColor: BRAND },
  cardPopular:     { borderWidth: 2, borderColor: BRAND + "44" },

  popularBadge:    { backgroundColor: BRAND, alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 12 },
  popularText:     { fontSize: 10, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  currentBadge:    { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 12 },
  currentText:     { fontSize: 12, fontWeight: "700" },

  cardHeader:      { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  planIcon:        { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  planEmoji:       { fontSize: 24 },
  cardHeaderText:  { flex: 1 },
  planName:        { fontSize: 18, fontWeight: "800" },
  planTagline:     { fontSize: 12, color: "#6B7280", marginTop: 2 },
  priceBlock:      { alignItems: "flex-end" },
  priceMain:       { fontSize: 20, fontWeight: "800" },
  priceEq:         { fontSize: 11, color: "#9CA3AF", marginTop: 2 },

  savingsRow:      { borderRadius: 8, padding: 8, marginBottom: 12 },
  savingsRowText:  { fontSize: 12, fontWeight: "600" },

  features:        { gap: 8, marginBottom: 16 },
  featureRow:      { flexDirection: "row", alignItems: "center", gap: 8 },
  featureCheck:    { fontSize: 13, fontWeight: "700", width: 16 },
  featureText:     { fontSize: 13, color: "#374151", flex: 1 },

  ctaBtn:          { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  ctaBtnText:      { fontSize: 15, fontWeight: "700" },

  compareSection:  { backgroundColor: "#fff", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  compareTitle:    { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 14 },
  compareTable:    { gap: 0 },
  compareRow:      { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F3F4F6" },
  compareRowHighlight: { backgroundColor: "#F8FAFF", borderRadius: 8, paddingHorizontal: 4 },
  compareLabel:    { flex: 2, fontSize: 13, color: "#374151" },
  compareCell:     { flex: 1, textAlign: "center", fontSize: 13, fontWeight: "600", color: GREEN },
  compareCellNo:   { color: "#D1D5DB" },

  restoreBtn:      { alignItems: "center", paddingVertical: 14 },
  restoreText:     { fontSize: 14, color: BRAND, fontWeight: "600" },

  legalText:       { fontSize: 11, color: "#9CA3AF", textAlign: "center", lineHeight: 16 },
  legalLink:       { color: BRAND },
});
