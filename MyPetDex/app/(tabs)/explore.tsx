import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Image, Linking, Modal, FlatList,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useUserProfile } from "@/hooks/useUserProfile";
import { webDb } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

const BRAND = "#4486F4";
const BLUE = "#4486F4";

type ExploreTab = "services" | "adopt";

const SERVICE_TYPES = [
  { label: "Grooming",    icon: "cut-outline",        color: "#8b5cf6", desc: "Baths, cuts & styling" },
  { label: "Dog Walking", icon: "footsteps-outline",  color: "#10b981", desc: "Daily walks & exercise" },
  { label: "Veterinary",  icon: "medkit-outline",     color: "#ef4444", desc: "Clinics & animal hospitals" },
  { label: "Boarding",    icon: "home-outline",       color: "#f59e0b", desc: "Overnight & pet hotels" },
  { label: "Training",    icon: "school-outline",     color: "#3b82f6", desc: "Obedience & behaviour" },
  { label: "Daycare",     icon: "people-outline",     color: "#ec4899", desc: "Full & half-day care" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

// ── State Dropdown ────────────────────────────────────────────────────────────
function StateDropdown({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={styles.stateDropdown} onPress={() => setOpen(true)}>
        <Text style={styles.stateDropdownValue}>{value || "State"}</Text>
        <Text style={styles.stateDropdownArrow}>▾</Text>
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

interface LocalShelterPet {
  id: string;
  name: string;
  breed: string;
  age: string;
  gender: string;
  photo: string;
  shelterName: string;
  contactPhone: string;
}

function mapUserToListing(data: Record<string, unknown>, uid: string) {
  const role = String(data.role || "provider");
  const city = String(data.city || "");
  const state = String(data.state || "");
  const isShelter = role === "shelter";
  const service = isShelter ? "Animal Shelter" : String(data.service || data.serviceType || "");
  return {
    id: `user_${uid}`,
    businessName: isShelter
      ? String(data.shelterName || data.displayName || "Shelter")
      : String(data.businessName || data.displayName || "Provider"),
    name: isShelter
      ? String(data.shelterName || data.displayName || "Shelter")
      : String(data.businessName || data.displayName || "Provider"),
    city,
    state,
    zip: String(data.zip || ""),
    stateCity: city && state ? `${state}_${city.toLowerCase()}` : undefined,
    service,
    serviceType: service,
    phone: String(data.phone || ""),
    website: String(data.website || ""),
    address: String(data.address || ""),
    bio: String(data.bio || ""),
    priceRange: String(data.priceRange || ""),
    role,
    verified: data.verified === true,
    source: "signup",
  };
}

function extractZipFromAddress(address?: string): string | null {
  if (!address) return null;
  const match = address.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

function matchesZipForUser(listing: { zip?: string; address?: string }, zip: string): boolean {
  if (!zip) return true;
  const listingZip = String(listing.zip || "").trim() || extractZipFromAddress(listing.address) || "";
  return listingZip === zip;
}

function filterByService(listings: any[], service: string): any[] {
  if (!service) return listings;
  return listings.filter((p) =>
    String(p.serviceType || p.service || "").toLowerCase() === service.toLowerCase(),
  );
}

function ProviderCard({
  p,
  badge,
}: {
  p: any;
  badge: "mypetdex" | "user";
}) {
  const router = useRouter();
  const svcType = SERVICE_TYPES.find((s) => s.label === p.serviceType || s.label === p.service);

  function openDetail() {
    router.push({
      pathname: "/provider/[id]",
      params: {
        id: p.id,
        name: p.businessName || p.name || "",
        serviceType: p.serviceType || p.service || "",
        city: p.city || "",
        state: p.state || "",
        zip: p.zip || extractZipFromAddress(p.address) || "",
        phone: p.phone || "",
        website: p.website || "",
        address: p.address || "",
        bio: p.bio || "",
        priceRange: p.priceRange || "",
        role: p.role || "",
        color: svcType?.color || BRAND,
      },
    });
  }

  return (
    <Pressable style={styles.providerCard} onPress={openDetail}>
      <View style={styles.providerHeader}>
        <View style={[styles.providerIcon, { backgroundColor: (svcType?.color || "#888") + "20" }]}>
          <Ionicons
            name={(svcType?.icon as any) || (p.role === "shelter" ? "home-outline" : "paw-outline")}
            size={22}
            color={svcType?.color || "#888"}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.providerNameRow}>
            <Text style={styles.providerName}>{p.businessName || p.name}</Text>
            {badge === "mypetdex" ? (
              <View style={styles.mypetdexVerifiedBadge}>
                <Text style={styles.mypetdexVerifiedText}>MyPetDex Verified</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.providerType}>{p.serviceType || p.service}</Text>
          <View style={styles.providerLocationRow}>
            <Ionicons name="location-outline" size={12} color="#888" />
            <Text style={styles.providerLocation}>
              {[p.city, p.state, p.zip || extractZipFromAddress(p.address)].filter(Boolean).join(", ")}
            </Text>
          </View>
        </View>
        {p.rating != null && p.rating !== "" ? (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={11} color="#92400E" />
            <Text style={styles.ratingText}>{p.rating}</Text>
          </View>
        ) : null}
      </View>
      {p.phone ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            Linking.openURL(`tel:${p.phone.replace(/\D/g, "")}`);
          }}
        >
          <View style={styles.providerPhoneRow}>
            <Ionicons name="call-outline" size={13} color="#4486F4" />
            <Text style={[styles.providerPhone, { color: "#4486F4" }]}>{p.phone}</Text>
          </View>
        </Pressable>
      ) : null}
      <View style={styles.viewDetailRow}>
        <Text style={styles.viewDetailText}>View profile & reviews</Text>
        <Ionicons name="chevron-forward" size={13} color={BRAND} />
      </View>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const { profile } = useUserProfile();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<ExploreTab>("services");

  useEffect(() => {
    if (tab === "adopt") setActiveTab("adopt");
    else if (tab === "services") setActiveTab("services");
  }, [tab]);

  // Services state — always starts fresh
  const [serviceFilter, setServiceFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [serviceZip, setServiceZip] = useState("");
  const [searched, setSearched] = useState(false);

  // No cleanup needed — state resets naturally on each fresh mount
  // (Expo Router unmounts tabs when navigating away, so state is always fresh)

  // Providers state
  const [seedProviders, setSeedProviders] = useState<any[]>([]);
  const [localProviders, setLocalProviders] = useState<any[]>([]);
  const [providerLoading, setProviderLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [providerError, setProviderError] = useState("");
  const searchIdRef = useRef(0);
  const cancelTimerRef = useRef<any>(null);

  function cancelSearch() {
    searchIdRef.current += 1;
    setProviderLoading(false);
    setShowCancel(false);
    setProviderError("");
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
  }

  async function searchProviders(overrideService?: string) {
    if (!stateFilter) return;
    const myId = ++searchIdRef.current;
    setProviderLoading(true);
    setShowCancel(false);
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    cancelTimerRef.current = setTimeout(() => setShowCancel(true), 2000);
    setSeedProviders([]);
    setLocalProviders([]);
    setProviderError("");

    const activeSvc = overrideService !== undefined ? overrideService : serviceFilter;
    const zipTrim = serviceZip.trim();

    const TIMEOUT_MS = 6000;

    try {
      const runQuery = async (): Promise<{ seed: any[]; local: any[] }> => {
        const seedQ = query(
          collection(webDb, "seedProviders"),
          where("state", "==", stateFilter),
          limit(500),
        );
        const usersQ = query(
          collection(webDb, "users"),
          where("role", "==", "provider"),
          where("state", "==", stateFilter),
          limit(200),
        );

        const [seedSnap, usersSnap] = await Promise.all([getDocs(seedQ), getDocs(usersQ)]);
        let localResults = usersSnap.docs.map((d) =>
          mapUserToListing(d.data() as Record<string, unknown>, d.id),
        );

        if (zipTrim) {
          localResults = localResults.filter((p) => matchesZipForUser(p, zipTrim));
        }

        // Show seed providers always — filter by zip if entered
        let seedResults = seedSnap.docs
          .map((d) => ({ id: d.id, ...d.data() } as any))
          .filter((p) => !zipTrim || String(p.zip || "").trim() === zipTrim);

        seedResults = filterByService(seedResults, activeSvc);
        localResults = filterByService(localResults, activeSvc);

        return { seed: seedResults, local: localResults };
      };

      const timeoutP = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Taking too long — try again in a moment.")), TIMEOUT_MS)
      );

      const { seed, local } = await Promise.race([runQuery(), timeoutP]);

      if (myId !== searchIdRef.current) return;
      setSeedProviders(seed);
      setLocalProviders(local);
    } catch (e: any) {
      if (myId !== searchIdRef.current) return;
      console.error("Provider search error:", e);
      setProviderError(e?.message || "Search failed. Please try again.");
    }
    if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    if (myId === searchIdRef.current) { setProviderLoading(false); setShowCancel(false); }
  }

  // Adopt state
  const [petType, setPetType] = useState<"Dog" | "Cat">("Dog");
  const [zipCode, setZipCode] = useState("");
  const [localShelterPets, setLocalShelterPets] = useState<LocalShelterPet[]>([]);

  async function fetchLocalShelterPets(zip: string, species: string): Promise<LocalShelterPet[]> {
    const snap = await getDocs(query(
      collection(webDb, "shelter_pets"),
      where("status", "==", "available"),
      limit(50),
    ));
    const pets = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    return pets
      .filter((p) => String(p.species || "").toLowerCase() === species.toLowerCase())
      .filter((p) => String(p.shelterZip || "").trim() === zip)
      .map((p) => ({
        id: p.id,
        name: String(p.name || "Pet"),
        breed: String(p.breed || ""),
        age: String(p.age || ""),
        gender: String(p.gender || ""),
        photo: String(p.photoURL || p.photoUri || ""),
        shelterName: String(p.shelterName || "Local Shelter"),
        contactPhone: String(p.contactPhone || ""),
      }));
  }

  const searchAdopt = async () => {
    if (!zipCode || zipCode.length < 5) return;
    try {
      const localPets = await fetchLocalShelterPets(zipCode, petType);
      setLocalShelterPets(localPets);
    } catch {
      setLocalShelterPets([]);
    }
    const petTypeParam = petType === "Dog" ? "dog" : "cat";
    const url = `https://www.adoptapet.com/pet-adoption?zip=${zipCode}&petType=${petTypeParam}`;
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      toolbarColor: "#4486F4",
    });
  };

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, activeTab === "services" && styles.toggleBtnActive]}
          onPress={() => setActiveTab("services")}
        >
          <Ionicons name="search-outline" size={14} color={activeTab === "services" ? "#fff" : "#666"} />
          <Text style={[styles.toggleText, activeTab === "services" && styles.toggleTextActive]}>
            Services
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, activeTab === "adopt" && styles.toggleBtnActiveGreen]}
          onPress={() => setActiveTab("adopt")}
        >
          <Ionicons name="heart-outline" size={14} color={activeTab === "adopt" ? "#fff" : "#666"} />
          <Text style={[styles.toggleText, activeTab === "adopt" && styles.toggleTextActive]}>
            Adopt
          </Text>
        </Pressable>
      </View>

      {/* ── Services Tab ── */}
      {activeTab === "services" && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={styles.heading}>Find Pet Services Near You</Text>
          <Text style={styles.subheading}>Vets, groomers, walkers & more</Text>

          {/* Search filters */}
          <View style={styles.filterRow}>
            <StateDropdown value={stateFilter} onSelect={setStateFilter} />
            <TextInput
              style={styles.zipInput}
              placeholder="Zip code"
              placeholderTextColor="#aaa"
              value={serviceZip}
              onChangeText={(text) => setServiceZip(text.replace(/\D/g, "").slice(0, 5))}
              keyboardType="numeric"
              maxLength={5}
              onSubmitEditing={() => setSearched(true)}
            />
            <Pressable style={[styles.searchBtn, !stateFilter && { opacity: 0.5 }]} onPress={() => { if (!stateFilter) return; setSearched(true); searchProviders(); }}>
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>

          {/* Service type grid */}
          <Text style={styles.label}>Browse by Service</Text>
          <View style={styles.serviceGrid}>
            {SERVICE_TYPES.map((s) => (
              <Pressable
                key={s.label}
                style={[
                  styles.serviceCard,
                  serviceFilter === s.label && { borderColor: s.color, backgroundColor: s.color + "11" },
                ]}
                disabled={providerLoading}
                onPress={() => {
                  const next = s.label === serviceFilter ? "" : s.label;
                  setServiceFilter(next);
                  setSearched(true);
                  if (stateFilter) searchProviders(next);
                }}
              >
                <Ionicons name={s.icon as any} size={24} color={s.color} style={{ marginBottom: 4 }} />
                <Text style={styles.serviceLabel}>{s.label}</Text>
                <Text style={styles.serviceDesc}>{s.desc}</Text>
              </Pressable>
            ))}
          </View>

          {searched && (
            providerLoading ? (
              <View style={{ alignItems: "center", marginTop: 32, gap: 16 }}>
                <ActivityIndicator color={BRAND} size="large" />
                {showCancel && (
                  <Pressable onPress={cancelSearch} style={styles.cancelBtn}>
                    <Text style={styles.cancelBtnText}>✕ Cancel Search</Text>
                  </Pressable>
                )}
              </View>
            ) : providerError ? (
              <View style={styles.comingSoonBox}>
                <Text style={styles.comingSoonEmoji}>⚠️</Text>
                <Text style={styles.comingSoonTitle}>Search failed</Text>
                <Text style={styles.comingSoonSub}>{providerError}</Text>
              </View>
            ) : seedProviders.length > 0 || localProviders.length > 0 ? (
              <View>
                {localProviders.length > 0 ? (
                  <View style={styles.resultsSection}>
                    <Text style={styles.sectionHeader}>MyPetDex Verified Providers</Text>
                    {localProviders.map((p: any) => (
                      <ProviderCard key={p.id} p={p} badge="mypetdex" />
                    ))}
                  </View>
                ) : null}
                {seedProviders.length > 0 ? (
                  <View style={styles.resultsSection}>
                    <Text style={styles.sectionHeader}>Local Providers Near You</Text>
                    {seedProviders.map((p: any) => (
                      <ProviderCard key={p.id} p={p} badge="user" />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <View style={styles.comingSoonBox}>
                <Text style={styles.comingSoonEmoji}>🔍</Text>
                <Text style={styles.comingSoonTitle}>No providers found</Text>
                <Text style={styles.comingSoonSub}>Try a different zip code or state</Text>
              </View>
            )
          )}
        </ScrollView>
      )}

      {/* ── Adopt Tab ── */}
      {activeTab === "adopt" && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
          <Text style={styles.heading}>Adopt a Pet ❤️</Text>
          <Text style={styles.subheading}>Find pets near you ready to adopt</Text>

          {/* Dog / Cat toggle */}
          <View style={styles.typeRow}>
            {(["Dog", "Cat"] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.typeBtn, petType === t && styles.typeBtnActive]}
                onPress={() => setPetType(t)}
              >
                <Text style={[styles.typeText, petType === t && styles.typeTextActive]}>
                  {t === "Dog" ? "🐶 Dogs" : "🐱 Cats"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Zip search */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Enter your zip code"
              placeholderTextColor="#aaa"
              value={zipCode}
              onChangeText={setZipCode}
              keyboardType="numeric"
              maxLength={5}
              returnKeyType="search"
              onSubmitEditing={searchAdopt}
            />
            <Pressable
              style={[styles.searchBtn, zipCode.length < 5 && { opacity: 0.5 }]}
              onPress={searchAdopt}
              disabled={zipCode.length < 5}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>

          {/* Info card */}
          <View style={styles.adoptInfoCard}>
            <Text style={styles.adoptInfoEmoji}>🐾</Text>
            <Text style={styles.adoptInfoTitle}>Real pets near you, ready to adopt</Text>
            <Text style={styles.adoptInfoSub}>
              Enter your zip code and tap Search to browse adoptable {petType === "Dog" ? "dogs" : "cats"} from shelters and rescues in your area.
            </Text>
          </View>

          {/* Local shelter pets from Firestore (if any) */}
          {localShelterPets.length > 0 ? (
            <>
              <Text style={styles.resultsLabel}>Available at Local Shelters</Text>
              <View style={styles.petGrid}>
                {localShelterPets.map((pet) => (
                  <View key={pet.id} style={styles.petCard}>
                    {pet.photo ? (
                      <Image source={{ uri: pet.photo }} style={styles.petPhoto} resizeMode="cover" />
                    ) : (
                      <View style={styles.petPhotoPlaceholder}>
                        <Text style={{ fontSize: 32 }}>{petType === "Dog" ? "🐶" : "🐱"}</Text>
                      </View>
                    )}
                    <View style={styles.petInfo}>
                      <Text style={styles.petName} numberOfLines={1}>{pet.name}</Text>
                      <Text style={styles.petBreed} numberOfLines={1}>{pet.breed}</Text>
                      <Text style={styles.petMeta}>{[pet.age, pet.gender].filter(Boolean).join(" · ")}</Text>
                      <Text style={styles.petCity} numberOfLines={1}>🏠 {pet.shelterName}</Text>
                      {pet.contactPhone ? (
                        <Pressable onPress={() => Linking.openURL(`tel:${pet.contactPhone.replace(/\D/g, "")}`)}>
                          <Text style={styles.shelterPhone}>📞 {pet.contactPhone}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Powered-by attribution (required by Adopt-a-Pet terms) */}
          <View style={styles.poweredByRow}>
            <Text style={styles.poweredByText}>Adoption data powered by </Text>
            <Pressable onPress={() => Linking.openURL("https://www.adoptapet.com")}>
              <Text style={styles.poweredByLink}>Adopt-a-Pet.com</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 14,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  toggleBtnActive: { backgroundColor: BLUE },
  toggleBtnActiveGreen: { backgroundColor: BRAND },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#fff", fontWeight: "700" },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginBottom: 4 },
  subheading: { fontSize: 14, color: "#888", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 16 },

  // Search / Filter
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" },
  stateDropdown: { backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, borderColor: "#eee", flexDirection: "row", alignItems: "center", gap: 4, minWidth: 70 },
  stateDropdownValue: { fontSize: 14, color: "#1a1a1a", fontWeight: "600" },
  stateDropdownArrow: { fontSize: 13, color: "#888" },
  zipInput: { flex: 1, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, fontSize: 14, color: "#1a1a1a", borderWidth: 1, borderColor: "#eee" },
  searchBtn: { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, justifyContent: "center" },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
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

  // Services
  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceCard: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  serviceEmoji: { fontSize: 22, marginBottom: 4 },
  serviceLabel: { fontSize: 12, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  serviceDesc: { fontSize: 10, color: "#888", textAlign: "center", marginTop: 2 },

  // Coming soon
  resultsSection: { marginTop: 8 },
  sectionHeader: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 12, marginTop: 8 },
  providerCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  providerHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  providerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f0faf5", alignItems: "center", justifyContent: "center" },
  providerName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", flexShrink: 1 },
  providerNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  verifiedBadge: { backgroundColor: "#DCFCE7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontWeight: "700", color: "#166534" },
  mypetdexVerifiedBadge: { backgroundColor: "#DCFCE7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  mypetdexVerifiedText: { fontSize: 11, fontWeight: "700", color: "#166534" },
  providerType: { fontSize: 12, color: BRAND, fontWeight: "600", marginTop: 2 },
  providerLocationRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  providerLocation: { fontSize: 12, color: "#888" },
  providerPhoneRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  providerPhone: { fontSize: 13, color: "#555" },
  viewDetailRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 3, marginTop: 10, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#eee" },
  viewDetailText: { fontSize: 12, color: BRAND, fontWeight: "600" },
  ratingBadge: { backgroundColor: "#FEF3C7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#92400E" },
  comingSoonBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginTop: 20,
    gap: 8,
  },
  comingSoonEmoji: { fontSize: 40 },
  comingSoonTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  comingSoonSub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },

  // Adopt
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#eee",
  },
  typeBtnActive: { borderColor: BRAND, backgroundColor: BRAND + "15" },
  typeText: { fontSize: 14, fontWeight: "600", color: "#666" },
  typeTextActive: { color: BRAND, fontWeight: "700" },

  adoptInfoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  adoptInfoEmoji: { fontSize: 40 },
  adoptInfoTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a", textAlign: "center" },
  adoptInfoSub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20 },
  poweredByRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 8,
  },
  poweredByText: { fontSize: 11, color: "#aaa" },
  poweredByLink: { fontSize: 11, color: "#4486F4", fontWeight: "600" },

  resultsLabel: { fontSize: 14, fontWeight: "700", color: "#1a1a1a", marginBottom: 12, marginTop: 8 },

  petGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  petCard: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  petPhoto: { width: "100%", height: 120 },
  petPhotoPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  petInfo: { padding: 10, gap: 2 },
  petName: { fontSize: 14, fontWeight: "700", color: "#1a1a1a" },
  petBreed: { fontSize: 11, color: "#888" },
  petMeta: { fontSize: 11, color: "#888" },
  petCity: { fontSize: 11, color: "#888" },
  shelterPhone: { fontSize: 12, color: BRAND, fontWeight: "600", marginTop: 4 },

  cancelBtn: { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  cancelBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
  searchRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B" },
});