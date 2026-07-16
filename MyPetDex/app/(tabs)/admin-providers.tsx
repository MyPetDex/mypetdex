import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { webDb } from "@/lib/firebase";
import {
  collection, getDocs, query, where, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";

const BRAND = "#4486F4";
const ADMIN_EMAIL = "mypetdexapp@gmail.com";

const SERVICE_ICONS: Record<string, string> = {
  Grooming: "cut-outline",
  "Dog Walking": "footsteps-outline",
  Veterinary: "medkit-outline",
  Boarding: "home-outline",
  Training: "school-outline",
  Daycare: "people-outline",
};

type FilterTab = "pending" | "approved" | "rejected";

export default function AdminProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("pending");
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) { setLoading(false); return; }
    loadProviders();
  }, [user]);

  useEffect(() => {
    let list = providers.filter(p => {
      if (filter === "pending") return p.role === "pending_provider";
      if (filter === "approved") return p.role === "provider";
      if (filter === "rejected") return p.role === "rejected_provider";
      return true;
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.businessName || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.service || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setFiltered(list);
  }, [providers, filter, search]);

  async function loadProviders() {
    setLoading(true);
    try {
      // Fetch all three states in one call to avoid multiple index requirements
      const snap = await getDocs(collection(webDb, "users"));
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => ["pending_provider", "provider", "rejected_provider"].includes(p.role));
      setProviders(all);
    } finally {
      setLoading(false);
    }
  }

  async function approve(providerId: string, name: string) {
    Alert.alert(
      "Approve Provider",
      `Approve "${name}" and give them access to the provider dashboard?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            setActing(providerId);
            try {
              await updateDoc(doc(webDb, "users", providerId), {
                role: "provider",
                approved: true,
                approvedAt: serverTimestamp(),
              });
              setProviders(prev => prev.map(p =>
                p.id === providerId ? { ...p, role: "provider", approved: true } : p
              ));
            } catch (e) {
              Alert.alert("Error", "Could not approve provider. Try again.");
            }
            setActing(null);
          },
        },
      ]
    );
  }

  async function reject(providerId: string, name: string) {
    Alert.alert(
      "Reject Application",
      `Reject "${name}"? They will see a rejection notice on next login.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActing(providerId);
            try {
              await updateDoc(doc(webDb, "users", providerId), {
                role: "rejected_provider",
                approved: false,
                rejectedAt: serverTimestamp(),
              });
              setProviders(prev => prev.map(p =>
                p.id === providerId ? { ...p, role: "rejected_provider", approved: false } : p
              ));
            } catch (e) {
              Alert.alert("Error", "Could not reject provider. Try again.");
            }
            setActing(null);
          },
        },
      ]
    );
  }

  async function reactivate(providerId: string, name: string) {
    Alert.alert(
      "Move to Pending",
      `Move "${name}" back to pending review?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Move to Pending",
          onPress: async () => {
            setActing(providerId);
            try {
              await updateDoc(doc(webDb, "users", providerId), {
                role: "pending_provider",
                approved: false,
              });
              setProviders(prev => prev.map(p =>
                p.id === providerId ? { ...p, role: "pending_provider", approved: false } : p
              ));
            } catch (e) {
              Alert.alert("Error", "Could not update provider. Try again.");
            }
            setActing(null);
          },
        },
      ]
    );
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <View style={s.center}>
        <Text style={s.noAccess}>Access Restricted</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={BRAND} size="large" />
      </View>
    );
  }

  const pendingCount = providers.filter(p => p.role === "pending_provider").length;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Provider Applications</Text>

      {pendingCount > 0 && (
        <View style={s.alertBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
          <Text style={s.alertText}>{pendingCount} application{pendingCount !== 1 ? "s" : ""} awaiting review</Text>
        </View>
      )}

      <TextInput
        style={s.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search by name, email, city..."
        placeholderTextColor="#94A3B8"
      />

      {/* Filter tabs */}
      <View style={s.filterRow}>
        {(["pending", "approved", "rejected"] as FilterTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.filterTab, filter === tab && s.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[s.filterTabText, filter === tab && s.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyTitle}>
            {filter === "pending" ? "No pending applications" : `No ${filter} providers`}
          </Text>
          <Text style={s.emptySub}>
            {filter === "pending" ? "All caught up! New applications will appear here." : ""}
          </Text>
        </View>
      ) : (
        filtered.map(p => <ProviderCard key={p.id} p={p} acting={acting} onApprove={approve} onReject={reject} onReactivate={reactivate} />)
      )}
    </ScrollView>
  );
}

function ProviderCard({
  p, acting, onApprove, onReject, onReactivate,
}: {
  p: any;
  acting: string | null;
  onApprove: (id: string, name: string) => void;
  onReject: (id: string, name: string) => void;
  onReactivate: (id: string, name: string) => void;
}) {
  const name = p.businessName || p.displayName || "Unnamed";
  const serviceIcon = (SERVICE_ICONS[p.service || ""] || "briefcase-outline") as any;
  const isActing = acting === p.id;
  const isPending = p.role === "pending_provider";
  const isApproved = p.role === "provider";
  const isRejected = p.role === "rejected_provider";

  const submittedDate = p.createdAt?.seconds
    ? new Date(p.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <View style={[s.card, isApproved && s.cardApproved, isRejected && s.cardRejected]}>
      {/* Header */}
      <View style={s.cardHeader}>
        <View style={s.iconWrap}>
          <Ionicons name={serviceIcon} size={22} color={BRAND} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardName}>{name}</Text>
          <Text style={s.cardEmail}>{p.email}</Text>
        </View>
        <View style={[
          s.statusBadge,
          isPending && s.statusPending,
          isApproved && s.statusApproved,
          isRejected && s.statusRejected,
        ]}>
          <Text style={[
            s.statusText,
            isPending && s.statusTextPending,
            isApproved && s.statusTextApproved,
            isRejected && s.statusTextRejected,
          ]}>
            {isPending ? "Pending" : isApproved ? "Approved" : "Rejected"}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={s.detailGrid}>
        {!!p.service && <Chip icon="briefcase-outline" label={p.service} />}
        {!!(p.city || p.state) && <Chip icon="location-outline" label={[p.city, p.state].filter(Boolean).join(", ")} />}
        {!!p.phone && <Chip icon="call-outline" label={p.phone} />}
        {!!p.priceRange && <Chip icon="pricetag-outline" label={p.priceRange} />}
        {!!submittedDate && <Chip icon="calendar-outline" label={`Applied ${submittedDate}`} />}
      </View>

      {!!p.bio && (
        <Text style={s.bio} numberOfLines={3}>{p.bio}</Text>
      )}

      {!!p.website && (
        <Text style={s.website} numberOfLines={1}>{p.website}</Text>
      )}

      {/* Actions */}
      <View style={s.actions}>
        {isActing ? (
          <ActivityIndicator color={BRAND} style={{ marginVertical: 8 }} />
        ) : isPending ? (
          <>
            <TouchableOpacity style={s.approveBtn} onPress={() => onApprove(p.id, name)}>
              <Ionicons name="checkmark-outline" size={16} color="#fff" />
              <Text style={s.approveBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.rejectBtn} onPress={() => onReject(p.id, name)}>
              <Ionicons name="close-outline" size={16} color="#EF4444" />
              <Text style={s.rejectBtnText}>Reject</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={s.reactivateBtn} onPress={() => onReactivate(p.id, name)}>
            <Text style={s.reactivateBtnText}>Move to Pending</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function Chip({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.chip}>
      <Ionicons name={icon as any} size={11} color="#64748B" />
      <Text style={s.chipText} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  noAccess: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 12 },

  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  alertText: { fontSize: 13, fontWeight: "600", color: "#92400E" },

  search: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#1E293B",
    marginBottom: 12,
  },

  filterRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  filterTabActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterTabText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  filterTabTextActive: { color: "#fff" },

  empty: { alignItems: "center", paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#94A3B8", marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, color: "#CBD5E1", textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardApproved: { borderLeftWidth: 3, borderLeftColor: "#10B981" },
  cardRejected: { borderLeftWidth: 3, borderLeftColor: "#EF4444", opacity: 0.75 },

  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BRAND + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  cardName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cardEmail: { fontSize: 12, color: "#64748B", marginTop: 2 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusApproved: { backgroundColor: "#D1FAE5" },
  statusRejected: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 11, fontWeight: "700" },
  statusTextPending: { color: "#92400E" },
  statusTextApproved: { color: "#065F46" },
  statusTextRejected: { color: "#991B1B" },

  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: "#475569", fontWeight: "600" },

  bio: { fontSize: 13, color: "#64748B", lineHeight: 19, marginBottom: 8 },
  website: { fontSize: 12, color: BRAND, marginBottom: 10 },

  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10B981",
    borderRadius: 10,
    paddingVertical: 11,
  },
  approveBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 11,
  },
  rejectBtnText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },
  reactivateBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingVertical: 11,
  },
  reactivateBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
});
