import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  Switch, ActivityIndicator, Modal, FlatList, Image, Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { db, uploadPetPhoto } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";

const BRAND = "#4486F4";

const SPECIES = ["dog", "cat"];
const ACTIVITY_LEVELS = ["sedentary", "indoor", "active", "very active"];
const BREEDS_DOG = ['Affenpinscher','Afghan Hound','Airedale Terrier','Akita','Alaskan Malamute','American Bulldog','American Eskimo','American Pit Bull Terrier','American Staffordshire Terrier','Australian Shepherd','Basenji','Basset Hound','Beagle','Belgian Malinois','Bernese Mountain Dog','Bichon Frise','Border Collie','Border Terrier','Boston Terrier','Boxer','Boykin Spaniel','Brittany','Bulldog','Bullmastiff','Cairn Terrier','Cane Corso','Cavalier King Charles Spaniel','Chihuahua','Chinese Shar-Pei','Chow Chow','Cocker Spaniel','Collie','Dachshund','Dalmatian','Doberman Pinscher','English Setter','English Springer Spaniel','French Bulldog','German Shepherd','German Shorthaired Pointer','Golden Retriever','Great Dane','Great Pyrenees','Greyhound','Havanese','Irish Setter','Irish Wolfhound','Italian Greyhound','Jack Russell Terrier','Labrador Retriever','Lhasa Apso','Maltese','Mastiff','Miniature Pinscher','Miniature Schnauzer','Newfoundland','Norwegian Elkhound','Old English Sheepdog','Papillon','Pekingese','Pembroke Welsh Corgi','Pit Bull','Pointer','Pomeranian','Poodle','Portuguese Water Dog','Pug','Rhodesian Ridgeback','Rottweiler','Saint Bernard','Samoyed','Schipperke','Scottish Terrier','Shetland Sheepdog','Shiba Inu','Shih Tzu','Siberian Husky','Soft Coated Wheaten Terrier','Staffordshire Bull Terrier','Standard Schnauzer','Toy Fox Terrier','Vizsla','Weimaraner','West Highland White Terrier','Whippet','Wire Fox Terrier','Yorkshire Terrier','Mixed/Other'];
const BREEDS_CAT = ['Abyssinian','American Bobtail','American Curl','American Shorthair','Balinese','Bengal','Birman','Bombay','British Longhair','British Shorthair','Burmese','Burmilla','Chartreux','Chausie','Cornish Rex','Devon Rex','Egyptian Mau','Exotic Shorthair','Havana Brown','Himalayan','Japanese Bobtail','Khao Manee','Korat','LaPerm','Maine Coon','Manx','Munchkin','Nebelung','Norwegian Forest Cat','Ocicat','Oriental Shorthair','Persian','Peterbald','Pixiebob','Ragamuffin','Ragdoll','Russian Blue','Savannah','Scottish Fold','Selkirk Rex','Siamese','Siberian','Singapura','Snowshoe','Somali','Sphynx','Thai','Tonkinese','Toyger','Turkish Angora','Turkish Van','Mixed/Other'];

// ── Dropdown Picker ───────────────────────────────────────────────────────────
function DropdownPicker({
  label, value, options, onSelect,
}: { label: string; value: string; options: string[]; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

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
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pickerItem, item === value && styles.pickerItemActive]}
                onPress={() => { onSelect(item); setOpen(false); setSearch(""); }}
              >
                <Text style={[styles.pickerItemText, item === value && styles.pickerItemTextActive]}>
                  {item}
                </Text>
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photos in Settings.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow camera access in Settings.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }

  function showPhotoOptions() {
    Alert.alert("Pet Photo", "Choose a photo source", [
      { text: "Camera", onPress: () => setTimeout(takePhoto, 300) },
      { text: "Photo Library", onPress: () => setTimeout(pickPhoto, 300) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSave() {
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
        createdAt: serverTimestamp(),
      };
      if (licenseNumber.trim()) petData.licenseNumber = licenseNumber.trim();

      // Add pet doc first to get the ID
      const docRef = await addDoc(
        collection(db, "users", user.uid, "pets"),
        petData
      );

      // Upload photo if selected
      if (photoUri) {
        try {
          setUploadingPhoto(true);
          const photoURL = await uploadPetPhoto(user.uid, docRef.id, photoUri);
          const { updateDoc, doc } = await import("firebase/firestore");
          await updateDoc(doc(db, "users", user.uid, "pets", docRef.id), { photoURL });
        } catch (photoErr) {
          console.error("Photo upload failed (pet saved without photo):", photoErr);
          Alert.alert("Photo not saved", "Your pet was saved but the photo couldn't be uploaded. You can add it later.");
        } finally {
          setUploadingPhoto(false);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Photo Picker */}
      <View style={styles.photoSection}>
        <Pressable style={styles.photoCircle} onPress={showPhotoOptions}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderEmoji}>
                {species === "cat" ? "🐱" : "🐶"}
              </Text>
              <Text style={styles.photoPlaceholderText}>Add Photo</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={showPhotoOptions}>
          <Text style={styles.photoChangeText}>
            {photoUri ? "Change photo" : "📷 Add a photo"}
          </Text>
        </Pressable>
      </View>

      {/* Name */}
      <View style={styles.section}>
        <Text style={styles.label}>Pet Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Buddy"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Species */}
      <View style={styles.section}>
        <Text style={styles.label}>Species *</Text>
        <View style={styles.optionRow}>
          {SPECIES.map((s) => (
            <Pressable
              key={s}
              style={[styles.option, species === s && styles.optionActive]}
              onPress={() => {
                setSpecies(s);
                setBreed(s === "dog" ? BREEDS_DOG[0] : BREEDS_CAT[0]);
              }}
            >
              <Text style={[styles.optionText, species === s && styles.optionTextActive]}>
                {s === "dog" ? "🐶 Dog" : "🐱 Cat"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Breed */}
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
          <TextInput
            style={styles.input}
            placeholder="e.g. 3"
            keyboardType="decimal-pad"
            value={age}
            onChangeText={(t) => setAge(t.replace(/[^0-9.]/g, ""))}
          />
        </View>
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.label}>Weight *</Text>
          <View style={styles.weightRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. 65"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={(t) => setWeight(t.replace(/[^0-9.]/g, ""))}
            />
            <Pressable
              style={styles.unitToggle}
              onPress={() => setWeightUnit(weightUnit === "lbs" ? "kg" : "lbs")}
            >
              <Text style={styles.unitText}>{weightUnit}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Sex */}
      <View style={styles.section}>
        <Text style={styles.label}>Sex *</Text>
        <View style={styles.optionRow}>
          {["male", "female"].map((s) => (
            <Pressable
              key={s}
              style={[styles.option, sex === s && styles.optionActive]}
              onPress={() => setSex(s)}
            >
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
          <Switch
            value={neutered}
            onValueChange={setNeutered}
            trackColor={{ true: BRAND }}
          />
        </View>
      </View>

      {/* Activity */}
      <View style={styles.section}>
        <Text style={styles.label}>Activity Level *</Text>
        <View style={styles.activityGrid}>
          {ACTIVITY_LEVELS.map((a) => (
            <Pressable
              key={a}
              style={[styles.activityChip, activityLevel === a && styles.activityChipActive]}
              onPress={() => setActivityLevel(a)}
            >
              <Text style={[styles.activityText, activityLevel === a && styles.activityTextActive]}>
                {a === "sedentary" ? "😴 Sedentary"
                  : a === "indoor" ? "🏠 Indoor"
                  : a === "active" ? "🏃 Active"
                  : "⚡ Very Active"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* License */}
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

      <Pressable
        style={[styles.saveBtn, (loading || uploadingPhoto) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={loading || uploadingPhoto}
      >
        {loading || uploadingPhoto ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save Pet 🐾</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 20, paddingBottom: 60, gap: 4 },
  photoSection: { alignItems: "center", marginBottom: 20 },
  photoCircle: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", marginBottom: 8 },
  photoPreview: { width: 100, height: 100 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#f0f8f4", borderWidth: 2, borderColor: BRAND + "44", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  photoPlaceholderEmoji: { fontSize: 32 },
  photoPlaceholderText: { fontSize: 11, color: BRAND, fontWeight: "600" },
  photoChangeText: { fontSize: 14, color: BRAND, fontWeight: "600" },
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
  saveBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  saveBtnDisabled: { backgroundColor: "#ccc" },
  saveBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  dropdown: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#eee", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownValue: { fontSize: 15, color: "#1a1a1a", flex: 1 },
  dropdownArrow: { fontSize: 16, color: "#888", marginLeft: 8 },
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
