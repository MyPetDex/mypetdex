import { useEffect, useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { isWeb, webDb } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect, router } from "expo-router";

const BRAND = "#4CAF82";

export default function ShelterHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, available: 0, adopted: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !isWeb) { setLoading(false); return; }
    try {
      const snap = await getDoc(doc(webDb, "users", user.uid));
      if (snap.exists()) setProfile(snap.data());
      const petsSnap = await getDocs(query(collection(webDb, "shelter_pets"), where("shelterId", "==", user.uid)));
      let available = 0, adopted = 0;
      petsSnap.forEach(d => {
        if (d.data().status === "adopted") adopted++;
        else available++;
      });
      setStats({ total: petsSnap.size, available, adopted });
    } finally { setLoading(false); }
  }, [user]);

  // Reload every time this tab comes into focus (e.g. after adding a pet)
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  const name = profile?.shelterName || profile?.displayName || "Shelter";
  const isVerified = profile?.verified === true;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <View style={s.avatar}>
          <Ionicons name="heart-outline" size={28} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{name}</Text>
          <View style={[s.badge, isVerified ? s.badgeGreen : s.badgeOrange]}>
            <Ionicons name={isVerified ? "checkmark-circle" : "time-outline"} size={12} color="#fff" />
            <Text style={s.badgeText}>{isVerified ? "Verified Shelter" : "Pending Verification"}</Text>
          </View>
        </View>
      </View>

      {!isVerified && (
        <View style={s.alert}>
          <Ionicons name="information-circle-outline" size={18} color="#F5A623" />
          <Text style={s.alertText}>Your account is under review. You can add pets and manage your shelter now — your public listing will go live once verified by our team.</Text>
        </View>
      )}

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.total}</Text>
          <Text style={s.statLabel}>Total Pets</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.available}</Text>
          <Text style={s.statLabel}>Available</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNum}>{stats.adopted}</Text>
          <Text style={s.statLabel}>Adopted</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Quick Actions</Text>
      {[
        { icon: "add-circle-outline", label: "Add New Pet", tab: "shelter-add-pet" },
        { icon: "paw-outline", label: "Manage Pets", tab: "shelter-pets" },
        { icon: "business-outline", label: "Shelter Profile", tab: "shelter-profile" },
      ].map(item => (
        <TouchableOpacity key={item.tab} style={s.actionRow} onPress={() => router.push(`/(tabs)/${item.tab}` as any)}>
          <View style={s.actionIcon}>
            <Ionicons name={item.icon as any} size={20} color={BRAND} />
          </View>
          <Text style={s.actionLabel}>{item.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      ))}

      <View style={s.freeCard}>
        <Text style={s.freeTitle}>✅ Always Free</Text>
        <Text style={s.freeText}>Shelter access on MyPetDex is 100% free, forever. No hidden fees.</Text>
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
  name: { fontSize: 20, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start" },
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
  freeCard: { backgroundColor: "rgba(76,175,130,0.08)", borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: "rgba(76,175,130,0.2)" },
  freeTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  freeText: { fontSize: 13, color: "#64748B", lineHeight: 19 },
});
