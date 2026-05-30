import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { isWeb, webDb } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4CAF82";
const ADMIN_EMAIL = "mypetdexapp@gmail.com";

export default function AdminReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (user.email !== ADMIN_EMAIL) { setLoading(false); return; }
    loadReviews();
  }, [user]);

  async function loadReviews() {
    try {
      const snap = await getDocs(query(collection(webDb, "reviews"), where("published", "==", false)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReviews(list);
    } finally { setLoading(false); }
  }

  async function approve(id: string) {
    await updateDoc(doc(webDb, "reviews", id), { published: true });
    setReviews(r => r.filter(x => x.id !== id));
  }

  async function reject(id: string) {
    await deleteDoc(doc(webDb, "reviews", id));
    setReviews(r => r.filter(x => x.id !== id));
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  if (!isAdmin) return <View style={s.center}><Text style={s.noAccess}>Access Restricted</Text></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Pending Reviews</Text>
      <Text style={s.subtitle}>Reviews waiting for approval before going live</Text>

      {reviews.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyText}>All clear!</Text>
          <Text style={s.emptySubtext}>No reviews pending approval</Text>
        </View>
      ) : (
        reviews.map(r => (
          <View key={r.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{(r.clientName || "?").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.clientName}>{r.clientName || "Pet Owner"}</Text>
                <Text style={s.providerName}>For: {r.providerName || r.providerId}</Text>
              </View>
              <View style={s.stars}>
                {[1,2,3,4,5].map(i => (
                  <Ionicons key={i} name="star" size={13} color={(r.rating || 0) >= i ? "#F5C842" : "#E2E8F0"} />
                ))}
              </View>
            </View>

            <Text style={s.reviewText}>{r.text || r.comment || "(No text)"}</Text>

            <View style={s.actions}>
              <TouchableOpacity style={s.approveBtn} onPress={() => approve(r.id)}>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <Text style={s.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.rejectBtn} onPress={() => reject(r.id)}>
                <Ionicons name="close" size={16} color="#EF4444" />
                <Text style={s.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  noAccess: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  subtitle: { fontSize: 13, color: "#64748B", marginBottom: 20, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  emptySubtext: { fontSize: 14, color: "#CBD5E1" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700" },
  clientName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  providerName: { fontSize: 12, color: "#64748B", marginTop: 1 },
  stars: { flexDirection: "row", gap: 2 },
  reviewText: { fontSize: 14, color: "#475569", lineHeight: 20, marginBottom: 14 },
  actions: { flexDirection: "row", gap: 10 },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: BRAND, borderRadius: 10, padding: 10 },
  approveBtnText: { color: "#fff", fontWeight: "700" },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10 },
  rejectBtnText: { color: "#EF4444", fontWeight: "700" },
});
