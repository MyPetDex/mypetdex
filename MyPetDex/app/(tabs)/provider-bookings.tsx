import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import { isWeb, webAuth, webDb } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, updateDoc, doc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const BRAND = "#4CAF82";
const STATUS_COLORS: Record<string, string> = {
  pending: "#F5A623", confirmed: "#4CAF82", completed: "#3B82F6", cancelled: "#EF4444",
};

export default function ProviderBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => { loadBookings(); }, []);

  async function loadBookings() {
    const user = webAuth.currentUser;
    if (!user || !isWeb) return;
    try {
      const snap = await getDocs(query(collection(webDb, "bookings"), where("providerId", "==", user.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setBookings(list);
    } finally { setLoading(false); }
  }

  async function updateStatus(id: string, status: string) {
    await updateDoc(doc(webDb, "bookings", id), { status });
    setBookings(b => b.map(x => x.id === id ? { ...x, status } : x));
  }

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Bookings</Text>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {["all", "pending", "confirmed", "completed", "cancelled"].map(f => (
          <TouchableOpacity key={f} style={[s.filterChip, filter === f && s.filterActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyText}>No bookings yet</Text>
          <Text style={s.emptySubtext}>Bookings from pet owners will appear here</Text>
        </View>
      ) : (
        filtered.map((b) => (
          <View key={b.id} style={s.card}>
            <View style={s.cardHeader}>
              <View>
                <Text style={s.clientName}>{b.clientName || b.clientEmail || "Pet Owner"}</Text>
                <Text style={s.service}>{b.service || "Service"}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[b.status] || "#94A3B8" }]}>
                <Text style={s.statusText}>{b.status || "pending"}</Text>
              </View>
            </View>
            <View style={s.cardMeta}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" />
              <Text style={s.metaText}>{b.date || "—"} {b.time ? `at ${b.time}` : ""}</Text>
            </View>
            {b.notes ? <Text style={s.notes}>{b.notes}</Text> : null}

            {b.status === "pending" && (
              <View style={s.actions}>
                <TouchableOpacity style={s.confirmBtn} onPress={() => updateStatus(b.id, "confirmed")}>
                  <Text style={s.confirmText}>Confirm</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => updateStatus(b.id, "cancelled")}>
                  <Text style={s.cancelText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
            {b.status === "confirmed" && (
              <TouchableOpacity style={s.completeBtn} onPress={() => updateStatus(b.id, "completed")}>
                <Text style={s.confirmText}>Mark as Completed</Text>
              </TouchableOpacity>
            )}
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
  filterRow: { marginBottom: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0", marginRight: 8, backgroundColor: "#fff" },
  filterActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  filterTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  emptySubtext: { fontSize: 14, color: "#CBD5E1" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  clientName: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  service: { fontSize: 13, color: "#64748B", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  metaText: { fontSize: 13, color: "#64748B" },
  notes: { fontSize: 13, color: "#64748B", fontStyle: "italic", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  confirmBtn: { flex: 1, backgroundColor: BRAND, borderRadius: 10, padding: 10, alignItems: "center" },
  cancelBtn: { flex: 1, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 10, alignItems: "center" },
  completeBtn: { backgroundColor: "#3B82F6", borderRadius: 10, padding: 10, alignItems: "center", marginTop: 8 },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  cancelText: { color: "#EF4444", fontWeight: "700", fontSize: 14 },
});
