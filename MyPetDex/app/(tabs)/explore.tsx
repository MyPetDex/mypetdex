import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Image, Linking, Modal, FlatList,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { useUserProfile } from "@/hooks/useUserProfile";
import { webDb } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

const BRAND = "#4486F4";
const BLUE = "#4486F4";

type ExploreTab = "services" | "adopt";

const SERVICE_TYPES = [
  { label: "Grooming",    emoji: "✂️",  color: "#8b5cf6", desc: "Baths, cuts & styling" },
  { label: "Dog Walking", emoji: "🐕",  color: "#10b981", desc: "Daily walks & exercise" },
  { label: "Veterinary",  emoji: "🏥",  color: "#ef4444", desc: "Clinics & animal hospitals" },
  { label: "Boarding",    emoji: "🏨",  color: "#f59e0b", desc: "Overnight & pet hotels" },
  { label: "Training",    emoji: "🎓",  color: "#3b82f6", desc: "Obedience & behaviour" },
  { label: "Daycare",     emoji: "🌞",  color: "#ec4899", desc: "Full & half-day care" },
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

interface AdoptPet {
  id: string;
  name: string;
  breed: string;
  age: string;
  sex: string;
  photo: string;
  url: string;
  city: string;
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

function matchesZipForSeed(listing: { zip?: string }, zip: string): boolean {
  if (!zip) return true;
  const explicitZip = String(listing.zip || "").trim();
  if (!explicitZip) return true;
  return explicitZip === zip;
}

function matchesZipForUser(listing: { zip?: string; address?: string }, zip: string): boolean {
  if (!zip) return true;
  const listingZip = String(listing.zip || "").trim() || extractZipFromAddress(listing.address) || "";
  return listingZip === zip;
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
  const [providers, setProviders] = useState<any[]>([]);
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
    setProviders([]);
    setProviderError("");

    const activeSvc = overrideService !== undefined ? overrideService : serviceFilter;
    const zipTrim = serviceZip.trim();

    const TIMEOUT_MS = 6000;

    try {
      const runQuery = async (): Promise<any[]> => {
        const seedQ = query(
          collection(webDb, "seedProviders"),
          where("state", "==", stateFilter),
          limit(500),
        );
        const usersQ = query(
          collection(webDb, "users"),
          where("role", "in", ["provider", "shelter"]),
          where("state", "==", stateFilter),
          limit(200),
        );

        const [seedSnap, usersSnap] = await Promise.all([getDocs(seedQ), getDocs(usersQ)]);
        const seedResults = seedSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => matchesZipForSeed(p, zipTrim));
        const userResults = usersSnap.docs
          .map((d) => mapUserToListing(d.data() as Record<string, unknown>, d.id))
          .filter((p) => matchesZipForUser(p, zipTrim));

        return [...seedResults, ...userResults];
      };

      const timeoutP = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Taking too long — try again in a moment.")), TIMEOUT_MS)
      );

      let results: any[] = await Promise.race([runQuery(), timeoutP]);

      // Filter by service type
      if (activeSvc) results = results.filter((p: any) =>
        p.serviceType?.toLowerCase() === activeSvc.toLowerCase()
      );

      if (myId !== searchIdRef.current) return; // cancelled — ignore stale result
      setProviders(results);
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
  const [adoptPets, setAdoptPets] = useState<AdoptPet[]>([]);
  const [adoptLoading, setAdoptLoading] = useState(false);
  const [adoptError, setAdoptError] = useState("");

  // ── Adopt search ────────────────────────────────────────────────────────────
  const getStateFromZip = (zip: string): string => {
    const z = parseInt(zip);
    if (z >= 1001 && z <= 2791) return "MA";
    if (z >= 6001 && z <= 6999) return "CT";
    if (z >= 7001 && z <= 8999) return "NJ";
    if (z >= 10001 && z <= 14999) return "NY";
    if (z >= 15001 && z <= 19699) return "PA";
    if (z >= 19701 && z <= 19999) return "DE";
    if (z >= 20601 && z <= 21999) return "MD";
    if (z >= 22001 && z <= 24699) return "VA";
    if (z >= 27001 && z <= 28999) return "NC";
    if (z >= 30001 && z <= 31999) return "GA";
    if (z >= 32001 && z <= 34999) return "FL";
    if (z >= 37001 && z <= 38599) return "TN";
    if (z >= 43001 && z <= 45999) return "OH";
    if (z >= 46001 && z <= 47999) return "IN";
    if (z >= 48001 && z <= 49999) return "MI";
    if (z >= 60001 && z <= 62999) return "IL";
    if (z >= 75001 && z <= 79999) return "TX";
    if (z >= 80001 && z <= 81999) return "CO";
    if (z >= 85001 && z <= 86599) return "AZ";
    if (z >= 90001 && z <= 96199) return "CA";
    if (z >= 97001 && z <= 97999) return "OR";
    if (z >= 98001 && z <= 99499) return "WA";
    return "NJ";
  };

  const searchAdopt = async () => {
    if (!zipCode || zipCode.length < 5) return;
    setAdoptLoading(true);
    setAdoptError("");
    setAdoptPets([]);
    const state = getStateFromZip(zipCode);
    try {
      // Call our secure Firebase Function proxy — key never exposed to client
      const res = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/rescueProxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            filters: [
              { fieldName: "statuses.name", operation: "equals", criteria: "Available" },
              { fieldName: "locations.state", operation: "equals", criteria: state },
              { fieldName: "species.singular", operation: "equals", criteria: petType },
            ],
            limit: 12,
            include: ["pictures", "orgs", "locations"],
          },
        }),
      });
      const data = await res.json();
      const animals: AdoptPet[] = (data.data || [])
        .map((a: any) => {
          const attr = a.attributes;
          const locId = a.relationships?.locations?.data?.[0]?.id;
          const orgId = a.relationships?.orgs?.data?.[0]?.id;
          const loc = data.included?.find((i: any) => i.type === "locations" && i.id === locId);
          const org = data.included?.find((i: any) => i.type === "orgs" && i.id === orgId);

          // Build the best possible direct-to-pet URL:
          // 1. attr.url — direct pet page (most reliable, works for dogs)
          // 2. RescueGroups hosted page — always links to exact pet
          // 3. org website — fallback
          const petDirectUrl = attr.url && attr.url.startsWith("http") && !attr.url.includes("rescuegroups.org/org/")
            ? attr.url
            : `https://www.rescuegroups.org/animals/detail/${a.id}/`;

          return {
            id: a.id,
            name: attr.name || "Unknown",
            breed: attr.breedString || attr.breedPrimary || "",
            age: attr.ageGroup || "",
            sex: attr.sex || "",
            photo: attr.pictureThumbnailUrl || attr.pictureThumbUrl || "",
            url: petDirectUrl,
            city: loc?.attributes?.city || org?.attributes?.city || state,
          };
        })
        .filter((a: AdoptPet) => a.name && a.name !== "Unknown");
      setAdoptPets(animals);
      if (animals.length === 0) setAdoptError("No pets found near that zip code. Try another!");
    } catch {
      setAdoptError("Could not load pets. Please try again.");
    }
    setAdoptLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, activeTab === "services" && styles.toggleBtnActive]}
          onPress={() => setActiveTab("services")}
        >
          <Text style={[styles.toggleText, activeTab === "services" && styles.toggleTextActive]}>
            🔍 Services
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, activeTab === "adopt" && styles.toggleBtnActiveGreen]}
          onPress={() => setActiveTab("adopt")}
        >
          <Text style={[styles.toggleText, activeTab === "adopt" && styles.toggleTextActive]}>
            🏠 Adopt
          </Text>
        </Pressable>
      </View>

      {/* ── Services Tab ── */}
      {activeTab === "services" && (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.serviceEmoji}>{s.emoji}</Text>
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
            ) : providers.length > 0 ? (
              <View>
                <Text style={styles.resultsCount}>{providers.length} providers found</Text>
                {providers.map((p: any) => (
                  <Pressable
                    key={p.id}
                    style={styles.providerCard}
                    onPress={() => p.website && Linking.openURL(p.website.startsWith("http") ? p.website : `https://${p.website}`)}
                  >
                    <View style={styles.providerHeader}>
                      <View style={styles.providerIcon}>
                        <Text style={{ fontSize: 22 }}>
                          {SERVICE_TYPES.find(s => s.label === p.serviceType || s.label === p.service)?.emoji || "🐾"}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.providerNameRow}>
                          <Text style={styles.providerName}>{p.businessName || p.name}</Text>
                          {p.verified === true ? (
                            <View style={styles.verifiedBadge}>
                              <Text style={styles.verifiedText}>✅ Verified</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.providerType}>{p.serviceType || p.service}</Text>
                        <Text style={styles.providerLocation}>
                          📍 {[p.city, p.state, p.zip || extractZipFromAddress(p.address)].filter(Boolean).join(", ")}
                        </Text>
                      </View>
                      {p.rating != null && p.rating !== "" ? (
                        <View style={styles.ratingBadge}>
                          <Text style={styles.ratingText}>⭐ {p.rating}</Text>
                        </View>
                      ) : null}
                    </View>
                    {p.phone ? <Text style={styles.providerPhone}>📞 {p.phone}</Text> : null}
                  </Pressable>
                ))}
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
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Adopt a Pet ❤️</Text>
          <Text style={styles.subheading}>Real pets available near you</Text>

          {/* Type toggle */}
          <View style={styles.typeRow}>
            {(["Dog", "Cat"] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.typeBtn, petType === t && styles.typeBtnActive]}
                onPress={() => { setPetType(t); setAdoptPets([]); setAdoptError(""); }}
              >
                <Text style={[styles.typeText, petType === t && styles.typeTextActive]}>
                  {t === "Dog" ? "🐶 Dogs" : "🐱 Cats"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Cat coming soon */}
          {petType === "Cat" && (
            <View style={styles.catBanner}>
              <Text style={styles.catBannerEmoji}>🐱</Text>
              <Text style={styles.catBannerTitle}>Cat Adoption Coming Soon!</Text>
              <Text style={styles.catBannerSub}>
                We're onboarding cat-friendly shelters. Search below to find cats near you in the meantime.
              </Text>
            </View>
          )}

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
            />
            <Pressable
              style={[styles.searchBtn, zipCode.length < 5 && { opacity: 0.5 }]}
              onPress={searchAdopt}
              disabled={zipCode.length < 5}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </Pressable>
          </View>

          {adoptLoading && (
            <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
          )}

          {adoptError ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🐾</Text>
              <Text style={styles.emptyTitle}>{adoptError}</Text>
            </View>
          ) : null}

          {/* Results grid */}
          {adoptPets.length > 0 && (
            <>
              <Text style={styles.resultsLabel}>
                🐾 {adoptPets.length} available near you
              </Text>
              <View style={styles.petGrid}>
                {adoptPets.map((pet) => (
                  <Pressable
                    key={pet.id}
                    style={styles.petCard}
                    onPress={() => pet.url && Linking.openURL(pet.url)}
                  >
                    {pet.photo ? (
                      <Image
                        source={{ uri: pet.photo }}
                        style={styles.petPhoto}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.petPhotoPlaceholder}>
                        <Text style={{ fontSize: 32 }}>
                          {petType === "Dog" ? "🐶" : "🐱"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.petInfo}>
                      <Text style={styles.petName} numberOfLines={1}>{pet.name}</Text>
                      <Text style={styles.petBreed} numberOfLines={1}>{pet.breed}</Text>
                      <Text style={styles.petMeta}>{pet.age} · {pet.sex}</Text>
                      <Text style={styles.petCity} numberOfLines={1}>📍 {pet.city}</Text>
                      <View style={styles.meetBtn}>
                        <Text style={styles.meetBtnText}>Meet {pet.name} →</Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {!adoptLoading && adoptPets.length === 0 && !adoptError && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={styles.emptyTitle}>Find your next best friend</Text>
              <Text style={styles.emptySub}>
                Enter your zip code to search real adoptable pets near you — powered by RescueGroups.org
              </Text>
            </View>
          )}
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
  resultsCount: { fontSize: 13, color: "#888", marginBottom: 12, marginTop: 4 },
  providerCard: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  providerHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  providerIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f0faf5", alignItems: "center", justifyContent: "center" },
  providerName: { fontSize: 15, fontWeight: "700", color: "#1a1a1a", flexShrink: 1 },
  providerNameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  verifiedBadge: { backgroundColor: "#DCFCE7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  verifiedText: { fontSize: 11, fontWeight: "700", color: "#166534" },
  providerType: { fontSize: 12, color: BRAND, fontWeight: "600", marginTop: 2 },
  providerLocation: { fontSize: 12, color: "#888", marginTop: 2 },
  providerPhone: { fontSize: 13, color: "#555", marginTop: 8 },
  ratingBadge: { backgroundColor: "#FEF3C7", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
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

  catBanner: {
    backgroundColor: "#FFF9E6",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F59E0B33",
    gap: 4,
  },
  catBannerEmoji: { fontSize: 28 },
  catBannerTitle: { fontSize: 15, fontWeight: "700", color: "#92400E" },
  catBannerSub: { fontSize: 12, color: "#B45309", textAlign: "center", lineHeight: 18 },

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
  meetBtn: {
    backgroundColor: BRAND,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: "center",
    marginTop: 6,
  },
  meetBtnText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  cancelBtn: { backgroundColor: "#fee2e2", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  cancelBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
  emptyBox: { alignItems: "center", paddingTop: 48, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#333", textAlign: "center" },
  emptySub: { fontSize: 13, color: "#888", textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
  searchRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginHorizontal: 16, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B" },
});