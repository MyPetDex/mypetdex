import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
// v2
import { useRouter } from "expo-router";
import { webDb } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4486F4";
const ADMIN_EMAIL = "mypetdexapp@gmail.com";

const PLAN_PRICES: Record<string, number> = { plus: 3.0, family: 5.0 };

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ owners: 0, providers: 0, shelters: 0, plusUsers: 0, familyUsers: 0 });
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (user.email !== ADMIN_EMAIL) { setLoading(false); return; }
    loadStats();
  }, [user]);

  async function loadStats() {
    try {
      const snap = await getDocs(collection(webDb, "users"));
      let owners = 0, providers = 0, shelters = 0, plusUsers = 0, familyUsers = 0;
      snap.forEach(d => {
        const data = d.data();
        if (data.role === "owner") owners++;
        else if (data.role === "provider") providers++;
        else if (data.role === "shelter") shelters++;
        if (data.plan === "plus") plusUsers++;
        if (data.plan === "family") familyUsers++;
      });
      setStats({ owners, providers, shelters, plusUsers, familyUsers });
    } finally { setLoading(false); }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  if (!isAdmin) return (
    <View style={s.center}>
      <Ionicons name="lock-closed-outline" size={48} color="#CBD5E1" />
      <Text style={s.noAccess}>Access Restricted</Text>
    </View>
  );

  const totalUsers = stats.owners + stats.providers + stats.shelters;
  const monthlyRevenue = stats.plusUsers * PLAN_PRICES.plus + stats.familyUsers * PLAN_PRICES.family;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Admin Dashboard</Text>
      <Text style={s.subtitle}>MyPetDex Overview</Text>

      {/* Revenue */}
      <View style={s.revenueCard}>
        <Text style={s.revenueLabel}>Est. Monthly Revenue</Text>
        <Text style={s.revenueNum}>${monthlyRevenue.toFixed(2)}</Text>
        <Text style={s.revenueBreakdown}>
          {stats.plusUsers} Plus × $3 + {stats.familyUsers} Family × $5
        </Text>
      </View>

      {/* User counts */}
      <Text style={s.sectionTitle}>Users ({totalUsers} total)</Text>
      <View style={s.statsGrid}>
        <StatCard label="Pet Owners" value={stats.owners} icon="paw-outline" color="#4486F4" />
        <StatCard label="Providers" value={stats.providers} icon="briefcase-outline" color="#3B82F6" />
        <StatCard label="Shelters" value={stats.shelters} icon="home-outline" color="#F5A623" />
        <StatCard label="Plus Plans" value={stats.plusUsers} icon="star-outline" color="#8B5CF6" />
        <StatCard label="Family Plans" value={stats.familyUsers} icon="people-outline" color="#EC4899" />
        <StatCard label="Free Plans" value={stats.owners - stats.plusUsers - stats.familyUsers} icon="gift-outline" color="#64748B" />
      </View>

      {/* Quick nav */}
      <Text style={s.sectionTitle}>Manage</Text>
      {[
        { icon: "people-outline", label: "Users & Accounts", sub: "Enable or disable provider/shelter accounts", tab: "admin-users" },
        { icon: "shield-checkmark-outline", label: "Pending Reviews", sub: "Approve or reject service provider reviews", tab: "admin-reviews" },
        { icon: "pricetag-outline", label: "Product Links", sub: "Add Amazon & Chewy product links", tab: "admin-products" },
      ].map(item => (
        <TouchableOpacity
          key={item.tab}
          style={s.navCard}
          onPress={() => router.push(`/(tabs)/${item.tab}`)}
          activeOpacity={0.7}
        >
          <View style={s.navIcon}>
            <Ionicons name={item.icon as any} size={22} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.navLabel}>{item.label}</Text>
            <Text style={s.navSub}>{item.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={s.statNum}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAccess: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  title: { fontSize: 24, fontWeight: "900", color: "#1E293B" },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 20 },
  revenueCard: { backgroundColor: "#1E293B", borderRadius: 18, padding: 24, marginBottom: 24, alignItems: "center" },
  revenueLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  revenueNum: { color: "#fff", fontSize: 42, fontWeight: "900" },
  revenueBreakdown: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 12, marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  statCard: { width: "30%", backgroundColor: "#fff", borderRadius: 12, padding: 14, borderLeftWidth: 3, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1, gap: 4 },
  statNum: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  statLabel: { fontSize: 11, color: "#64748B" },
  navCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  navIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(76,175,130,0.1)", alignItems: "center", justifyContent: "center" },
  navLabel: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  navSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
});
