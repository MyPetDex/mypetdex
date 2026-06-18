import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { webDb } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4486F4";
const ADMIN_EMAIL = "mypetdexapp@gmail.com";

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    if (user.email !== ADMIN_EMAIL) { setLoading(false); return; }
    loadUsers();
  }, [user]);

  useEffect(() => {
    let list = users;
    if (roleFilter !== "all") list = list.filter(u => u.role === roleFilter);
    if (search.trim()) list = list.filter(u => (u.email || "").toLowerCase().includes(search.toLowerCase()) || (u.displayName || "").toLowerCase().includes(search.toLowerCase()) || (u.businessName || "").toLowerCase().includes(search.toLowerCase()));
    setFiltered(list);
  }, [users, search, roleFilter]);

  async function loadUsers() {
    try {
      const snap = await getDocs(collection(webDb, "users"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setUsers(list);
    } finally { setLoading(false); }
  }

  async function toggleDisabled(userId: string, current: boolean) {
    await updateDoc(doc(webDb, "users", userId), { disabled: !current });
    setUsers(u => u.map(x => x.id === userId ? { ...x, disabled: !current } : x));
  }

  async function toggleVerified(userId: string, current: boolean) {
    await updateDoc(doc(webDb, "users", userId), { verified: !current });
    setUsers(u => u.map(x => x.id === userId ? { ...x, verified: !current } : x));
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  if (!user || user.email !== ADMIN_EMAIL) return <View style={s.center}><Text style={s.noAccess}>Access Restricted</Text></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>User Accounts</Text>

      <TextInput style={s.search} value={search} onChangeText={setSearch} placeholder="Search by email or name..." placeholderTextColor="#94A3B8" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {["all", "owner", "provider", "shelter"].map(r => (
          <TouchableOpacity key={r} style={[s.chip, roleFilter === r && s.chipActive]} onPress={() => setRoleFilter(r)}>
            <Text style={[s.chipText, roleFilter === r && s.chipTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.count}>{filtered.length} user{filtered.length !== 1 ? "s" : ""}</Text>

      {filtered.map(u => (
        <View key={u.id} style={[s.card, u.disabled && s.cardDisabled]}>
          <View style={s.cardTop}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{(u.displayName || u.email || "?").charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>{u.businessName || u.shelterName || u.displayName || "—"}</Text>
              <Text style={s.userEmail}>{u.email}</Text>
              <View style={s.tagRow}>
                <View style={[s.tag, { backgroundColor: u.role === "provider" ? "#3B82F6" : u.role === "shelter" ? "#F5A623" : BRAND }]}>
                  <Text style={s.tagText}>{u.role || "owner"}</Text>
                </View>
                <View style={[s.tag, { backgroundColor: u.plan === "plus" || u.plan === "family" ? "#8B5CF6" : "#E2E8F0" }]}>
                  <Text style={[s.tagText, { color: u.plan === "plus" || u.plan === "family" ? "#fff" : "#64748B" }]}>{u.plan || "free"}</Text>
                </View>
                {u.verified && <View style={[s.tag, { backgroundColor: BRAND }]}><Text style={s.tagText}>✓ verified</Text></View>}
                {u.disabled && <View style={[s.tag, { backgroundColor: "#EF4444" }]}><Text style={s.tagText}>disabled</Text></View>}
              </View>
            </View>
          </View>

          <View style={s.actions}>
            {(u.role === "provider" || u.role === "shelter") && (
              <TouchableOpacity style={[s.actionBtn, u.verified ? s.actionBtnOrange : s.actionBtnGreen]} onPress={() => toggleVerified(u.id, u.verified)}>
                <Text style={s.actionBtnText}>{u.verified ? "Unverify" : "Verify"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.actionBtn, u.disabled ? s.actionBtnGreen : s.actionBtnRed]} onPress={() => toggleDisabled(u.id, u.disabled)}>
              <Text style={s.actionBtnText}>{u.disabled ? "Enable" : "Disable"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  noAccess: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 16 },
  search: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 12 },
  filterRow: { marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0", marginRight: 8, backgroundColor: "#fff" },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  count: { fontSize: 13, color: "#64748B", marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardDisabled: { opacity: 0.6 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  userName: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  userEmail: { fontSize: 12, color: "#64748B", marginTop: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, color: "#fff", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  actionBtnGreen: { backgroundColor: BRAND },
  actionBtnOrange: { backgroundColor: "#F5A623" },
  actionBtnRed: { backgroundColor: "#FEE2E2" },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
