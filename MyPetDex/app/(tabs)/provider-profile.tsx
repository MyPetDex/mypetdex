import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { isWeb, webDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const BRAND = "#4CAF82";

export default function ProviderProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      if (!isWeb) { setLoading(false); return; }
      const snap = await getDoc(doc(webDb, "users", user!.uid));
      if (snap.exists()) setProfile(snap.data());
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/sign-in");
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{(profile?.businessName || profile?.displayName || "P").charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={s.name}>{profile?.businessName || profile?.displayName || "Provider"}</Text>
      <Text style={s.email}>{profile?.email || ""}</Text>

      <View style={[s.badge, profile?.verified ? s.badgeGreen : s.badgeOrange]}>
        <Ionicons name={profile?.verified ? "checkmark-circle" : "time-outline"} size={14} color="#fff" />
        <Text style={s.badgeText}>{profile?.verified ? "Verified Provider" : "Pending Verification"}</Text>
      </View>

      <View style={s.card}>
        <Row icon="briefcase-outline" label="Service Type" value={profile?.serviceType} />
        <Row icon="location-outline" label="Location" value={profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : profile?.city || profile?.state} />
        <Row icon="call-outline" label="Phone" value={profile?.phone} />
        <Row icon="globe-outline" label="Website" value={profile?.website} />
        <Row icon="star-outline" label="Google Reviews" value={profile?.googleReviewUrl ? "Linked" : "Not linked"} />
        <Row icon="pricetag-outline" label="Price Range" value={profile?.priceRange} />
      </View>

      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as any} size={18} color="#64748B" />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 60, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  email: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 24 },
  badgeGreen: { backgroundColor: BRAND },
  badgeOrange: { backgroundColor: "#F5A623" },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 4, width: "100%", marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowLabel: { flex: 1, fontSize: 14, color: "#64748B" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1E293B", maxWidth: "50%", textAlign: "right" },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  signOutText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
});
