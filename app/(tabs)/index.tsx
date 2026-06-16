import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Modal, FlatList, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt from "@/components/UpgradePrompt";
import { PetCardSkeleton } from "@/components/SkeletonLoader";
import AnimatedPetCard from "@/components/AnimatedPetCard";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
import { isWeb, webDb } from "@/lib/firebase";
import { collection as webCollection, onSnapshot as webOnSnapshot, doc, getDoc } from "firebase/firestore";
import _nativeFirestore from "@react-native-firebase/firestore";

const BRAND = "#4486F4";
const BLUE = "#4486F4";

export default function HomeScreen() {
  const { user, isDemoMode } = useAuth();
  const { maxPets } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const router = useRouter();
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPet, setSelectedPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [roleChecked, setRoleChecked] = useState(false);

  const firstName = user?.displayName?.split(" ")[0] || "there";

  // Redirect non-owners to their own dashboard BEFORE rendering anything
  useEffect(() => {
    if (!user || !isWeb) { setRoleChecked(true); return; }
    // Admin email always goes to admin dashboard regardless of Firestore doc
    if (user.email === "mypetdexapp@gmail.com") { router.replace("/(tabs)/admin-dashboard" as any); return; }
    getDoc(doc(webDb, "users", user.uid)).then((snap) => {
      if (!snap.exists()) { setRoleChecked(true); return; }
      const role = snap.data()?.role;
      if (role === "provider") { router.replace("/(tabs)/provider-home" as any); return; }
      if (role === "shelter") { router.replace("/(tabs)/shelter-home" as any); return; }
      if (role === "admin") { router.replace("/(tabs)/admin-dashboard" as any); return; }
      setRoleChecked(true); // only owners reach here
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const handleSnap = (docs: { id: string; [key: string]: any }[]) => {
      setPets(docs);
      if (docs.length > 0 && !selectedPet) setSelectedPet(docs[0]);
      setLoading(false);
    };
    const handleErr = () => setLoading(false);

    if (isWeb) {
      const ref = webCollection(webDb, "users", user.uid, "pets");
      const unsub = webOnSnapshot(ref, (snap) => {
        handleSnap(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }, handleErr);
      return unsub;
    } else {
      const unsub = _nativeFirestore()
        .collection("users")
        .doc(user.uid)
        .collection("pets")
        .onSnapshot(
          (snap: any) => handleSnap(snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))),
          handleErr
        );
      return unsub;
    }
  }, [user]);

  function handleAddPet() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to add your own pets and save data."); return; }
    if (pets.length >= maxPets) {
      setShowUpgrade(true);
    } else {
      router.push("/pet/add");
    }
  }

  // Don't render pet-owner UI until we know this user is actually an owner
  if (!roleChecked) {
    return <View style={{ flex: 1, backgroundColor: "#fff" }}><ActivityIndicator style={{ marginTop: 80 }} color={BRAND} size="large" /></View>;
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
        <View>
          <Text style={styles.greeting}>Hello, {firstName} 👋</Text>
          <Text style={styles.sub}>Welcome to MyPetDex</Text>
        </View>
      </View>

      {/* Pet Section */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
        <View style={{ width: 4, height: 20, backgroundColor: BRAND, borderRadius: 2, marginRight: 8 }} />
        <Text style={styles.sectionTitle}>Your Pet</Text>
      </View>

      {loading ? (
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <PetCardSkeleton />
          <PetCardSkeleton />
        </View>
      ) : pets.length === 0 ? (
        // No pets yet
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
          {/* Pet Picker Dropdown */}
          {pets.length > 1 && (
            <Pressable
              style={styles.pickerBtn}
              onPress={() => setShowPicker(true)}
            >
              <Text style={styles.pickerEmoji}>
                {selectedPet?.species === "cat" ? "🐱" : "🐶"}
              </Text>
              <Text style={styles.pickerName}>{selectedPet?.name}</Text>
              <Text style={styles.pickerChevron}>▾</Text>
            </Pressable>
          )}

          {/* Pet Dashboard Card */}
          {selectedPet && (
            <Pressable
              style={styles.petDashCard}
              onPress={() => router.push(`/pet/${selectedPet.id}`)}
            >
              {/* Top row */}
              <View style={styles.petDashTop}>
                <View style={styles.petDashAvatar}>
                  {selectedPet.photoURL ? (
                    <Animated.Image
                      entering={FadeIn.duration(400)}
                      source={{ uri: selectedPet.photoURL }}
                      style={{ width: 56, height: 56, borderRadius: 28 }}
                    />
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
                        <Text style={styles.metaChipText}>
                          🎂 {selectedPet.age}
                        </Text>
                      </View>
                    ) : null}
                    {selectedPet.weight ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          ⚖️ {selectedPet.weight}{" "}
                          {selectedPet.weightUnit || "lbs"}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Next vet */}
              {selectedPet.nextVet ? (
                <View style={styles.vetRow}>
                  <Text style={styles.vetText}>
                    🗓️ Next vet: {selectedPet.nextVet}
                  </Text>
                </View>
              ) : null}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {(selectedPet.vaccines || []).length}
                  </Text>
                  <Text style={styles.statLabel}>💉 Vaccines</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {(selectedPet.reminders || []).length}
                  </Text>
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
          <View style={[styles.quickIconBg, { backgroundColor: "#EEF4FF" }]}>
            <Ionicons name="sparkles" size={24} color={BLUE} />
          </View>
          <Text style={styles.quickLabel}>PetDex AI</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => router.push("/(tabs)/shopping")}>
          <View style={[styles.quickIconBg, { backgroundColor: "#FFF5EB" }]}>
            <Ionicons name="cart" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.quickLabel}>Shop</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => router.push("/(tabs)/explore")}>
          <View style={[styles.quickIconBg, { backgroundColor: "#EDFFF5" }]}>
            <Ionicons name="search" size={24} color="#10B981" />
          </View>
          <Text style={styles.quickLabel}>Services</Text>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={handleAddPet}>
          <View style={[styles.quickIconBg, { backgroundColor: "#FFF0F5" }]}>
            <Ionicons name="add-circle" size={24} color="#EC4899" />
          </View>
          <Text style={styles.quickLabel}>Add Pet</Text>
        </Pressable>
      </View>

      {/* Discover */}
      <Text style={styles.sectionTitle}>Discover</Text>
      <Pressable
        style={styles.discoverCard}
        onPress={() => router.push("/(tabs)/explore")}
      >
        <View style={styles.discoverIcon}>
          <Text style={styles.discoverEmoji}>🔍</Text>
        </View>
        <View style={styles.discoverInfo}>
          <Text style={styles.discoverTitle}>Find Services Near You</Text>
          <Text style={styles.discoverSub}>
            Vets, groomers, walkers, trainers & more
          </Text>
        </View>
        <Text style={styles.discoverArrow}>›</Text>
      </Pressable>

      <Pressable
        style={[styles.discoverCard, styles.discoverCardGreen]}
        onPress={() => router.push("/(tabs)/explore")}
      >
        <View style={[styles.discoverIcon, styles.discoverIconGreen]}>
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
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select a Pet</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", paddingVertical: 8 }}>
              {pets.map((pet, i) => (
                <AnimatedPetCard
                  key={pet.id}
                  pet={pet}
                  index={i}
                  isSelected={selectedPet?.id === pet.id}
                  selectedColor={BLUE}
                  onPress={() => {
                    setSelectedPet(pet);
                    setShowPicker(false);
                  }}
                />
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 20, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  sub: { fontSize: 14, color: "#888", marginTop: 2 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a1a",
    marginBottom: 0,
    marginTop: 20,
  },

  // Empty
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1a1a1a" },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center" },
  addBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 4,
  },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  // Pet picker button
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    alignSelf: "flex-start",
    gap: 8,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  pickerEmoji: { fontSize: 18 },
  pickerName: { fontSize: 15, fontWeight: "700", color: "#fff" },
  pickerChevron: { fontSize: 14, color: "#fff", fontWeight: "700", opacity: 0.85 },

  // Pet dashboard card
  petDashCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  petDashTop: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 14,
  },
  petDashAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  petDashEmoji: { fontSize: 34 },
  petDashInfo: { flex: 1 },
  petDashName: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  petDashBreed: { fontSize: 13, color: "#888", marginTop: 2 },
  petDashMeta: { flexDirection: "row", gap: 6, marginTop: 8, flexWrap: "wrap" },
  metaChip: {
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaChipText: { fontSize: 12, color: "#555", fontWeight: "500" },

  // Vet row
  vetRow: {
    backgroundColor: "#FFF8E7",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F5E9C8",
  },
  vetText: { fontSize: 13, color: "#B45309", fontWeight: "600" },

  // Stats
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: BRAND,
  },
  statLabel: { fontSize: 11, color: "#888", fontWeight: "500" },

  // Quick Access
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    width: "47%",
    gap: 8,
  },
  quickIconBg: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },

  // Discover
  discoverCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: BLUE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  discoverCardGreen: { borderLeftColor: BRAND },
  discoverIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  discoverIconGreen: { backgroundColor: "#f0f8f4" },
  discoverEmoji: { fontSize: 24 },
  discoverInfo: { flex: 1 },
  discoverTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  discoverSub: { fontSize: 12, color: "#888", marginTop: 2 },
  discoverArrow: { fontSize: 24, color: "#ccc", fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  modalPetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    backgroundColor: "#F8F8F8",
  },
  modalPetRowActive: {
    backgroundColor: BRAND + "15",
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  modalPetEmoji: { fontSize: 28 },
  modalPetInfo: { flex: 1 },
  modalPetName: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  modalPetBreed: { fontSize: 13, color: "#888", marginTop: 2 },
  modalCheck: { fontSize: 18, color: BRAND, fontWeight: "700" },
});