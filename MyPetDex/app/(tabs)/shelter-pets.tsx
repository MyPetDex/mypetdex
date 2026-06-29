import { useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Image, Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { webDb, storage } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useFocusEffect } from "expo-router";

const BRAND = "#4486F4";
const STATUS_COLORS: Record<string, string> = { available: BRAND, pending: "#F5A623", adopted: "#3B82F6" };
const GENDERS = ["Male", "Female", "Unknown"];
const STATUSES = ["available", "pending", "adopted"];

type PetRecord = {
  id: string;
  name?: string;
  species?: string;
  breed?: string;
  age?: string;
  weight?: string;
  gender?: string;
  color?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: string;
  photoURL?: string;
  photoUri?: string;
};

const emptyEditForm = {
  name: "", breed: "", age: "", weight: "", gender: "Male",
  color: "", description: "", contactPhone: "", contactEmail: "", status: "available",
};

export default function ShelterPets() {
  const { user } = useAuth();
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editPet, setEditPet] = useState<PetRecord | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPets = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const snap = await getDocs(query(collection(webDb, "shelter_pets"), where("shelterId", "==", user.uid)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PetRecord[];
      list.sort((a, b) => ((b as any).createdAt?.seconds || 0) - ((a as any).createdAt?.seconds || 0));
      setPets(list);
    } finally { setLoading(false); }
  }, [user]);

  useFocusEffect(useCallback(() => { loadPets(); }, [loadPets]));

  function openEdit(pet: PetRecord) {
    setEditPet(pet);
    setEditPhotoUri(null); // reset any previously picked photo
    setEditForm({
      name: pet.name || "",
      breed: pet.breed || "",
      age: pet.age || "",
      weight: pet.weight || "",
      gender: pet.gender || "Male",
      color: pet.color || "",
      description: pet.description || "",
      contactPhone: pet.contactPhone || "",
      contactEmail: pet.contactEmail || "",
      status: pet.status || "available",
    });
  }

  async function pickEditPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow photo access to change the pet photo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setEditPhotoUri(result.assets[0].uri);
    }
  }

  async function uploadEditPhoto(uid: string, petId: string, localUri: string): Promise<string> {
    const storageRef = ref(storage, `shelters/${uid}/pets/${petId}/photo.jpg`);
    const blob = await new Promise<Blob>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new Error("Failed to fetch image blob"));
      xhr.responseType = "blob";
      xhr.open("GET", localUri);
      xhr.send();
    });
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    return getDownloadURL(storageRef);
  }

  async function saveEdit() {
    if (!editPet || !user) return;
    if (!editForm.name.trim()) { Alert.alert("Required", "Please enter the pet's name."); return; }
    if (!editForm.breed.trim()) { Alert.alert("Required", "Please enter the breed."); return; }
    setSaving(true);
    try {
      let photoURL: string | undefined = undefined;
      if (editPhotoUri) {
        try {
          photoURL = await uploadEditPhoto(user.uid, editPet.id, editPhotoUri);
        } catch (e: any) {
          console.error("Shelter edit pet photo upload error:", e?.code, e?.message, e);
          Alert.alert("Error", e?.message || "Failed to upload photo. Please try again.");
          return;
        }
      }
      const updates: any = {
        name: editForm.name.trim(),
        breed: editForm.breed.trim(),
        age: editForm.age.trim(),
        weight: editForm.weight.trim(),
        gender: editForm.gender,
        color: editForm.color.trim(),
        description: editForm.description.trim(),
        contactPhone: editForm.contactPhone.trim(),
        contactEmail: editForm.contactEmail.trim(),
        status: editForm.status,
      };
      if (photoURL) updates.photoURL = photoURL;
      await updateDoc(doc(webDb, "shelter_pets", editPet.id), updates);
      setPets(p => p.map(x => x.id === editPet.id ? { ...x, ...updates } : x));
      setEditPet(null);
      setEditPhotoUri(null);
    } catch (e: any) {
      console.error("Shelter edit pet error:", e?.code, e?.message, e);
      Alert.alert("Error", e?.message || "Failed to update pet. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      await updateDoc(doc(webDb, "shelter_pets", id), { status });
      setPets(p => p.map(x => x.id === id ? { ...x, status } : x));
    } catch (e: any) {
      console.error("Shelter update status error:", e?.code, e?.message, e);
      Alert.alert("Error", e?.message || "Failed to update status.");
    }
  }

  function deletePet(id: string, name: string) {
    Alert.alert("Remove Pet", `Remove ${name} from listings?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try {
          await deleteDoc(doc(webDb, "shelter_pets", id));
          setPets(p => p.filter(x => x.id !== id));
        } catch (e: any) {
          console.error("Shelter delete pet error:", e?.code, e?.message, e);
          Alert.alert("Error", e?.message || "Failed to delete pet. Please try again.");
        }
      }},
    ]);
  }

  const filtered = filter === "all" ? pets : pets.filter(p => p.status === filter);

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <>
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
                {pet.photoURL || pet.photoUri ? (
                  <Image source={{ uri: pet.photoURL || pet.photoUri }} style={s.petPhoto} />
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
                <View style={[s.statusBadge, { backgroundColor: STATUS_COLORS[pet.status || "available"] || "#94A3B8" }]}>
                  <Text style={s.statusText}>{pet.status}</Text>
                </View>
              </View>

              {pet.description ? <Text style={s.desc} numberOfLines={2}>{pet.description}</Text> : null}

              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => openEdit(pet)}>
                  <Ionicons name="pencil-outline" size={16} color={BRAND} />
                  <Text style={s.editBtnText}>Edit</Text>
                </TouchableOpacity>
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
                <TouchableOpacity style={s.deleteBtn} onPress={() => deletePet(pet.id, pet.name || "this pet")}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={editPet != null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditPet(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView style={s.modalContainer} contentContainerStyle={s.modalContent} keyboardShouldPersistTaps="handled">
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Pet</Text>
              <Pressable onPress={() => setEditPet(null)}>
                <Text style={s.modalClose}>Cancel</Text>
              </Pressable>
            </View>

            {/* Photo picker */}
            <TouchableOpacity style={s.photoBox} onPress={pickEditPhoto}>
              {editPhotoUri || editPet?.photoURL ? (
                <View>
                  <Image source={{ uri: editPhotoUri || editPet?.photoURL }} style={s.photo} />
                  <View style={s.photoChangeOverlay}>
                    <Ionicons name="camera-outline" size={18} color="#fff" />
                    <Text style={s.photoChangeText}>Change</Text>
                  </View>
                </View>
              ) : (
                <View style={s.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#94A3B8" />
                  <Text style={s.photoPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={s.label}>Pet Name *</Text>
            <TextInput style={s.input} value={editForm.name} onChangeText={v => setEditForm(f => ({ ...f, name: v }))} />

            <Text style={s.label}>Breed *</Text>
            <TextInput style={s.input} value={editForm.breed} onChangeText={v => setEditForm(f => ({ ...f, breed: v }))} />

            <View style={s.row2}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Age</Text>
                <TextInput style={s.input} value={editForm.age} onChangeText={v => setEditForm(f => ({ ...f, age: v }))} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Weight</Text>
                <TextInput style={s.input} value={editForm.weight} onChangeText={v => setEditForm(f => ({ ...f, weight: v }))} />
              </View>
            </View>

            <Text style={s.label}>Gender</Text>
            <View style={s.chipRowInline}>
              {GENDERS.map(g => (
                <TouchableOpacity key={g} style={[s.chip, editForm.gender === g && s.chipActive]} onPress={() => setEditForm(f => ({ ...f, gender: g }))}>
                  <Text style={[s.chipText, editForm.gender === g && s.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.label}>Color / Markings</Text>
            <TextInput style={s.input} value={editForm.color} onChangeText={v => setEditForm(f => ({ ...f, color: v }))} />

            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, { height: 80, textAlignVertical: "top" }]}
              value={editForm.description}
              onChangeText={v => setEditForm(f => ({ ...f, description: v }))}
              multiline
            />

            <Text style={s.label}>Contact Phone</Text>
            <TextInput style={s.input} value={editForm.contactPhone} onChangeText={v => setEditForm(f => ({ ...f, contactPhone: v }))} keyboardType="phone-pad" />

            <Text style={s.label}>Contact Email</Text>
            <TextInput style={s.input} value={editForm.contactEmail} onChangeText={v => setEditForm(f => ({ ...f, contactEmail: v }))} autoCapitalize="none" keyboardType="email-address" />

            <Text style={s.label}>Status</Text>
            <View style={s.chipRowInline}>
              {STATUSES.map(st => (
                <TouchableOpacity key={st} style={[s.chip, editForm.status === st && s.chipActive]} onPress={() => setEditForm(f => ({ ...f, status: st }))}>
                  <Text style={[s.chipText, editForm.status === st && s.chipTextActive]}>{st.charAt(0).toUpperCase() + st.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={s.saveBtn} onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  desc: { fontSize: 13, color: "#64748B", lineHeight: 18, marginBottom: 10 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: BRAND + "15", borderWidth: 1, borderColor: BRAND + "44" },
  editBtnText: { color: BRAND, fontWeight: "700", fontSize: 13 },
  actionBtn: { flex: 1, minWidth: 100, backgroundColor: BRAND, borderRadius: 10, padding: 8, alignItems: "center" },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  modalContainer: { flex: 1, backgroundColor: "#F5F8FF" },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  modalClose: { fontSize: 16, color: BRAND, fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 12 },
  row2: { flexDirection: "row", gap: 12 },
  chipRowInline: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  saveBtn: { backgroundColor: BRAND, borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  photoBox: { alignSelf: "center", marginBottom: 20 },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoChangeOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 32, backgroundColor: "rgba(0,0,0,0.45)", borderBottomLeftRadius: 50, borderBottomRightRadius: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 },
  photoChangeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#F1F5F9", borderWidth: 2, borderColor: "#E2E8F0", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  photoPlaceholderText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
});
