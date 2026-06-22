import { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from "react-native";
import { webDb } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect } from "expo-router";

const BRAND = "#4486F4";
const STATUS_COLORS: Record<string, string> = { available: BRAND, pending: "#F5A623", adopted: "#3B82F6" };

export default function ShelterPets() {
  const { user } = useAuth();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadPets = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const snap = await getDocs(query(collection(webDb, "shelter_pets"), where("shelterId", "==", user.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setPets(list);
    } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { loadPets(); }, [loadPets]));

  async function updateStatus(id: string, status: string) {
    await updateDoc(doc(webDb, "shelter_pets", id), { status });
    setPets(p => p.map(x => x.id === id ? { ...x, status } : x));
  }

  async function deletePet(id: string, name: string) {
    Alert.alert("Remove Pet", `Remove ${name} from listings?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        await deleteDoc(doc(webDb, "shelter_pets", id));
        setPets(p => p.filter(x => x.id !== id));
      }},
    ]);
  }

  const filtered = filter === "all" ? pets : pets.filter(p => p.status === filter);

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Our Pets ({pets.length})</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}>
        {["all", "available", "pending", "adopted"].map(f => (
          <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipActive]} onPress={() => setFilter(f)}>
            <Text style={[s.chipText, filter === f && s.chipTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="paw-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyText}>No pets listed yet</Text>
          <Text style={s.emptySubtext}>Tap "Add Pet" to list your first adoptable pet</Text>
        </View>
      ) : (
        filtered.map(pet => (
          <View key={pet.id} style={s.card}>
            <View style={s.cardTop}>
              {pet.photoUri ? (
                <Image source={{ uri: pet.photoUri }} style={s.petPhoto} />
              ) : (
                <View style={s.petPhotoPlaceholder}>
                  <Text style={s.petPhotoEmoji}>{pet.species === "Cat" ? "🐱" : pet.species === "Dog" ? "🐶" : "🐾"}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.petName}>{pet.name}</Text>
                <Text style={s.petBreed}>{pet.species} • {pet.breed}</Text>
                <Text style={s.petDetail}>{pet.age || ""}{pet.age && pet.weight ? " • " : ""}{pet.weight || ""}{pet.gender ? ` • ${pet.gender}` : ""}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[pet.status] || "#94A3B8" }]}>
                <Text style={s.statusText}>{pet.status}</Text>
              </View>
            </View>

            {pet.description ? <Text style={s.desc} numberOfLines={2}>{pet.description}</Text> : null}

            <View style={s.actions}>
              {pet.status !== "available" && (
                <TouchableOpacity style={s.actionBtn} onPress={() => updateStatus(pet.id, "available")}>
                  <Text style={s.actionBtnText}>Mark Available</Text>
                </TouchableOpacity>
              )}
              {pet.status !== "adopted" && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#3B82F6" }]} onPress={() => updateStatus(pet.id, "adopted")}>
                  <Text style={s.actionBtnText}>Mark Adopted</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={s.deleteBtn} onPress={() => deletePet(pet.id, pet.name)}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
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
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 16 },
  filterRow: { marginBottom: 20 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0", marginRight: 8, backgroundColor: "#fff" },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  emptySubtext: { fontSize: 14, color: "#CBD5E1", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  petPhoto: { width: 60, height: 60, borderRadius: 12 },
  petPhotoPlaceholder: { width: 60, height: 60, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  petPhotoEmoji: { fontSize: 28 },
  petName: { fontSize: 17, fontWeight: "700", color: "#1E293B" },
  petBreed: { fontSize: 13, color: "#64748B", marginTop: 2 },
  petDetail: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start" },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  desc: { fontSize: 13, color: "#64748B", lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, backgroundColor: BRAND, borderRadius: 10, padding: 8, alignItems: "center" },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
});
