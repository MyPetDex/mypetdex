import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  ActivityIndicator, Linking, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { useState, useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { db } from "@/lib/firebase";
import {
  collection, query, where, orderBy, getDocs,
  addDoc, serverTimestamp,
} from "firebase/firestore";

const BRAND = "#4486F4";
const TEXT = "#0F172A";
const TEXT2 = "#64748B";
const BG = "#F4F6FB";

type Review = {
  id: string;
  userId: string;
  clientName: string;
  rating: number;
  text: string;
  published: boolean;
  createdAt: any;
};

// ── Star components ────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Ionicons
            name={n <= value ? "star" : "star-outline"}
            size={30}
            color={n <= value ? "#F59E0B" : "#D1D5DB"}
          />
        </Pressable>
      ))}
    </View>
  );
}

function StarRow({ value, count }: { value: number; count?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= Math.round(value) ? "star" : "star-outline"}
          size={15}
          color={n <= Math.round(value) ? "#F59E0B" : "#D1D5DB"}
        />
      ))}
      <Text style={{ fontSize: 14, fontWeight: "700", color: TEXT, marginLeft: 2 }}>
        {value.toFixed(1)}
      </Text>
      {count != null && (
        <Text style={{ fontSize: 13, color: TEXT2 }}>
          ({count} review{count !== 1 ? "s" : ""})
        </Text>
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ProviderDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    serviceType?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone?: string;
    website?: string;
    address?: string;
    bio?: string;
    priceRange?: string;
    role?: string;
    color?: string;
  }>();

  const router = useRouter();
  const { user } = useAuth();
  const { profile } = useUserProfile();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myText, setMyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const {
    id, name, serviceType, city, state, zip,
    phone, website, address, bio, priceRange, color,
  } = params;

  const location = [city, state, zip].filter(Boolean).join(", ");
  const accentColor = color || BRAND;

  useEffect(() => {
    if (id) loadReviews();
  }, [id]);

  async function loadReviews() {
    setReviewsLoading(true);
    try {
      const q = query(
        collection(db, "reviews"),
        where("providerId", "==", id),
        where("published", "==", true),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review));
      setReviews(list);

      // Check if this user already submitted a review (pending or published)
      if (user) {
        const myQ = query(
          collection(db, "reviews"),
          where("providerId", "==", id),
          where("userId", "==", user.uid),
        );
        const mySnap = await getDocs(myQ);
        if (!mySnap.empty) setAlreadyReviewed(true);
      }
    } catch (e) {
      console.error("Failed to load reviews:", e);
    }
    setReviewsLoading(false);
  }

  async function submitReview() {
    if (!user || myRating === 0 || !myText.trim()) return;
    setSubmitting(true);
    try {
      const clientName =
        profile?.displayName || profile?.name || user.email?.split("@")[0] || "Pet Owner";
      await addDoc(collection(db, "reviews"), {
        userId: user.uid,
        clientName,
        providerId: id,
        providerName: name || "Provider",
        rating: myRating,
        text: myText.trim(),
        published: false,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      setAlreadyReviewed(true);
      setMyRating(0);
      setMyText("");
    } catch {
      Alert.alert("Error", "Could not submit your review. Please try again.");
    }
    setSubmitting(false);
  }

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={TEXT} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{name || "Provider"}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Provider Hero Card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroAvatar, { backgroundColor: accentColor + "20" }]}>
            <Ionicons name="business-outline" size={32} color={accentColor} />
          </View>
          <Text style={styles.heroName}>{name || "Provider"}</Text>
          {serviceType ? (
            <Text style={[styles.heroType, { color: accentColor }]}>{serviceType}</Text>
          ) : null}
          {reviews.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <StarRow value={avgRating} count={reviews.length} />
            </View>
          ) : null}
          {bio ? <Text style={styles.heroBio}>{bio}</Text> : null}
        </View>

        {/* Contact Details */}
        <View style={styles.detailCard}>
          {location ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={16} color={TEXT2} />
              <Text style={styles.detailText}>{location}</Text>
            </View>
          ) : null}
          {address ? (
            <View style={styles.detailRow}>
              <Ionicons name="map-outline" size={16} color={TEXT2} />
              <Text style={styles.detailText}>{address}</Text>
            </View>
          ) : null}
          {phone ? (
            <Pressable
              style={styles.detailRow}
              onPress={() => Linking.openURL(`tel:${phone.replace(/\D/g, "")}`)}
            >
              <Ionicons name="call-outline" size={16} color={BRAND} />
              <Text style={[styles.detailText, { color: BRAND, fontWeight: "600" }]}>{phone}</Text>
            </Pressable>
          ) : null}
          {website ? (
            <Pressable
              style={styles.detailRow}
              onPress={() =>
                Linking.openURL(website.startsWith("http") ? website : `https://${website}`)
              }
            >
              <Ionicons name="globe-outline" size={16} color={BRAND} />
              <Text
                style={[styles.detailText, { color: BRAND, fontWeight: "600" }]}
                numberOfLines={1}
              >
                {website}
              </Text>
            </Pressable>
          ) : null}
          {priceRange ? (
            <View style={styles.detailRow}>
              <Ionicons name="pricetag-outline" size={16} color={TEXT2} />
              <Text style={styles.detailText}>{priceRange}</Text>
            </View>
          ) : null}
        </View>

        {/* Reviews Section */}
        <Text style={styles.sectionTitle}>Reviews</Text>

        {/* Submit a review */}
        {user && !alreadyReviewed ? (
          <View style={styles.reviewForm}>
            <Text style={styles.reviewFormTitle}>Leave a review</Text>
            <StarPicker value={myRating} onChange={setMyRating} />
            <TextInput
              style={styles.reviewInput}
              placeholder="Share your experience with this provider..."
              placeholderTextColor="#aaa"
              value={myText}
              onChangeText={setMyText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Pressable
              style={[
                styles.submitBtn,
                (myRating === 0 || !myText.trim() || submitting) && styles.submitBtnDisabled,
              ]}
              onPress={submitReview}
              disabled={myRating === 0 || !myText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Review</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        {submitted && (
          <View style={styles.notice}>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={styles.noticeText}>
              Thanks! Your review will appear after we review it — usually within 24 hours.
            </Text>
          </View>
        )}

        {alreadyReviewed && !submitted && (
          <View style={[styles.notice, { borderColor: "#DBEAFE", backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color={BRAND} />
            <Text style={[styles.noticeText, { color: "#1D4ED8" }]}>
              You've already submitted a review for this provider.
            </Text>
          </View>
        )}

        {!user && (
          <Pressable style={styles.loginPrompt} onPress={() => router.replace("/")}>
            <Text style={styles.loginPromptText}>Sign in to leave a review</Text>
            <Ionicons name="arrow-forward" size={14} color={BRAND} />
          </Pressable>
        )}

        {/* Reviews list */}
        {reviewsLoading ? (
          <ActivityIndicator color={BRAND} style={{ marginTop: 24 }} />
        ) : reviews.length === 0 ? (
          <View style={styles.emptyReviews}>
            <Ionicons name="chatbubble-ellipses-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No reviews yet</Text>
            <Text style={styles.emptySub}>Be the first to share your experience!</Text>
          </View>
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={styles.reviewCard}>
              <View style={styles.reviewTop}>
                <View style={styles.reviewAvatar}>
                  <Text style={styles.reviewAvatarText}>
                    {(r.clientName || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewerName}>{r.clientName || "Pet Owner"}</Text>
                  <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Ionicons
                        key={n}
                        name={n <= r.rating ? "star" : "star-outline"}
                        size={13}
                        color={n <= r.rating ? "#F59E0B" : "#D1D5DB"}
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          ))
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // Header
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
    marginHorizontal: 8,
  },

  // Content
  content: { paddingBottom: 60 },

  // Hero card
  heroCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#eee",
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroName: { fontSize: 22, fontWeight: "700", color: TEXT, textAlign: "center" },
  heroType: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  heroBio: {
    fontSize: 14,
    color: TEXT2,
    textAlign: "center",
    lineHeight: 21,
    marginTop: 14,
  },

  // Detail card
  detailCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 0.5,
    borderColor: "#eee",
  },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  detailText: { fontSize: 14, color: TEXT2, flex: 1 },

  // Section title
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: TEXT2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
    paddingHorizontal: 20,
  },

  // Review form
  reviewForm: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 0.5,
    borderColor: "#eee",
    marginBottom: 12,
  },
  reviewFormTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  reviewInput: {
    backgroundColor: BG,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: TEXT,
    minHeight: 90,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
  },
  submitBtn: {
    backgroundColor: BRAND,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { backgroundColor: "#CBD5E1" },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  // Notices
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: "#BBF7D0",
  },
  noticeText: { fontSize: 13, color: "#166534", flex: 1, lineHeight: 19 },

  // Login prompt
  loginPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: BRAND + "12",
    borderRadius: 12,
    padding: 14,
  },
  loginPromptText: { fontSize: 14, color: BRAND, fontWeight: "600" },

  // Empty reviews
  emptyReviews: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#94A3B8" },
  emptySub: { fontSize: 13, color: "#CBD5E1" },

  // Review cards
  reviewCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
    borderWidth: 0.5,
    borderColor: "#eee",
  },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  reviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BRAND + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: { fontSize: 15, fontWeight: "700", color: BRAND },
  reviewerName: { fontSize: 14, fontWeight: "700", color: TEXT },
  reviewText: { fontSize: 14, color: TEXT2, lineHeight: 21 },
});
