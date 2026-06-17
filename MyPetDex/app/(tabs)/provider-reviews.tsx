import { isWeb } from "@/lib/platform";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { webDb } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4CAF82";

export default function ProviderReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      if (!isWeb) { setLoading(false); return; }
      try {
        const snap = await getDocs(query(collection(webDb, "reviews"), where("providerId", "==", user!.uid), where("published", "==", true)));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setReviews(list);
      } finally { setLoading(false); }
    }
    load();
  }, [user]);

  const avg = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : "—";

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Customer Reviews</Text>

      <View style={s.summaryCard}>
        <Text style={s.avgNum}>{avg}</Text>
        <View style={s.stars}>
          {[1,2,3,4,5].map(i => (
            <Ionicons key={i} name="star" size={20} color={parseFloat(avg) >= i ? "#F5C842" : "#E2E8F0"} />
          ))}
        </View>
        <Text style={s.reviewCount}>{reviews.length} published review{reviews.length !== 1 ? "s" : ""}</Text>
      </View>

      {reviews.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="star-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyText}>No reviews yet</Text>
          <Text style={s.emptySubtext}>Reviews from pet owners will appear here once approved</Text>
        </View>
      ) : (
        reviews.map(r => (
          <View key={r.id} style={s.card}>
            <View style={s.cardTop}>
              <View style={s.clientAvatar}>
                <Text style={s.clientInitial}>{(r.clientName || "?").charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.clientName}>{r.clientName || "Pet Owner"}</Text>
                <View style={s.starsSmall}>
                  {[1,2,3,4,5].map(i => (
                    <Ionicons key={i} name="star" size={13} color={(r.rating || 0) >= i ? "#F5C842" : "#E2E8F0"} />
                  ))}
                </View>
              </View>
              <Text style={s.date}>{r.createdAt?.toDate?.().toLocaleDateString() || ""}</Text>
            </View>
            <Text style={s.reviewText}>{r.text || r.comment || ""}</Text>
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
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 16 },
  summaryCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avgNum: { fontSize: 48, fontWeight: "900", color: "#1E293B" },
  stars: { flexDirection: "row", gap: 4, marginVertical: 6 },
  reviewCount: { fontSize: 13, color: "#64748B" },
  empty: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  emptySubtext: { fontSize: 14, color: "#CBD5E1", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  clientAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  clientInitial: { color: "#fff", fontWeight: "700", fontSize: 16 },
  clientName: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  starsSmall: { flexDirection: "row", gap: 2, marginTop: 2 },
  date: { fontSize: 12, color: "#94A3B8" },
  reviewText: { fontSize: 14, color: "#64748B", lineHeight: 20 },
});
