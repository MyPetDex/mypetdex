import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { webDb, webAuth } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { signOut, setPersistence, inMemoryPersistence } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4CAF82";
const ADMIN_EMAIL = "mypetdexapp@gmail.com";
const PLAN_PRICES: Record<string, number> = { plus: 3.0, family: 5.0 };

async function doSignOut() {
  try { await setPersistence(webAuth, inMemoryPersistence); } catch {}
  try { await signOut(webAuth); } catch {}
  try { localStorage.clear(); } catch {}
  try { sessionStorage.clear(); } catch {}
  const dbNames = ["firebaseLocalStorageDb", "firebase-heartbeat-database", "firebase-installations-database"];
  await Promise.allSettled(dbNames.map(name => new Promise<void>(resolve => {
    const req = indexedDB.deleteDatabase(name);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  })));
  window.location.href = "/";
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ owners: 0, providers: 0, shelters: 0, plusUsers: 0, familyUsers: 0 });
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (user.email !== ADMIN_EMAIL) { setLoading(false); return; }
    getDocs(collection(webDb, "users")).then(snap => {
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
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  if (!isAdmin) return (
    <View style={s.center}>
      <Ionicons name="lock-closed-outline" size={48} color="#CBD5E1" />
      <Text style={s.noAccess}>Access Restricted</Text>
    </View>
  );

  const totalUsers = stats.owners + stats.providers + stats.shelters;
  const monthlyRevenue = stats.plusUsers * PLAN_PRICES.plus + stats.familyUsers * PLAN_PRICES.family;

  const manageItems = [
    { icon: "people-outline", label: "Users & Accounts", sub: "Enable or disable provider/shelter accounts", href: "/admin-users" },
    { icon: "shield-checkmark-outline", label: "Pending Reviews", sub: "Approve or reject service provider reviews", href: "/admin-reviews" },
    { icon: "pricetag-outline", label: "Product Links", sub: "Add Amazon & Chewy product links", href: "/admin-products" },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>

      {/* Sign out button — top of page, always visible */}
      <button
        onClick={doSignOut}
        style={{ display: "flex", alignItems: "center", gap: 8, background: "#EF4444", border: "none",
          borderRadius: 10, padding: "10px 18px", cursor: "pointer", marginBottom: 20, alignSelf: "flex-start" } as any}
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>Sign Out</span>
      </button>

      <Text style={s.title}>Admin Dashboard</Text>
      <Text style={[s.subtitle, { marginBottom: 20 }]}>MyPetDex Overview</Text>

      {/* Revenue */}
      <View style={s.revenueCard}>
        <Text style={s.revenueLabel}>Est. Monthly Revenue</Text>
        <Text style={s.revenueNum}>${monthlyRevenue.toFixed(2)}</Text>
        <Text style={s.revenueBreakdown}>{stats.plusUsers} Plus × $3 + {stats.familyUsers} Family × $5</Text>
      </View>

      {/* User counts */}
      <Text style={s.sectionTitle}>Users ({totalUsers} total)</Text>
      <View style={s.statsGrid}>
        <StatCard label="Pet Owners" value={stats.owners} icon="paw-outline" color="#4CAF82" />
        <StatCard label="Providers" value={stats.providers} icon="briefcase-outline" color="#3B82F6" />
        <StatCard label="Shelters" value={stats.shelters} icon="home-outline" color="#F5A623" />
        <StatCard label="Plus Plans" value={stats.plusUsers} icon="star-outline" color="#8B5CF6" />
        <StatCard label="Family Plans" value={stats.familyUsers} icon="people-outline" color="#EC4899" />
        <StatCard label="Free Plans" value={stats.owners - stats.plusUsers - stats.familyUsers} icon="gift-outline" color="#64748B" />
      </View>

      {/* Manage nav — plain <a> tags, always work in Safari */}
      <Text style={s.sectionTitle}>Manage</Text>
      {manageItems.map(item => (
        <a key={item.href} href={item.href} style={{ textDecoration: "none" } as any}>
          <View style={s.navCard}>
            <View style={s.navIcon}>
              <Ionicons name={item.icon as any} size={22} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.navLabel}>{item.label}</Text>
              <Text style={s.navSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </View>
        </a>
      ))}

      {/* Sign out — also at bottom for convenience */}
      <button
        onClick={doSignOut}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 14, padding: "16px",
          cursor: "pointer", width: "100%", marginTop: 16 } as any}
      >
        <span style={{ color: "#EF4444", fontWeight: 700, fontSize: 15 }}>Sign Out</span>
      </button>

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
  content: { padding: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  noAccess: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  title: { fontSize: 24, fontWeight: "900", color: "#1E293B" },
  subtitle: { fontSize: 14, color: "#64748B", marginTop: 2 },
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
