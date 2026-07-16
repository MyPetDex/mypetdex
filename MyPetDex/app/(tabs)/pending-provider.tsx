import { useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useRouter } from "expo-router";

const BRAND = "#4486F4";

const SERVICE_ICONS: Record<string, string> = {
  Grooming: "cut-outline",
  "Dog Walking": "footsteps-outline",
  Veterinary: "medkit-outline",
  Boarding: "home-outline",
  Training: "school-outline",
  Daycare: "people-outline",
};

export default function PendingProvider() {
  const { user, signOut } = useAuth();
  const { profile, loading } = useUserProfile();
  const router = useRouter();

  // Auto-navigate the moment admin approves — no sign-out needed
  useEffect(() => {
    if (profile?.role === "provider") {
      router.replace("/(tabs)/provider-home");
    }
  }, [profile?.role]);

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/sign-in");
  }

  async function handleContact() {
    try {
      await Linking.openURL("mailto:help@mypetdex.app?subject=Provider%20Application%20Inquiry");
    } catch {
      Alert.alert("Contact Us", "Email us at help@mypetdex.app with any questions about your application.");
    }
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={BRAND} size="large" />
      </View>
    );
  }

  const isRejected = profile?.role === "rejected_provider";
  const serviceIcon = (SERVICE_ICONS[profile?.service || ""] || "briefcase-outline") as any;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {/* Status banner */}
      <View style={[s.banner, isRejected && s.bannerRejected]}>
        <View style={[s.bannerIconWrap, isRejected && s.bannerIconWrapRejected]}>
          <Ionicons
            name={isRejected ? "close-circle-outline" : "hourglass-outline"}
            size={32}
            color={isRejected ? "#EF4444" : BRAND}
          />
        </View>
        <Text style={s.bannerTitle}>
          {isRejected ? "Application Not Approved" : "Application Under Review"}
        </Text>
        <Text style={s.bannerSub}>
          {isRejected
            ? "Unfortunately your provider application wasn't approved at this time. Please contact our support team for more information or to reapply."
            : "Our team is reviewing your provider application. You'll be able to access your provider dashboard once approved — typically within 1–2 business days."}
        </Text>
      </View>

      {/* Timeline */}
      {!isRejected && (
        <View style={s.timeline}>
          <TimelineStep icon="checkmark-circle" color="#10B981" label="Application submitted" done />
          <TimelineLine />
          <TimelineStep icon="hourglass-outline" color={BRAND} label="Admin review" active />
          <TimelineLine faded />
          <TimelineStep icon="rocket-outline" color="#94A3B8" label="Provider dashboard unlocked" faded />
        </View>
      )}
      {isRejected && (
        <View style={s.timeline}>
          <TimelineStep icon="checkmark-circle" color="#10B981" label="Application submitted" done />
          <TimelineLine />
          <TimelineStep icon="close-circle" color="#EF4444" label="Application not approved" done />
        </View>
      )}

      {/* Submitted details */}
      {profile && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Your Submitted Details</Text>

          <DetailRow icon={serviceIcon} label="Service" value={profile.service || "—"} />
          <DetailRow icon="business-outline" label="Business" value={profile.businessName || "—"} />
          <DetailRow icon="location-outline" label="Location" value={[profile.city, profile.state].filter(Boolean).join(", ") || "—"} />
          {!!profile.phone && <DetailRow icon="call-outline" label="Phone" value={profile.phone} />}
          {!!profile.website && <DetailRow icon="globe-outline" label="Website" value={profile.website} />}
          {!!profile.priceRange && <DetailRow icon="pricetag-outline" label="Price range" value={profile.priceRange} />}
          {!!profile.bio && (
            <View style={s.bioRow}>
              <Text style={s.bioLabel}>Bio</Text>
              <Text style={s.bioText}>{profile.bio}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <TouchableOpacity style={s.contactBtn} onPress={handleContact}>
        <Ionicons name="mail-outline" size={18} color={BRAND} />
        <Text style={s.contactBtnText}>{isRejected ? "Appeal or Ask a Question" : "Contact Support"}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function TimelineStep({ icon, color, label, done, active, faded }: {
  icon: string; color: string; label: string;
  done?: boolean; active?: boolean; faded?: boolean;
}) {
  return (
    <View style={s.timelineStep}>
      <View style={[s.timelineDot, { backgroundColor: faded ? "#F1F5F9" : color + "20", borderColor: faded ? "#E2E8F0" : color }]}>
        <Ionicons name={icon as any} size={16} color={faded ? "#CBD5E1" : color} />
      </View>
      <Text style={[s.timelineLabel, faded && s.timelineLabelFaded, active && s.timelineLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

function TimelineLine({ faded }: { faded?: boolean }) {
  return <View style={[s.timelineLine, faded && s.timelineLineFaded]} />;
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon as any} size={16} color="#64748B" style={s.detailIcon} />
      <Text style={s.detailLabel}>{label}:</Text>
      <Text style={s.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  banner: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  bannerIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  bannerRejected: { borderWidth: 1.5, borderColor: "#FECACA" },
  bannerIconWrapRejected: { backgroundColor: "#FEE2E2" },
  bannerTitle: { fontSize: 20, fontWeight: "800", color: "#1E293B", marginBottom: 10, textAlign: "center" },
  bannerSub: { fontSize: 14, color: "#64748B", lineHeight: 21, textAlign: "center" },

  timeline: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineLabel: { fontSize: 14, fontWeight: "600", color: "#1E293B", flex: 1 },
  timelineLabelFaded: { color: "#CBD5E1" },
  timelineLabelActive: { color: BRAND },
  timelineLine: { width: 2, height: 20, backgroundColor: "#E2E8F0", marginLeft: 17, marginVertical: 4 },
  timelineLineFaded: { backgroundColor: "#F1F5F9" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 14 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  detailIcon: { width: 18 },
  detailLabel: { fontSize: 13, color: "#64748B", width: 74 },
  detailValue: { fontSize: 13, fontWeight: "600", color: "#1E293B", flex: 1 },
  bioRow: { marginTop: 4 },
  bioLabel: { fontSize: 13, color: "#64748B", marginBottom: 4 },
  bioText: { fontSize: 13, color: "#1E293B", lineHeight: 20 },

  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  contactBtnText: { fontSize: 15, fontWeight: "700", color: BRAND },

  signOutBtn: { alignItems: "center", paddingVertical: 14 },
  signOutText: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
});
