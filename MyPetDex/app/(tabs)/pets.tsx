import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, deleteDoc, doc } from "firebase/firestore";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt from "@/components/UpgradePrompt";

const BRAND = "#4486F4";

export default function PetsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { maxPets } = usePlan();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "pets"),
      (snap) => {
        setPets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  const filtered = pets.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddPet() {
    if (pets.length >= maxPets) {
      setShowUpgrade(true);
    } else {
      router.push("/pet/add");
    }
  }

  function handleDeletePet(pet: any) {
    Alert.alert(
      `Delete ${pet.name}?`,
      "This will permanently delete this pet and all their records and reminders. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", user!.uid, "pets", pet.id));
            } catch {
              Alert.alert("Error", "Could not delete pet. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={`More than ${maxPets} pet${maxPets === 1 ? "" : "s"}`}
        requiredPlan="plus"
      />

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search pets..."
          placeholderTextColor="#aaa"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🐾</Text>
              <Text style={styles.emptyTitle}>No pets yet</Text>
              <Text style={styles.emptySub}>Add your first pet to get started</Text>
            </View>
          ) : (
            filtered.map((pet) => (
              <Pressable
                key={pet.id}
                style={styles.card}
                onPress={() => router.push(`/pet/${pet.id}`)}
                onLongPress={() => handleDeletePet(pet)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>
                    {pet.species === "cat" ? "🐱" : "🐶"}
                  </Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{pet.name}</Text>
                  <Text style={styles.breed}>{pet.breed || pet.species}</Text>
                  <View style={styles.tags}>
                    {pet.age ? (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>Age: {pet.age}</Text>
                      </View>
                    ) : null}
                    {pet.weight ? (
                      <View style={styles.tag}>
                        <Text style={styles.tagText}>
                          {pet.weight} {pet.weightUnit || "lbs"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.chevron}>›</Text>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDeletePet(pet)}
                    hitSlop={8}
                  >
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))
          )}

          <Pressable style={styles.addBtn} onPress={handleAddPet}>
            <Text style={styles.addBtnText}>+ Add New Pet</Text>
          </Pressable>

          <Text style={styles.hint}>Long-press a pet card to delete</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", margin: 16, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#eee" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  list: { padding: 16, paddingTop: 0, gap: 12 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", marginTop: 20, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1a1a1a" },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center" },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#f0f8f4", alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarEmoji: { fontSize: 32 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  breed: { fontSize: 13, color: "#888", marginTop: 2 },
  tags: { flexDirection: "row", gap: 6, marginTop: 8 },
  tag: { backgroundColor: "#f0f8f4", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: BRAND, fontWeight: "500" },
  cardRight: { alignItems: "center", gap: 6 },
  chevron: { fontSize: 22, color: "#ccc" },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 18 },
  addBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  hint: { textAlign: "center", fontSize: 12, color: "#bbb", marginTop: 8 },
});
