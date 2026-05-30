import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from "react-native";
import { isWeb, webAuth, webDb } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

const BRAND = "#4CAF82";
const SPECIES = ["Dog", "Cat", "Rabbit", "Bird", "Other"];
const GENDERS = ["Male", "Female", "Unknown"];
const STATUSES = ["Available", "Pending", "Adopted"];

export default function ShelterAddPet() {
  const [saving, setSaving] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", species: "Dog", breed: "", age: "", weight: "",
    gender: "Male", color: "", description: "", contactPhone: "",
    contactEmail: "", status: "Available",
  });

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleSubmit() {
    if (!form.name.trim()) { Alert.alert("Required", "Please enter the pet's name."); return; }
    if (!form.breed.trim()) { Alert.alert("Required", "Please enter the breed."); return; }
    const user = webAuth.currentUser;
    if (!user || !isWeb) return;
    setSaving(true);
    try {
      await addDoc(collection(webDb, "shelter_pets"), {
        ...form,
        shelterId: user.uid,
        photoUri: photoUri || null,
        status: form.status.toLowerCase(),
        createdAt: serverTimestamp(),
      });
      Alert.alert("✅ Pet Added", `${form.name} has been added to your listings!`);
      setForm({ name: "", species: "Dog", breed: "", age: "", weight: "", gender: "Male", color: "", description: "", contactPhone: "", contactEmail: "", status: "Available" });
      setPhotoUri(null);
    } catch (e) {
      Alert.alert("Error", "Failed to add pet. Please try again.");
    } finally { setSaving(false); }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.title}>Add a Pet</Text>

      {/* Photo */}
      <TouchableOpacity style={s.photoBox} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.photo} />
        ) : (
          <View style={s.photoPlaceholder}>
            <Ionicons name="camera-outline" size={32} color="#94A3B8" />
            <Text style={s.photoText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Species */}
      <Text style={s.label}>Species *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
        {SPECIES.map(sp => (
          <TouchableOpacity key={sp} style={[s.chip, form.species === sp && s.chipActive]} onPress={() => set("species", sp)}>
            <Text style={[s.chipText, form.species === sp && s.chipTextActive]}>{sp}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.label}>Pet Name *</Text>
      <TextInput style={s.input} value={form.name} onChangeText={v => set("name", v)} placeholder="e.g. Buddy" />

      <Text style={s.label}>Breed *</Text>
      <TextInput style={s.input} value={form.breed} onChangeText={v => set("breed", v)} placeholder="e.g. Labrador Retriever" />

      <View style={s.row2}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Age</Text>
          <TextInput style={s.input} value={form.age} onChangeText={v => set("age", v)} placeholder="e.g. 2 years" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Weight</Text>
          <TextInput style={s.input} value={form.weight} onChangeText={v => set("weight", v)} placeholder="e.g. 25 lbs" keyboardType="decimal-pad" />
        </View>
      </View>

      <Text style={s.label}>Gender</Text>
      <View style={s.chipRowInline}>
        {GENDERS.map(g => (
          <TouchableOpacity key={g} style={[s.chip, form.gender === g && s.chipActive]} onPress={() => set("gender", g)}>
            <Text style={[s.chipText, form.gender === g && s.chipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.label}>Color / Markings</Text>
      <TextInput style={s.input} value={form.color} onChangeText={v => set("color", v)} placeholder="e.g. Brown and white" />

      <Text style={s.label}>Description</Text>
      <TextInput style={[s.input, { height: 90 }]} value={form.description} onChangeText={v => set("description", v)} placeholder="Personality, health notes, special needs..." multiline />

      <Text style={s.label}>Adoption Status</Text>
      <View style={s.chipRowInline}>
        {STATUSES.map(st => (
          <TouchableOpacity key={st} style={[s.chip, form.status === st && s.chipActive]} onPress={() => set("status", st)}>
            <Text style={[s.chipText, form.status === st && s.chipTextActive]}>{st}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.sectionDivider}>Contact Information</Text>

      <Text style={s.label}>Contact Phone *</Text>
      <TextInput style={s.input} value={form.contactPhone} onChangeText={v => set("contactPhone", v)} placeholder="+1 (555) 000-0000" keyboardType="phone-pad" />

      <Text style={s.label}>Contact Email</Text>
      <TextInput style={s.input} value={form.contactEmail} onChangeText={v => set("contactEmail", v)} placeholder="shelter@example.com" autoCapitalize="none" keyboardType="email-address" />

      <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : (
          <>
            <Ionicons name="paw" size={18} color="#fff" />
            <Text style={s.submitText}>Add Pet to Listings</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 20 },
  photoBox: { alignSelf: "center", marginBottom: 20 },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#F1F5F9", borderWidth: 2, borderColor: "#E2E8F0", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 6 },
  photoText: { fontSize: 13, color: "#94A3B8", fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 16 },
  chipRow: { marginBottom: 16 },
  chipRowInline: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#fff" },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  row2: { flexDirection: "row", gap: 12 },
  sectionDivider: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginTop: 8, marginBottom: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  submitBtn: { backgroundColor: BRAND, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 8 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
