import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Pressable,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { webDb } from "@/lib/firebase";
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp,
} from "firebase/firestore";

import { buildPetProfileSnapshot } from "@/lib/bookingStatus";

const BRAND = "#4486F4";
const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function defaultAvailability() {
  const avail: Record<string, any> = {};
  ["monday", "tuesday", "wednesday", "thursday", "friday"].forEach((d) => {
    avail[d] = { closed: false, slots: [{ open: "09:00", close: "17:00" }], slotMinutes: 60 };
  });
  ["saturday", "sunday"].forEach((d) => {
    avail[d] = { closed: true, slots: [{ open: "09:00", close: "17:00" }], slotMinutes: 60 };
  });
  return avail;
}

function isDayOpen(dayAvail: any): boolean {
  if (!dayAvail || dayAvail.closed) return false;
  if (dayAvail.slots?.length) return true;
  return Boolean(dayAvail.open && dayAvail.close);
}

function getAvailableDates(
  availability: Record<string, any>,
  blockedDates: string[] = [],
): { date: string; label: string; dayName: string }[] {
  const result: { date: string; label: string; dayName: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = DAYS_OF_WEEK[d.getDay()];
    const dayAvail = availability?.[dayName];
    if (isDayOpen(dayAvail)) {
      const dateStr = toLocalISO(d);
      if (blockedDates.includes(dateStr)) continue;
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      result.push({ date: dateStr, label, dayName });
    }
  }
  return result;
}

function generateSlotsForDay(dayAvail: any, bookedSlots: string[] = []): string[] {
  if (!isDayOpen(dayAvail)) return [];
  const blocks = dayAvail.slots?.length
    ? dayAvail.slots
    : [{ open: dayAvail.open || "09:00", close: dayAvail.close || "17:00" }];
  const duration = dayAvail.slotMinutes || dayAvail.slotDuration || 60;
  const all = blocks.flatMap((block: { open: string; close: string }) =>
    generateSlots(block.open, block.close, duration, bookedSlots)
  );
  return Array.from(new Set(all)).sort() as string[];
}

function normalizeTime(t: string): string {
  if (!t || typeof t !== "string") return "00:00";
  const trimmed = t.trim();
  if (trimmed.includes(":")) return trimmed;
  const n = parseInt(trimmed, 10);
  return isNaN(n) ? "00:00" : `${String(n).padStart(2, "0")}:00`;
}

function generateSlots(open: string, close: string, slotMinutes: number, bookedSlots: string[]): string[] {
  const slots: string[] = [];
  const [openH, openM] = normalizeTime(open).split(":").map(Number);
  const [closeH, closeM] = normalizeTime(close).split(":").map(Number);
  let current = openH * 60 + openM;
  const end = closeH * 60 + closeM;
  while (current + slotMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0");
    const m = (current % 60).toString().padStart(2, "0");
    const slot = `${h}:${m}`;
    if (!bookedSlots.includes(slot)) slots.push(slot);
    current += slotMinutes;
  }
  return slots;
}

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function toLocalISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function BookingNew() {
  const { providerId, providerName, serviceType } = useLocalSearchParams<{
    providerId: string;
    providerName: string;
    serviceType?: string;
  }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const navigation = useNavigation();

  const initialService = serviceType && serviceType !== "Service" ? serviceType : "";
  const skipServiceStep = !!initialService;

  const [step, setStep] = useState(skipServiceStep ? 2 : 1);
  const [providerAvailability, setProviderAvailability] = useState<Record<string, any>>({});
  const [selectedService, setSelectedService] = useState(initialService);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedPetName, setSelectedPetName] = useState("");
  const [selectedPetData, setSelectedPetData] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [slotTaken, setSlotTaken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedProviderName, setResolvedProviderName] = useState(providerName || "Provider");
  const [providerBlockedDates, setProviderBlockedDates] = useState<string[]>([]);

  const SERVICE_OPTIONS = [
    "Grooming", "Dog Walking", "Veterinary", "Training",
    "Boarding", "Daycare", "Pet Sitting", "Photography",
  ];
  const services = serviceType && !SERVICE_OPTIONS.includes(serviceType)
    ? [serviceType, ...SERVICE_OPTIONS]
    : SERVICE_OPTIONS;

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: "Book Service",
      headerBackTitle: "Back",
    });
  }, [navigation]);

  useEffect(() => {
    loadProviderAndPets();
  }, []);

  async function loadProviderAndPets() {
    try {
      if (providerId) {
        const provSnap = await getDoc(doc(webDb, "users", providerId));
        if (provSnap.exists()) {
          const provData = provSnap.data();
          setProviderAvailability(provData.availability || defaultAvailability());
          setProviderBlockedDates(provData.blockedDates || []);
          if (!providerName || providerName === "Provider") {
            setResolvedProviderName(provData.businessName || provData.displayName || providerName || "Provider");
          }
        } else {
          setProviderAvailability(defaultAvailability());
        }
      } else {
        setProviderAvailability(defaultAvailability());
      }

      if (user) {
        const petsSnap = await getDocs(collection(webDb, "users", user.uid, "pets"));
        const list = petsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPets(list);
        if (list.length === 1) {
          setSelectedPetId(list[0].id);
          setSelectedPetName((list[0] as any).name || "My Pet");
          setSelectedPetData(list[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function checkConflict(date: string, slot: string): Promise<boolean> {
    try {
      const snap = await getDocs(
        query(
          collection(webDb, "bookings"),
          where("providerId", "==", providerId),
          where("date", "==", date),
          where("timeSlot", "==", slot),
          where("status", "in", ["pending", "confirmed"]),
        )
      );
      return !snap.empty;
    } catch (e) {
      console.warn("Conflict check skipped:", e);
      return false;
    }
  }

  async function selectDate(date: string, dayName: string) {
    setSelectedDate(date);
    setSelectedTime("");
    setSlotTaken(false);
    setLoadingSlots(true);
    try {
      const dayAvail = providerAvailability[dayName];
      const snap = await getDocs(
        query(
          collection(webDb, "bookings"),
          where("providerId", "==", providerId),
          where("date", "==", date),
          where("status", "in", ["pending", "confirmed"])
        )
      );
      const booked = snap.docs.map((d) => (d.data().timeSlot || d.data().time) as string).filter(Boolean);
      setAvailableSlots(generateSlotsForDay(dayAvail, booked));
    } catch (e) {
      console.error("selectDate slots error:", e);
      setAvailableSlots(generateSlotsForDay(providerAvailability[dayName], []));
    } finally {
      setLoadingSlots(false);
    }
  }

  async function submitBooking() {
    if (!user || !selectedService || !selectedDate || !selectedTime || !selectedPetId) {
      Alert.alert("Missing info", "Please complete all steps before confirming.");
      return;
    }
    setSubmitting(true);
    setCheckingConflict(true);
    setSlotTaken(false);
    try {
      let conflict = false;
      try {
        conflict = await checkConflict(selectedDate, selectedTime);
      } catch (e) {
        console.warn("Conflict check error at submit:", e);
      }
      if (conflict) {
        setSlotTaken(true);
        setStep(2);
        Alert.alert("Slot unavailable", "This slot is already booked. Please choose another time.");
        return;
      }

      const ownerName = profile?.displayName || profile?.name || "Pet Owner";
      const bookingData = {
        providerId,
        providerName: resolvedProviderName,
        ownerId: user.uid,
        ownerName,
        ownerEmail: user.email || "",
        petId: selectedPetId,
        petName: selectedPetName,
        petBreed: selectedPetData?.breed || "",
        petAge: selectedPetData?.age || "",
        petWeight: selectedPetData?.weight || "",
        petWeightUnit: selectedPetData?.weightUnit || "lbs",
        petSpecies: selectedPetData?.species || selectedPetData?.type || "",
        petNeutered: selectedPetData?.neutered || false,
        petProfile: buildPetProfileSnapshot(selectedPetData, selectedPetName),
        petProfileShared: true,
        service: selectedService,
        date: selectedDate,
        timeSlot: selectedTime,
        time: selectedTime,
        notes: notes.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        uid: user.uid,
        clientId: user.uid,
        clientName: ownerName,
        clientEmail: user.email || "",
      };

      const bookingRef = await addDoc(collection(webDb, "bookings"), bookingData);

      if (selectedPetId) {
        try {
          await addDoc(
            collection(webDb, "users", user.uid, "pets", selectedPetId, "reminders"),
            {
              type: "appointment",
              title: `${selectedService} with ${resolvedProviderName}`,
              date: selectedDate,
              time: selectedTime,
              providerId,
              providerName: resolvedProviderName,
              bookingId: bookingRef.id,
              createdAt: serverTimestamp(),
            }
          );
        } catch (e) {
          console.warn("Reminder write failed:", e);
        }
      }

      Alert.alert(
        "Booking Requested! 🎉",
        `Your appointment with ${resolvedProviderName} on ${formatDisplayDate(selectedDate)} at ${selectedTime} has been sent! ${selectedPetName}'s profile has been shared with ${resolvedProviderName}.`,
        [
          {
            text: "View Appointments",
            onPress: () => router.replace("/bookings" as any),
          },
        ]
      );
    } catch (e) {
      console.error("submitBooking error:", e);
      Alert.alert("Error", "Failed to send booking request. Please try again.");
    } finally {
      setSubmitting(false);
      setCheckingConflict(false);
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={BRAND} size="large" />
      </View>
    );
  }

  function StepDots() {
    const steps = skipServiceStep ? [2, 3] : [1, 2, 3];
    return (
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 24 }}>
        {steps.map((n) => (
          <View
            key={n}
            style={{
              width: n === step ? 20 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: n <= step ? BRAND : "#E2E8F0",
            }}
          />
        ))}
      </View>
    );
  }

  if (step === 1) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.screenTitle}>Book with {resolvedProviderName}</Text>
        <StepDots />
        <Text style={s.stepTitle}>What service do you need?</Text>
        {services.map((svc) => (
          <TouchableOpacity
            key={svc}
            style={[s.optionCard, selectedService === svc && s.optionCardActive]}
            onPress={() => setSelectedService(svc)}
          >
            <Text style={[s.optionText, selectedService === svc && s.optionTextActive]}>{svc}</Text>
            {selectedService === svc ? <Ionicons name="checkmark-circle" size={20} color={BRAND} /> : null}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[s.nextBtn, !selectedService && s.nextBtnDisabled]}
          onPress={() => selectedService && setStep(2)}
          disabled={!selectedService}
        >
          <Text style={s.nextBtnText}>Next: Choose Date</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const availableDates = getAvailableDates(providerAvailability, providerBlockedDates);

  if (step === 2) {
    return (
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        <Text style={s.screenTitle}>Book with {resolvedProviderName}</Text>
        <StepDots />
        <Text style={s.stepTitle}>Select Date & Time</Text>
        <Text style={s.stepSub}>Showing next 14 days when {resolvedProviderName} is available</Text>

        {availableDates.length === 0 ? (
          <View style={s.emptyBox}>
            <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
            <Text style={s.emptyText}>No available dates in the next 14 days</Text>
            <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>
              The provider hasn't set their availability yet. Try messaging them directly.
            </Text>
          </View>
        ) : (
          <>
            <Text style={s.sectionTitle}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {availableDates.map((d) => (
                <Pressable
                  key={d.date}
                  onPress={() => selectDate(d.date, d.dayName)}
                  style={{
                    marginRight: 10,
                    padding: 12,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: selectedDate === d.date ? BRAND : "#fff",
                    borderWidth: 1,
                    borderColor: selectedDate === d.date ? BRAND : "#E2E8F0",
                    minWidth: 72,
                  }}
                >
                  <Text style={{ fontSize: 11, color: selectedDate === d.date ? "#fff" : "#94A3B8", fontWeight: "600" }}>
                    {d.label.split(" ")[0].toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: selectedDate === d.date ? "#fff" : "#1E293B" }}>
                    {d.label.split(" ")[2]}
                  </Text>
                  <Text style={{ fontSize: 11, color: selectedDate === d.date ? "#ffffffaa" : "#94A3B8" }}>
                    {d.label.split(" ")[1]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {selectedDate ? (
              loadingSlots ? (
                <ActivityIndicator color={BRAND} style={{ marginBottom: 16 }} />
              ) : (
                <>
                  <Text style={s.sectionTitle}>Select Time</Text>
                  {availableSlots.length === 0 ? (
                    <Text style={{ color: "#94A3B8", fontSize: 14, marginBottom: 16 }}>No slots available on this day.</Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                      {availableSlots.map((slot) => (
                        <Pressable
                          key={slot}
                          onPress={() => { setSelectedTime(slot); setSlotTaken(false); }}
                          style={{
                            paddingHorizontal: 18,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: selectedTime === slot ? BRAND : "#fff",
                            borderWidth: 1,
                            borderColor: selectedTime === slot ? BRAND : "#E2E8F0",
                          }}
                        >
                          <Text style={{ fontWeight: "600", color: selectedTime === slot ? "#fff" : "#1E293B" }}>{slot}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                  {slotTaken && (
                    <Text style={{ color: "#EF4444", fontSize: 13, marginBottom: 12 }}>
                      This slot is already booked. Please choose another time.
                    </Text>
                  )}
                </>
              )
            ) : (
              <Text style={{ color: "#94A3B8", fontSize: 14, marginBottom: 16 }}>Select a date to see available times.</Text>
            )}
          </>
        )}

        <TouchableOpacity
          style={[s.nextBtn, (!selectedDate || !selectedTime) && s.nextBtnDisabled]}
          onPress={() => selectedDate && selectedTime && setStep(3)}
          disabled={!selectedDate || !selectedTime}
        >
          <Text style={s.nextBtnText}>Next: Confirm Details</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={s.backBtn} onPress={() => (skipServiceStep ? router.back() : setStep(1))}>
          <Ionicons name="arrow-back" size={16} color="#64748B" />
          <Text style={s.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.screenTitle}>Confirm Booking</Text>
        <StepDots />

        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Booking Summary</Text>
          <SummaryRow icon="person-outline" label="Provider" value={String(resolvedProviderName || "")} />
          <SummaryRow icon="briefcase-outline" label="Service" value={selectedService} />
          <SummaryRow icon="calendar-outline" label="Date" value={formatDisplayDate(selectedDate)} />
          <SummaryRow icon="time-outline" label="Time" value={selectedTime} />
        </View>

        <Text style={s.label}>Which pet is this for?</Text>
        {pets.length === 0 ? (
          <View style={[s.emptyBox, { marginBottom: 16 }]}>
            <Text style={s.emptyText}>No pets found in your profile</Text>
            <Text style={{ fontSize: 13, color: "#94A3B8" }}>Add a pet from your profile first.</Text>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
            {pets.map((pet: any) => (
              <TouchableOpacity
                key={pet.id}
                style={[s.petChip, selectedPetId === pet.id && s.petChipActive]}
                onPress={() => {
                  setSelectedPetId(pet.id);
                  setSelectedPetName(pet.name || "My Pet");
                  setSelectedPetData(pet);
                }}
              >
                <Ionicons name="paw-outline" size={14} color={selectedPetId === pet.id ? "#fff" : BRAND} />
                <Text style={[s.petChipText, selectedPetId === pet.id && { color: "#fff" }]}>{pet.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.label}>Notes for the provider (optional)</Text>
        <TextInput
          style={[s.input, { height: 90 }]}
          placeholder="e.g. My dog is nervous around other dogs, please trim nails gently..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          style={[s.nextBtn, (!selectedPetId || submitting || checkingConflict) && s.nextBtnDisabled]}
          onPress={submitBooking}
          disabled={!selectedPetId || submitting || checkingConflict}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={s.nextBtnText}>Send Booking Request</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={() => setStep(2)}>
          <Ionicons name="arrow-back" size={16} color="#64748B" />
          <Text style={s.backBtnText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" }}>
      <Ionicons name={icon as any} size={16} color="#64748B" />
      <Text style={{ fontSize: 13, color: "#64748B", width: 70 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: "#1E293B" }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 50 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  screenTitle: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 16 },
  stepTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 6 },
  stepSub: { fontSize: 13, color: "#64748B", marginBottom: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 10 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 16, textAlignVertical: "top" },
  optionCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1.5, borderColor: "#E2E8F0" },
  optionCardActive: { borderColor: BRAND, backgroundColor: "rgba(68,134,244,0.05)" },
  optionText: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  optionTextActive: { color: BRAND },
  dateCard: { width: 64, alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 10, borderWidth: 1.5, borderColor: "#E2E8F0" },
  dateCardActive: { backgroundColor: BRAND, borderColor: BRAND },
  dateDayName: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  dateDayNum: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  dateMon: { fontSize: 11, color: "#94A3B8" },
  timeChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0" },
  timeChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  timeChipText: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  timeChipTextActive: { color: "#fff" },
  petChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0" },
  petChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  petChipText: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  summaryCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 8 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: BRAND, borderRadius: 14, padding: 16, marginBottom: 12, marginTop: 4 },
  nextBtnDisabled: { backgroundColor: "#CBD5E1" },
  nextBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  backBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12 },
  backBtnText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "700", color: "#94A3B8" },
});
