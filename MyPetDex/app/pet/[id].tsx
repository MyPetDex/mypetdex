import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, TextInput, Modal, Platform,
  Share, Linking, Switch, Image, FlatList,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { db, uploadPetPhoto } from "@/lib/firebase";
import {
  doc, onSnapshot, updateDoc, deleteDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import DatePicker from "@/components/DatePicker";
import QRCode from "react-native-qrcode-svg";

const BRAND = "#4486F4";
const BLUE = "#4486F4";
const TABS = ["Records", "Reminders", "Calories", "Recipes"];

const BREEDS_DOG = ['Affenpinscher','Afghan Hound','Airedale Terrier','Akita','Alaskan Malamute','American Bulldog','American Eskimo','American Pit Bull Terrier','American Staffordshire Terrier','Australian Shepherd','Basenji','Basset Hound','Beagle','Belgian Malinois','Bernese Mountain Dog','Bichon Frise','Border Collie','Border Terrier','Boston Terrier','Boxer','Boykin Spaniel','Brittany','Bulldog','Bullmastiff','Cairn Terrier','Cane Corso','Cavalier King Charles Spaniel','Chihuahua','Chinese Shar-Pei','Chow Chow','Cocker Spaniel','Collie','Dachshund','Dalmatian','Doberman Pinscher','English Setter','English Springer Spaniel','French Bulldog','German Shepherd','German Shorthaired Pointer','Golden Retriever','Great Dane','Great Pyrenees','Greyhound','Havanese','Irish Setter','Irish Wolfhound','Italian Greyhound','Jack Russell Terrier','Labrador Retriever','Lhasa Apso','Maltese','Mastiff','Miniature Pinscher','Miniature Schnauzer','Newfoundland','Norwegian Elkhound','Old English Sheepdog','Papillon','Pekingese','Pembroke Welsh Corgi','Pit Bull','Pointer','Pomeranian','Poodle','Portuguese Water Dog','Pug','Rhodesian Ridgeback','Rottweiler','Saint Bernard','Samoyed','Schipperke','Scottish Terrier','Shetland Sheepdog','Shiba Inu','Shih Tzu','Siberian Husky','Soft Coated Wheaten Terrier','Staffordshire Bull Terrier','Standard Schnauzer','Toy Fox Terrier','Vizsla','Weimaraner','West Highland White Terrier','Whippet','Wire Fox Terrier','Yorkshire Terrier','Mixed/Other'];
const BREEDS_CAT = ['Abyssinian','American Bobtail','American Curl','American Shorthair','Balinese','Bengal','Birman','Bombay','British Longhair','British Shorthair','Burmese','Burmilla','Chartreux','Chausie','Cornish Rex','Devon Rex','Egyptian Mau','Exotic Shorthair','Havana Brown','Himalayan','Japanese Bobtail','Khao Manee','Korat','LaPerm','Maine Coon','Manx','Munchkin','Nebelung','Norwegian Forest Cat','Ocicat','Oriental Shorthair','Persian','Peterbald','Pixiebob','Ragamuffin','Ragdoll','Russian Blue','Savannah','Scottish Fold','Selkirk Rex','Siamese','Siberian','Singapura','Snowshoe','Somali','Sphynx','Thai','Tonkinese','Toyger','Turkish Angora','Turkish Van','Mixed/Other'];
const ACTIVITY_LEVELS = ["sedentary", "indoor", "active", "very active"];

// ── Breed Dropdown ─────────────────────────────────────────────────────────────
function BreedDropdown({ value, options, onSelect }: { value: string; options: string[]; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <Pressable style={styles.dropdown} onPress={() => setOpen(true)}>
        <Text style={styles.dropdownValue}>{value}</Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Breed</Text>
            <Pressable onPress={() => { setOpen(false); setSearch(""); }}><Text style={styles.pickerDone}>Done</Text></Pressable>
          </View>
          <View style={styles.pickerSearch}>
            <TextInput style={styles.pickerSearchInput} placeholder="Search..." value={search} onChangeText={setSearch} autoFocus />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable style={[styles.pickerItem, item === value && styles.pickerItemActive]} onPress={() => { onSelect(item); setOpen(false); setSearch(""); }}>
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

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { plan } = usePlan();
  const router = useRouter();
  const navigation = useNavigation();

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Records");
  const [showQR, setShowQR] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSpecies, setEditSpecies] = useState("dog");
  const [editBreed, setEditBreed] = useState("");
  const [editAge, setEditAge] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editWeightUnit, setEditWeightUnit] = useState("lbs");
  const [editSex, setEditSex] = useState("male");
  const [editNeutered, setEditNeutered] = useState(false);
  const [editActivity, setEditActivity] = useState("active");
  const [editLicense, setEditLicense] = useState("");
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const unsub = onSnapshot(
      doc(db, "users", user.uid, "pets", id as string),
      (snap) => {
        if (snap.exists()) {
          setPet({ id: snap.id, ...snap.data() });
        } else {
          Alert.alert("Not found", "This pet could not be found.");
          router.back();
        }
        setLoading(false);
      },
      () => {
        Alert.alert("Error", "Could not load pet.");
        setLoading(false);
      }
    );
    return unsub;
  }, [user, id]);

  // Wire header right button — Edit + Delete
  useEffect(() => {
    if (!pet) return;
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 12, marginRight: 4 }}>
          <Pressable onPress={openEdit} hitSlop={8}>
            <Text style={{ fontSize: 15, color: BRAND, fontWeight: "600" }}>✏️ Edit</Text>
          </Pressable>
          <Pressable onPress={handleDeletePet} hitSlop={8}>
            <Text style={{ fontSize: 15, color: "#E53935", fontWeight: "600" }}>🗑️</Text>
          </Pressable>
        </View>
      ),
    });
  }, [pet]);

  function openEdit() {
    if (!pet) return;
    setEditName(pet.name || "");
    setEditSpecies(pet.species || "dog");
    setEditBreed(pet.breed || "");
    setEditAge(pet.age?.toString() || "");
    setEditWeight(pet.weight?.toString() || "");
    setEditWeightUnit(pet.weightUnit || "lbs");
    setEditSex(pet.sex || "male");
    setEditNeutered(!!pet.neutered);
    setEditActivity(pet.activityLevel || "active");
    setEditLicense(pet.licenseNumber || "");
    setEditPhotoUri(null);
    setShowEdit(true);
  }

  async function pickEditPhoto() {
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
      setEditPhotoUri(result.assets[0].uri);
    }
  }

  async function takeEditPhoto() {
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
      setEditPhotoUri(result.assets[0].uri);
    }
  }

  function showPhotoOptions() {
    Alert.alert("Pet Photo", "Choose a photo source", [
      { text: "Camera", onPress: () => setTimeout(takeEditPhoto, 300) },
      { text: "Photo Library", onPress: () => setTimeout(pickEditPhoto, 300) },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function saveEdit() {
    if (!editName.trim()) { Alert.alert("Missing info", "Please enter your pet's name."); return; }
    setEditSaving(true);
    let photoUploadFailed = false;
    try {
      const updates: Record<string, any> = {
        name: editName.trim(),
        species: editSpecies,
        breed: editBreed,
        age: parseFloat(editAge) || 0,
        weight: parseFloat(editWeight) || 0,
        weightUnit: editWeightUnit,
        sex: editSex,
        neutered: editNeutered,
        activityLevel: editActivity,
        licenseNumber: editLicense.trim() || null,
      };

      if (editPhotoUri) {
        try {
          updates.photoURL = await uploadPetPhoto(user!.uid, pet.id, editPhotoUri);
        } catch (photoErr) {
          console.error("Photo upload failed:", photoErr);
          photoUploadFailed = true;
        }
      }

      await updateDoc(doc(db, "users", user!.uid, "pets", pet.id), updates);
      setShowEdit(false);
      if (photoUploadFailed) {
        Alert.alert("Photo not saved", "Your other changes were saved but the photo couldn't be uploaded. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Could not save changes. Please try again.");
    }
    setEditSaving(false);
  }

  function handleDeletePet() {
    Alert.alert(
      `Delete ${pet?.name}?`,
      "This will permanently delete this pet and all their records. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "users", user!.uid, "pets", pet.id));
              router.back();
            } catch {
              Alert.alert("Error", "Could not delete pet. Please try again.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }
  if (!pet) return null;

  const canUseAI = plan === "plus" || plan === "family";
  const displayPhoto = editPhotoUri || pet.photoURL;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          {pet.photoURL ? (
            <Image source={{ uri: pet.photoURL }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarEmoji}>{pet.species === "cat" ? "🐱" : "🐶"}</Text>
          )}
        </View>
        <View style={styles.nameRow}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Pressable style={styles.qrBtn} onPress={() => setShowQR(true)}>
            <Text style={styles.qrBtnText}>📱 QR</Text>
          </Pressable>
        </View>
        <Text style={styles.petBreed}>{pet.breed}</Text>
        <View style={styles.petTags}>
          {pet.age ? <View style={styles.tag}><Text style={styles.tagText}>Age {pet.age}</Text></View> : null}
          {pet.weight ? <View style={styles.tag}><Text style={styles.tagText}>{pet.weight} {pet.weightUnit || "lbs"}</Text></View> : null}
          {pet.activityLevel ? <View style={styles.tag}><Text style={styles.tagText}>{pet.activityLevel}</Text></View> : null}
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {/* QR Modal */}
      <Modal visible={showQR} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowQR(false)}>
        <View style={styles.qrModalContainer}>
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>🐾 {pet.name}'s QR Code</Text>
            <Pressable onPress={() => setShowQR(false)}><Text style={styles.qrModalClose}>Done</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.qrModalScroll}>
            <Text style={styles.qrModalSub}>Anyone can scan this to see {pet.name}'s emergency info — no app needed.</Text>
            <View style={styles.qrCodeBox}>
              <QRCode value={`https://app.mypetdex.app/pet/${pet.id}`} size={220} color="#1a1a1a" backgroundColor="#fff" />
            </View>
            <View style={styles.qrInfoCard}>
              <Text style={styles.qrInfoTitle}>🚨 Emergency Info</Text>
              {[
                ["Name", pet.name],
                ["Species", pet.species || pet.type],
                ["Breed", pet.breed],
                ["Age", pet.age ? `${pet.age} years` : null],
                ["Weight", pet.weight ? `${pet.weight} ${pet.weightUnit || "lbs"}` : null],
                ["Sex", pet.sex],
                ["Neutered", pet.neutered !== undefined ? (pet.neutered ? "Yes" : "No") : null],
                ["License #", pet.licenseNumber],
              ].filter(([, v]) => v).map(([label, value]) => (
                <View key={label as string} style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>{label}</Text>
                  <Text style={styles.qrInfoValue}>{value}</Text>
                </View>
              ))}
            </View>
            {(pet.vaccines || []).length > 0 && (
              <View style={styles.qrInfoCard}>
                <Text style={styles.qrInfoTitle}>💉 Vaccine Records</Text>
                {(pet.vaccines || []).map((v: any, i: number) => (
                  <View key={i} style={styles.qrVaccineRow}>
                    <View style={styles.qrVaccineDot} />
                    <View style={styles.qrVaccineInfo}>
                      <Text style={styles.qrVaccineName}>{v.title}</Text>
                      <Text style={styles.qrVaccineDate}>{v.type} · {v.date}</Text>
                      {v.note ? <Text style={styles.qrVaccineNote}>{v.note}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.qrBtnRow}>
              <Pressable style={[styles.qrActionBtn, styles.qrActionBtnBlue]} onPress={() => Linking.openURL(`https://app.mypetdex.app/pet/${pet.id}`)}>
                <Text style={styles.qrActionBtnText}>🔗 Open Link</Text>
              </Pressable>
              <Pressable style={[styles.qrActionBtn, styles.qrActionBtnGreen]} onPress={() => Share.share({ message: `🐾 ${pet.name}'s emergency info: https://app.mypetdex.app/pet/${pet.id}`, url: `https://app.mypetdex.app/pet/${pet.id}` })}>
                <Text style={styles.qrActionBtnText}>📤 Share</Text>
              </Pressable>
            </View>
            <Text style={styles.qrTip}>💡 Print this QR and attach it to {pet.name}'s collar tag</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Pet Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit {pet.name}</Text>
            <Pressable onPress={() => setShowEdit(false)}><Text style={styles.modalClose}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">

            {/* Photo */}
            <View style={styles.photoSection}>
              <Pressable style={styles.photoCircle} onPress={showPhotoOptions}>
                {editPhotoUri || pet.photoURL ? (
                  <Image source={{ uri: editPhotoUri || pet.photoURL }} style={styles.photoPreview} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Text style={styles.photoPlaceholderEmoji}>{editSpecies === "cat" ? "🐱" : "🐶"}</Text>
                    <Text style={styles.photoPlaceholderText}>Add Photo</Text>
                  </View>
                )}
              </Pressable>
              <Pressable onPress={showPhotoOptions}>
                <Text style={styles.photoChangeText}>📷 Change photo</Text>
              </Pressable>
            </View>

            <Text style={styles.modalLabel}>Pet Name *</Text>
            <TextInput style={styles.modalInput} value={editName} onChangeText={setEditName} placeholder="e.g. Buddy" placeholderTextColor="#aaa" />

            <Text style={styles.modalLabel}>Species</Text>
            <View style={styles.optionRow}>
              {["dog", "cat"].map((s) => (
                <Pressable key={s} style={[styles.option, editSpecies === s && styles.optionActive]} onPress={() => { setEditSpecies(s); setEditBreed(s === "dog" ? BREEDS_DOG[0] : BREEDS_CAT[0]); }}>
                  <Text style={[styles.optionText, editSpecies === s && styles.optionTextActive]}>{s === "dog" ? "🐶 Dog" : "🐱 Cat"}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>Breed</Text>
            <BreedDropdown
              value={editBreed || (editSpecies === "dog" ? BREEDS_DOG[0] : BREEDS_CAT[0])}
              options={editSpecies === "dog" ? BREEDS_DOG : BREEDS_CAT}
              onSelect={setEditBreed}
            />

            <View style={styles.editRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Age (years)</Text>
                <TextInput style={styles.modalInput} value={editAge} onChangeText={(t) => setEditAge(t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="e.g. 3" placeholderTextColor="#aaa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Weight</Text>
                <View style={styles.weightRow}>
                  <TextInput style={[styles.modalInput, { flex: 1 }]} value={editWeight} onChangeText={(t) => setEditWeight(t.replace(/[^0-9.]/g, ""))} keyboardType="decimal-pad" placeholder="e.g. 65" placeholderTextColor="#aaa" />
                  <Pressable style={styles.unitToggle} onPress={() => setEditWeightUnit(editWeightUnit === "lbs" ? "kg" : "lbs")}>
                    <Text style={styles.unitText}>{editWeightUnit}</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <Text style={styles.modalLabel}>Sex</Text>
            <View style={styles.optionRow}>
              {["male", "female"].map((s) => (
                <Pressable key={s} style={[styles.option, editSex === s && styles.optionActive]} onPress={() => setEditSex(s)}>
                  <Text style={[styles.optionText, editSex === s && styles.optionTextActive]}>{s === "male" ? "♂ Male" : "♀ Female"}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.modalLabel}>Spayed / Neutered</Text>
              <Switch value={editNeutered} onValueChange={setEditNeutered} trackColor={{ true: BRAND }} />
            </View>

            <Text style={styles.modalLabel}>Activity Level</Text>
            <View style={styles.activityGrid}>
              {ACTIVITY_LEVELS.map((a) => (
                <Pressable key={a} style={[styles.activityChip, editActivity === a && styles.activityChipActive]} onPress={() => setEditActivity(a)}>
                  <Text style={[styles.activityText, editActivity === a && styles.activityTextActive]}>
                    {a === "sedentary" ? "😴 Sedentary" : a === "indoor" ? "🏠 Indoor" : a === "active" ? "🏃 Active" : "⚡ Very Active"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>License Number (optional)</Text>
            <TextInput style={styles.modalInput} value={editLicense} onChangeText={setEditLicense} placeholder="State/city license #" placeholderTextColor="#aaa" autoCapitalize="characters" />

            <Pressable style={[styles.saveBtn, editSaving && { opacity: 0.6 }]} onPress={saveEdit} disabled={editSaving}>
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {activeTab === "Records" && <RecordsTab pet={pet} user={user} />}
        {activeTab === "Reminders" && <RemindersTab pet={pet} user={user} />}
        {activeTab === "Calories" && <CaloriesTab pet={pet} />}
        {activeTab === "Recipes" && <RecipesTab pet={pet} canUseAI={canUseAI} />}
      </ScrollView>
    </View>
  );
}

// ── Records Tab ───────────────────────────────────────────────────────────────
function RecordsTab({ pet, user }: { pet: any; user: any }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", type: "Vet Visit", date: "", note: "" });

  const vaccines = pet.vaccines || [];
  const RECORD_TYPES = ["Vet Visit", "Vaccination", "Medication", "Surgery", "Other"];
  const TYPE_COLORS: Record<string, string> = {
    "Vet Visit": BRAND, "Vaccination": BLUE, "Medication": "#F4A644", "Surgery": "#E53935", "Other": "#888",
  };

  async function saveRecord() {
    if (!form.title.trim() || !form.date.trim()) { Alert.alert("Missing info", "Please add a title and date."); return; }
    setSaving(true);
    try {
      const updated = [...vaccines, { ...form, id: Date.now().toString() }];
      await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { vaccines: updated });
      setShowModal(false);
      setForm({ title: "", type: "Vet Visit", date: "", note: "" });
    } catch { Alert.alert("Error", "Could not save record."); }
    setSaving(false);
  }

  async function deleteRecord(recordId: string) {
    Alert.alert("Delete Record", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const updated = vaccines.filter((v: any) => v.id !== recordId);
        await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { vaccines: updated });
      }},
    ]);
  }

  return (
    <View style={styles.tabContent}>
      {vaccines.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No records yet</Text>
          <Text style={styles.emptySub}>Track vet visits, vaccines & medications</Text>
        </View>
      ) : (
        vaccines.map((r: any) => (
          <Pressable key={r.id} style={styles.recordCard} onLongPress={() => deleteRecord(r.id)}>
            <View style={[styles.recordBar, { backgroundColor: TYPE_COLORS[r.type] || BRAND }]} />
            <View style={styles.recordContent}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>{r.title}</Text>
                <Text style={styles.recordDate}>{r.date}</Text>
              </View>
              <Text style={styles.recordType}>{r.type}</Text>
              {r.note ? <Text style={styles.recordNote}>{r.note}</Text> : null}
            </View>
            <Pressable onPress={() => deleteRecord(r.id)} hitSlop={8} style={{ padding: 8 }}>
              <Text style={{ fontSize: 16 }}>🗑️</Text>
            </Pressable>
          </Pressable>
        ))
      )}
      <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>+ Add Record</Text>
      </Pressable>
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Record</Text>
            <Pressable onPress={() => setShowModal(false)}><Text style={styles.modalClose}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {RECORD_TYPES.map((t) => (
                <Pressable key={t} style={[styles.typeChip, form.type === t && styles.typeChipActive]} onPress={() => setForm((f) => ({ ...f, type: t }))}>
                  <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput style={styles.modalInput} value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Annual checkup" placeholderTextColor="#aaa" />
            <DatePicker label="Date *" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} future={false} />
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.note} onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} placeholder="Any additional details..." placeholderTextColor="#aaa" multiline numberOfLines={3} textAlignVertical="top" />
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveRecord} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Record</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Reminders Tab ─────────────────────────────────────────────────────────────
function RemindersTab({ pet, user }: { pet: any; user: any }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateError, setDateError] = useState("");
  const [form, setForm] = useState({ title: "", due: "", repeat: "None", note: "" });

  const reminders = pet.reminders || [];
  const REPEATS = ["None", "Daily", "Weekly", "Monthly", "Yearly"];

  function parseDueDatetime(due: string): Date | null {
    if (!due) return null;
    const parts = due.split(" ");
    const [y, m, d] = parts[0].split("-").map(Number);
    if (parts.length >= 3) {
      let [h, min] = parts[1].split(":").map(Number);
      const ap = parts[2];
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return new Date(y, m - 1, d, h, min);
    }
    return new Date(y, m - 1, d, 23, 59, 59);
  }

  function isOverdue(due: string) {
    const dt = parseDueDatetime(due);
    return dt ? dt < new Date() : false;
  }

  function openAdd() { setEditingId(null); setForm({ title: "", due: "", repeat: "None", note: "" }); setDateError(""); setShowModal(true); }
  function openEdit(r: any) { setEditingId(r.id); setForm({ title: r.title, due: r.due || "", repeat: r.repeat || "None", note: r.note || "" }); setDateError(""); setShowModal(true); }

  async function saveReminder() {
    if (!form.title.trim()) { Alert.alert("Missing info", "Please add a title."); return; }
    if (form.due) {
      const dt = parseDueDatetime(form.due);
      if (dt && dt < new Date()) { setDateError("⚠️ Please select a future date and time."); return; }
    }
    setDateError("");
    setSaving(true);
    try {
      let updated;
      if (editingId) {
        updated = reminders.map((r: any) => r.id === editingId ? { ...form, id: editingId, done: r.done, sent: false } : r);
      } else {
        updated = [...reminders, { ...form, id: Date.now().toString(), done: false, sent: false }];
      }
      await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { reminders: updated });
      setShowModal(false);
      setForm({ title: "", due: "", repeat: "None", note: "" });
    } catch { Alert.alert("Error", "Could not save reminder."); }
    setSaving(false);
  }

  async function toggleDone(reminderId: string) {
    const updated = reminders.map((r: any) => r.id === reminderId ? { ...r, done: !r.done } : r);
    await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { reminders: updated });
  }

  async function deleteReminder(reminderId: string) {
    Alert.alert("Delete Reminder", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const updated = reminders.filter((r: any) => r.id !== reminderId);
        await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { reminders: updated });
      }},
    ]);
  }

  const pending = reminders.filter((r: any) => !r.done);
  const done = reminders.filter((r: any) => r.done);

  return (
    <View style={styles.tabContent}>
      {reminders.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No reminders yet</Text>
          <Text style={styles.emptySub}>Set reminders for vaccines, meds & vet visits</Text>
        </View>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Upcoming</Text>
              {pending.map((r: any) => (
                <View key={r.id} style={[styles.reminderCard, isOverdue(r.due) && styles.reminderOverdue]}>
                  <Pressable onPress={() => toggleDone(r.id)}>
                    <View style={styles.checkbox} />
                  </Pressable>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderTitle}>{r.title}</Text>
                    {r.due ? <Text style={[styles.reminderDue, isOverdue(r.due) && styles.reminderDueUrgent]}>{isOverdue(r.due) ? "⚠️ Overdue · " : "Due: "}{r.due}</Text> : null}
                    {r.repeat !== "None" && r.repeat ? <Text style={styles.reminderRepeat}>🔁 Repeats {r.repeat}</Text> : null}
                  </View>
                  <View style={styles.reminderActions}>
                    <Pressable style={styles.iconBtn} onPress={() => openEdit(r)}><Text style={styles.iconBtnEdit}>✏️</Text></Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => deleteReminder(r.id)}><Text style={styles.iconBtnDelete}>🗑️</Text></Pressable>
                  </View>
                </View>
              ))}
            </>
          )}
          {done.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Completed</Text>
              {done.map((r: any) => (
                <View key={r.id} style={[styles.reminderCard, { opacity: 0.5 }]}>
                  <Pressable onPress={() => toggleDone(r.id)}>
                    <View style={[styles.checkbox, styles.checkboxDone]}>
                      <Text style={styles.checkboxTick}>✓</Text>
                    </View>
                  </Pressable>
                  <View style={styles.reminderInfo}>
                    <Text style={[styles.reminderTitle, { textDecorationLine: "line-through" }]}>{r.title}</Text>
                  </View>
                  <Pressable style={styles.iconBtn} onPress={() => deleteReminder(r.id)}><Text style={styles.iconBtnDelete}>🗑️</Text></Pressable>
                </View>
              ))}
            </>
          )}
        </>
      )}
      <Pressable style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Reminder</Text>
      </Pressable>
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit Reminder" : "Add Reminder"}</Text>
            <Pressable onPress={() => setShowModal(false)}><Text style={styles.modalClose}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput style={styles.modalInput} value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} placeholder="e.g. Heartworm pill" placeholderTextColor="#aaa" />
            <DatePicker label="Due Date & Time *" value={form.due} onChange={(v) => { setForm((f) => ({ ...f, due: v })); const dt = v ? (() => { const p = v.split(" "); const [y,m,d] = p[0].split("-").map(Number); if(p.length>=3){let[h,min]=p[1].split(":").map(Number);const ap=p[2];if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;return new Date(y,m-1,d,h,min);}return new Date(y,m-1,d,23,59,59); })() : null; setDateError(dt && dt < new Date() ? "⚠️ Please select a future date and time." : ""); }} future={true} showTime={true} />
            {dateError ? <Text style={{ color: "#E53935", fontSize: 13, marginTop: 4 }}>{dateError}</Text> : null}
            <Text style={styles.modalLabel}>Repeat</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {REPEATS.map((r) => (
                <Pressable key={r} style={[styles.typeChip, form.repeat === r && styles.typeChipActive]} onPress={() => setForm((f) => ({ ...f, repeat: r }))}>
                  <Text style={[styles.typeChipText, form.repeat === r && styles.typeChipTextActive]}>{r}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.note} onChangeText={(v) => setForm((f) => ({ ...f, note: v }))} placeholder="Dosage, instructions..." placeholderTextColor="#aaa" multiline numberOfLines={3} textAlignVertical="top" />
            <Pressable style={[styles.saveBtn, (saving || !!dateError) && { opacity: 0.6 }]} onPress={saveReminder} disabled={saving || !!dateError}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingId ? "Update Reminder" : "Save Reminder"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Calories Tab ──────────────────────────────────────────────────────────────
function CaloriesTab({ pet }: { pet: any }) {
  const weight = parseFloat(pet.weight) || 0;
  const weightKg = (pet.weightUnit === "lbs" || !pet.weightUnit) ? weight * 0.453592 : weight;
  const rer = weightKg > 0 ? Math.round(70 * Math.pow(weightKg, 0.75)) : 0;
  const factors: Record<string, number> = { sedentary: 1.2, indoor: 1.2, low: 1.2, moderate: 1.4, active: 1.4, "very active": 1.6, high: 1.6 };
  const factor = factors[pet.activityLevel?.toLowerCase()] || 1.4;
  const der = Math.round(rer * factor * (pet.neutered ? 0.9 : 1.0));
  const protein = Math.round(weightKg * (pet.species === "cat" ? 6 : 5));
  const fat = Math.round(der * 0.18 / 9);

  if (weightKg === 0) return (
    <View style={styles.tabContent}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>⚖️</Text>
        <Text style={styles.emptyTitle}>Weight not set</Text>
        <Text style={styles.emptySub}>Add your pet's weight to calculate daily calories</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.calorieHero}>
        <Text style={styles.calorieNumber}>{der}</Text>
        <Text style={styles.calorieLabel}>kcal/day recommended</Text>
        <Text style={styles.calorieSource}>Based on AAFCO 2023 + WSAVA guidelines</Text>
      </View>
      <View style={styles.macroRow}>
        <View style={styles.macroCard}><Text style={styles.macroValue}>{protein}g</Text><Text style={styles.macroLabel}>Protein</Text></View>
        <View style={styles.macroCard}><Text style={styles.macroValue}>{fat}g</Text><Text style={styles.macroLabel}>Fat</Text></View>
        <View style={styles.macroCard}><Text style={styles.macroValue}>{rer}</Text><Text style={styles.macroLabel}>RER</Text></View>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How we calculate this</Text>
        <Text style={styles.infoText}>• RER = 70 × (weight kg)^0.75</Text>
        <Text style={styles.infoText}>• Weight: {weightKg.toFixed(1)} kg ({weight} {pet.weightUnit || "lbs"})</Text>
        <Text style={styles.infoText}>• Activity factor: {factor}x ({pet.activityLevel || "moderate"})</Text>
        <Text style={styles.infoText}>• Neutered adjustment: {pet.neutered ? "−10%" : "none"}</Text>
        <Text style={styles.infoText}>• Source: AAFCO 2023, WSAVA, USDA FoodData</Text>
      </View>
    </View>
  );
}

// ── Recipes Tab ───────────────────────────────────────────────────────────────
function RecipesTab({ pet, canUseAI }: { pet: any; canUseAI: boolean }) {
  const [step, setStep] = useState<"select" | "result">("select");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [recipe, setRecipe] = useState("");
  const [loading, setLoading] = useState(false);

  const weight = parseFloat(pet.weight) || 0;
  const weightKg = (pet.weightUnit === "lbs" || !pet.weightUnit) ? weight * 0.453592 : weight;
  const rer = weightKg > 0 ? Math.round(70 * Math.pow(weightKg, 0.75)) : 0;
  const der = Math.round(rer * ({ sedentary: 1.2, indoor: 1.2, low: 1.2, moderate: 1.4, active: 1.4, "very active": 1.6, high: 1.6 }[pet.activityLevel?.toLowerCase()] || 1.4) * (pet.neutered ? 0.9 : 1.0));

  const INGREDIENTS: Record<string, string[]> = {
    "Protein": ["Chicken", "Turkey", "Beef", "Salmon", "Sardines", "Eggs", "Lamb", "Venison"],
    "Carbs": ["White Rice", "Sweet Potato", "Oats", "Quinoa", "Pumpkin", "Barley"],
    "Vegetables": ["Carrots", "Broccoli", "Spinach", "Peas", "Zucchini", "Green Beans"],
    "Healthy Fats": ["Olive Oil", "Fish Oil", "Coconut Oil", "Flaxseed"],
    "Fruits": ["Blueberries", "Apple", "Watermelon", "Banana"],
  };

  function toggleIngredient(category: string, item: string) {
    setSelected((prev) => {
      const current = prev[category] || [];
      return { ...prev, [category]: current.includes(item) ? current.filter((i) => i !== item) : [...current, item] };
    });
  }

  const allSelected = Object.values(selected).flat();

  async function generateRecipe() {
    if (allSelected.length < 2 || !canUseAI) return;
    setLoading(true);
    setStep("result");
    const prompt = `You are a veterinary nutritionist for MyPetDex. Generate a personalized homemade meal recipe for:\n\nPet: ${pet.name}\nSpecies: ${pet.species || pet.type}\nBreed: ${pet.breed}\nAge: ${pet.age} years\nWeight: ${pet.weight} ${pet.weightUnit || "lbs"} (${weightKg.toFixed(1)} kg)\nNeutered: ${pet.neutered ? "Yes" : "No"}\nActivity: ${pet.activityLevel || "moderate"}\nDaily calorie need (AAFCO/WSAVA): ${der} kcal/day\nAvailable ingredients: ${allSelected.join(", ")}\n\nProvide:\n1. RECIPE NAME\n2. INGREDIENTS with exact gram amounts for ${der} kcal daily need split into 2 meals\n3. PREPARATION STEPS\n4. NUTRITIONAL BREAKDOWN\n5. REQUIRED SUPPLEMENTS\n6. BREED-SPECIFIC NOTES for ${pet.breed}\n7. TOXIC FOODS WARNING for ${pet.species || pet.type}s\n\nKeep it practical and science-based.`;
    try {
      const apiUrl = Platform.OS === "web" ? "/api/chat" : "https://app.mypetdex.app/api/chat";
      const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1200, messages: [{ role: "user", content: prompt }] }) });
      if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err?.error?.message || `API error ${response.status}`); }
      const data = await response.json();
      setRecipe(data.content?.[0]?.text || "Could not generate recipe. Please try again.");
    } catch (e: any) {
      setRecipe(`Could not generate recipe: ${e?.message || "Please check your connection and try again."}`);
    } finally { setLoading(false); }
  }

  if (!canUseAI) return (
    <View style={styles.tabContent}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>🔒</Text>
        <Text style={styles.emptyTitle}>Plus Feature</Text>
        <Text style={styles.emptySub}>Upgrade to Plus to generate AI-powered personalized recipes for {pet.name}</Text>
      </View>
    </View>
  );

  if (step === "result") return (
    <View style={styles.tabContent}>
      <Pressable style={styles.backBtn} onPress={() => { setStep("select"); setRecipe(""); }}>
        <Text style={styles.backBtnText}>← Choose different ingredients</Text>
      </Pressable>
      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingEmoji}>🧬</Text>
          <Text style={styles.loadingTitle}>Generating {pet.name}'s recipe...</Text>
          <Text style={styles.loadingDesc}>Using AAFCO 2023, USDA FoodData and WSAVA guidelines</Text>
        </View>
      ) : (
        <View style={styles.recipeResultCard}><Text style={styles.recipeResultText}>{recipe}</Text></View>
      )}
    </View>
  );

  return (
    <View style={styles.tabContent}>
      <View style={styles.recipeIntro}>
        <Text style={styles.recipeIntroTitle}>Build {pet.name}'s Recipe</Text>
        <Text style={styles.recipeIntroDesc}>Select ingredients you have at home. We'll generate a personalized recipe based on {pet.name}'s breed, age, weight and {der} kcal/day need.</Text>
      </View>
      {Object.entries(INGREDIENTS).map(([category, items]) => (
        <View key={category} style={styles.ingredientGroup}>
          <Text style={styles.ingredientCategory}>{category}</Text>
          <View style={styles.ingredientGrid}>
            {items.map((item) => {
              const isSelected = (selected[category] || []).includes(item);
              return (
                <Pressable key={item} style={[styles.ingredientChip, isSelected && styles.ingredientChipSelected]} onPress={() => toggleIngredient(category, item)}>
                  <Text style={[styles.ingredientChipText, isSelected && styles.ingredientChipTextSelected]}>{item}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
        <Text style={styles.disclaimerText}>Homemade diets may lack essential nutrients. Always consult your veterinarian before switching to homemade food.</Text>
      </View>
      <Pressable style={[styles.generateBtn, allSelected.length < 2 && styles.generateBtnDisabled]} onPress={generateRecipe} disabled={allSelected.length < 2}>
        <Text style={styles.generateBtnText}>{allSelected.length < 2 ? "Select at least 2 ingredients" : `Generate ${pet.name}'s Recipe`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { backgroundColor: "#fff", padding: 20, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0f8f4", alignItems: "center", justifyContent: "center", marginBottom: 12, overflow: "hidden" },
  avatarImage: { width: 80, height: 80 },
  avatarEmoji: { fontSize: 44 },
  petName: { fontSize: 24, fontWeight: "700", color: "#1a1a1a" },
  petBreed: { fontSize: 15, color: "#888", marginTop: 2 },
  petTags: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  tag: { backgroundColor: "#f0f8f4", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  tagText: { fontSize: 12, color: BRAND, fontWeight: "500" },
  tabBar: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: BRAND },
  tabText: { fontSize: 13, color: "#888", fontWeight: "500" },
  tabTextActive: { color: BRAND, fontWeight: "600" },
  content: { flex: 1 },
  contentPadding: { padding: 16, gap: 12, paddingBottom: 40 },
  tabContent: { gap: 12 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#333" },
  emptySub: { fontSize: 13, color: "#888", textAlign: "center" },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#aaa", textTransform: "uppercase", letterSpacing: 1 },
  recordCard: { backgroundColor: "#fff", borderRadius: 12, flexDirection: "row", overflow: "hidden", alignItems: "center" },
  recordBar: { width: 4, alignSelf: "stretch" },
  recordContent: { flex: 1, padding: 14 },
  recordHeader: { flexDirection: "row", justifyContent: "space-between" },
  recordTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  recordDate: { fontSize: 12, color: "#888" },
  recordType: { fontSize: 11, color: "#aaa", marginTop: 2 },
  recordNote: { fontSize: 13, color: "#888", marginTop: 4, fontStyle: "italic" },
  reminderCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  reminderOverdue: { borderWidth: 1, borderColor: "#FFCDD2" },
  reminderInfo: { flex: 1 },
  reminderTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  reminderDue: { fontSize: 13, color: "#888", marginTop: 2 },
  reminderDueUrgent: { color: "#E53935" },
  reminderRepeat: { fontSize: 12, color: "#aaa", marginTop: 2 },
  reminderActions: { flexDirection: "row", gap: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: BRAND, borderColor: BRAND },
  checkboxTick: { color: "#fff", fontSize: 12, fontWeight: "700" },
  iconBtn: { padding: 6 },
  iconBtnEdit: { fontSize: 18 },
  iconBtnDelete: { fontSize: 18 },
  calorieHero: { backgroundColor: "#fff", borderRadius: 16, padding: 24, alignItems: "center" },
  calorieNumber: { fontSize: 56, fontWeight: "700", color: BRAND },
  calorieLabel: { fontSize: 16, color: "#1a1a1a", fontWeight: "600", marginTop: 4 },
  calorieSource: { fontSize: 12, color: "#888", marginTop: 6, textAlign: "center" },
  macroRow: { flexDirection: "row", gap: 10 },
  macroCard: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center" },
  macroValue: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  macroLabel: { fontSize: 12, color: "#888", marginTop: 4 },
  infoCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 6 },
  infoTitle: { fontSize: 14, fontWeight: "600", color: "#1a1a1a", marginBottom: 4 },
  infoText: { fontSize: 13, color: "#555" },
  recipeIntro: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 6 },
  recipeIntroTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  recipeIntroDesc: { fontSize: 13, color: "#888", lineHeight: 20 },
  ingredientGroup: { gap: 8 },
  ingredientCategory: { fontSize: 13, fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: 0.5 },
  ingredientGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ingredientChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee" },
  ingredientChipSelected: { backgroundColor: BRAND, borderColor: BRAND },
  ingredientChipText: { fontSize: 13, color: "#555" },
  ingredientChipTextSelected: { color: "#fff", fontWeight: "600" },
  disclaimerCard: { backgroundColor: "#FFF8E1", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FFE082" },
  disclaimerTitle: { fontSize: 13, fontWeight: "700", color: "#F57F17", marginBottom: 4 },
  disclaimerText: { fontSize: 12, color: "#795548", lineHeight: 18 },
  generateBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  generateBtnDisabled: { backgroundColor: "#ccc" },
  generateBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  backBtn: { paddingVertical: 8 },
  backBtnText: { fontSize: 14, color: BRAND, fontWeight: "500" },
  loadingCard: { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 12 },
  loadingEmoji: { fontSize: 48 },
  loadingTitle: { fontSize: 17, fontWeight: "600", color: "#1a1a1a", textAlign: "center" },
  loadingDesc: { fontSize: 13, color: "#888", textAlign: "center" },
  recipeResultCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  recipeResultText: { fontSize: 14, color: "#1a1a1a", lineHeight: 22 },
  addBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalContainer: { flex: 1, backgroundColor: "#f8f8f8" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 24, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  modalClose: { fontSize: 16, color: BLUE, fontWeight: "600" },
  modalScroll: { padding: 20, gap: 8, paddingBottom: 40 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 8, marginBottom: 6 },
  modalInput: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1a1a1a" },
  modalTextarea: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  typeRow: { gap: 8, paddingBottom: 4 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0F0F0", borderWidth: 1.5, borderColor: "transparent" },
  typeChipActive: { backgroundColor: BRAND + "15", borderColor: BRAND },
  typeChipText: { fontSize: 13, fontWeight: "600", color: "#666" },
  typeChipTextActive: { color: BRAND },
  saveBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 2 },
  qrBtn: { backgroundColor: BRAND + "20", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: BRAND + "44" },
  qrBtnText: { fontSize: 12, fontWeight: "700", color: BRAND },
  qrModalContainer: { flex: 1, backgroundColor: "#f8f8f8" },
  qrModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 24, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  qrModalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  qrModalClose: { fontSize: 16, color: BLUE, fontWeight: "600" },
  qrModalScroll: { padding: 20, gap: 16, paddingBottom: 48, alignItems: "center" },
  qrModalSub: { fontSize: 14, color: "#888", textAlign: "center", lineHeight: 20 },
  qrCodeBox: { backgroundColor: "#fff", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  qrInfoCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, width: "100%", gap: 10 },
  qrInfoTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  qrInfoRow: { flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#f5f5f5", paddingBottom: 8 },
  qrInfoLabel: { fontSize: 13, color: "#888" },
  qrInfoValue: { fontSize: 13, fontWeight: "600", color: "#1a1a1a" },
  qrVaccineRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  qrVaccineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BLUE, marginTop: 5 },
  qrVaccineInfo: { flex: 1 },
  qrVaccineName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  qrVaccineDate: { fontSize: 12, color: "#888", marginTop: 2 },
  qrVaccineNote: { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 },
  qrBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  qrActionBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  qrActionBtnBlue: { backgroundColor: BLUE },
  qrActionBtnGreen: { backgroundColor: BRAND },
  qrActionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  qrTip: { fontSize: 12, color: "#aaa", textAlign: "center" },
  // Edit modal helpers
  photoSection: { alignItems: "center", marginBottom: 12 },
  photoCircle: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", marginBottom: 8 },
  photoPreview: { width: 100, height: 100 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#f0f8f4", borderWidth: 2, borderColor: BRAND + "44", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4 },
  photoPlaceholderEmoji: { fontSize: 32 },
  photoPlaceholderText: { fontSize: 11, color: BRAND, fontWeight: "600" },
  photoChangeText: { fontSize: 14, color: BRAND, fontWeight: "600" },
  editRow: { flexDirection: "row", gap: 12 },
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
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 8 },
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
