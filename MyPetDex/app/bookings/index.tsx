import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { webDb } from "@/lib/firebase";
import {
  collection, query, where, doc, updateDoc, serverTimestamp,
  onSnapshot, getDoc,
} from "firebase/firestore";

import { bookingStatusStyle } from "@/lib/bookingStatus";

const BRAND = "#4486F4";

function canCancelBooking(booking: any, today: string) {
  return (booking.status === "pending" || booking.status === "confirmed") && booking.date >= today;
}

export default function OwnerBookingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(webDb, "bookings"), where("ownerId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((b: any) => !b.hiddenByOwner)
        .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));
      setBookings(list);
      setLoading(false);
    }, (err) => {
      console.warn("bookings listener error:", err);
      setLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    bookings.forEach((b) => {
      if ((!b.providerName || b.providerName === "Provider") && b.providerId) {
        if (!providerNames[b.providerId]) {
          getDoc(doc(webDb, "users", b.providerId)).then((snap) => {
            if (snap.exists()) {
              const d = snap.data();
              const resolved = d.businessName || d.displayName || "Provider";
              setProviderNames((prev) => ({ ...prev, [b.providerId]: resolved }));
            }
          }).catch(() => {});
        }
      }
    });
  }, [bookings]);

  async function confirmCancel(bookingId: string) {
    Alert.alert(
      "Cancel Appointment",
      "Are you sure you want to cancel this booking?",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel Booking",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(webDb, "bookings", bookingId), {
                status: "cancelled",
                cancelledAt: serverTimestamp(),
                cancelledBy: "owner",
              });
            } catch {
              Alert.alert("Error", "Could not cancel booking. Please try again.");
            }
          },
        },
      ]
    );
  }

  async function confirmDelete(bookingId: string) {
    Alert.alert(
      "Remove Booking",
      "Remove this booking from your list?",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(webDb, "bookings", bookingId), {
                hiddenByOwner: true,
              });
            } catch {
              Alert.alert("Error", "Could not remove booking.");
            }
          },
        },
      ]
    );
  }

  const upcoming = bookings.filter((b) => b.date >= today && b.status !== "cancelled");
  const past = bookings.filter((b) => b.date < today || b.status === "cancelled");

  function renderCard(b: any) {
    const colors = bookingStatusStyle(b.status);
    const cancelable = canCancelBooking(b, today);
    const isDeletable = b.status === "cancelled" || b.date < today;
    const displayProviderName = b.providerName && b.providerName !== "Provider"
      ? b.providerName
      : (providerNames[b.providerId] || "Provider");

    return (
      <Pressable key={b.id} style={s.card} onPress={() => router.push(`/bookings/${b.id}` as any)}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={s.iconWrap}>
            <Ionicons name="calendar-outline" size={22} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{b.service} · {b.petName || "Pet"}</Text>
            <Text style={s.cardSub}>
              {displayProviderName} ·{" "}
              {new Date(b.date + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric",
              })}{" "}
              at {b.timeSlot || b.time}
            </Text>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.bg }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: colors.text, textTransform: "capitalize" }}>
              {b.status}
            </Text>
          </View>
        </View>
        {cancelable && (
          <Pressable onPress={(e) => { e.stopPropagation?.(); confirmCancel(b.id); }} style={s.cancelBtn}>
            <Text style={s.cancelBtnText}>Cancel Appointment</Text>
          </Pressable>
        )}
        {isDeletable && (
          <Pressable onPress={(e) => { e.stopPropagation?.(); confirmDelete(b.id); }} style={s.deleteBtn}>
            <Text style={s.deleteBtnText}>Remove from list</Text>
          </Pressable>
        )}
      </Pressable>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {loading ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
      ) : bookings.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
          <Text style={s.emptyTitle}>No appointments yet</Text>
          <Text style={s.emptySub}>Book a service from Explore to see appointments here.</Text>
        </View>
      ) : (
        <>
          {upcoming.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Upcoming</Text>
              {upcoming.map(renderCard)}
            </>
          )}
          {past.length > 0 && (
            <>
              <Text style={[s.sectionTitle, { marginTop: 24, color: "#94A3B8" }]}>Past & Cancelled</Text>
              {past.map(renderCard)}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#4486F420",
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  cardSub: { fontSize: 13, color: "#64748B", marginTop: 2 },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center",
  },
  cancelBtnText: { color: "#EF4444", fontWeight: "600", fontSize: 14 },
  deleteBtn: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  deleteBtnText: { color: "#94A3B8", fontWeight: "600", fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#94A3B8" },
  emptySub: { fontSize: 14, color: "#CBD5E1", textAlign: "center" },
});
