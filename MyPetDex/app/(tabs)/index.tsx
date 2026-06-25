import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Modal, Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt from "@/components/UpgradePrompt";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc } from "firebase/firestore";

const BRAND = "#4C6EF5";
const BRAND_DARK = "#3A5BD9";
const BG = "#F4F6FB";
const TEXT = "#0F172A";
const TEXT2 = "#64748B";

export default function HomeScreen() {
  const { user } = useAuth();
  const { maxPets, plan } = usePlan();

  const planLabel = plan === "plus" ? "⭐ Plus Plan" : plan === "family" ? "👑 Family Plan" : null;
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roleChecked, setRoleChecked] = useState(false);

  const firstName = user?.displayName?.split(" ")[0] || "there";

  // Redirect non-owners to their own dashboard
  useEffect(() => {
    if (!user) { setRoleChecked(true); return; }
    if (user.email === "mypetdexapp@gmail.com") {
      router.replace("/(tabs)/admin-dashboard");
      return;
    }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (!snap.exists()) { setRoleChecked(true); return; }
      const role = snap.data()?.role;
      if (role === "provider") { router.replace("/(tabs)/provider-home"); return; }
      if (role === "shelter") { router.replace("/(tabs)/shelter-home"); return; }
      if (role === "admin") { router.replace("/(tabs)/admin-dashboard"); return; }
      setRoleChecked(true);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "pets"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPets(docs);
        if (docs.length > 0) {
          setSelectedPet(prev =>
            prev ? (docs.find(d => d.id === prev.id) ?? docs[0]) : docs[0]
          );
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  function handleAddPet() {
    if (pets.length >= maxPets) {
      setShowUpgrade(true);
    } else {
      router.push("/pet/add");
    }
  }

  if (!roleChecked) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        <ActivityIndicator style={{ marginTop: 80 }} color={BRAND} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={`More than ${maxPets} pet${maxPets === 1 ? "" : "s"}`}
        requiredPlan="plus"
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
            <Text style={styles.sub}>Welcome to MyPetDex</Text>
          </View>
          {planLabel ? (
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>{planLabel}</Text>
            </View>
          ) : (
            <View style={styles.headerPawBadge}>
              <Text style={{ fontSize: 22 }}>🐾</Text>
            </View>
          )}
        </View>
      </View>

      {/* Pet Section */}
      <Text style={styles.sectionTitle}>Your Pet</Text>

      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 20 }} />
      ) : pets.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <Text style={styles.emptySub}>Add your first pet to get started</Text>
          <Pressable style={styles.addBtn} onPress={handleAddPet}>
            <Text style={styles.addBtnText}>+ Add Pet</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {pets.length > 1 && (
            <Pressable style={styles.pickerBtn} onPress={() => setShowPicker(true)}>
              <Text style={styles.pickerEmoji}>
                {selectedPet?.species === "cat" ? "🐱" : "🐶"}
              </Text>
              <Text style={styles.pickerName}>{selectedPet?.name}</Text>
              <Text style={styles.pickerChevron}>▾</Text>
            </Pressable>
          )}

          {selectedPet && (
            <Pressable
              style={styles.petDashCard}
              onPress={() => router.push(`/pet/${selectedPet.id}`)}
            >
              <View style={styles.petDashTop}>
                <View style={styles.petDashAvatar}>
                  {selectedPet.photoURL ? (
                    <Image source={{ uri: selectedPet.photoURL }} style={styles.petDashAvatarImage} />
                  ) : (
                    <Text style={styles.petDashEmoji}>
                      {selectedPet.species === "cat" ? "🐱" : "🐶"}
                    </Text>
                  )}
                </View>
                <View style={styles.petDashInfo}>
                  <Text style={styles.petDashName}>{selectedPet.name}</Text>
                  <Text style={styles.petDashBreed}>
                    {selectedPet.breed || selectedPet.species}
                  </Text>
                  <View style={styles.petDashMeta}>
                    {selectedPet.age ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>🎂 {selectedPet.age}</Text>
                      </View>
                    ) : null}
                    {selectedPet.weight ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          ⚖️ {selectedPet.weight} {selectedPet.weightUnit || "lbs"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {selectedPet.nextVet ? (
                <View style={styles.vetRow}>
                  <Text style={styles.vetText}>🗓️ Next vet: {selectedPet.nextVet}</Text>
                </View>
              ) : null}

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{(selectedPet.vaccines || []).length}</Text>
                  <Text style={styles.statLabel}>💉 Vaccines</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{(selectedPet.reminders || []).length}</Text>
                  <Text style={styles.statLabel}>⏰ Reminders</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>→</Text>
                  <Text style={styles.statLabel}>Full Profile</Text>
                </View>
              </View>
            </Pressable>
          )}
        </>
      )}

      {/* Quick Access */}
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.quickGrid}>
        <Pressable style={styles.quickCard} onPress={() => router.push("/(tabs)/ai")}>
          <View style={[styles.quickIconBadge, { backgroundColor: "#EDE9FE" }]}>
            <Text style={styles.quickEmoji}>🤖</Text>
          </View>
          <Text style={styles.quickLabel}>MyPetDex{"\n"}Assistant</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => router.push("/(tabs)/shopping")}>
          <View style={[styles.quickIconBadge, { backgroundColor: "#DCFCE7" }]}>
            <Text style={styles.quickEmoji}>🛍️</Text>
          </View>
          <Text style={styles.quickLabel}>Pet Shop</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => router.push("/(tabs)/explore")}>
          <View style={[styles.quickIconBadge, { backgroundColor: "#FEF3C7" }]}>
            <Text style={styles.quickEmoji}>📍</Text>
          </View>
          <Text style={styles.quickLabel}>Services</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={handleAddPet}>
          <View style={[styles.quickIconBadge, { backgroundColor: "#DBEAFE" }]}>
            <Text style={styles.quickEmoji}>🐾</Text>
          </View>
          <Text style={styles.quickLabel}>Add Pet</Text>
        </Pressable>
      </View>

      {/* Discover */}
      <Text style={styles.sectionTitle}>Discover</Text>
      <Pressable style={styles.discoverCard} onPress={() => router.push("/(tabs)/explore")}>
        <View style={[styles.discoverIcon, { backgroundColor: "#EDE9FE" }]}>
          <Text style={styles.discoverEmoji}>🔍</Text>
        </View>
        <View style={styles.discoverInfo}>
          <Text style={styles.discoverTitle}>Find Services Near You</Text>
          <Text style={styles.discoverSub}>Vets, groomers, walkers, trainers & more</Text>
        </View>
        <Text style={styles.discoverArrow}>›</Text>
      </Pressable>

      <Pressable
        style={[styles.discoverCard, { borderLeftColor: "#059669" }]}
        onPress={() => router.push("/adopt")}
      >
        <View style={[styles.discoverIcon, { backgroundColor: "#D1FAE5" }]}>
          <Text style={styles.discoverEmoji}>🏠</Text>
        </View>
        <View style={styles.discoverInfo}>
          <Text style={styles.discoverTitle}>Adopt a Pet</Text>
          <Text style={styles.discoverSub}>Find adoptable dogs near you</Text>
        </View>
        <Text style={styles.discoverArrow}>›</Text>
      </Pressable>

      {/* Pet Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select a Pet</Text>
            {pets.map((pet) => (
              <Pressable
                key={pet.id}
                style={[
                  styles.modalPetRow,
                  selectedPet?.id === pet.id && styles.modalPetRowActive,
                ]}
                onPress={() => { setSelectedPet(pet); setShowPicker(false); }}
              >
                <Text style={styles.modalPetEmoji}>
                  {pet.species === "cat" ? "🐱" : "🐶"}
                </Text>
                <View style={styles.modalPetInfo}>
                  <Text style={styles.modalPetName}>{pet.name}</Text>
                  <Text style={styles.modalPetBreed}>{pet.breed || pet.species}</Text>
                </View>
                {selectedPet?.id === pet.id && (
                  <Text style={styles.modalCheck}>✓</Text>
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48 },
  // ── Header ──────────────────────────────────────────────────────────
  header: { backgroundColor: BRAND, margin: -20, marginBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  headerInner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  greeting: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  sub: { fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  planBadge: { backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 20, paddingHorizontal: 13, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  planBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  headerPawBadge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  // ── Section titles ───────────────────────────────────────────────────
  sectionTitle: { fontSize: 18, fontWeight: "700", color: TEXT, marginBottom: 12, marginTop: 24, letterSpacing: -0.3 },
  // ── Empty state ──────────────────────────────────────────────────────
  emptyCard: { backgroundColor: "#fff", borderRadius: 20, padding: 36, alignItems: "center", gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: TEXT },
  emptySub: { fontSize: 14, color: TEXT2, textAlign: "center" },
  addBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 28, marginTop: 6 },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  // ── Pet picker ───────────────────────────────────────────────────────
  pickerBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1.5, borderColor: BRAND + "55", alignSelf: "flex-start", gap: 8 },
  pickerEmoji: { fontSize: 18 },
  pickerName: { fontSize: 15, fontWeight: "700", color: TEXT },
  pickerChevron: { fontSize: 13, color: BRAND, fontWeight: "700" },
  // ── Pet dashboard card ───────────────────────────────────────────────
  petDashCard: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", shadowColor: BRAND, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 16, elevation: 5 },
  petDashTop: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  petDashAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 3, borderColor: BRAND + "30" },
  petDashAvatarImage: { width: 72, height: 72, borderRadius: 36 },
  petDashEmoji: { fontSize: 38 },
  petDashInfo: { flex: 1 },
  petDashName: { fontSize: 22, fontWeight: "800", color: TEXT, letterSpacing: -0.3 },
  petDashBreed: { fontSize: 13, color: TEXT2, marginTop: 2 },
  petDashMeta: { flexDirection: "row", gap: 6, marginTop: 10, flexWrap: "wrap" },
  metaChip: { backgroundColor: "#F0F4FF", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  metaChipText: { fontSize: 12, color: BRAND, fontWeight: "600" },
  vetRow: { backgroundColor: "#FFFBEB", paddingHorizontal: 20, paddingVertical: 11, borderTopWidth: 1, borderTopColor: "#FDE68A" },
  vetText: { fontSize: 13, color: "#B45309", fontWeight: "600" },
  statsRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F0F0F0" },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 4 },
  statDivider: { width: 1, backgroundColor: "#F0F0F0", marginVertical: 10 },
  statValue: { fontSize: 20, fontWeight: "800", color: BRAND },
  statLabel: { fontSize: 11, color: TEXT2, fontWeight: "500" },
  // ── Quick access grid ────────────────────────────────────────────────
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "flex-start", width: "47%", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  quickIconBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickEmoji: { fontSize: 22 },
  quickLabel: { fontSize: 13, fontWeight: "700", color: TEXT, lineHeight: 18 },
  // ── Discover cards ───────────────────────────────────────────────────
  discoverCard: { backgroundColor: "#fff", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 12, borderLeftWidth: 4, borderLeftColor: BRAND, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  discoverIcon: { width: 50, height: 50, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
  discoverEmoji: { fontSize: 24 },
  discoverInfo: { flex: 1 },
  discoverTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  discoverSub: { fontSize: 12, color: TEXT2, marginTop: 3 },
  discoverArrow: { fontSize: 24, color: "#C7D2E8", fontWeight: "600" },
  // ── Pet picker modal ─────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, gap: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: TEXT, marginBottom: 6 },
  modalPetRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, gap: 12, backgroundColor: "#F8F9FC" },
  modalPetRowActive: { backgroundColor: BRAND + "12", borderWidth: 1.5, borderColor: BRAND },
  modalPetEmoji: { fontSize: 30 },
  modalPetInfo: { flex: 1 },
  modalPetName: { fontSize: 16, fontWeight: "700", color: TEXT },
  modalPetBreed: { fontSize: 13, color: TEXT2, marginTop: 2 },
  modalCheck: { fontSize: 18, color: BRAND, fontWeight: "700" },
});
