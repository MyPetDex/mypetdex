import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, TextInput, Modal, Platform,
  Share, Linking, Image, Switch, FlatList,
} from "react-native";
import { generatePetRecipe } from "@/lib/ai";
// ImagePicker loaded lazily — only when user taps photo button
// Prevents crash if native module not yet linked in current build
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import firestore from "@react-native-firebase/firestore";
import { doc as webDoc, onSnapshot as webOnSnap, updateDoc } from "firebase/firestore";
import { isWeb, webDb } from "@/lib/firebase";
import * as ImagePicker from "expo-image-picker";
import DatePicker from "@/components/DatePicker";
import QRCode from "react-native-qrcode-svg";

const BRAND = "#4486F4";
const BLUE = "#4486F4";

const TABS = ["Records", "Reminders", "Calories", "Recipes"];
const BREEDS_DOG = ['Affenpinscher','Afghan Hound','Airedale Terrier','Akita','Alaskan Malamute','American Bulldog','American Eskimo','American Pit Bull Terrier','Australian Shepherd','Basenji','Basset Hound','Beagle','Belgian Malinois','Bernese Mountain Dog','Bichon Frise','Border Collie','Boston Terrier','Boxer','Bulldog','Cairn Terrier','Cane Corso','Cavalier King Charles Spaniel','Chihuahua','Chow Chow','Cocker Spaniel','Dachshund','Dalmatian','Doberman Pinscher','French Bulldog','German Shepherd','Golden Retriever','Great Dane','Greyhound','Havanese','Irish Setter','Jack Russell Terrier','Labrador Retriever','Maltese','Mastiff','Miniature Schnauzer','Pomeranian','Poodle','Pug','Rottweiler','Saint Bernard','Samoyed','Shiba Inu','Shih Tzu','Siberian Husky','Yorkshire Terrier','Mixed/Other'];
const BREEDS_CAT = ['Abyssinian','American Shorthair','Bengal','Birman','British Shorthair','Burmese','Devon Rex','Exotic Shorthair','Himalayan','Maine Coon','Manx','Munchkin','Norwegian Forest Cat','Persian','Ragdoll','Russian Blue','Scottish Fold','Siamese','Siberian','Sphynx','Turkish Angora','Mixed/Other'];
const ACTIVITY_LEVELS = ["sedentary", "indoor", "active", "very active"];
const SEX_OPTIONS = ["male", "female"];

function BreedPicker({ label, value, options, onSelect }: { label: string; value: string; options: string[]; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <Text style={styles.modalLabel}>{label}</Text>
      <Pressable style={styles.dropdown} onPress={() => setOpen(true)}>
        <Text style={styles.dropdownValue}>{value || "Select..."}</Text>
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
          <View style={{ padding: 12 }}>
            <TextInput style={styles.modalInput} placeholder="Search..." value={search} onChangeText={setSearch} autoFocus placeholderTextColor="#aaa" />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item}
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
  const { user, isDemoMode } = useAuth();
  const { plan } = usePlan();
  const router = useRouter();

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Records");
  const [showQR, setShowQR] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  function openEditModal() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to edit pet details!"); return; }
    setEditForm({
      name: pet.name || "",
      species: pet.species || "dog",
      breed: pet.breed || "",
      age: pet.age?.toString() || "",
      weight: pet.weight?.toString() || "",
      weightUnit: pet.weightUnit || "lbs",
      sex: pet.sex || "male",
      neutered: pet.neutered ?? false,
      activityLevel: pet.activityLevel || "active",
      licenseNumber: pet.licenseNumber || "",
      ownerName: pet.ownerName || "",
      ownerPhone: pet.ownerPhone || "",
      ownerAddress: pet.ownerAddress || "",
    });
    setShowEditModal(true);
  }

  async function saveEdit() {
    if (!editForm.name?.trim()) { Alert.alert("Missing info", "Pet name is required."); return; }
    setEditSaving(true);
    try {
      const data: any = {
        name: editForm.name.trim(),
        species: editForm.species,
        breed: editForm.breed,
        age: parseFloat(editForm.age) || null,
        weight: parseFloat(editForm.weight) || null,
        weightUnit: editForm.weightUnit,
        sex: editForm.sex,
        neutered: editForm.neutered,
        activityLevel: editForm.activityLevel,
        licenseNumber: editForm.licenseNumber.trim() || null,
        ownerName: editForm.ownerName.trim() || null,
        ownerPhone: editForm.ownerPhone.trim() || null,
        ownerAddress: editForm.ownerAddress.trim() || null,
      };
      if (isWeb) {
        await updateDoc(webDoc(webDb, "users", user!.uid, "pets", id as string), data);
      } else {
        await firestore().collection("users").doc(user!.uid).collection("pets").doc(id as string).update(data);
      }
      setShowEditModal(false);
    } catch {
      Alert.alert("Error", "Could not save changes.");
    }
    setEditSaving(false);
  }

  async function changePhoto() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to edit photos!"); return; }
    Alert.alert("Change Pet Photo", "Choose a source", [
      {
        text: "📷 Camera",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!result.canceled && result.assets[0]) await uploadAndSave(result.assets[0].uri);
        },
      },
      {
        text: "🖼️ Photo Library",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.8 });
          if (!result.canceled && result.assets[0]) await uploadAndSave(result.assets[0].uri);
        },
      },
      ...(pet?.photoURL ? [{ text: "🗑️ Remove Photo", style: "destructive" as const, onPress: async () => {
        if (isWeb) {
          const { updateDoc } = await import("firebase/firestore");
          await updateDoc(require("@/lib/firebase").petDoc(user!.uid, id as string), { photoURL: null });
        } else {
          await require("@react-native-firebase/firestore").default()
            .collection("users").doc(user!.uid).collection("pets").doc(id as string)
            .update({ photoURL: null });
        }
      }}] : []),
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function uploadAndSave(uri: string) {
    if (!user || !id) return;
    setUploadingPhoto(true);
    try {
      const { isWeb: web, webStorage } = require("@/lib/firebase");
      let photoURL: string;
      if (web) {
        const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
        const res = await fetch(uri);
        const blob = await res.blob();
        const storageRef = ref(webStorage, `users/${user.uid}/pets/${id}/photo.jpg`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
        const { updateDoc } = await import("firebase/firestore");
        await updateDoc(require("@/lib/firebase").petDoc(user.uid, id as string), { photoURL });
      } else {
        const storage = require("@react-native-firebase/storage").default;
        const storageRef = storage().ref(`users/${user.uid}/pets/${id}/photo.jpg`);
        await storageRef.putFile(uri);
        photoURL = await storageRef.getDownloadURL();
        await require("@react-native-firebase/firestore").default()
          .collection("users").doc(user.uid).collection("pets").doc(id as string)
          .update({ photoURL });
      }
    } catch (e) {
      Alert.alert("Error", "Could not upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  useEffect(() => {
    if (!user || !id) return;
    if (isWeb) {
      const ref = webDoc(webDb, "users", user.uid, "pets", id as string);
      const unsub = webOnSnap(
        ref,
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
    } else {
      const unsub = firestore()
        .collection("users")
        .doc(user.uid)
        .collection("pets")
        .doc(id as string)
        .onSnapshot(
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
    }
  }, [user, id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BRAND} />
      </View>
    );
  }

  if (!pet) return null;

  const canUseAI = plan === "plus" || plan === "family";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.avatar} onPress={changePhoto}>
          {pet.photoURL
            ? <Image source={{ uri: pet.photoURL }} style={styles.avatarPhoto} />
            : <Text style={styles.avatarEmoji}>{pet.species === "cat" ? "🐱" : "🐶"}</Text>
          }
          <View style={styles.avatarEditBadge}>
            {uploadingPhoto
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.avatarEditIcon}>✏️</Text>
            }
          </View>
        </Pressable>
        <View style={styles.nameRow}>
          <Text style={styles.petName}>{pet.name}</Text>
          <Pressable style={styles.qrBtn} onPress={() => setShowQR(true)}>
            <Text style={styles.qrBtnText}>📱 QR</Text>
          </Pressable>
        </View>
        <Text style={styles.petBreed}>{pet.breed}</Text>
        <View style={styles.petTags}>
          {pet.age ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>Age {pet.age}</Text>
            </View>
          ) : null}
          {pet.weight ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {pet.weight} {pet.weightUnit || "lbs"}
              </Text>
            </View>
          ) : null}
          {pet.activityLevel ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{pet.activityLevel}</Text>
            </View>
          ) : null}
        </View>
        <Pressable style={styles.editDetailsBtn} onPress={openEditModal}>
          <Text style={styles.editDetailsBtnText}>✏️ Edit Details</Text>
        </Pressable>
      </View>

      {/* Edit Pet Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Edit Pet</Text>
            <Pressable onPress={saveEdit} disabled={editSaving}>
              <Text style={[styles.modalClose, editSaving && { opacity: 0.4 }]}>
                {editSaving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">

            {/* ── Pet Details ── */}
            <Text style={styles.editSection}>Pet Details</Text>

            <Text style={styles.modalLabel}>Name *</Text>
            <TextInput style={styles.modalInput} value={editForm.name} onChangeText={v => setEditForm((f: any) => ({ ...f, name: v }))} placeholder="Pet name" placeholderTextColor="#aaa" />

            <Text style={styles.modalLabel}>Species</Text>
            <View style={styles.pillRow}>
              {["dog", "cat"].map(s => (
                <Pressable key={s} style={[styles.pill, editForm.species === s && styles.pillActive]} onPress={() => setEditForm((f: any) => ({ ...f, species: s, breed: s === "dog" ? BREEDS_DOG[0] : BREEDS_CAT[0] }))}>
                  <Text style={[styles.pillText, editForm.species === s && styles.pillTextActive]}>{s === "dog" ? "🐶 Dog" : "🐱 Cat"}</Text>
                </Pressable>
              ))}
            </View>

            <BreedPicker label="Breed" value={editForm.breed} options={editForm.species === "dog" ? BREEDS_DOG : BREEDS_CAT} onSelect={v => setEditForm((f: any) => ({ ...f, breed: v }))} />

            <Text style={styles.modalLabel}>Age (years)</Text>
            <TextInput style={styles.modalInput} value={editForm.age} onChangeText={v => setEditForm((f: any) => ({ ...f, age: v }))} placeholder="e.g. 3" placeholderTextColor="#aaa" keyboardType="decimal-pad" />

            <Text style={styles.modalLabel}>Weight</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput style={[styles.modalInput, { flex: 1 }]} value={editForm.weight} onChangeText={v => setEditForm((f: any) => ({ ...f, weight: v }))} placeholder="e.g. 55" placeholderTextColor="#aaa" keyboardType="decimal-pad" />
              <View style={styles.pillRow}>
                {["lbs", "kg"].map(u => (
                  <Pressable key={u} style={[styles.pill, editForm.weightUnit === u && styles.pillActive]} onPress={() => setEditForm((f: any) => ({ ...f, weightUnit: u }))}>
                    <Text style={[styles.pillText, editForm.weightUnit === u && styles.pillTextActive]}>{u}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={styles.modalLabel}>Sex</Text>
            <View style={styles.pillRow}>
              {SEX_OPTIONS.map(s => (
                <Pressable key={s} style={[styles.pill, editForm.sex === s && styles.pillActive]} onPress={() => setEditForm((f: any) => ({ ...f, sex: s }))}>
                  <Text style={[styles.pillText, editForm.sex === s && styles.pillTextActive]}>{s === "male" ? "♂ Male" : "♀ Female"}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.modalLabel}>Neutered / Spayed</Text>
              <Switch value={editForm.neutered} onValueChange={v => setEditForm((f: any) => ({ ...f, neutered: v }))} trackColor={{ true: BRAND }} />
            </View>

            <Text style={styles.modalLabel}>Activity Level</Text>
            <View style={styles.pillRow}>
              {ACTIVITY_LEVELS.map(a => (
                <Pressable key={a} style={[styles.pill, editForm.activityLevel === a && styles.pillActive]} onPress={() => setEditForm((f: any) => ({ ...f, activityLevel: a }))}>
                  <Text style={[styles.pillText, editForm.activityLevel === a && styles.pillTextActive]}>{a}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalLabel}>License Number (optional)</Text>
            <TextInput style={styles.modalInput} value={editForm.licenseNumber} onChangeText={v => setEditForm((f: any) => ({ ...f, licenseNumber: v }))} placeholder="e.g. A-123456" placeholderTextColor="#aaa" />

            {/* ── Owner Contact ── */}
            <Text style={styles.editSection}>Owner Contact</Text>
            <Text style={styles.editSectionSub}>Shown on the QR emergency card</Text>

            <Text style={styles.modalLabel}>Owner Name</Text>
            <TextInput style={styles.modalInput} value={editForm.ownerName} onChangeText={v => setEditForm((f: any) => ({ ...f, ownerName: v }))} placeholder="Your name" placeholderTextColor="#aaa" />

            <Text style={styles.modalLabel}>Phone Number</Text>
            <TextInput style={styles.modalInput} value={editForm.ownerPhone} onChangeText={v => setEditForm((f: any) => ({ ...f, ownerPhone: v }))} placeholder="e.g. +1 555 123 4567" placeholderTextColor="#aaa" keyboardType="phone-pad" />

            <Text style={styles.modalLabel}>Address (optional)</Text>
            <TextInput style={[styles.modalInput, styles.modalTextarea]} value={editForm.ownerAddress} onChangeText={v => setEditForm((f: any) => ({ ...f, ownerAddress: v }))} placeholder="Your address" placeholderTextColor="#aaa" multiline numberOfLines={2} textAlignVertical="top" />

            <Pressable style={[styles.saveBtn, editSaving && { opacity: 0.6 }]} onPress={saveEdit} disabled={editSaving}>
              {editSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.qrModalContainer}>
          <View style={styles.qrModalHeader}>
            <Text style={styles.qrModalTitle}>🐾 {pet.name}'s QR Code</Text>
            <Pressable onPress={() => setShowQR(false)}>
              <Text style={styles.qrModalClose}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.qrModalScroll}>
            <Text style={styles.qrModalSub}>
              Anyone can scan this to see {pet.name}'s emergency info — no app needed.
            </Text>

            {/* QR Code */}
            <View style={styles.qrCodeBox}>
              <QRCode
                value={`https://app.mypetdex.app/pet/${pet.id}`}
                size={220}
                color="#1a1a1a"
                backgroundColor="#fff"
              />
            </View>

            {/* Emergency Info Card */}
            <View style={styles.qrInfoCard}>
              <Text style={styles.qrInfoTitle}>🚨 Emergency Info</Text>
              <View style={styles.qrInfoRow}>
                <Text style={styles.qrInfoLabel}>Name</Text>
                <Text style={styles.qrInfoValue}>{pet.name}</Text>
              </View>
              <View style={styles.qrInfoRow}>
                <Text style={styles.qrInfoLabel}>Species</Text>
                <Text style={styles.qrInfoValue}>{pet.species || pet.type}</Text>
              </View>
              {pet.breed ? (
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Breed</Text>
                  <Text style={styles.qrInfoValue}>{pet.breed}</Text>
                </View>
              ) : null}
              {pet.age ? (
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Age</Text>
                  <Text style={styles.qrInfoValue}>{pet.age} years</Text>
                </View>
              ) : null}
              {pet.weight ? (
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Weight</Text>
                  <Text style={styles.qrInfoValue}>{pet.weight} {pet.weightUnit || "lbs"}</Text>
                </View>
              ) : null}
              {pet.sex ? (
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Sex</Text>
                  <Text style={styles.qrInfoValue}>{pet.sex}</Text>
                </View>
              ) : null}
              {pet.neutered !== undefined ? (
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>Neutered</Text>
                  <Text style={styles.qrInfoValue}>{pet.neutered ? "Yes" : "No"}</Text>
                </View>
              ) : null}
              {pet.licenseNumber ? (
                <View style={styles.qrInfoRow}>
                  <Text style={styles.qrInfoLabel}>License #</Text>
                  <Text style={styles.qrInfoValue}>{pet.licenseNumber}</Text>
                </View>
              ) : null}
            </View>

            {/* Owner Contact */}
            {(pet.ownerName || pet.ownerPhone || pet.ownerAddress) ? (
              <View style={styles.qrInfoCard}>
                <Text style={styles.qrInfoTitle}>👤 Owner Contact</Text>
                {pet.ownerName ? (
                  <View style={styles.qrInfoRow}>
                    <Text style={styles.qrInfoLabel}>Name</Text>
                    <Text style={styles.qrInfoValue}>{pet.ownerName}</Text>
                  </View>
                ) : null}
                {pet.ownerPhone ? (
                  <View style={styles.qrInfoRow}>
                    <Text style={styles.qrInfoLabel}>Phone</Text>
                    <Text style={styles.qrInfoValue}>{pet.ownerPhone}</Text>
                  </View>
                ) : null}
                {pet.ownerAddress ? (
                  <View style={styles.qrInfoRow}>
                    <Text style={styles.qrInfoLabel}>Address</Text>
                    <Text style={styles.qrInfoValue}>{pet.ownerAddress}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Vaccines */}
            {(pet.vaccines || []).length > 0 ? (
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
            ) : null}

            {/* URL */}
            <View style={styles.qrUrlBox}>
              <Text style={styles.qrUrlText} numberOfLines={1}>
                https://app.mypetdex.app/pet/{pet.id}
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.qrBtnRow}>
              <Pressable
                style={[styles.qrActionBtn, styles.qrActionBtnBlue]}
                onPress={() => {
                  Linking.openURL(`https://app.mypetdex.app/pet/${pet.id}`);
                }}
              >
                <Text style={styles.qrActionBtnText}>🔗 Copy Link</Text>
              </Pressable>
              <Pressable
                style={[styles.qrActionBtn, styles.qrActionBtnGreen]}
                onPress={() => {
                  Share.share({
                    message: `🐾 ${pet.name}'s emergency info: https://app.mypetdex.app/pet/${pet.id}`,
                    url: `https://app.mypetdex.app/pet/${pet.id}`,
                  });
                }}
              >
                <Text style={styles.qrActionBtnText}>📤 Share</Text>
              </Pressable>
            </View>

            <Text style={styles.qrTip}>
              💡 Print this QR and attach it to {pet.name}'s collar tag
            </Text>
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
  const { isDemoMode } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "", type: "Vet Visit", date: "", note: "",
  });

  const vaccines = pet.vaccines || [];
  const RECORD_TYPES = ["Vet Visit", "Vaccination", "Medication", "Surgery", "Other"];
  const TYPE_COLORS: Record<string, string> = {
    "Vet Visit": BRAND,
    "Vaccination": BLUE,
    "Medication": "#F4A644",
    "Surgery": "#E53935",
    "Other": "#888",
  };

  async function saveRecord() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to add health records for your pet."); return; }
    if (!form.title.trim() || !form.date.trim()) {
      Alert.alert("Missing info", "Please add a title and date.");
      return;
    }
    setSaving(true);
    try {
      const updated = [
        ...vaccines,
        { ...form, id: Date.now().toString() },
      ];
      if (isWeb) {
        await updateDoc(webDoc(webDb, "users", user.uid, "pets", pet.id), { vaccines: updated });
      } else {
        await firestore().collection("users").doc(user.uid).collection("pets").doc(pet.id).update({ vaccines: updated });
      }
      setShowModal(false);
      setForm({ title: "", type: "Vet Visit", date: "", note: "" });
    } catch {
      Alert.alert("Error", "Could not save record.");
    }
    setSaving(false);
  }

  async function deleteRecord(recordId: string) {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to manage health records."); return; }
    Alert.alert("Delete Record", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = vaccines.filter((v: any) => v.id !== recordId);
          if (isWeb) {
            await updateDoc(webDoc(webDb, "users", user.uid, "pets", pet.id), { vaccines: updated });
          } else {
            await firestore().collection("users").doc(user.uid).collection("pets").doc(pet.id).update({ vaccines: updated });
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.tabContent}>
      {vaccines.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyTitle}>No records yet</Text>
          <Text style={styles.emptySub}>
            Track vet visits, vaccines & medications
          </Text>
        </View>
      ) : (
        vaccines.map((r: any) => (
          <Pressable
            key={r.id}
            style={styles.recordCard}
            onLongPress={() => deleteRecord(r.id)}
          >
            <View
              style={[
                styles.recordBar,
                { backgroundColor: TYPE_COLORS[r.type] || BRAND },
              ]}
            />
            <View style={styles.recordContent}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>{r.title}</Text>
                <Text style={styles.recordDate}>{r.date}</Text>
              </View>
              <Text style={styles.recordType}>{r.type}</Text>
              {r.note ? (
                <Text style={styles.recordNote}>{r.note}</Text>
              ) : null}
            </View>
          </Pressable>
        ))
      )}

      <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>+ Add Record</Text>
      </Pressable>

      {/* Add Record Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Record</Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {RECORD_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typeChip, form.type === t && styles.typeChipActive]}
                  onPress={() => setForm((f) => ({ ...f, type: t }))}
                >
                  <Text style={[styles.typeChipText, form.type === t && styles.typeChipTextActive]}>
                    {t}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput
              style={styles.modalInput}
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="e.g. Annual checkup"
              placeholderTextColor="#aaa"
            />

            <DatePicker
              label="Date *"
              value={form.date}
              onChange={(v) => setForm((f) => ({ ...f, date: v }))}
              future={false}
            />

            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
              placeholder="Any additional details..."
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveRecord}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>Save Record</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ── Reminders Tab ─────────────────────────────────────────────────────────────
function RemindersTab({ pet, user }: { pet: any; user: any }) {
  const { isDemoMode } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dateError, setDateError] = useState("");
  const [form, setForm] = useState({
    title: "", due: "", repeat: "None", note: "",
  });

  const reminders = pet.reminders || [];
  const REPEATS = ["None", "Daily", "Weekly", "Monthly", "Yearly"];

  function parseDueDatetime(due: string): Date | null {
    if (!due) return null;
    const parts = due.split(" ");
    const [y, m, d] = parts[0].split("-").map(Number);
    if (parts.length >= 3) {
      // "YYYY-MM-DD HH:MM AM/PM"
      let [h, min] = parts[1].split(":").map(Number);
      const ap = parts[2];
      if (ap === "PM" && h !== 12) h += 12;
      if (ap === "AM" && h === 12) h = 0;
      return new Date(y, m - 1, d, h, min);
    }
    // "YYYY-MM-DD" — treat as end of that day so the whole day is valid
    return new Date(y, m - 1, d, 23, 59, 59);
  }

  function isOverdue(due: string) {
    const dt = parseDueDatetime(due);
    if (!dt) return false;
    return dt < new Date();
  }

  function openAdd() {
    setEditingId(null);
    setForm({ title: "", due: "", repeat: "None", note: "" });
    setDateError("");
    setShowModal(true);
  }

  function openEdit(r: any) {
    setEditingId(r.id);
    setForm({ title: r.title, due: r.due || "", repeat: r.repeat || "None", note: r.note || "" });
    setDateError("");
    setShowModal(true);
  }

  async function saveReminder() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to set reminders for your pet."); return; }
    if (!form.title.trim()) {
      Alert.alert("Missing info", "Please add a title.");
      return;
    }
    if (form.due) {
      const dt = parseDueDatetime(form.due);
      if (dt && dt < new Date()) {
        setDateError("⚠️ Please select a future date and time.");
        return;
      }
    }
    setDateError("");
    setSaving(true);
    try {
      let updated;
      if (editingId) {
        updated = reminders.map((r: any) =>
          r.id === editingId ? { ...form, id: editingId, done: r.done } : r
        );
      } else {
        updated = [...reminders, { ...form, id: Date.now().toString(), done: false }];
      }
      if (isWeb) {
        await updateDoc(webDoc(webDb, "users", user.uid, "pets", pet.id), { reminders: updated });
      } else {
        await firestore().collection("users").doc(user.uid).collection("pets").doc(pet.id).update({ reminders: updated });
      }
      setShowModal(false);
      setForm({ title: "", due: "", repeat: "None", note: "" });
    } catch {
      Alert.alert("Error", "Could not save reminder.");
    }
    setSaving(false);
  }

  async function toggleDone(reminderId: string) {
    const updated = reminders.map((r: any) =>
      r.id === reminderId ? { ...r, done: !r.done } : r
    );
    if (isWeb) {
      await updateDoc(webDoc(webDb, "users", user.uid, "pets", pet.id), { reminders: updated });
    } else {
      await firestore().collection("users").doc(user.uid).collection("pets").doc(pet.id).update({ reminders: updated });
    }
  }

  async function deleteReminder(reminderId: string) {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to manage reminders."); return; }
    Alert.alert("Delete Reminder", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const updated = reminders.filter((r: any) => r.id !== reminderId);
          if (isWeb) {
            await updateDoc(webDoc(webDb, "users", user.uid, "pets", pet.id), { reminders: updated });
          } else {
            await firestore().collection("users").doc(user.uid).collection("pets").doc(pet.id).update({ reminders: updated });
          }
        },
      },
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
          <Text style={styles.emptySub}>
            Set reminders for vaccines, meds & vet visits
          </Text>
        </View>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Upcoming</Text>
              {pending.map((r: any) => (
                <View
                  key={r.id}
                  style={[
                    styles.reminderCard,
                    isOverdue(r.due) && styles.reminderOverdue,
                  ]}
                >
                  <Pressable onPress={() => toggleDone(r.id)}>
                    <View style={styles.checkbox} />
                  </Pressable>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderTitle}>{r.title}</Text>
                    {r.due ? (
                      <Text
                        style={[
                          styles.reminderDue,
                          isOverdue(r.due) && styles.reminderDueUrgent,
                        ]}
                      >
                        {isOverdue(r.due) ? "⚠️ Overdue · " : "Due: "}
                        {r.due}
                      </Text>
                    ) : null}
                    {r.repeat !== "None" && r.repeat ? (
                      <Text style={styles.reminderRepeat}>
                        🔁 Repeats {r.repeat}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.reminderActions}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => openEdit(r)}
                    >
                      <Text style={styles.iconBtnEdit}>✏️</Text>
                    </Pressable>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => deleteReminder(r.id)}
                    >
                      <Text style={styles.iconBtnDelete}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          )}

          {done.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Completed</Text>
              {done.map((r: any) => (
                <View
                  key={r.id}
                  style={[styles.reminderCard, { opacity: 0.5 }]}
                >
                  <Pressable onPress={() => toggleDone(r.id)}>
                    <View style={[styles.checkbox, styles.checkboxDone]}>
                      <Text style={styles.checkboxTick}>✓</Text>
                    </View>
                  </Pressable>
                  <View style={styles.reminderInfo}>
                    <Text style={[styles.reminderTitle, { textDecorationLine: "line-through" }]}>
                      {r.title}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </>
      )}

      <Pressable style={styles.addBtn} onPress={() => setShowModal(true)}>
        <Text style={styles.addBtnText}>+ Add Reminder</Text>
      </Pressable>

      {/* Add Reminder Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingId ? "Edit Reminder" : "Add Reminder"}
            </Text>
            <Pressable onPress={() => setShowModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput
              style={styles.modalInput}
              value={form.title}
              onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              placeholder="e.g. Heartworm pill"
              placeholderTextColor="#aaa"
            />

            <DatePicker
              label="Due Date & Time *"
              value={form.due}
              onChange={(v) => {
                setForm((f) => ({ ...f, due: v }));
                const dt = parseDueDatetime(v);
                if (dt && dt < new Date()) {
                  setDateError("⚠️ Please select a future date and time.");
                } else {
                  setDateError("");
                }
              }}
              future={true}
              showTime={true}
            />
            {dateError ? (
              <Text style={{ color: "#E53935", fontSize: 13, marginTop: 4, marginBottom: 4 }}>
                {dateError}
              </Text>
            ) : null}

            <Text style={styles.modalLabel}>Repeat</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {REPEATS.map((r) => (
                <Pressable
                  key={r}
                  style={[styles.typeChip, form.repeat === r && styles.typeChipActive]}
                  onPress={() => setForm((f) => ({ ...f, repeat: r }))}
                >
                  <Text style={[styles.typeChipText, form.repeat === r && styles.typeChipTextActive]}>
                    {r}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={form.note}
              onChangeText={(v) => setForm((f) => ({ ...f, note: v }))}
              placeholder="Dosage, instructions..."
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable
              style={[styles.saveBtn, (saving || !!dateError) && { opacity: 0.6 }]}
              onPress={saveReminder}
              disabled={saving || !!dateError}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>
                  {editingId ? "Update Reminder" : "Save Reminder"}
                </Text>
              )}
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
  const weightKg = (pet.weightUnit === "lbs" || !pet.weightUnit)
    ? weight * 0.453592
    : weight;

  const rer = weightKg > 0 ? Math.round(70 * Math.pow(weightKg, 0.75)) : 0;
  const factors: Record<string, number> = {
    sedentary: 1.2, indoor: 1.2, low: 1.2,
    moderate: 1.4, active: 1.4,
    "very active": 1.6, high: 1.6,
  };
  const factor = factors[pet.activityLevel?.toLowerCase()] || 1.4;
  const neuteredAdj = pet.neutered ? 0.9 : 1.0;
  const der = Math.round(rer * factor * neuteredAdj);
  const protein = Math.round(weightKg * (pet.species === "cat" ? 6 : 5));
  const fat = Math.round(der * 0.18 / 9);

  if (weightKg === 0) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>⚖️</Text>
          <Text style={styles.emptyTitle}>Weight not set</Text>
          <Text style={styles.emptySub}>
            Add your pet's weight to calculate daily calories
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.calorieHero}>
        <Text style={styles.calorieNumber}>{der}</Text>
        <Text style={styles.calorieLabel}>kcal/day recommended</Text>
        <Text style={styles.calorieSource}>Based on AAFCO 2023 + WSAVA guidelines</Text>
      </View>
      <View style={styles.macroRow}>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{protein}g</Text>
          <Text style={styles.macroLabel}>Protein</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{fat}g</Text>
          <Text style={styles.macroLabel}>Fat</Text>
        </View>
        <View style={styles.macroCard}>
          <Text style={styles.macroValue}>{rer}</Text>
          <Text style={styles.macroLabel}>RER</Text>
        </View>
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
  const weightKg = (pet.weightUnit === "lbs" || !pet.weightUnit)
    ? weight * 0.453592
    : weight;
  const rer = weightKg > 0 ? Math.round(70 * Math.pow(weightKg, 0.75)) : 0;
  const factors: Record<string, number> = {
    sedentary: 1.2, indoor: 1.2, low: 1.2,
    moderate: 1.4, active: 1.4,
    "very active": 1.6, high: 1.6,
  };
  const der = Math.round(rer * (factors[pet.activityLevel?.toLowerCase()] || 1.4) * (pet.neutered ? 0.9 : 1.0));

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
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return { ...prev, [category]: updated };
    });
  }

  const allSelected = Object.values(selected).flat();

  async function generateRecipe() {
    if (allSelected.length < 2 || !canUseAI) return;
    setLoading(true);
    setStep("result");
    try {
      const result = await generatePetRecipe({
        name: pet.name,
        species: pet.species || pet.type || "dog",
        breed: pet.breed,
        age: pet.age,
        weight: pet.weight,
        weightUnit: pet.weightUnit,
        activityLevel: pet.activityLevel,
        neutered: pet.neutered,
      });
      setRecipe(result.recipe);
    } catch (e: any) {
      setRecipe(`Could not generate recipe: ${e?.message || "Please check your connection and try again."}`);
    } finally {
      setLoading(false);
    }
  }

  if (!canUseAI) {
    return (
      <View style={styles.tabContent}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🔒</Text>
          <Text style={styles.emptyTitle}>Plus Feature</Text>
          <Text style={styles.emptySub}>
            Upgrade to Plus to generate AI-powered personalized recipes for {pet.name}
          </Text>
        </View>
      </View>
    );
  }

  if (step === "result") {
    return (
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
          <View style={styles.recipeResultCard}>
            <Text style={styles.recipeResultText}>{recipe}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      <View style={styles.recipeIntro}>
        <Text style={styles.recipeIntroTitle}>Build {pet.name}'s Recipe</Text>
        <Text style={styles.recipeIntroDesc}>
          Select ingredients you have at home. We'll generate a personalized recipe based on {pet.name}'s breed, age, weight and {der} kcal/day need.
        </Text>
      </View>

      {Object.entries(INGREDIENTS).map(([category, items]) => (
        <View key={category} style={styles.ingredientGroup}>
          <Text style={styles.ingredientCategory}>{category}</Text>
          <View style={styles.ingredientGrid}>
            {items.map((item) => {
              const isSelected = (selected[category] || []).includes(item);
              return (
                <Pressable
                  key={item}
                  style={[styles.ingredientChip, isSelected && styles.ingredientChipSelected]}
                  onPress={() => toggleIngredient(category, item)}
                >
                  <Text style={[styles.ingredientChipText, isSelected && styles.ingredientChipTextSelected]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.disclaimerCard}>
        <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
        <Text style={styles.disclaimerText}>
          Homemade diets may lack essential nutrients. Always consult your veterinarian before switching to homemade food.
        </Text>
      </View>

      <Pressable
        style={[styles.generateBtn, allSelected.length < 2 && styles.generateBtnDisabled]}
        onPress={generateRecipe}
        disabled={allSelected.length < 2}
      >
        <Text style={styles.generateBtnText}>
          {allSelected.length < 2
            ? "Select at least 2 ingredients"
            : `Generate ${pet.name}'s Recipe`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { backgroundColor: "#fff", padding: 20, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#f0f8f4", alignItems: "center", justifyContent: "center", marginBottom: 12, position: "relative" },
  avatarPhoto: { width: 80, height: 80, borderRadius: 40 },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  avatarEditIcon: { fontSize: 11 },
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
  recordCard: { backgroundColor: "#fff", borderRadius: 12, flexDirection: "row", overflow: "hidden" },
  recordBar: { width: 4 },
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
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#ccc", alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: BRAND, borderColor: BRAND },
  checkboxTick: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
  qrUrlBox: { backgroundColor: "#F5F5F5", borderRadius: 12, padding: 12, width: "100%" },
  qrUrlText: { fontSize: 12, color: "#555", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  qrBtnRow: { flexDirection: "row", gap: 12, width: "100%" },
  qrActionBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  qrActionBtnBlue: { backgroundColor: BLUE },
  qrActionBtnGreen: { backgroundColor: BRAND },
  qrActionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  qrTip: { fontSize: 12, color: "#aaa", textAlign: "center" },
  editDetailsBtn: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: "#F0F4FF", borderWidth: 1, borderColor: BRAND + "33" },
  editDetailsBtnText: { fontSize: 13, color: BRAND, fontWeight: "600" },
  editSection: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", marginTop: 16, marginBottom: 2 },
  editSectionSub: { fontSize: 12, color: "#aaa", marginBottom: 8 },
  pillRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, marginBottom: 4 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0F0F0", borderWidth: 1.5, borderColor: "transparent" },
  pillActive: { backgroundColor: BRAND + "15", borderColor: BRAND },
  pillText: { fontSize: 13, fontWeight: "600" as const, color: "#666" },
  pillTextActive: { color: BRAND },
  switchRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginVertical: 4 },
  dropdown: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5", paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 4 },
  dropdownValue: { fontSize: 15, color: "#1a1a1a" },
  dropdownArrow: { fontSize: 14, color: "#aaa" },
  pickerModal: { flex: 1, backgroundColor: "#f8f8f8" },
  pickerHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, padding: 20, paddingTop: 24, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  pickerTitle: { fontSize: 18, fontWeight: "700" as const, color: "#1a1a1a" },
  pickerDone: { fontSize: 16, color: BRAND, fontWeight: "600" as const },
  pickerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#f5f5f5", flexDirection: "row" as const, justifyContent: "space-between" as const },
  pickerItemActive: { backgroundColor: BRAND + "10" },
  pickerItemText: { fontSize: 15, color: "#1a1a1a" },
  pickerItemTextActive: { color: BRAND, fontWeight: "600" as const },
  pickerCheck: { color: BRAND, fontWeight: "700" as const },
  reminderActions: { flexDirection: "row" as const, gap: 8, marginTop: 8 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F1F5F9", alignItems: "center" as const, justifyContent: "center" as const },
  iconBtnEdit: { fontSize: 16 },
  iconBtnDelete: { fontSize: 16 },
});