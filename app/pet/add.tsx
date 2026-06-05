import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Switch, ActivityIndicator, Modal, FlatList, Image, Alert, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { isWeb, webDb, webStorage } from "@/lib/firebase";
import { collection as webCollection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import _nativeFirestore from "@react-native-firebase/firestore";
import _nativeStorage from "@react-native-firebase/storage";
// ImagePicker loaded lazily in pickPhoto()

const BRAND = "#4486F4";

const SPECIES = ["dog", "cat"];
const ACTIVITY_LEVELS = ["sedentary", "indoor", "active", "very active"];
const BREEDS_DOG = ['Affenpinscher', 'Afghan Hound', 'Airedale Terrier', 'Akita', 'Alaskan Malamute', 'American Bulldog', 'American Eskimo', 'American Pit Bull Terrier', 'American Staffordshire Terrier', 'Australian Shepherd', 'Basenji', 'Basset Hound', 'Beagle', 'Belgian Malinois', 'Bernese Mountain Dog', 'Bichon Frise', 'Border Collie', 'Border Terrier', 'Boston Terrier', 'Boxer', 'Boykin Spaniel', 'Brittany', 'Bulldog', 'Bullmastiff', 'Cairn Terrier', 'Cane Corso', 'Cavalier King Charles Spaniel', 'Chihuahua', 'Chinese Shar-Pei', 'Chow Chow', 'Cocker Spaniel', 'Collie', 'Dachshund', 'Dalmatian', 'Doberman Pinscher', 'English Setter', 'English Springer Spaniel', 'French Bulldog', 'German Shepherd', 'German Shorthaired Pointer', 'Golden Retriever', 'Great Dane', 'Great Pyrenees', 'Greyhound', 'Havanese', 'Irish Setter', 'Irish Wolfhound', 'Italian Greyhound', 'Jack Russell Terrier', 'Labrador Retriever', 'Lhasa Apso', 'Maltese', 'Mastiff', 'Miniature Pinscher', 'Miniature Schnauzer', 'Newfoundland', 'Norwegian Elkhound', 'Old English Sheepdog', 'Papillon', 'Pekingese', 'Pembroke Welsh Corgi', 'Pit Bull', 'Pointer', 'Pomeranian', 'Poodle', 'Portuguese Water Dog', 'Pug', 'Rhodesian Ridgeback', 'Rottweiler', 'Saint Bernard', 'Samoyed', 'Schipperke', 'Scottish Terrier', 'Shetland Sheepdog', 'Shiba Inu', 'Shih Tzu', 'Siberian Husky', 'Soft Coated Wheaten Terrier', 'Staffordshire Bull Terrier', 'Standard Schnauzer', 'Toy Fox Terrier', 'Vizsla', 'Weimaraner', 'West Highland White Terrier', 'Whippet', 'Wire Fox Terrier', 'Yorkshire Terrier', 'Mixed/Other'];
const BREEDS_CAT = ['Abyssinian', 'American Bobtail', 'American Curl', 'American Shorthair', 'Balinese', 'Bengal', 'Birman', 'Bombay', 'British Longhair', 'British Shorthair', 'Burmese', 'Burmilla', 'Chartreux', 'Chausie', 'Cornish Rex', 'Devon Rex', 'Egyptian Mau', 'Exotic Shorthair', 'Havana Brown', 'Himalayan', 'Japanese Bobtail', 'Khao Manee', 'Korat', 'LaPerm', 'Maine Coon', 'Manx', 'Munchkin', 'Nebelung', 'Norwegian Forest Cat', 'Ocicat', 'Oriental Shorthair', 'Persian', 'Peterbald', 'Pixiebob', 'Ragamuffin', 'Ragdoll', 'Russian Blue', 'Savannah', 'Scottish Fold', 'Selkirk Rex', 'Siamese', 'Siberian', 'Singapura', 'Snowshoe', 'Somali', 'Sphynx', 'Thai', 'Tonkinese', 'Toyger', 'Turkish Angora', 'Turkish Van', 'Mixed/Other'];

// ── Dropdown Picker ──────────────────────────────────────────────────────────
function DropdownPicker({
  label, value, options, onSelect,
}: { label: string; value: string; options: string[]; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.dropdown} onPress={() => setOpen(true)}>
        <Text style={styles.dropdownValue}>{value}</Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{label}</Text>
            <Pressable onPress={() => { setOpen(false); setSearch(""); }}>
              <Text style={styles.pickerDone}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.pickerSearch}>
            <TextInput
              style={styles.pickerSearchInput}
              placeholder="Search..."
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pickerItem, item === value && styles.pickerItemActive]}
                onPress={() => { onSelect(item); setOpen(false); setSearch(""); }}
              >
                <Text style={[styles.pickerItemText, item === value && styles.pickerItemTextActive]}>{item}</Text>
                {item === value && <Text style={styles.pickerCheck}>✓</Text>}
              </Pressable>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </>
  );
}

export default function AddPetScreen() {
  const router = useRouter();
  const { user, isDemoMode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  async function pickPhoto() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to add photos!"); return; }
    let IP: any;
    try { IP = require("expo-image-picker"); } catch {
      Alert.alert("Coming Soon", "Photo upload will be available soon. 🐾"); return;
    }
    if (!IP?.launchImageLibraryAsync) {
      Alert.alert("Coming Soon", "Photo upload will be available soon. 🐾"); return;
    }
    Alert.alert("Add Pet Photo", "Choose a source", [
      {
        text: "📷 Camera",
        onPress: async () => {
          const { status } = await IP.requestCameraPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Please allow camera access in Settings."); return; }
          const result = await IP.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: "🖼️ Photo Library",
        onPress: async () => {
          const { status } = await IP.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") { Alert.alert("Permission needed", "Please allow photo access in Settings."); return; }
          const result = await IP.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function uploadPhoto(uid: string, petId: string): Promise<string | null> {
    if (!photoUri) return null;
    try {
      if (isWeb) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const storageRef = ref(webStorage, `users/${uid}/pets/${petId}/photo.jpg`);
        await uploadBytes(storageRef, blob);
        return await getDownloadURL(storageRef);
      } else {
        const storageRef = _nativeStorage().ref(`users/${uid}/pets/${petId}/photo.jpg`);
        await storageRef.putFile(photoUri);
        return await storageRef.getDownloadURL();
      }
    } catch { return null; }
  }

  const [name, setName] = useState("");
  const [species, setSpecies] = useState("dog");
  const [breed, setBreed] = useState("Golden Retriever");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [weightUnit, setWeightUnit] = useState("lbs");
  const [sex, setSex] = useState("male");
  const [neutered, setNeutered] = useState(false);
  const [activityLevel, setActivityLevel] = useState("active");
  const [licenseNumber, setLicenseNumber] = useState("");

  const breeds = species === "dog" ? BREEDS_DOG : BREEDS_CAT;

  async function handleSave() {
    if (isDemoMode) { setError("This is a demo — sign up free to add your own pets."); return; }
    if (!name.trim()) { setError("Please enter your pet's name"); return; }
    if (!age.trim()) { setError("Please enter your pet's age"); return; }
    if (!weight.trim()) { setError("Please enter your pet's weight"); return; }
    if (!user) { setError("You must be signed in"); return; }

    setLoading(true);
    setError("");

    try {
      const petData: Record<string, any> = {
        name: name.trim(),
        species,
        breed,
        age: parseFloat(age),
        weight: parseFloat(weight),
        weightUnit,
        sex,
        neutered,
        activityLevel,
      };
      if (licenseNumber.trim()) petData.licenseNumber = licenseNumber.trim();

      let petId: string;
      if (isWeb) {
        const docRef = await addDoc(webCollection(webDb, "users", user.uid, "pets"), {
          ...petData,
          createdAt: serverTimestamp(),
        });
        petId = docRef.id;
      } else {
        const docRef = await _nativeFirestore()
          .collection("users")
          .doc(user.uid)
          .collection("pets")
          .add({
            ...petData,
            createdAt: _nativeFirestore.FieldValue.serverTimestamp(),
          });
        petId = docRef.id;
      }
      // Upload photo if selected
      if (photoUri) {
        const photoURL = await uploadPhoto(user.uid, petId);
        if (photoURL) {
          if (isWeb) {
            const { doc, updateDoc } = await import("firebase/firestore");
            await updateDoc(doc(webDb, "users", user.uid, "pets", petId), { photoURL });
          } else {
            await _nativeFirestore().collection("users").doc(user.uid).collection("pets").doc(petId).update({ photoURL });
          }
        }
      }
      router.back();
    } catch (e) {
      setError("Failed to save pet. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Photo */}
      <Pressable style={styles.photoBtn} onPress={pickPhoto}>
        {photoUri
          ? <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          : <View style={styles.photoPlaceholder}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={styles.photoText}>Add Pet Photo</Text>
              <Text style={styles.photoSub}>Tap to choose from library</Text>
            </View>
        }
      </Pressable>

      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Pet Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. Buddy" value={name} onChangeText={setName} />
      </View>

      {/* Species */}
      <View style={styles.section}>
        <Text style={styles.label}>Species *</Text>
        <View style={styles.optionRow}>
          {SPECIES.map(s => (
            <Pressable key={s} style={[styles.option, species === s && styles.optionActive]} onPress={() => {
              setSpecies(s);
              setBreed(s === "dog" ? BREEDS_DOG[0] : BREEDS_CAT[0]);
            }}>
              <Text style={[styles.optionText, species === s && styles.optionTextActive]}>
                {s === "dog" ? "🐶 Dog" : "🐱 Cat"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Breed Dropdown */}
      <View style={styles.section}>
        <DropdownPicker
          label="Breed *"
          value={breed}
          options={breeds}
          onSelect={setBreed}
        />
      </View>

      {/* Age & Weight */}
      <View style={styles.row}>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Age (years) *</Text>
          <TextInput style={styles.input} placeholder="e.g. 3" keyboardType="decimal-pad" value={age} onChangeText={(t) => setAge(t.replace(/[^0-9.]/g, ""))} />
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Weight *</Text>
          <View style={styles.weightRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="e.g. 65" keyboardType="decimal-pad" value={weight} onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ""))} />
            <Pressable style={styles.unitToggle} onPress={() => setWeightUnit(weightUnit === "lbs" ? "kg" : "lbs")}>
              <Text style={styles.unitText}>{weightUnit}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Sex */}
      <View style={styles.section}>
        <Text style={styles.label}>Sex *</Text>
        <View style={styles.optionRow}>
          {["male", "female"].map(s => (
            <Pressable key={s} style={[styles.option, sex === s && styles.optionActive]} onPress={() => setSex(s)}>
              <Text style={[styles.optionText, sex === s && styles.optionTextActive]}>
                {s === "male" ? "♂ Male" : "♀ Female"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Neutered */}
      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Spayed / Neutered</Text>
          <Switch value={neutered} onValueChange={setNeutered} trackColor={{ true: BRAND }} />
        </View>
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <Text style={styles.label}>Activity Level *</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_LEVELS.map(a => (
            <Pressable key={a} style={[styles.activityChip, activityLevel === a && styles.activityChipActive]} onPress={() => setActivityLevel(a)}>
              <Text style={[styles.activityText, activityLevel === a && styles.activityTextActive]}>
                {a === "sedentary" ? "😴 Sedentary" : a === "indoor" ? "🏠 Indoor" : a === "active" ? "🏃 Active" : "⚡ Very Active"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* License Number */}
      <View style={styles.section}>
        <Text style={styles.label}>License Number (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="State/city pet license #"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          autoCapitalize="characters"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.saveBtn, loading && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Pet 🐾</Text>}
      </Pressable>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 20, paddingBottom: 60, gap: 4 },
  section: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", borderWidth: 1, borderColor: "#eee" },
  row: { flexDirection: "row", gap: 12 },
  weightRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  unitToggle: { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  unitText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  optionRow: { flexDirection: "row", gap: 10 },
  option: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#eee" },
  optionActive: { backgroundColor: BRAND, borderColor: BRAND },
  optionText: { fontSize: 15, color: "#555", fontWeight: "500" },
  optionTextActive: { color: "#fff", fontWeight: "600" },
  activityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  activityChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },
  activityChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  activityText: { fontSize: 13, color: "#555" },
  activityTextActive: { color: "#fff", fontWeight: "600" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  error: { color: "#E53935", fontSize: 14, textAlign: "center", marginBottom: 8 },
  photoBtn: { alignItems: "center", marginBottom: 24 },
  photoPreview: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: BRAND },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#f0faf5", borderWidth: 2, borderColor: BRAND + "44", borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  photoIcon: { fontSize: 32, marginBottom: 4 },
  photoText: { fontSize: 12, fontWeight: "700", color: BRAND },
  photoSub: { fontSize: 10, color: "#888", marginTop: 2 },
  saveBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled: { backgroundColor: "#ccc" },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  // Dropdown
  dropdown: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#eee", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownValue: { fontSize: 15, color: "#1a1a1a", flex: 1 },
  dropdownArrow: { fontSize: 16, color: "#888", marginLeft: 8 },
  // Picker Modal
  pickerModal: { flex: 1, backgroundColor: "#f8f8f8" },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee", backgroundColor: "#fff" },
  pickerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  pickerDone: { fontSize: 16, color: BRAND, fontWeight: "600" },
  pickerSearch: { padding: 12, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#eee" },
  pickerSearchInput: { backgroundColor: "#f8f8f8", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: "#1a1a1a" },
  pickerItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff" },
  pickerItemActive: { backgroundColor: "#f0faf5" },
  pickerItemText: { fontSize: 15, color: "#1a1a1a" },
  pickerItemTextActive: { color: BRAND, fontWeight: "600" },
  pickerCheck: { fontSize: 16, color: BRAND, fontWeight: "700" },
});
