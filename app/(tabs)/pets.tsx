import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import firestore from "@react-native-firebase/firestore";
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
    const unsub = firestore()
      .collection("users")
      .doc(user.uid)
      .collection("pets")
      .onSnapshot(snap => {
        setPets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, () => setLoading(false));
    return unsub;
  }, [user]);

  const filtered = pets.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddPet() {
    if (pets.length >= maxPets) {
      setShowUpgrade(true);
    } else {
      router.push("/pet/add");
    }
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
            filtered.map(pet => (
              <Pressable
                key={pet.id}
                style={styles.card}
                onPress={() => router.push(`/pet/${pet.id}`)}
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
                    {pet.age && <View style={styles.tag}><Text style={styles.tagText}>Age: {pet.age}</Text></View>}
                    {pet.weight && <View style={styles.tag}><Text style={styles.tagText}>{pet.weight} {pet.weightUnit || "lbs"}</Text></View>}
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}

          <Pressable style={styles.addBtn} onPress={handleAddPet}>
            <Text style={styles.addBtnText}>+ Add New Pet</Text>
          </Pressable>
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
  chevron: { fontSize: 22, color: "#ccc" },
  addBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
