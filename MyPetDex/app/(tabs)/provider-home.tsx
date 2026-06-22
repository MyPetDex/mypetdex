import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { webDb } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4486F4";

export default function ProviderHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ bookings: 0, reviews: 0, rating: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]);

  async function loadData() {
    try {
      const snap = await getDoc(doc(webDb, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());

      const bookingsSnap = await getDocs(
        query(collection(webDb, "bookings"), where("providerId", "==", user.uid))
      );
      const reviewsSnap = await getDocs(
        query(collection(webDb, "reviews"), where("providerId", "==", user.uid), where("published", "==", true))
      );
      let totalRating = 0;
      reviewsSnap.forEach((d) => { totalRating += d.data().rating || 0; });
      const avgRating = reviewsSnap.size > 0 ? totalRating / reviewsSnap.size : 0;
      setStats({ bookings: bookingsSnap.size, reviews: reviewsSnap.size, rating: avgRating });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  const name = profile?.businessName || profile?.displayName || "Provider";
  const isVerified = profile?.verified === true;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{name}</Text>
          <View style={s.badgeRow}>
            <View style={[s.badge, isVerified ? s.badgeGreen : s.badgeOrange]}>
              <Ionicons name={isVerified ? "checkmark-circle" : "time-outline"} size={12} color="#fff" />
              <Text style={s.badgeText}>{isVerified ? "Verified" : "Pending Verification"}</Text>
            </View>
          </View>
        </View>
      </View>

      {!isVerified && (
        <View style={s.alert}>
          <Ionicons name="information-circle-outline" size={18} color="#F5A623" />
          <Text style={s.alertText}>
            Your account is under review. You can set up your services now — your public listing will go live once verified by our team.
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.bookings}</Text>
          <Text style={s.statLabel}>Bookings</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.reviews}</Text>
          <Text style={s.statLabel}>Reviews</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.rating > 0 ? stats.rating.toFixed(1) : "—"}</Text>
          <Text style={s.statLabel}>Avg Rating</Text>
        </View>
      </View>

      {/* Quick links */}
      <Text style={s.sectionTitle}>Quick Actions</Text>
      {[
        { icon: "briefcase-outline", label: "Manage Services", tab: "provider-services" },
        { icon: "calendar-outline", label: "View Bookings", tab: "provider-bookings" },
        { icon: "star-outline", label: "Customer Reviews", tab: "provider-reviews" },
        { icon: "person-outline", label: "Edit Profile", tab: "provider-profile" },
      ].map((item) => (
        <TouchableOpacity key={item.tab} style={s.actionRow}>
          <View style={s.actionIcon}>
            <Ionicons name={item.icon as any} size={20} color={BRAND} />
          </View>
          <Text style={s.actionLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      ))}

      {/* Pricing reminder */}
      <View style={s.pricingCard}>
        <Text style={s.pricingTitle}>💰 Your Pricing Plan</Text>
        <Text style={s.pricingText}>First 6 months completely FREE. After that, just 5% per completed booking. No monthly fees, ever.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 24, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  badgeRow: { flexDirection: "row", marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeGreen: { backgroundColor: BRAND },
  badgeOrange: { backgroundColor: "#F5A623" },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  alert: { flexDirection: "row", gap: 10, backgroundColor: "rgba(245,166,35,0.1)", borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: "rgba(245,166,35,0.3)" },
  alertText: { flex: 1, color: "#92400E", fontSize: 13, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statNum: { fontSize: 26, fontWeight: "800", color: "#1E293B" },
  statLabel: { fontSize: 12, color: "#64748B", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  actionIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(76,175,130,0.1)", alignItems: "center", justifyContent: "center" },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1E293B" },
  pricingCard: { backgroundColor: "rgba(76,175,130,0.08)", borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "rgba(76,175,130,0.2)" },
  pricingTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  pricingText: { fontSize: 13, color: "#64748B", lineHeight: 19 },
});
