import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, Alert, Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { webDb } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, serverTimestamp } from "firebase/firestore";
import { bookingStatusStyle, formatMedications } from "@/lib/bookingStatus";
import { openChatWithProvider } from "@/lib/chat";

const BRAND = "#4486F4";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(webDb, "bookings", id), (snap) => {
      if (snap.exists()) {
        setBooking({ id: snap.id, ...snap.data() });
      } else {
        setBooking(null);
      }
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [id]);

  async function openChat() {
    if (!user?.uid || !booking?.providerId) {
      Alert.alert("Unavailable", "Chat is not available for this booking.");
      return;
    }
    const result = await openChatWithProvider({
      ownerUid: user.uid,
      ownerName: user.displayName || "Pet Owner",
      providerUid: booking.providerId,
      providerName: booking.providerName || "Provider",
      activeBooking: true,
    });
    if (!result.ok) {
      Alert.alert("Error", "Could not open chat. Please try again.");
      return;
    }
    router.push({
      pathname: "/messages/[id]" as any,
      params: { id: result.convId, otherName: result.otherName, otherUid: result.otherUid },
    });
  }

  async function confirmCancel() {
    if (!booking?.id) return;
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel this booking?", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel Booking",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(webDb, "bookings", booking.id), {
              status: "cancelled",
              cancelledAt: serverTimestamp(),
              cancelledBy: "owner",
            });
          } catch {
            Alert.alert("Error", "Could not cancel booking.");
          }
        },
      },
    ]);
  }

  if (loading) {
    return <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />;
  }

  if (!booking) {
    return (
      <View style={s.center}>
        <Text style={s.empty}>Booking not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: BRAND, marginTop: 12 }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const colors = bookingStatusStyle(booking.status);
  const profile = booking.petProfile || {};
  const canCancel =
    (booking.status === "pending" || booking.status === "confirmed") && booking.date >= today;
  const meds = profile.medications
    ? (typeof profile.medications === "string" ? profile.medications : formatMedications(profile.medications))
    : "";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F8FF" }}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <Text style={s.headerTitle} numberOfLines={1}>Appointment</Text>
        <View style={{ width: 36 }} />
      </View>

    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <Text style={s.title}>{booking.service || "Appointment"}</Text>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.bg }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text, textTransform: "capitalize" }}>
            {booking.status}
          </Text>
        </View>
      </View>

      <Text style={s.sub}>
        {booking.providerName || "Provider"} ·{" "}
        {new Date(booking.date + "T12:00:00").toLocaleDateString("en-US", {
          weekday: "long", month: "long", day: "numeric",
        })}{" "}
        at {booking.timeSlot || booking.time}
      </Text>

      {booking.notes ? (
        <View style={s.card}>
          <Text style={s.cardTitle}>Notes</Text>
          <Text style={s.cardText}>{booking.notes}</Text>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.cardTitle}>Pet Profile Snapshot</Text>
        {[
          ["Name", profile.name || booking.petName],
          ["Species", profile.species || booking.petSpecies],
          ["Breed", profile.breed || booking.petBreed],
          ["Age", profile.age || booking.petAge],
          ["Weight", profile.weight ? `${profile.weight} ${profile.weightUnit || booking.petWeightUnit || "lbs"}` : booking.petWeight],
          ["Allergies", profile.allergies],
          ["Medications", meds],
          ["Health Notes", profile.healthNotes],
        ].filter(([, v]) => v).map(([label, value]) => (
          <View key={label as string} style={s.row}>
            <Text style={s.label}>{label}</Text>
            <Text style={s.value}>{String(value)}</Text>
          </View>
        ))}
      </View>

      {canCancel && booking.providerId && (
        <Pressable onPress={openChat} style={s.messageBtn}>
          <Ionicons name="chatbubble-outline" size={17} color="#fff" />
          <Text style={s.messageBtnText}>Message Provider</Text>
        </Pressable>
      )}

      {canCancel && (
        <Pressable onPress={confirmCancel} style={s.cancelBtn}>
          <Text style={s.cancelBtnText}>Cancel Appointment</Text>
        </Pressable>
      )}
    </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F4F6FB",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: BRAND, textAlign: "center" },
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  empty: { fontSize: 16, color: "#94A3B8" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#1E293B", flex: 1, marginRight: 12 },
  sub: { fontSize: 14, color: "#64748B", marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  cardText: { fontSize: 14, color: "#64748B", lineHeight: 20 },
  row: { flexDirection: "row", marginBottom: 8, gap: 12 },
  label: { width: 100, fontSize: 13, color: "#64748B" },
  value: { flex: 1, fontSize: 13, color: "#1E293B", fontWeight: "500" },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  messageBtn: {
    marginTop: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: BRAND,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  messageBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtnText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
});
