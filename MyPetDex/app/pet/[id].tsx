import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Alert, TextInput, Modal, Platform,
  Share, Linking, Switch, Image, FlatList, KeyboardAvoidingView,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import { db, uploadPetPhoto, auth } from "@/lib/firebase";
import {
  doc, onSnapshot, updateDoc, deleteDoc, arrayUnion, arrayRemove,
  addDoc, collection, serverTimestamp, query, where, orderBy, getDocs, limit,
} from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import DatePicker from "@/components/DatePicker";
import QRCode from "react-native-qrcode-svg";
import Svg, { Polyline, Circle, Line, Text as SvgText } from "react-native-svg";

const BRAND = "#4486F4";
const BLUE = "#4486F4";
const TABS = ["Records", "Reminders", "Meds", "Calories", "Recipes"];

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
  const { plan, pdfExport } = usePlan();
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
          const data = { id: snap.id, ...snap.data() } as any;
          if (data.photoURL) ExpoImage.prefetch(data.photoURL);
          setPet(data);
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

  async function generatePetResume() {
    if (!pet) return;
    const activeMeds = (pet.medications || []).filter((m: any) => m.active !== false);
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const vetAddress = pet.vet?.street
      ? `${pet.vet.street}${pet.vet.city ? `, ${pet.vet.city}` : ""}${pet.vet.state ? `, ${pet.vet.state}` : ""}${pet.vet.zip ? ` ${pet.vet.zip}` : ""}${pet.vet.country && pet.vet.country !== "USA" ? `, ${pet.vet.country}` : ""}`
      : pet.vet?.address || "";

    const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: -apple-system, Helvetica, sans-serif; color:#0F172A; }
.header { background:#4486F4; padding:32px 24px; color:white; }
.header h1 { font-size:26px; font-weight:900; }
.header p { font-size:13px; opacity:0.75; margin-top:4px; }
.hero { display:flex; align-items:center; gap:20px; padding:24px; border-bottom:1px solid #E2E8F0; }
.avatar { width:80px; height:80px; border-radius:40px; background:#E2E8F0; display:flex; align-items:center; justify-content:center; font-size:40px; border:3px solid #4486F4; overflow:hidden; }
.avatar img { width:80px; height:80px; object-fit:cover; }
.pet-name { font-size:24px; font-weight:800; }
.pet-meta { font-size:13px; color:#64748B; margin-top:3px; }
.section { padding:20px 24px; border-bottom:1px solid #E2E8F0; }
.label { font-size:11px; font-weight:700; color:#4486F4; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px; }
.row { display:flex; gap:8px; margin-bottom:7px; font-size:14px; }
.key { color:#64748B; min-width:90px; }
.val { color:#0F172A; font-weight:500; }
.med { background:#F8FAFC; border-radius:8px; padding:12px; margin-bottom:8px; }
.med-name { font-weight:700; font-size:14px; }
.med-sub { font-size:12px; color:#64748B; margin-top:2px; }
.empty { color:#94A3B8; font-size:13px; font-style:italic; }
.footer { padding:24px; text-align:center; background:#F8FAFC; }
.footer-brand { font-size:15px; font-weight:800; color:#4486F4; }
.footer-sub { font-size:12px; color:#94A3B8; margin-top:4px; }
</style></head><body>
<div class="header"><h1>${pet.name}'s Care Resume</h1><p>Generated by MyPetDex · ${today}</p></div>
<div class="hero">
  <div class="avatar">${pet.photoURL ? `<img src="${pet.photoURL}" />` : "🐾"}</div>
  <div>
    <div class="pet-name">${pet.name}</div>
    <div class="pet-meta">${pet.species || "Dog"} · ${pet.breed || "Mixed"}</div>
    <div class="pet-meta">${pet.age ? `${pet.age} yrs` : ""}${pet.age && pet.weight ? " · " : ""}${pet.weight ? `${pet.weight} ${pet.weightUnit || "lbs"}` : ""}</div>
  </div>
</div>
<div class="section">
  <div class="label">Basic Info</div>
  ${pet.activityLevel ? `<div class="row"><span class="key">Activity</span><span class="val">${pet.activityLevel}</span></div>` : ""}
  ${pet.neutered !== undefined ? `<div class="row"><span class="key">Neutered</span><span class="val">${pet.neutered ? "Yes" : "No"}</span></div>` : ""}
  ${pet.licenseNumber ? `<div class="row"><span class="key">License #</span><span class="val">${pet.licenseNumber}</span></div>` : ""}
</div>
${pet.vet?.name ? `<div class="section">
  <div class="label">Veterinarian</div>
  <div class="row"><span class="key">Doctor</span><span class="val">${pet.vet.name}</span></div>
  ${pet.vet.clinic ? `<div class="row"><span class="key">Clinic</span><span class="val">${pet.vet.clinic}</span></div>` : ""}
  ${pet.vet.phone ? `<div class="row"><span class="key">Phone</span><span class="val">${pet.vet.phone}</span></div>` : ""}
  ${pet.vet.email ? `<div class="row"><span class="key">Email</span><span class="val">${pet.vet.email}</span></div>` : ""}
  ${vetAddress ? `<div class="row"><span class="key">Address</span><span class="val">${vetAddress}</span></div>` : ""}
</div>` : ""}
<div class="section">
  <div class="label">Active Medications</div>
  ${activeMeds.length === 0
    ? `<p class="empty">No active medications</p>`
    : activeMeds.map((m: any) => `<div class="med"><div class="med-name">${m.name}</div><div class="med-sub">${[m.dosage, m.frequency].filter(Boolean).join(" · ")}${m.note ? ` · ${m.note}` : ""}</div></div>`).join("")}
</div>
${(pet.vaccines || []).length > 0 ? `
<div class="section">
  <div class="label">Health Records</div>
  ${(pet.vaccines as any[]).map(v => `
    <div class="med">
      <div class="med-name">${v.title || v.type || "Record"}</div>
      <div class="med-sub">${v.type || ""}${v.type && v.date ? " · " : ""}${v.date || ""}${v.note ? ` · ${v.note}` : ""}</div>
    </div>
  `).join("")}
</div>` : ""}
<div class="footer">
  <div class="footer-brand">MyPetDex</div>
  <div class="footer-sub">The complete home for pet owners · home.mypetdex.app</div>
</div>
</body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `${pet.name}'s Care Resume`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      Alert.alert("Could not generate resume", "Please try again.");
    }
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
            <ExpoImage
              source={{ uri: pet.photoURL }}
              style={styles.avatarImage}
              cachePolicy="memory-disk"
              contentFit="cover"
              transition={0}
            />
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
        <Pressable
          style={[styles.resumeBtn, !pdfExport && styles.resumeBtnLocked]}
          onPress={() => {
            if (!pdfExport) {
              Alert.alert(
                "Plus Feature",
                "Generate and share a professional Care Resume PDF for your pet. Upgrade to Plus to unlock.",
                [{ text: "Not now", style: "cancel" }, { text: "Upgrade", onPress: () => router.push("/settings/subscription") }]
              );
              return;
            }
            generatePetResume();
          }}
        >
          <Ionicons name={pdfExport ? "document-text-outline" : "lock-closed-outline"} size={18} color={pdfExport ? BRAND : "#94A3B8"} />
          <Text style={[styles.resumeBtnText, !pdfExport && { color: "#94A3B8" }]}>
            {pdfExport ? "Generate Care Resume PDF" : "Care Resume PDF — Plus Feature"}
          </Text>
        </Pressable>
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
              <QRCode value={`https://app.mypetdex.app/pet/${user?.uid}/${pet.id}`} size={220} color="#1a1a1a" backgroundColor="#fff" />
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
              <Pressable style={[styles.qrActionBtn, styles.qrActionBtnBlue]} onPress={() => Linking.openURL(`https://app.mypetdex.app/pet/${user?.uid}/${pet.id}`)}>
                <Text style={styles.qrActionBtnText}>🔗 Open Link</Text>
              </Pressable>
              <Pressable style={[styles.qrActionBtn, styles.qrActionBtnGreen]} onPress={() => Share.share({ message: `🐾 ${pet.name}'s emergency info: https://app.mypetdex.app/pet/${user?.uid}/${pet.id}`, url: `https://app.mypetdex.app/pet/${user?.uid}/${pet.id}` })}>
                <Text style={styles.qrActionBtnText}>📤 Share</Text>
              </Pressable>
            </View>
            <Text style={styles.qrTip}>💡 Print this QR and attach it to {pet.name}'s collar tag</Text>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Pet Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
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
        </KeyboardAvoidingView>
      </Modal>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {activeTab === "Records" && <RecordsTab pet={pet} user={user} />}
        {activeTab === "Reminders" && <RemindersTab pet={pet} user={user} />}
        {activeTab === "Meds" && <MedsTab pet={pet} user={user} />}
        {activeTab === "Calories" && <CaloriesTab pet={pet} user={user} />}
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
  const [showVetModal, setShowVetModal] = useState(false);
  const [savingVet, setSavingVet] = useState(false);
  const [vetForm, setVetForm] = useState({
    name: "", clinic: "", phone: "",
    street: "", city: "", state: "", zip: "", country: "USA",
    email: "", notes: ""
  });

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

  function openVetEdit() {
    setVetForm({
      name: pet.vet?.name || "",
      clinic: pet.vet?.clinic || "",
      phone: pet.vet?.phone || "",
      street: pet.vet?.street || "",
      city: pet.vet?.city || "",
      state: pet.vet?.state || "",
      zip: pet.vet?.zip || "",
      country: pet.vet?.country || "USA",
      email: pet.vet?.email || "",
      notes: pet.vet?.notes || "",
    });
    setShowVetModal(true);
  }

  async function saveVet() {
    setSavingVet(true);
    try {
      await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { vet: vetForm });
      setShowVetModal(false);
    } catch { Alert.alert("Error", "Could not save vet info."); }
    setSavingVet(false);
  }

  return (
    <View style={styles.tabContent}>
      {/* Vet Contact Card */}
      <View style={styles.vetCard}>
        <View style={styles.vetCardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="business-outline" size={16} color="#1a1a1a" />
            <Text style={styles.vetCardTitle}>My Vet</Text>
          </View>
          <Pressable onPress={openVetEdit} style={styles.vetAddBtn}>
            <Text style={styles.vetAddBtnText}>{pet.vet?.name ? "Edit" : "+ Add Vet"}</Text>
          </Pressable>
        </View>
        {pet.vet?.name ? (
          <View style={styles.vetCardBody}>
            <Text style={styles.vetName}>{pet.vet.name}</Text>
            {pet.vet.clinic ? (
              <View style={styles.vetDetailRow}>
                <Ionicons name="business-outline" size={13} color="#64748B" />
                <Text style={styles.vetDetail}>{pet.vet.clinic}</Text>
              </View>
            ) : null}
            {pet.vet.phone ? (
              <Pressable onPress={() => Linking.openURL(`tel:${pet.vet.phone.replace(/\D/g, "")}`)}>
                <View style={styles.vetDetailRow}>
                  <Ionicons name="call-outline" size={13} color={BRAND} />
                  <Text style={[styles.vetDetail, styles.vetPhone]}>{pet.vet.phone}</Text>
                </View>
              </Pressable>
            ) : null}
            {(pet.vet.street || pet.vet.address) ? (
              <View style={styles.vetDetailRow}>
                <Ionicons name="location-outline" size={13} color="#64748B" />
                <Text style={styles.vetDetail}>
                  {pet.vet.street
                    ? `${pet.vet.street}${pet.vet.city ? `, ${pet.vet.city}` : ""}${pet.vet.state ? `, ${pet.vet.state}` : ""}${pet.vet.zip ? ` ${pet.vet.zip}` : ""}${pet.vet.country && pet.vet.country !== "USA" ? `, ${pet.vet.country}` : ""}`
                    : pet.vet.address}
                </Text>
              </View>
            ) : null}
            {pet.vet.email ? (
              <Pressable onPress={() => Linking.openURL(`mailto:${pet.vet.email}`)}>
                <View style={styles.vetDetailRow}>
                  <Ionicons name="mail-outline" size={13} color={BRAND} />
                  <Text style={[styles.vetDetail, styles.vetPhone]}>{pet.vet.email}</Text>
                </View>
              </Pressable>
            ) : null}
            {pet.vet.notes ? <Text style={styles.vetNotes}>{pet.vet.notes}</Text> : null}
          </View>
        ) : (
          <Text style={styles.vetEmptyText}>Tap "+ Add Vet" to save your vet's contact info</Text>
        )}
      </View>

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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Record</Text>
            <Pressable onPress={() => setShowModal(false)}><Text style={styles.modalClose}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
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
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={showVetModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVetModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Vet Contact</Text>
            <Pressable onPress={() => setShowVetModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Vet / Doctor Name</Text>
            <TextInput
              style={styles.modalInput}
              value={vetForm.name}
              onChangeText={(v) => setVetForm(f => ({ ...f, name: v }))}
              placeholder="e.g. Dr. Sarah Lee"
              placeholderTextColor="#aaa"
            />
            <Text style={styles.modalLabel}>Clinic Name</Text>
            <TextInput
              style={styles.modalInput}
              value={vetForm.clinic}
              onChangeText={(v) => setVetForm(f => ({ ...f, clinic: v }))}
              placeholder="e.g. Happy Paws Veterinary"
              placeholderTextColor="#aaa"
            />
            <Text style={styles.modalLabel}>Phone Number</Text>
            <TextInput
              style={styles.modalInput}
              value={vetForm.phone}
              onChangeText={(v) => setVetForm(f => ({ ...f, phone: v }))}
              placeholder="e.g. 555-123-4567"
              placeholderTextColor="#aaa"
              keyboardType="phone-pad"
            />
            <Text style={styles.modalLabel}>Street Address (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={vetForm.street}
              onChangeText={(v) => setVetForm(f => ({ ...f, street: v }))}
              placeholder="e.g. 123 Main St"
              placeholderTextColor="#aaa"
            />
            <View style={styles.editRow}>
              <View style={{ flex: 2 }}>
                <Text style={styles.modalLabel}>City</Text>
                <TextInput
                  style={styles.modalInput}
                  value={vetForm.city}
                  onChangeText={(v) => setVetForm(f => ({ ...f, city: v }))}
                  placeholder="City"
                  placeholderTextColor="#aaa"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>State</Text>
                <TextInput
                  style={styles.modalInput}
                  value={vetForm.state}
                  onChangeText={(v) => setVetForm(f => ({ ...f, state: v.toUpperCase() }))}
                  placeholder="NJ"
                  placeholderTextColor="#aaa"
                  maxLength={2}
                  autoCapitalize="characters"
                />
              </View>
            </View>
            <View style={styles.editRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Zip Code</Text>
                <TextInput
                  style={styles.modalInput}
                  value={vetForm.zip}
                  onChangeText={(v) => setVetForm(f => ({ ...f, zip: v }))}
                  placeholder="08816"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalLabel}>Country</Text>
                <TextInput
                  style={styles.modalInput}
                  value={vetForm.country}
                  onChangeText={(v) => setVetForm(f => ({ ...f, country: v }))}
                  placeholder="USA"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
            <Text style={styles.modalLabel}>Email (optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={vetForm.email}
              onChangeText={(v) => setVetForm(f => ({ ...f, email: v }))}
              placeholder="e.g. clinic@happypaws.com"
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextarea]}
              value={vetForm.notes}
              onChangeText={(v) => setVetForm(f => ({ ...f, notes: v }))}
              placeholder="Emergency hours, parking notes, etc."
              placeholderTextColor="#aaa"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Pressable
              style={[styles.saveBtn, savingVet && { opacity: 0.6 }]}
              onPress={saveVet}
              disabled={savingVet}
            >
              {savingVet
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Vet Info</Text>
              }
            </Pressable>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Meds Tab ──────────────────────────────────────────────────────────────────
function MedsTab({ pet, user }: { pet: any; user: any }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", dosage: "", frequency: "Daily", refillDate: "", note: ""
  });

  const FREQ = ["Daily", "Twice Daily", "Weekly", "Monthly", "As Needed", "Other"];
  const medications = pet.medications || [];
  const active = medications.filter((m: any) => m.active !== false);
  const inactive = medications.filter((m: any) => m.active === false);

  function isRefillSoon(refillDate: string): boolean {
    if (!refillDate) return false;
    const [y, m, d] = refillDate.split("-").map(Number);
    const refill = new Date(y, m - 1, d);
    const diff = (refill.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  }

  function openAdd() {
    setEditingId(null);
    setForm({ name: "", dosage: "", frequency: "Daily", refillDate: "", note: "" });
    setShowModal(true);
  }

  function openEdit(m: any) {
    setEditingId(m.id);
    setForm({ name: m.name, dosage: m.dosage || "", frequency: m.frequency || "Daily", refillDate: m.refillDate || "", note: m.note || "" });
    setShowModal(true);
  }

  async function saveMed() {
    if (!form.name.trim()) { Alert.alert("Missing info", "Please enter a medication name."); return; }
    setSaving(true);
    try {
      let updated;
      if (editingId) {
        updated = medications.map((m: any) =>
          m.id === editingId ? { ...m, ...form } : m
        );
      } else {
        updated = [...medications, { ...form, id: Date.now().toString(), active: true }];
      }
      await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { medications: updated });
      setShowModal(false);
    } catch { Alert.alert("Error", "Could not save medication."); }
    setSaving(false);
  }

  async function toggleActive(medId: string) {
    const updated = medications.map((m: any) =>
      m.id === medId ? { ...m, active: !m.active } : m
    );
    await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { medications: updated });
  }

  async function deleteMed(medId: string) {
    Alert.alert("Delete Medication", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const updated = medications.filter((m: any) => m.id !== medId);
        await updateDoc(doc(db, "users", user.uid, "pets", pet.id), { medications: updated });
      }},
    ]);
  }

  function renderMedCard(m: any) {
    const isActive = m.active !== false;
    return (
      <View key={m.id} style={styles.medCard}>
        <View style={[styles.medBar, { backgroundColor: isActive ? "#22C55E" : "#94A3B8" }]} />
        <View style={{ flex: 1 }}>
          <View style={styles.medContent}>
            <View style={styles.medTopRow}>
              <Text style={styles.medName}>{m.name}</Text>
              {m.refillDate ? (
                isRefillSoon(m.refillDate) ? (
                  <Text style={styles.medRefillWarn}>⚠️ Refill soon</Text>
                ) : (
                  <Text style={styles.medRefill}>{m.refillDate}</Text>
                )
              ) : null}
            </View>
            {m.dosage ? <Text style={styles.medDosage}>💊 {m.dosage}</Text> : null}
            <Text style={styles.medFreq}>🔁 {m.frequency || "Daily"}</Text>
            {m.note ? <Text style={styles.medNote}>{m.note}</Text> : null}
          </View>
          {/* Action bar */}
          <View style={styles.medActionBar}>
            <Pressable style={styles.medActionBtn} onPress={() => openEdit(m)}>
              <Text style={styles.medActionEdit}>Edit</Text>
            </Pressable>
            <View style={styles.medActionDivider} />
            <Pressable style={[styles.medActionBtn, { flex: 2 }]} onPress={() => toggleActive(m.id)}>
              <Text style={styles.medActionToggle}>
                {isActive ? "▼ Mark as stopped" : "▲ Mark as active"}
              </Text>
            </Pressable>
            <View style={styles.medActionDivider} />
            <Pressable style={styles.medActionBtn} onPress={() => deleteMed(m.id)}>
              <Text style={styles.medActionDelete}>Delete</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {medications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>💊</Text>
          <Text style={styles.emptyTitle}>No medications yet</Text>
          <Text style={styles.emptySub}>Track your pet's medications, dosages & refills</Text>
        </View>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Active</Text>
              {active.map(renderMedCard)}
            </>
          )}
          {inactive.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Stopped</Text>
              {inactive.map(renderMedCard)}
            </>
          )}
        </>
      )}
      <Pressable style={styles.addBtn} onPress={openAdd}>
        <Text style={styles.addBtnText}>+ Add Medication</Text>
      </Pressable>
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit Medication" : "Add Medication"}</Text>
            <Pressable onPress={() => setShowModal(false)}><Text style={styles.modalClose}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Medication Name *</Text>
            <TextInput style={styles.modalInput} value={form.name} onChangeText={(v) => setForm(f => ({ ...f, name: v }))} placeholder="e.g. Heartgard Plus" placeholderTextColor="#aaa" />
            <Text style={styles.modalLabel}>Dosage</Text>
            <TextInput style={styles.modalInput} value={form.dosage} onChangeText={(v) => setForm(f => ({ ...f, dosage: v }))} placeholder="e.g. 1 tablet, 5mg" placeholderTextColor="#aaa" />
            <Text style={styles.modalLabel}>Frequency</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
              {FREQ.map((f) => (
                <Pressable key={f} style={[styles.typeChip, form.frequency === f && styles.typeChipActive]} onPress={() => setForm(prev => ({ ...prev, frequency: f }))}>
                  <Text style={[styles.typeChipText, form.frequency === f && styles.typeChipTextActive]}>{f}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <DatePicker label="Refill Date (optional)" value={form.refillDate} onChange={(v) => setForm(f => ({ ...f, refillDate: v }))} future={true} showTime={false} />
            <Text style={styles.modalLabel}>Notes (optional)</Text>
            <TextInput style={[styles.modalInput, styles.modalTextarea]} value={form.note} onChangeText={(v) => setForm(f => ({ ...f, note: v }))} placeholder="Any instructions or notes..." placeholderTextColor="#aaa" multiline numberOfLines={3} textAlignVertical="top" />
            <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={saveMed} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingId ? "Update Medication" : "Save Medication"}</Text>}
            </Pressable>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Weight Chart helper ───────────────────────────────────────────────────────
function WeightChart({ data }: { data: any[] }) {
  if (data.length < 2) return null;

  const W = 320, H = 120, PAD = { top: 12, bottom: 28, left: 36, right: 12 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const weights = data.map((d: any) => d.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;

  const xStep = chartW / (data.length - 1);
  const points = data.map((d: any, i: number) => {
    const x = PAD.left + i * xStep;
    const y = PAD.top + chartH - ((d.weight - minW) / range) * chartH;
    return { x, y, d };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(" ");
  const labelStep = Math.ceil(data.length / 5);

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line
        x1={PAD.left} y1={PAD.top + chartH}
        x2={PAD.left + chartW} y2={PAD.top + chartH}
        stroke="#E5E7EB" strokeWidth={1}
      />
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke="#4486F4"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#4486F4" />
      ))}
      {points.map((p, i) =>
        i % labelStep === 0 ? (
          <SvgText
            key={i}
            x={p.x}
            y={H - 4}
            fontSize={9}
            fill="#94A3B8"
            textAnchor="middle"
          >
            {p.d.date.slice(5)}
          </SvgText>
        ) : null
      )}
      <SvgText x={PAD.left - 4} y={PAD.top + chartH} fontSize={9} fill="#94A3B8" textAnchor="end">
        {minW}
      </SvgText>
      <SvgText x={PAD.left - 4} y={PAD.top + 8} fontSize={9} fill="#94A3B8" textAnchor="end">
        {maxW}
      </SvgText>
    </Svg>
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{editingId ? "Edit Reminder" : "Add Reminder"}</Text>
            <Pressable onPress={() => setShowModal(false)}><Text style={styles.modalClose}>Cancel</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Calories Tab ──────────────────────────────────────────────────────────────
function CaloriesTab({ pet, user }: { pet: any; user: any }) {
  const [weightLog, setWeightLog] = useState<any[]>([]);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightEntry, setWeightEntry] = useState({
    weight: pet.weight?.toString() || "",
    weightUnit: pet.weightUnit || "lbs",
    date: new Date().toISOString().slice(0, 10),
  });
  const [savingWeight, setSavingWeight] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "pets", pet.id, "weightLog"),
      orderBy("date", "asc"),
      limit(20)
    );
    const unsub = onSnapshot(q, snap => {
      setWeightLog(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, pet.id]);

  async function saveWeightEntry() {
    const w = parseFloat(weightEntry.weight);
    if (!w || w <= 0) { Alert.alert("Invalid", "Please enter a valid weight."); return; }
    setSavingWeight(true);
    try {
      await addDoc(collection(db, "users", user.uid, "pets", pet.id, "weightLog"), {
        weight: w,
        weightUnit: weightEntry.weightUnit,
        date: weightEntry.date,
        createdAt: serverTimestamp(),
      });
      setShowWeightModal(false);
    } catch { Alert.alert("Error", "Could not save weight entry."); }
    setSavingWeight(false);
  }

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

      {/* Weight History */}
      <View style={styles.infoCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Text style={styles.infoTitle}>⚖️ Weight History</Text>
          <Pressable
            style={{ backgroundColor: BRAND, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
            onPress={() => setShowWeightModal(true)}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>+ Log</Text>
          </Pressable>
        </View>

        {weightLog.length === 0 ? (
          <Text style={{ color: "#aaa", fontSize: 13, textAlign: "center", paddingVertical: 16 }}>
            No weight entries yet. Tap + Log to start tracking.
          </Text>
        ) : weightLog.length === 1 ? (
          <View style={{ alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#1a1a1a" }}>
              {weightLog[0].weight} {weightLog[0].weightUnit}
            </Text>
            <Text style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{weightLog[0].date}</Text>
            <Text style={{ color: "#aaa", fontSize: 12, marginTop: 8 }}>Log one more entry to see the chart.</Text>
          </View>
        ) : (
          <>
            {(() => {
              const last = weightLog[weightLog.length - 1].weight;
              const prev = weightLog[weightLog.length - 2].weight;
              const diff = (last - prev).toFixed(1);
              const unit = weightLog[weightLog.length - 1].weightUnit;
              const up = last > prev;
              const same = last === prev;
              return (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 20 }}>{same ? "➡️" : up ? "📈" : "📉"}</Text>
                  <Text style={{ fontSize: 14, color: "#555" }}>
                    {same ? "No change" : `${up ? "+" : ""}${diff} ${unit} since last entry`}
                  </Text>
                </View>
              );
            })()}
            <View style={{ alignItems: "center" }}>
              <WeightChart data={weightLog} />
            </View>
            <View style={{ marginTop: 12, gap: 6 }}>
              {[...weightLog].reverse().slice(0, 5).map((entry: any) => (
                <View key={entry.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 13, color: "#888" }}>{entry.date}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#1a1a1a" }}>
                    {entry.weight} {entry.weightUnit}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <Modal
        visible={showWeightModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowWeightModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log Weight</Text>
            <Pressable onPress={() => setShowWeightModal(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalLabel}>Weight *</Text>
            <View style={styles.weightRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                value={weightEntry.weight}
                onChangeText={(t) => setWeightEntry(e => ({ ...e, weight: t.replace(/[^0-9.]/g, "") }))}
                keyboardType="decimal-pad"
                placeholder="e.g. 65"
                placeholderTextColor="#aaa"
              />
              <Pressable
                style={styles.unitToggle}
                onPress={() => setWeightEntry(e => ({ ...e, weightUnit: e.weightUnit === "lbs" ? "kg" : "lbs" }))}
              >
                <Text style={styles.unitText}>{weightEntry.weightUnit}</Text>
              </Pressable>
            </View>
            <DatePicker
              label="Date *"
              value={weightEntry.date}
              onChange={(v) => setWeightEntry(e => ({ ...e, date: v }))}
              future={false}
            />
            <Pressable
              style={[styles.saveBtn, savingWeight && { opacity: 0.6 }]}
              onPress={saveWeightEntry}
              disabled={savingWeight}
            >
              {savingWeight
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveBtnText}>Save Entry</Text>
              }
            </Pressable>
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Recipes Tab ───────────────────────────────────────────────────────────────
const RECIPE_URL = "https://us-central1-mypetdex-c4315.cloudfunctions.net/getRecipe";

function RecipesTab({ pet, canUseAI }: { pet: any; canUseAI: boolean }) {
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "result">("select");
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "savedRecipes"),
      where("uid", "==", user.uid),
      where("petId", "==", pet.id),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, snap => {
      setSavedRecipes(snap.docs.map(d => ({ docId: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, pet.id]);

  const weight = parseFloat(pet.weight) || 0;
  const weightKg = (pet.weightUnit === "lbs" || !pet.weightUnit) ? weight * 0.453592 : weight;
  const rer = weightKg > 0 ? Math.round(70 * Math.pow(weightKg, 0.75)) : 0;
  const actMult: Record<string, number> = { sedentary: 1.2, indoor: 1.2, low: 1.2, moderate: 1.4, active: 1.4, "very active": 1.6, high: 1.6 };
  const der = Math.round(rer * (actMult[pet.activityLevel?.toLowerCase()] || 1.4) * (pet.neutered ? 0.9 : 1.0));

  const INGREDIENTS: Record<string, string[]> = {
    "🥩 Protein": ["Chicken", "Turkey", "Beef", "Salmon", "Sardines", "Eggs", "Lamb", "Venison", "Duck", "Tuna", "Shrimp"],
    "🍚 Carbs": ["White Rice", "Sweet Potato", "Oats", "Quinoa", "Pumpkin", "Barley", "Brown Rice", "Lentils"],
    "🥦 Vegetables": ["Carrots", "Broccoli", "Spinach", "Peas", "Zucchini", "Green Beans", "Kale", "Celery", "Cucumber", "Bell Pepper"],
    "🫐 Fruits": ["Blueberries", "Apple", "Watermelon", "Banana", "Mango", "Strawberries"],
    "🫒 Healthy Fats": ["Olive Oil", "Fish Oil", "Coconut Oil", "Flaxseed", "Sunflower Oil"],
    "💊 Supplements": ["Fish Oil Capsule", "Calcium Powder", "Vitamin E", "Probiotic", "Glucosamine"],
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
    setProgressStep(0);
    setError("");
    setStep("result");

    let stepIndex = 0;
    const interval = setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, 3);
      setProgressStep(stepIndex);
    }, 2200);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Not authenticated");
      const response = await fetch(RECIPE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          petName: pet.name,
          species: pet.species || pet.type || "dog",
          breed: pet.breed,
          age: pet.age,
          weight: pet.weight,
          weightUnit: pet.weightUnit || "lbs",
          activityLevel: pet.activityLevel || "moderate",
          neutered: pet.neutered || false,
          dailyCalories: der,
          ingredients: allSelected,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      if (!data.name || !data.ingredients) {
        throw new Error("Recipe generation failed. Please try again.");
      }
      setRecipe(data);
      try {
        const existingSnap = await getDocs(query(
          collection(db, "savedRecipes"),
          where("uid", "==", user?.uid),
          where("petId", "==", pet.id)
        ));
        if (existingSnap.size >= 3) {
          setSaved(false);
        } else {
          await addDoc(collection(db, "savedRecipes"), {
            uid: user?.uid,
            petId: pet.id,
            petName: pet.name,
            recipeName: data.name,
            recipe: data,
            createdAt: serverTimestamp(),
          });
          setSaved(true);
        }
      } catch (e) {
        // silent fail — recipe still shows even if save fails
      }
    } catch (e: any) {
      setError(e?.message || "Could not generate recipe. Please try again.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }

  function shareRecipe() {
    if (!recipe) return;
    const text = [
      `🐾 ${recipe.name} — Recipe for ${pet.name}`,
      `\n${recipe.description}`,
      `\n📋 Serving: ${recipe.servingInfo}`,
      `\n🥗 INGREDIENTS\n${(recipe.ingredients || []).map((i: string) => `• ${i}`).join("\n")}`,
      `\n👨‍🍳 INSTRUCTIONS\n${(recipe.instructions || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}`,
      `\n💊 SUPPLEMENTS\n${(recipe.supplements || []).map((s: string) => `• ${s}`).join("\n")}`,
      `\n🌿 MULTIVITAMIN\n${recipe.multivitamin}`,
      `\n📊 NUTRITION\n${recipe.nutritionBreakdown}`,
      `\n🐕 BREED NOTE\n${recipe.breedNote}`,
      `\n⚠️ ${recipe.warning}`,
      `\nGenerated by MyPetDex — home.mypetdex.app`,
    ].join("\n");
    Share.share({ message: text, title: `${pet.name}'s Recipe` });
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
      <Pressable style={styles.backBtn} onPress={() => { setStep("select"); setRecipe(null); setError(""); setSaved(false); }}>
        <Text style={styles.backBtnText}>← Make New Recipe</Text>
      </Pressable>
      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={BRAND} size="large" style={{ marginBottom: 20 }} />
          <Text style={styles.loadingTitle}>
            {[
              `Looking up ${pet.name}'s nutrition needs...`,
              "Calculating calories & portions...",
              "Crafting your recipe with AI...",
              "Almost ready...",
            ][progressStep]}
          </Text>
          <View style={styles.progressDots}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.progressDot, i <= progressStep && styles.progressDotActive]} />
            ))}
          </View>
          <Text style={styles.loadingDesc}>Using AAFCO 2023 · USDA FoodData · WSAVA guidelines</Text>
        </View>
      ) : error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setStep("select"); setError(""); }}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      ) : recipe ? (
        <View style={{ gap: 12 }}>
          {/* Header */}
          <View style={styles.recipeHeader}>
            <Text style={styles.recipeHeaderEmoji}>🍽️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipeHeaderTitle}>{recipe.name}</Text>
              <Text style={styles.recipeHeaderDesc}>{recipe.description}</Text>
            </View>
          </View>
          {/* Serving */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>📋 Serving Info</Text>
            <Text style={styles.recipeSectionText}>{recipe.servingInfo}</Text>
          </View>
          {/* Ingredients */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>🥗 Ingredients</Text>
            {(recipe.ingredients || []).map((item: string, i: number) => (
              <Text key={i} style={styles.recipeListItem}>• {item}</Text>
            ))}
          </View>
          {/* Instructions */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>👨‍🍳 Preparation</Text>
            {(recipe.instructions || []).map((step: string, i: number) => (
              <Text key={i} style={styles.recipeListItem}>{i + 1}. {step}</Text>
            ))}
          </View>
          {/* Nutrition */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>📊 Nutrition Breakdown</Text>
            <Text style={styles.recipeSectionText}>{recipe.nutritionBreakdown}</Text>
          </View>
          {/* 2-Week Shopping List */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>🛒 2-Week Shopping List</Text>
            <Text style={styles.recipeSectionText}>Multiply each ingredient × 14 days:</Text>
            {(recipe.shoppingList14Days || []).map((item: string, i: number) => (
              <Text key={i} style={styles.recipeListItem}>• {item}</Text>
            ))}
          </View>
          {/* Supplements */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>💊 Required Supplements</Text>
            {(recipe.supplements || []).map((item: string, i: number) => (
              <Text key={i} style={styles.recipeListItem}>• {item}</Text>
            ))}
          </View>
          {/* Shop Supplements on Amazon */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>🛒 Shop Supplements on Amazon</Text>
            <Text style={[styles.recipeSectionText, { marginBottom: 10 }]}>
              These supplements are required for every homemade diet. Tap to shop:
            </Text>
            {[
              { label: "Fish Oil for Dogs", url: "https://www.amazon.com/s?k=fish+oil+for+dogs&tag=mypetdex20-20" },
              { label: "Calcium Carbonate Powder", url: "https://www.amazon.com/s?k=calcium+carbonate+powder+supplement&tag=mypetdex20-20" },
              { label: "Glucosamine 500mg for Dogs", url: "https://www.amazon.com/s?k=glucosamine+500mg+for+dogs&tag=mypetdex20-20" },
              { label: "Vitamin E 400 IU", url: "https://www.amazon.com/s?k=vitamin+e+400+iu&tag=mypetdex20-20" },
              { label: "Balance IT Canine Multivitamin", url: "https://www.amazon.com/s?k=balance+it+canine+supplement&tag=mypetdex20-20" },
            ].map((item, i) => (
              <Pressable
                key={i}
                style={styles.amazonBtn}
                onPress={() => Linking.openURL(item.url)}
              >
                <Text style={styles.amazonBtnText}>🛒 {item.label}</Text>
              </Pressable>
            ))}
            <Text style={styles.amazonDisclaimer}>
              As an Amazon Associate, MyPetDex earns from qualifying purchases.
            </Text>
          </View>
          {/* Shop Supplements on Chewy */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>🐾 Shop Supplements on Chewy</Text>
            <Text style={[styles.recipeSectionText, { marginBottom: 10 }]}>
              Find these supplements on Chewy with fast delivery:
            </Text>
            {[
              { label: "Fish Oil — Zesty Paws Omega-3", url: "https://chewy.sjv.io/E0xqXK" },
              { label: "Calcium — Wholistic Pet Organics", url: "https://chewy.sjv.io/xJmn3v" },
              { label: "Glucosamine — Nutramax Cosequin", url: "https://chewy.sjv.io/zz0jk6" },
              { label: "Vitamin E — Zesty Paws 8-in-1", url: "https://chewy.sjv.io/OYa1Qn" },
              { label: "Probiotic — Purina FortiFlora", url: "https://chewy.sjv.io/3kR7xd" },
              { label: "Multivitamin — Wholistic Canine Complete", url: "https://chewy.sjv.io/9V9eP3" },
            ].map((item, i) => (
              <Pressable
                key={i}
                style={styles.chewyBtn}
                onPress={() => Linking.openURL(item.url)}
              >
                <Text style={styles.chewyBtnText}>🐾 {item.label}</Text>
              </Pressable>
            ))}
            <Text style={styles.amazonDisclaimer}>
              MyPetDex earns a commission from qualifying Chewy purchases.
            </Text>
          </View>
          {/* Multivitamin */}
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionLabel}>🌿 Multivitamin</Text>
            <Text style={styles.recipeSectionText}>{recipe.multivitamin}</Text>
          </View>
          {/* Breed note */}
          {recipe.breedNote ? (
            <View style={styles.recipeSection}>
              <Text style={styles.recipeSectionLabel}>🐕 Breed Note</Text>
              <Text style={styles.recipeSectionText}>{recipe.breedNote}</Text>
            </View>
          ) : null}
          {/* Disclaimer */}
          <View style={styles.recipeDisclaimer}>
            <Text style={styles.recipeDisclaimerText}>
              ⚠️ Some human foods can be harmful to pets. Always check with your veterinarian before introducing new ingredients to your pet's diet.
            </Text>
          </View>
          {/* Warning */}
          <View style={styles.recipeWarning}>
            <Text style={styles.recipeWarningText}>{recipe.warning}</Text>
          </View>
          {/* Auto-saved indicator */}
          {saved && (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>✅ Recipe saved to your profile</Text>
            </View>
          )}
          {/* Share */}
          <Pressable style={styles.shareBtn} onPress={shareRecipe}>
            <Text style={styles.shareBtnText}>📤 Share Recipe</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.tabContent}>
      {savedRecipes.length > 0 && (
        <View style={styles.savedSection}>
          <Text style={styles.savedSectionTitle}>💾 Saved Recipes ({savedRecipes.length}/3)</Text>
          {savedRecipes.map((r) => (
            <View key={r.docId} style={styles.savedRecipeRow}>
              <Pressable style={{ flex: 1 }} onPress={() => { setRecipe(r.recipe); setStep("result"); setSaved(true); }}>
                <Text style={styles.savedRecipeName}>{r.recipeName}</Text>
                <Text style={styles.savedRecipeMeta}>{r.petName} · {r.recipe?.servingInfo?.split(" in ")[0]}</Text>
              </Pressable>
              <Pressable onPress={() => deleteDoc(doc(db, "savedRecipes", r.docId))}>
                <Text style={styles.savedRecipeDelete}>🗑️</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={styles.recipeIntro}>
        <Text style={styles.recipeIntroTitle}>Build {pet.name}'s Recipe</Text>
        <Text style={styles.recipeIntroDesc}>
          Select ingredients you have at home. We'll generate a personalized recipe based on {pet.name}'s breed, age, weight and {der} kcal/day calorie need.
        </Text>
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
        <Text style={styles.disclaimerTitle}>⚠️ Important</Text>
        <Text style={styles.disclaimerText}>Homemade diets may lack essential nutrients. Always consult your veterinarian before switching from commercial food.</Text>
      </View>
      <Pressable style={[styles.generateBtn, allSelected.length < 2 && styles.generateBtnDisabled]} onPress={generateRecipe} disabled={allSelected.length < 2}>
        <Text style={styles.generateBtnText}>{allSelected.length < 2 ? "Select at least 2 ingredients" : `🍽️ Generate ${pet.name}'s Recipe`}</Text>
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
  tabText: { fontSize: 11, color: "#888", fontWeight: "500" },
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
  progressDots: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 10 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#E2E8F0" },
  progressDotActive: { backgroundColor: BRAND },
  // Recipe result — document style
  recipeHeader: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  recipeHeaderEmoji: { fontSize: 36 },
  recipeHeaderTitle: { fontSize: 17, fontWeight: "800", color: "#1a1a1a" },
  recipeHeaderDesc: { fontSize: 13, color: "#666", marginTop: 4, lineHeight: 18 },
  recipeSection: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 8 },
  recipeSectionLabel: { fontSize: 13, fontWeight: "700", color: BRAND, textTransform: "uppercase", letterSpacing: 0.5 },
  recipeSectionText: { fontSize: 14, color: "#333", lineHeight: 20 },
  recipeListItem: { fontSize: 14, color: "#333", lineHeight: 22 },
  savedSection: { backgroundColor: "#fff", borderRadius: 14, padding: 16, gap: 10, marginBottom: 12 },
  savedSectionTitle: { fontSize: 13, fontWeight: "700", color: "#333" },
  savedRecipeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  savedRecipeName: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  savedRecipeMeta: { fontSize: 12, color: "#888", marginTop: 2 },
  savedRecipeDelete: { fontSize: 20, paddingHorizontal: 8 },
  recipeDisclaimer: { backgroundColor: "#FFFBEB", borderRadius: 10, padding: 12, borderLeftWidth: 3, borderLeftColor: "#F59E0B" },
  recipeDisclaimerText: { fontSize: 12, color: "#92400E", lineHeight: 18 },
  recipeWarning: { backgroundColor: "#FFFBEB", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#FDE68A" },
  recipeWarningText: { fontSize: 12, color: "#92400E", lineHeight: 18 },
  savedBadge: { backgroundColor: "#F0FDF4", borderRadius: 10, padding: 14, alignItems: "center" },
  savedBadgeText: { color: "#166534", fontWeight: "700" },
  shareBtn: { backgroundColor: BRAND, borderRadius: 14, padding: 16, alignItems: "center", marginBottom: 8 },
  shareBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  errorCard: { backgroundColor: "#fff", borderRadius: 14, padding: 24, alignItems: "center", gap: 12 },
  errorEmoji: { fontSize: 36 },
  errorText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20 },
  retryBtn: { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: "#fff", fontWeight: "700" },
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
  resumeBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: BRAND, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginTop: 10, justifyContent: "center" },
  resumeBtnLocked: { borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  resumeBtnText: { color: BRAND, fontWeight: "700", fontSize: 14 },
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
  amazonBtn: {
    backgroundColor: "#4486F4",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  amazonBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  chewyBtn: {
    backgroundColor: "#0074C8",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  chewyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  amazonDisclaimer: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 6,
    fontStyle: "italic",
  },
  medCard: { backgroundColor: "#fff", borderRadius: 12, flexDirection: "row", overflow: "hidden", alignItems: "stretch" },
  medBar: { width: 4 },
  medContent: { flex: 1, padding: 14, gap: 3 },
  medName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  medDosage: { fontSize: 13, color: "#555" },
  medFreq: { fontSize: 13, color: "#888" },
  medNote: { fontSize: 12, color: "#aaa", fontStyle: "italic", marginTop: 2 },
  medRefill: { fontSize: 12, color: "#888" },
  medRefillWarn: { fontSize: 12, color: "#F97316", fontWeight: "600" },
  medTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  medActions: { flexDirection: "column", justifyContent: "center", gap: 4, paddingRight: 12, paddingVertical: 12 },
  medActionBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#F0F0F0", alignItems: "center" },
  medActionBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  medActionDivider: { width: 1, height: 20, backgroundColor: "#F0F0F0" },
  medActionEdit: { fontSize: 13, fontWeight: "600", color: "#4486F4" },
  medActionToggle: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  medActionDelete: { fontSize: 13, fontWeight: "600", color: "#E53935" },
  vetCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 4 },
  vetCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  vetCardTitle: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  vetCardEdit: { fontSize: 14, color: "#4486F4", fontWeight: "600" },
  vetCardBody: { gap: 5 },
  vetName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  vetDetailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  vetDetail: { fontSize: 13, color: "#555", flex: 1 },
  vetPhone: { color: "#4486F4", fontWeight: "600" },
  vetNotes: { fontSize: 12, color: "#888", fontStyle: "italic", marginTop: 4 },
  vetEmptyText: { fontSize: 13, color: "#aaa", textAlign: "center", paddingVertical: 8 },
  vetAddBtn: { backgroundColor: "#4486F4", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  vetAddBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
