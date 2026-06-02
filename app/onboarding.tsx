import {
  View, Text, StyleSheet, ScrollView, TextInput, Pressable,
  ActivityIndicator, Modal, FlatList, Image, Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { isWeb, webDb } from "@/lib/firebase";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import _nativeFirestore from "@react-native-firebase/firestore";

const BRAND = "#4CAF82";
const BLUE  = "#4486F4";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const PET_TYPES = ["Dog", "Cat"];

const SERVICE_TYPES = [
  "Grooming","Dog Walking","Veterinary","Training","Boarding","Daycare","Other",
];

function StateDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.dropdown} onPress={() => setOpen(true)}>
        <Text style={styles.dropdownValue}>{value || "Select state"}</Text>
        <Text style={styles.dropdownArrow}>▾</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={styles.pickerModal}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select State</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.pickerDone}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={US_STATES}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.pickerItem, item === value && styles.pickerItemActive]}
                onPress={() => { onSelect(item); setOpen(false); }}
              >
                <Text style={[styles.pickerItemText, item === value && styles.pickerItemTextActive]}>{item}</Text>
                {item === value && <Text style={styles.pickerCheck}>✓</Text>}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, signOut, isDemoMode } = useAuth();

  // Demo users must never see onboarding — redirect immediately
  useEffect(() => {
    if (isDemoMode) router.replace("/(tabs)");
  }, [isDemoMode]);

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch {}
  }

  const [role, setRole] = useState<"owner" | "provider" | "shelter">("owner");
  // When role is locked (came from a role-specific sign-up), hide the picker
  const [roleLocked, setRoleLocked] = useState(false);
  const [state, setState] = useState("NJ");

  // On mount: read the intended role saved before OAuth and pre-select it
  useEffect(() => {
    if (isWeb && typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("mypetdex_onboarding_role") as "owner" | "provider" | "shelter" | null;
      if (saved === "provider" || saved === "shelter" || saved === "owner") {
        setRole(saved);
        // Lock the picker for all roles coming from a role-specific sign-up flow
        setRoleLocked(true);
        localStorage.removeItem("mypetdex_onboarding_role");
      }
    }
  }, []);
  const [city, setCity] = useState("");

  // Owner fields
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("Dog");

  // Provider fields
  const [businessName, setBusinessName] = useState("");
  const [serviceType, setServiceType] = useState("Grooming");
  const [priceRange, setPriceRange] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");

  // Shelter fields
  const [shelterName, setShelterName] = useState("");
  const [ein, setEin] = useState("");
  const [license, setLicense] = useState("");
  const [shelterPhone, setShelterPhone] = useState("");
  const [shelterWebsite, setShelterWebsite] = useState("");
  const [shelterAddress, setShelterAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFinish() {
    if (!city.trim()) { setError("Please enter your city."); return; }
    if (role === "provider" && !businessName.trim()) { setError("Please enter your business name."); return; }
    if (role === "shelter" && !shelterName.trim()) { setError("Please enter your shelter name."); return; }

    setLoading(true);
    setError("");

    try {
      const u = user;
      if (!u) throw new Error("No user");

      const userDoc: any = {
        uid: u.uid,
        email: u.email || null,
        displayName: u.displayName || null,
        role,
        plan: "free",
        state,
        city: city.trim(),
        onboardingComplete: true,
      };

      if (role === "provider") {
        Object.assign(userDoc, {
          businessName: businessName.trim(),
          service: serviceType,
          priceRange: priceRange.trim(),
          phone: phone.trim(),
          website: website.trim(),
          bio: bio.trim(),
          approved: false,
        });
      }

      if (role === "shelter") {
        Object.assign(userDoc, {
          shelterName: shelterName.trim(),
          ein: ein.trim(),
          license: license.trim(),
          phone: shelterPhone.trim(),
          website: shelterWebsite.trim(),
          address: shelterAddress.trim(),
          approved: false,
        });
      }

      if (isWeb) {
        await setDoc(doc(webDb, "users", u.uid), { ...userDoc, updatedAt: serverTimestamp() }, { merge: true });
        if (role === "owner" && petName.trim()) {
          await addDoc(collection(webDb, "users", u.uid, "pets"), {
            name: petName.trim(),
            species: petType.toLowerCase(),
            breed: "Mixed/Other",
            createdAt: serverTimestamp(),
          });
        }
      } else {
        await _nativeFirestore().collection("users").doc(u.uid).set(
          { ...userDoc, updatedAt: _nativeFirestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
        if (role === "owner" && petName.trim()) {
          await _nativeFirestore().collection("users").doc(u.uid).collection("pets").add({
            name: petName.trim(),
            species: petType.toLowerCase(),
            breed: "Mixed/Other",
            createdAt: _nativeFirestore.FieldValue.serverTimestamp(),
          });
        }
      }

      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.inner}>

        {/* Sign out link — top right */}
        <View style={{ alignItems: "flex-end", marginBottom: 4 }}>
          <Pressable onPress={handleSignOut} hitSlop={12}>
            <Text style={{ fontSize: 13, color: "#aaa" }}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Logo */}
        <View style={styles.logoRow}>
          <Image
            source={require("../assets/images/logo-transparent.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Welcome! Let's set up your account</Text>
        <Text style={styles.subtitle}>Just a few quick details to personalize your experience.</Text>

        {/* Role selection — hidden when role is locked (provider/shelter OAuth flow) */}
        {roleLocked ? (
          <View style={styles.section}>
            <View style={styles.roleLockedBadge}>
              <Text style={styles.roleLockedEmoji}>
                {role === "owner" ? "🐾" : role === "provider" ? "🛎️" : "🏠"}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleLockedTitle}>
                  {role === "owner" ? "Pet Owner Account" : role === "provider" ? "Service Provider Account" : "Animal Shelter Account"}
                </Text>
                <Text style={styles.roleLockedDesc}>
                  {role === "owner"
                    ? "Complete your profile to find services near you"
                    : role === "provider"
                    ? "Complete your business profile below"
                    : "Complete your shelter details below"}
                </Text>
              </View>
              <Text style={styles.roleLockedCheck}>✓</Text>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.label}>I AM A...</Text>
            <View style={styles.roleGrid}>
              {([
                { key: "owner",    emoji: "🐾",  title: "Pet Owner",         desc: "Track my pet's health & care" },
                { key: "provider", emoji: "✂️",  title: "Service Provider",  desc: "Groomer, vet, trainer, etc." },
                { key: "shelter",  emoji: "🏠",  title: "Shelter / Rescue",  desc: "Manage adoptable animals" },
              ] as const).map(r => (
                <Pressable
                  key={r.key}
                  style={[styles.roleCard, role === r.key && styles.roleCardActive]}
                  onPress={() => setRole(r.key)}
                >
                  <Text style={styles.roleEmoji}>{r.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleTitle, role === r.key && styles.roleTitleActive]}>{r.title}</Text>
                    <Text style={[styles.roleDesc, role === r.key && styles.roleDescActive]}>{r.desc}</Text>
                  </View>
                  {role === r.key && <Text style={styles.roleCheck}>✓</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.label}>YOUR LOCATION</Text>
          <Text style={styles.sublabel}>Used to show nearby services and providers</Text>

          <Text style={styles.fieldLabel}>State</Text>
          <StateDropdown value={state} onSelect={setState} />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>City *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Miami"
            value={city}
            onChangeText={setCity}
            autoCapitalize="words"
          />
        </View>

        {/* Owner: first pet */}
        {role === "owner" && (
          <View style={styles.section}>
            <Text style={styles.label}>ADD YOUR FIRST PET (optional)</Text>
            <Text style={styles.sublabel}>You can always add pets later</Text>

            <Text style={styles.fieldLabel}>Pet Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Buddy"
              value={petName}
              onChangeText={setPetName}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Pet Type</Text>
            <View style={styles.petTypeRow}>
              {PET_TYPES.map(t => (
                <Pressable
                  key={t}
                  style={[styles.petTypeBtn, petType === t && styles.petTypeBtnActive]}
                  onPress={() => setPetType(t)}
                >
                  <Text style={[styles.petTypeText, petType === t && styles.petTypeTextActive]}>
                    {t === "Dog" ? "🐶 Dog" : "🐱 Cat"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Provider: business details */}
        {role === "provider" && (
          <View style={styles.section}>
            <Text style={styles.label}>YOUR BUSINESS</Text>
            <Text style={styles.sublabel}>Help pet owners find and book your services</Text>

            <Text style={styles.fieldLabel}>Business Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Happy Paws Grooming"
              value={businessName}
              onChangeText={setBusinessName}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Service Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {SERVICE_TYPES.map(s => (
                <Pressable
                  key={s}
                  style={[styles.chip, serviceType === s && styles.chipActive]}
                  onPress={() => setServiceType(s)}
                >
                  <Text style={[styles.chipText, serviceType === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 8 }]}>Price Range</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. $40 – $80 per session"
              value={priceRange}
              onChangeText={setPriceRange}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Website (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://yoursite.com"
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Bio / Description (optional)</Text>
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              placeholder="Tell pet owners a little about your services…"
              value={bio}
              onChangeText={setBio}
              multiline
            />

            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>🎉 6-Month Free Trial — then only 5% commission on bookings!</Text>
            </View>
          </View>
        )}

        {/* Shelter: organization details */}
        {role === "shelter" && (
          <View style={styles.section}>
            <Text style={styles.label}>YOUR SHELTER</Text>
            <Text style={styles.sublabel}>Help pets find forever homes in your area</Text>

            <Text style={styles.fieldLabel}>Shelter / Rescue Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Second Chance Animal Shelter"
              value={shelterName}
              onChangeText={setShelterName}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>EIN Number</Text>
            <TextInput
              style={styles.input}
              placeholder="xx-xxxxxxx"
              value={ein}
              onChangeText={setEin}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>State License #</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. NJ-2024-xxxxx"
              value={license}
              onChangeText={setLicense}
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 (555) 000-0000"
              value={shelterPhone}
              onChangeText={setShelterPhone}
              keyboardType="phone-pad"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Website (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="https://yourshelter.org"
              value={shelterWebsite}
              onChangeText={setShelterWebsite}
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Address (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main St, Newark, NJ"
              value={shelterAddress}
              onChangeText={setShelterAddress}
            />

            <View style={[styles.trialBadge, { backgroundColor: BRAND + "15", borderColor: BRAND + "44" }]}>
              <Text style={[styles.trialBadgeText, { color: BRAND }]}>Shelter access is always FREE on MyPetDex!</Text>
            </View>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.finishBtn, loading && styles.finishBtnDisabled]}
          onPress={handleFinish}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.finishBtnText}>
                {role === "provider" ? "Create Provider Account →" : role === "shelter" ? "Submit for Approval →" : "Get Started →"}
              </Text>
          }
        </Pressable>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 24, paddingBottom: 60, alignItems: "center" },
  // Max-width wrapper — makes it look good on desktop web
  inner: {
    width: "100%",
    maxWidth: 560,
  },
  logoRow: { alignItems: "center", marginBottom: 24, marginTop: 20 },
  logoImage: { width: 140, height: 60 },
  title: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#888", lineHeight: 20, marginBottom: 28 },
  section: { marginBottom: 28, width: "100%" },
  label: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  sublabel: { fontSize: 12, color: "#aaa", marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6 },
  input: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, color: "#1a1a1a", borderWidth: 1, borderColor: "#eee", width: "100%" },
  // Role cards
  roleGrid: { gap: 10 },
  roleCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderColor: "#eee" },
  roleCardActive: { borderColor: "#3B82F6", backgroundColor: "#3B82F6" },
  roleEmoji: { fontSize: 26 },
  roleTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  roleTitleActive: { color: "#FFFFFF" },
  roleDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  roleDescActive: { color: "rgba(255,255,255,0.85)" },
  roleCheck: { fontSize: 16, color: "#FFFFFF", fontWeight: "700" },
  // Dropdown
  dropdown: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: "#eee", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dropdownValue: { fontSize: 15, color: "#1a1a1a", flex: 1 },
  dropdownArrow: { fontSize: 16, color: "#888" },
  // Picker modal
  pickerModal: { flex: 1, backgroundColor: "#f8f8f8" },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#eee", backgroundColor: "#fff" },
  pickerTitle: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  pickerDone: { fontSize: 16, color: BRAND, fontWeight: "600" },
  pickerItem: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff" },
  pickerItemActive: { backgroundColor: "#f0faf5" },
  pickerItemText: { fontSize: 15, color: "#1a1a1a" },
  pickerItemTextActive: { color: BRAND, fontWeight: "600" },
  pickerCheck: { fontSize: 16, color: BRAND, fontWeight: "700" },
  // Pet type
  petTypeRow: { flexDirection: "row", gap: 10 },
  petTypeBtn: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingVertical: 12, alignItems: "center", borderWidth: 1.5, borderColor: "#eee" },
  petTypeBtnActive: { borderColor: BRAND, backgroundColor: "#f0faf5" },
  petTypeText: { fontSize: 15, color: "#555", fontWeight: "500" },
  petTypeTextActive: { color: BRAND, fontWeight: "700" },
  // Service type chips
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "transparent" },
  chipActive: { backgroundColor: BLUE + "15", borderColor: BLUE },
  chipText: { fontSize: 13, color: "#666", fontWeight: "500" },
  chipTextActive: { color: BLUE, fontWeight: "700" },
  // Trial badge
  trialBadge: { backgroundColor: "#EEF4FF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#c7d9ff", marginTop: 16 },
  trialBadgeText: { fontSize: 13, color: BLUE, fontWeight: "600", textAlign: "center" },
  // Error / finish
  error: { color: "#E53935", fontSize: 14, textAlign: "center", marginBottom: 12 },
  finishBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 8, width: "100%" },
  finishBtnDisabled: { backgroundColor: "#ccc" },
  finishBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  // Locked role badge (shown for provider/shelter OAuth flow)
  roleLockedBadge: { backgroundColor: "#3B82F6", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 2, borderColor: "#3B82F6" },
  roleLockedEmoji: { fontSize: 26 },
  roleLockedTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  roleLockedDesc: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  roleLockedCheck: { fontSize: 18, color: "#FFFFFF", fontWeight: "700" },
});
