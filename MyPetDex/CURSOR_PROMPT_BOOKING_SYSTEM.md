# Build: Booking System (Pet Owner → Service Provider)

## Overview
Pet owners can book a service from a provider's profile. The flow is:
1. Owner taps **"Book Now"** on `app/provider/[id].tsx`
2. A new screen `app/booking/new.tsx` opens with a 4-step wizard:
   - Step 1: Select service
   - Step 2: Pick a date (calendar, only days the provider works)
   - Step 3: Pick a time slot (based on provider's availability + existing bookings)
   - Step 4: Select pet + notes → confirm
3. Booking is written to Firestore `bookings` collection
4. Provider sees the request in `app/(tabs)/provider-bookings.tsx` (already exists, already has confirm/decline/complete)
5. Cloud Functions send push notifications: new booking → provider, status change → owner

---

## Firestore Data Model

### Collection: `bookings/{bookingId}`

```
bookings/{bookingId}
  providerId: string         // provider's UID
  providerName: string       // provider's businessName
  ownerId: string            // pet owner's UID
  ownerName: string          // owner's displayName
  ownerEmail: string         // owner's email
  petId: string              // pet document ID (from owner's pets subcollection)
  petName: string            // pet's name
  service: string            // e.g. "Grooming"
  date: string               // ISO date "2026-09-15"
  timeSlot: string           // "10:00"
  notes: string              // optional notes from owner
  status: "pending" | "confirmed" | "declined" | "completed" | "cancelled"
  createdAt: Timestamp
  updatedAt: Timestamp
```

### Provider availability (already stored in `users/{uid}` after the enhancements prompt):

```
availability: {
  monday: { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 },
  tuesday: { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 },
  wednesday: { closed: true, open: "09:00", close: "17:00", slotMinutes: 60 },
  thursday: { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 },
  friday: { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 },
  saturday: { closed: false, open: "10:00", close: "14:00", slotMinutes: 60 },
  sunday: { closed: true, open: "09:00", close: "17:00", slotMinutes: 60 },
}
```

If a provider has no `availability` set, default to Mon–Fri 9:00–17:00, 60-min slots.

---

## Files to create

### 1. `app/booking/new.tsx` — Booking wizard screen

Full 4-step booking creation screen for pet owners.

```tsx
import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { webDb } from "@/lib/firebase";
import {
  doc, getDoc, collection, query, where, getDocs,
  addDoc, serverTimestamp, Timestamp,
} from "firebase/firestore";

const BRAND = "#4486F4";
const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function defaultAvailability() {
  const avail: Record<string, any> = {};
  ["monday","tuesday","wednesday","thursday","friday"].forEach(d => {
    avail[d] = { closed: false, open: "09:00", close: "17:00", slotMinutes: 60 };
  });
  ["saturday","sunday"].forEach(d => {
    avail[d] = { closed: true, open: "09:00", close: "17:00", slotMinutes: 60 };
  });
  return avail;
}

function generateSlots(open: string, close: string, slotMinutes: number, bookedSlots: string[]): string[] {
  const slots: string[] = [];
  const [openH, openM] = open.split(":").map(Number);
  const [closeH, closeM] = close.split(":").map(Number);
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

export default function BookingNew() {
  const { providerId, providerName, serviceType } = useLocalSearchParams<{
    providerId: string;
    providerName: string;
    serviceType?: string;
  }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();

  const [step, setStep] = useState(1); // 1=service, 2=date, 3=time, 4=details
  const [providerAvailability, setProviderAvailability] = useState<Record<string, any>>({});
  const [selectedService, setSelectedService] = useState(serviceType || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState("");
  const [selectedPetName, setSelectedPetName] = useState("");
  const [notes, setNotes] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const SERVICE_OPTIONS = [
    "Grooming", "Dog Walking", "Veterinary", "Training",
    "Boarding", "Daycare", "Pet Sitting", "Photography",
  ];
  // If provider has a specific serviceType, show it first
  const services = serviceType && !SERVICE_OPTIONS.includes(serviceType)
    ? [serviceType, ...SERVICE_OPTIONS]
    : SERVICE_OPTIONS;

  useEffect(() => {
    loadProviderAndPets();
  }, []);

  async function loadProviderAndPets() {
    try {
      // Load provider availability
      const provSnap = await getDoc(doc(webDb, "users", providerId));
      if (provSnap.exists()) {
        setProviderAvailability(provSnap.data().availability || defaultAvailability());
      } else {
        setProviderAvailability(defaultAvailability());
      }

      // Load owner's pets
      if (user) {
        const petsSnap = await getDocs(collection(webDb, "users", user.uid, "pets"));
        const list = petsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPets(list);
        if (list.length === 1) {
          setSelectedPetId(list[0].id);
          setSelectedPetName((list[0] as any).name || "My Pet");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  // Generate calendar dates (next 30 days, skip closed days)
  function getAvailableDates(): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = DAYS_OF_WEEK[d.getDay()];
      const avail = providerAvailability[dayName];
      if (avail && !avail.closed) {
        const iso = d.toISOString().split("T")[0];
        dates.push(iso);
      }
    }
    return dates;
  }

  async function selectDate(date: string) {
    setSelectedDate(date);
    setSelectedTime("");
    setLoadingSlots(true);
    try {
      const dayName = DAYS_OF_WEEK[new Date(date + "T12:00:00").getDay()];
      const avail = providerAvailability[dayName] || { open: "09:00", close: "17:00", slotMinutes: 60 };

      // Get already-booked slots for this provider on this date
      const snap = await getDocs(
        query(
          collection(webDb, "bookings"),
          where("providerId", "==", providerId),
          where("date", "==", date),
          where("status", "in", ["pending", "confirmed"])
        )
      );
      const booked = snap.docs.map(d => d.data().timeSlot as string);
      setAvailableSlots(generateSlots(avail.open, avail.close, avail.slotMinutes, booked));
    } finally {
      setLoadingSlots(false); }
    setStep(3);
  }

  async function submitBooking() {
    if (!user || !selectedService || !selectedDate || !selectedTime || !selectedPetId) {
      Alert.alert("Missing info", "Please complete all steps before confirming.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(webDb, "bookings"), {
        providerId,
        providerName: providerName || "Provider",
        ownerId: user.uid,
        ownerName: profile?.displayName || "Pet Owner",
        ownerEmail: user.email || "",
        petId: selectedPetId,
        petName: selectedPetName,
        service: selectedService,
        date: selectedDate,
        timeSlot: selectedTime,
        notes: notes.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      Alert.alert(
        "Booking Requested! 🎉",
        `Your booking with ${providerName} on ${formatDisplayDate(selectedDate)} at ${selectedTime} has been sent. You'll get a notification when they respond.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert("Error", "Failed to send booking request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  // ── Step indicator ─────────────────────────────────────────────────────────
  function StepDots() {
    return (
      <View style={{ flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 24 }}>
        {[1,2,3,4].map(n => (
          <View key={n} style={{
            width: n === step ? 20 : 8, height: 8, borderRadius: 4,
            backgroundColor: n <= step ? BRAND : "#E2E8F0",
          }} />
        ))}
      </View>
    );
  }

  // ── Step 1: Select service ─────────────────────────────────────────────────
  if (step === 1) return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>Book with {providerName}</Text>
      <StepDots />
      <Text style={s.stepTitle}>What service do you need?</Text>
      {services.map(svc => (
        <TouchableOpacity
          key={svc}
          style={[s.optionCard, selectedService === svc && s.optionCardActive]}
          onPress={() => setSelectedService(svc)}
        >
          <Text style={[s.optionText, selectedService === svc && s.optionTextActive]}>{svc}</Text>
          {selectedService === svc && <Ionicons name="checkmark-circle" size={20} color={BRAND} />}
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

  // ── Step 2: Pick a date ────────────────────────────────────────────────────
  const availDates = getAvailableDates();
  if (step === 2) return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>Book with {providerName}</Text>
      <StepDots />
      <Text style={s.stepTitle}>Select a date</Text>
      <Text style={s.stepSub}>Showing next 30 days when {providerName} is available</Text>
      {availDates.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
          <Text style={s.emptyText}>No available dates in the next 30 days</Text>
          <Text style={{ fontSize: 13, color: "#94A3B8", textAlign: "center" }}>The provider hasn't set their availability yet. Try messaging them directly.</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          {availDates.map(date => {
            const [y, m, d] = date.split("-").map(Number);
            const dt = new Date(y, m - 1, d);
            const dayShort = dt.toLocaleDateString("en-US", { weekday: "short" });
            const dayNum = dt.getDate();
            const mon = dt.toLocaleDateString("en-US", { month: "short" });
            return (
              <TouchableOpacity
                key={date}
                style={[s.dateCard, selectedDate === date && s.dateCardActive]}
                onPress={() => selectDate(date)}
              >
                <Text style={[s.dateDayName, selectedDate === date && { color: "#fff" }]}>{dayShort}</Text>
                <Text style={[s.dateDayNum, selectedDate === date && { color: "#fff" }]}>{dayNum}</Text>
                <Text style={[s.dateMon, selectedDate === date && { color: "rgba(255,255,255,0.8)" }]}>{mon}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
        <Ionicons name="arrow-back" size={16} color="#64748B" />
        <Text style={s.backBtnText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Step 3: Pick a time slot ───────────────────────────────────────────────
  if (step === 3) return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.screenTitle}>Book with {providerName}</Text>
      <StepDots />
      <Text style={s.stepTitle}>Choose a time</Text>
      <Text style={s.stepSub}>{formatDisplayDate(selectedDate)}</Text>
      {loadingSlots ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      ) : availableSlots.length === 0 ? (
        <View style={s.emptyBox}>
          <Ionicons name="time-outline" size={40} color="#CBD5E1" />
          <Text style={s.emptyText}>No slots available on this day</Text>
          <TouchableOpacity onPress={() => { setStep(2); setSelectedDate(""); }}>
            <Text style={{ color: BRAND, fontWeight: "700", marginTop: 8 }}>Choose a different date</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 }}>
          {availableSlots.map(slot => (
            <TouchableOpacity
              key={slot}
              style={[s.timeChip, selectedTime === slot && s.timeChipActive]}
              onPress={() => setSelectedTime(slot)}
            >
              <Text style={[s.timeChipText, selectedTime === slot && s.timeChipTextActive]}>{slot}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <TouchableOpacity
        style={[s.nextBtn, !selectedTime && s.nextBtnDisabled]}
        onPress={() => selectedTime && setStep(4)}
        disabled={!selectedTime}
      >
        <Text style={s.nextBtnText}>Next: Confirm Details</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={s.backBtn} onPress={() => { setStep(2); setSelectedDate(""); }}>
        <Ionicons name="arrow-back" size={16} color="#64748B" />
        <Text style={s.backBtnText}>Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ── Step 4: Select pet + notes + confirm ───────────────────────────────────
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.screenTitle}>Confirm Booking</Text>
        <StepDots />

        {/* Summary card */}
        <View style={s.summaryCard}>
          <Text style={s.summaryTitle}>Booking Summary</Text>
          <SummaryRow icon="person-outline" label="Provider" value={providerName} />
          <SummaryRow icon="briefcase-outline" label="Service" value={selectedService} />
          <SummaryRow icon="calendar-outline" label="Date" value={formatDisplayDate(selectedDate)} />
          <SummaryRow icon="time-outline" label="Time" value={selectedTime} />
        </View>

        {/* Pet selection */}
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
                onPress={() => { setSelectedPetId(pet.id); setSelectedPetName(pet.name || "My Pet"); }}
              >
                <Ionicons name="paw-outline" size={14} color={selectedPetId === pet.id ? "#fff" : BRAND} />
                <Text style={[s.petChipText, selectedPetId === pet.id && { color: "#fff" }]}>{pet.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Notes */}
        <Text style={s.label}>Notes for the provider (optional)</Text>
        <TextInput
          style={[s.input, { height: 90 }]}
          placeholder="e.g. My dog is nervous around other dogs, please trim nails gently..."
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          style={[s.nextBtn, (!selectedPetId || submitting) && s.nextBtnDisabled]}
          onPress={submitBooking}
          disabled={!selectedPetId || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                <Text style={s.nextBtnText}>Send Booking Request</Text>
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.backBtn} onPress={() => setStep(3)}>
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
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 16 },
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
```

---

## Files to edit

### 2. `app/provider/[id].tsx` — Add "Book Now" button

Find the action buttons section in the provider detail screen (near the phone/website/Google Review buttons). Add a "Book Now" button:

**Add this import** (if not already present):
```ts
import { useRouter } from "expo-router";
```

**Add router** inside the component (if not already present):
```ts
const router = useRouter();
```

**Add the `Book Now` button** in the action buttons area, right after or before the existing call/website buttons:

```tsx
<Pressable
  onPress={() => router.push({
    pathname: "/booking/new",
    params: {
      providerId: params.id,
      providerName: params.name || providerData?.businessName || "Provider",
      serviceType: params.serviceType || providerData?.serviceType || "",
    },
  })}
  style={styles.bookBtn}
>
  <Ionicons name="calendar-outline" size={16} color="#fff" />
  <Text style={styles.bookBtnText}>Book Now</Text>
</Pressable>
```

**Add to StyleSheet**:
```ts
bookBtn: {
  flexDirection: "row", alignItems: "center", justifyContent: "center",
  gap: 8, backgroundColor: "#4486F4", borderRadius: 14,
  paddingVertical: 14, paddingHorizontal: 20, flex: 1,
},
bookBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
```

**Important**: Only show the "Book Now" button to pet owners (not to providers or admins). Wrap it with a check — look at how the review form is already conditionally shown (it checks `profile?.role` or similar). Apply the same guard:
```tsx
{profile?.role === "owner" && (
  <Pressable ... >
```

If `profile` comes from `useUserProfile()`, which is already imported and used in this file, check what field indicates the owner role (likely `profile?.role === "owner"` or `profile?.userType === "owner"` — check the actual field name used in the existing review form guard and use the same).

---

### 3. Firestore Rules — add bookings rules

In `firestore.rules`, inside the main `match /databases/{database}/documents` block, add:

```js
// Bookings: owner can create, both provider and owner can read their own, provider can update status
match /bookings/{bookingId} {
  allow read: if isSignedIn() && (
    request.auth.uid == resource.data.ownerId ||
    request.auth.uid == resource.data.providerId
  );
  allow create: if isSignedIn() && request.auth.uid == request.resource.data.ownerId;
  allow update: if isSignedIn() && (
    request.auth.uid == resource.data.providerId ||
    request.auth.uid == resource.data.ownerId
  );
}
```

After adding, deploy:
```bash
cd ~/mypetdex
firebase deploy --only firestore:rules
```

---

### 4. `functions/index.js` — Cloud Functions for push notifications

Add two new Cloud Functions. Import at the top if not already present:
```js
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
```

**Function 1: Notify provider when new booking is created**
```js
exports.onNewBooking = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const booking = event.data.data();
    const { getMessaging } = require("firebase-admin/messaging");

    // Get provider's FCM token
    const providerDoc = await db.collection("users").doc(booking.providerId).get();
    const fcmToken = providerDoc.data()?.fcmToken;
    if (!fcmToken) return;

    try {
      await getMessaging().send({
        token: fcmToken,
        notification: {
          title: "New Booking Request 📅",
          body: `${booking.ownerName} wants to book ${booking.service} on ${booking.date} at ${booking.timeSlot}`,
        },
        data: {
          type: "new_booking",
          bookingId: event.params.bookingId,
          screen: "provider_bookings",
        },
      });
    } catch (e) {
      console.error("FCM error (onNewBooking):", e);
    }
  }
);
```

**Function 2: Notify owner when booking status changes**
```js
exports.onBookingStatusChange = onDocumentUpdated(
  "bookings/{bookingId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    if (before.status === after.status) return; // no status change
    const { getMessaging } = require("firebase-admin/messaging");

    // Get owner's FCM token
    const ownerDoc = await db.collection("users").doc(after.ownerId).get();
    const fcmToken = ownerDoc.data()?.fcmToken;
    if (!fcmToken) return;

    const statusMessages: Record<string, string> = {
      confirmed: `Your booking for ${after.service} on ${after.date} at ${after.timeSlot} has been confirmed! ✅`,
      declined: `Your booking request for ${after.service} on ${after.date} was declined.`,
      completed: `Your ${after.service} session has been marked as completed. Leave a review!`,
      cancelled: `Your booking for ${after.service} on ${after.date} has been cancelled.`,
    };

    const body = statusMessages[after.status];
    if (!body) return;

    try {
      await getMessaging().send({
        token: fcmToken,
        notification: {
          title: "Booking Update",
          body,
        },
        data: {
          type: "booking_status_change",
          bookingId: event.params.bookingId,
          status: after.status,
        },
      });
    } catch (e) {
      console.error("FCM error (onBookingStatusChange):", e);
    }
  }
);
```

Deploy:
```bash
cd ~/mypetdex
firebase deploy --only functions:onNewBooking,functions:onBookingStatusChange
```

---

## What NOT to change
- Do not touch `provider-bookings.tsx` — it already handles confirm/decline/complete perfectly
- Do not change `provider-home.tsx`, `provider-services.tsx`, or any shelter screens (separate prompt)
- Do not change any pet owner screens (index, explore, shopping, ai, me)
- Do not change auth flow, Stripe, Resend, or other Cloud Functions
- Do not change `app.json` or `storage.rules`
- Do not touch `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`
- Never deploy `rescueProxy`, `deleteAccount`, or `getPublicStats` — always type N if prompted

---

## After applying

Test booking flow:
1. Log in as a pet owner → find a provider → tap "Book Now"
2. Select a service → choose a date (should only show days the provider works) → pick a time slot → select pet → tap "Send Booking Request"
3. Log in as the provider → go to Bookings tab → should see the new pending booking → tap "Confirm"
4. Owner should receive a push notification with "Booking confirmed" message

Commit:
```bash
git add app/booking/new.tsx app/provider/[id].tsx firestore.rules functions/index.js
git commit -m "feat: booking system - owner flow, Book Now button, push notifications"
eas build --platform ios --profile production
```

This will be build 35 (after chat system in build 34).
