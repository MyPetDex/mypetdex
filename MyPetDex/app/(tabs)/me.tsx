import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Switch, Modal,
  Share, Linking, Platform, Alert, Image,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt from "@/components/UpgradePrompt";
import { db, webAuth, webDb, callFunction } from "@/lib/firebase";
import { collection, onSnapshot, doc, deleteDoc, getDocs } from "firebase/firestore";
import * as WebBrowser from "expo-web-browser";

const BRAND = "#4C6EF5";
const BG = "#F4F6FB";
const TEXT = "#0F172A";
const TEXT2 = "#64748B";

type MeTab = "pets" | "settings";

const APP_URL = "https://apps.apple.com/app/mypetdex/id6772248051";
const APP_MESSAGE = "🐾 Check out MyPetDex — the ultimate pet care app! Track health records, get AI advice, find local services & adopt pets near you.";

export default function MeScreen() {
  const [activeTab, setActiveTab] = useState<MeTab>("pets");
  const { user, signOut } = useAuth();
  const { plan, maxPets } = usePlan();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/sign-in");
  }
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackSubject, setFeedbackSubject] = useState("General Feedback");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      collection(db, "users", user.uid, "pets"),
      (snap) => {
        setPets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user]);

  const filtered = pets.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddPet() {
    if (pets.length >= maxPets) {
      setShowUpgrade(true);
    } else {
      router.push("/pet/add");
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "Are you sure? This permanently deletes your account and all pet data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDeleteAccount },
      ]
    );
  }

  async function confirmDeleteAccount() {
    const u = webAuth.currentUser;
    if (!u) return;
    setDeleting(true);
    try {
      const petsSnap = await getDocs(collection(webDb, "users", u.uid, "pets"));
      await Promise.all(petsSnap.docs.map((petDoc) => deleteDoc(petDoc.ref)));
      await deleteDoc(doc(webDb, "users", u.uid));
      await u.delete();
      router.replace("/(auth)/sign-in");
    } catch (e: any) {
      if (e?.code === "auth/requires-recent-login") {
        Alert.alert("Sign In Required", "Please sign out and sign back in, then try again.");
      } else {
        Alert.alert("Error", "Could not delete account. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleShareApp() {
    try {
      await Share.share({
        message: `${APP_MESSAGE}\n\n${APP_URL}`,
        url: APP_URL,
        title: "MyPetDex — Your Pet Care App",
      });
    } catch (e) {}
  }

  function handleShareWhatsApp() {
    const msg = encodeURIComponent(`${APP_MESSAGE}\n${APP_URL}`);
    Linking.openURL(`whatsapp://send?text=${msg}`).catch(() =>
      Alert.alert("WhatsApp not installed", "Please install WhatsApp to share.")
    );
  }

  function handleShareFacebook() {
    Linking.openURL(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(APP_URL)}`);
  }

  function handleShareSMS() {
    const msg = encodeURIComponent(`${APP_MESSAGE}\n${APP_URL}`);
    Linking.openURL(`sms:?body=${msg}`);
  }

  async function sendFeedback() {
    if (!feedbackMessage.trim() || feedbackMessage.trim().length < 10) {
      Alert.alert("Too short", "Please write at least 10 characters.");
      return;
    }
    setFeedbackSending(true);
    try {
      const fn = callFunction("sendFeedback");
      await fn({ subject: feedbackSubject, message: feedbackMessage.trim() });
      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSent(false);
        setFeedbackMessage("");
        setFeedbackSubject("General Feedback");
      }, 2000);
    } catch {
      Alert.alert("Error", "Could not send feedback. Please email help@mypetdex.app directly.");
    }
    setFeedbackSending(false);
  }

  const planLabel = plan === "family" ? "Family Plan" : plan === "plus" ? "Plus Plan" : "Free Plan";
  const planColor = plan === "family" ? "#F59E0B" : plan === "plus" ? BRAND : "#888";

  const FEEDBACK_SUBJECTS = ["General Feedback", "Bug Report", "Feature Request", "Account Issue", "Other"];

  return (
    <View style={styles.container}>
      <UpgradePrompt
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature={`More than ${maxPets} pet${maxPets === 1 ? "" : "s"}`}
        requiredPlan="plus"
      />

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleBtn, activeTab === "pets" && styles.toggleBtnActive]}
          onPress={() => setActiveTab("pets")}
        >
          <Text style={[styles.toggleText, activeTab === "pets" && styles.toggleTextActive]}>
            🐾 My Pets
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, activeTab === "settings" && styles.toggleBtnActive]}
          onPress={() => setActiveTab("settings")}
        >
          <Text style={[styles.toggleText, activeTab === "settings" && styles.toggleTextActive]}>
            ⚙️ Settings
          </Text>
        </Pressable>
      </View>

      {activeTab === "pets" && (
        <View style={{ flex: 1 }}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search pets..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          {loading ? (
            <ActivityIndicator color={BRAND} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={styles.list}>
              {filtered.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>🐾</Text>
                  <Text style={styles.emptyTitle}>No pets yet</Text>
                  <Text style={styles.emptySub}>Add your first pet to get started</Text>
                </View>
              ) : (
                filtered.map((pet) => (
                  <Pressable
                    key={pet.id}
                    style={styles.card}
                    onPress={() => router.push(`/pet/${pet.id}`)}
                  >
                    <View style={styles.avatar}>
                      {pet.photoURL ? (
                        <Image source={{ uri: pet.photoURL }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarEmoji}>
                          {pet.species === "cat" ? "🐱" : "🐶"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name}>{pet.name}</Text>
                      <Text style={styles.breed}>{pet.breed || pet.species}</Text>
                      <View style={styles.tags}>
                        {pet.age != null && pet.age !== "" ? (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>Age: {pet.age}</Text>
                          </View>
                        ) : null}
                        {pet.weight != null && pet.weight !== "" ? (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>{pet.weight} {pet.weightUnit || "lbs"}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                ))
              )}
              <Pressable style={styles.addBtn} onPress={handleAddPet}>
                <Text style={styles.addBtnText}>+ Add New Pet</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      )}

      {activeTab === "settings" && (
        <ScrollView contentContainerStyle={styles.settingsScroll}>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>
                {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.displayName || "Pet Owner"}</Text>
              <Text style={styles.profileEmail}>{user?.email || ""}</Text>
              <View style={[styles.planBadge, { backgroundColor: planColor + "20" }]}>
                <Text style={[styles.planBadgeText, { color: planColor }]}>{planLabel}</Text>
              </View>
            </View>
          </View>

          {plan === "free" ? (
            <Pressable
              style={styles.upgradeCard}
              onPress={() => router.push("/settings/subscription")}
            >
              <View>
                <Text style={styles.upgradeCardTitle}>⬆️ Upgrade Your Plan</Text>
                <Text style={styles.upgradeCardSub}>Plus $2.99/mo · Family $4.99/mo</Text>
              </View>
              <Text style={styles.upgradeCardArrow}>›</Text>
            </Pressable>
          ) : (
            <View style={styles.manageCard}>
              <View style={styles.manageCardLeft}>
                <Text style={styles.manageCardTitle}>
                  {plan === "family" ? "👨‍👩‍👧 Family Plan" : "⭐ Plus Plan"}
                </Text>
                <Text style={styles.manageCardSub}>
                  {plan === "family" ? "Unlimited pets · All features" : "3 pets · AI · Recipes"}
                </Text>
              </View>
              <Pressable
                style={styles.manageBtn}
                onPress={() => {
                  Linking.openURL("itms-apps://apps.apple.com/account/subscriptions").catch(() =>
                    Linking.openURL("https://apps.apple.com/account/subscriptions")
                  );
                }}
              >
                <Text style={styles.manageBtnText}>Manage</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.settingsSectionTitle}>Share MyPetDex</Text>
          <View style={styles.shareCard}>
            <Text style={styles.shareTitle}>❤️ Love MyPetDex?</Text>
            <Text style={styles.shareSub}>Share it with friends and family who have pets!</Text>
            <Pressable style={styles.shareMainBtn} onPress={handleShareApp}>
              <Text style={styles.shareMainBtnText}>📤 Share App</Text>
            </Pressable>
            <View style={styles.shareRow}>
              <Pressable style={styles.shareBtn} onPress={handleShareWhatsApp}>
                <Text style={styles.shareBtnEmoji}>💬</Text>
                <Text style={styles.shareBtnText}>WhatsApp</Text>
              </Pressable>
              <Pressable style={[styles.shareBtn, styles.shareBtnFacebook]} onPress={handleShareFacebook}>
                <Text style={styles.shareBtnEmoji}>📘</Text>
                <Text style={styles.shareBtnText}>Facebook</Text>
              </Pressable>
              <Pressable style={[styles.shareBtn, styles.shareBtnSMS]} onPress={handleShareSMS}>
                <Text style={styles.shareBtnEmoji}>💬</Text>
                <Text style={styles.shareBtnText}>SMS</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.settingsSectionTitle}>Notifications</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingsRow}>
              <Text style={styles.settingsRowLabel}>Push notifications</Text>
              <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: BRAND }} />
            </View>
            <View style={[styles.settingsRow, styles.settingsRowLast]}>
              <Text style={styles.settingsRowLabel}>Vaccine reminders</Text>
              <Switch value={reminders} onValueChange={setReminders} trackColor={{ true: BRAND }} />
            </View>
          </View>

          <Text style={styles.settingsSectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            {[
              { label: "Privacy Policy", icon: "🔒", onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/privacy.html") },
              { label: "Terms of Service", icon: "📄", onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/terms.html") },
              { label: "Rate MyPetDex", icon: "⭐", onPress: () => Linking.openURL("https://apps.apple.com/app/mypetdex/id6772248051?action=write-review") },
            ].map((item, i, arr) => (
              <Pressable
                key={item.label}
                style={[styles.settingsRow, i === arr.length - 1 && styles.settingsRowLast]}
                onPress={item.onPress}
              >
                <Text style={styles.settingsRowIcon}>{item.icon}</Text>
                <Text style={styles.settingsRowLabel}>{item.label}</Text>
                <Text style={styles.settingsChevron}>›</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.settingsSectionTitle}>Support</Text>
          <Pressable style={styles.feedbackBtn} onPress={() => setShowFeedback(true)}>
            <Text style={styles.feedbackBtnEmoji}>💬</Text>
            <View style={styles.feedbackBtnInfo}>
              <Text style={styles.feedbackBtnTitle}>Send Feedback</Text>
              <Text style={styles.feedbackBtnSub}>Bug reports, suggestions or questions</Text>
            </View>
            <Text style={styles.settingsChevron}>›</Text>
          </Pressable>

          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

          <Pressable
            style={[styles.deleteBtn, deleting && { opacity: 0.6 }]}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <Text style={styles.deleteBtnText}>{deleting ? "Deleting…" : "Delete Account"}</Text>
          </Pressable>

          <Text style={styles.version}>MyPetDex v1.0.0 · help@mypetdex.app</Text>
        </ScrollView>
      )}

      <Modal
        visible={showFeedback}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFeedback(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>💬 Send Feedback</Text>
            <Pressable onPress={() => setShowFeedback(false)}>
              <Text style={styles.modalClose}>Cancel</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {feedbackSent ? (
              <View style={styles.sentBox}>
                <Text style={styles.sentEmoji}>✅</Text>
                <Text style={styles.sentTitle}>Thank you!</Text>
                <Text style={styles.sentSub}>We'll get back to you at {user?.email}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalLabel}>Subject</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectRow}>
                  {FEEDBACK_SUBJECTS.map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.subjectChip, feedbackSubject === s && styles.subjectChipActive]}
                      onPress={() => setFeedbackSubject(s)}
                    >
                      <Text style={[styles.subjectChipText, feedbackSubject === s && styles.subjectChipTextActive]}>
                        {s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.modalLabel}>Your Message</Text>
                <TextInput
                  style={styles.modalTextarea}
                  value={feedbackMessage}
                  onChangeText={setFeedbackMessage}
                  placeholder="Describe your issue, suggestion or question... (min 10 characters)"
                  placeholderTextColor="#aaa"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
                <Text style={styles.modalHint}>We'll reply to {user?.email}</Text>
                <Pressable
                  style={[styles.sendBtn, (feedbackSending || feedbackMessage.trim().length < 10) && { opacity: 0.5 }]}
                  onPress={sendFeedback}
                  disabled={feedbackSending || feedbackMessage.trim().length < 10}
                >
                  {feedbackSending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>Send Feedback →</Text>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  // ── Tab toggle ───────────────────────────────────────────────────────
  toggleRow: { flexDirection: "row", margin: 16, marginBottom: 8, backgroundColor: "#E8EAF2", borderRadius: 16, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  toggleBtnActive: { backgroundColor: BRAND, shadowColor: BRAND, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  toggleText: { fontSize: 14, fontWeight: "600", color: TEXT2 },
  toggleTextActive: { color: "#fff", fontWeight: "700" },
  // ── Pets sub-tab ─────────────────────────────────────────────────────
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginVertical: 8, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: TEXT },
  list: { padding: 16, paddingTop: 8, gap: 12 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 20, padding: 36, alignItems: "center", gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: TEXT },
  emptySub: { fontSize: 14, color: TEXT2, textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#EDE9FE", alignItems: "center", justifyContent: "center", marginRight: 14, overflow: "hidden", borderWidth: 2.5, borderColor: BRAND + "25" },
  avatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarEmoji: { fontSize: 34 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: TEXT },
  breed: { fontSize: 13, color: TEXT2, marginTop: 2 },
  tags: { flexDirection: "row", gap: 6, marginTop: 8 },
  tag: { backgroundColor: "#EDE9FE", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: "#7C3AED", fontWeight: "600" },
  chevron: { fontSize: 22, color: "#C7D2E8" },
  addBtn: { backgroundColor: BRAND, borderRadius: 16, paddingVertical: 15, alignItems: "center", marginTop: 4, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  // ── Settings sub-tab ─────────────────────────────────────────────────
  settingsScroll: { padding: 16, paddingBottom: 48, gap: 8 },
  profileCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: BRAND + "35" },
  profileAvatarText: { fontSize: 26, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 17, fontWeight: "700", color: TEXT },
  profileEmail: { fontSize: 13, color: TEXT2 },
  planBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  planBadgeText: { fontSize: 12, fontWeight: "700" },
  upgradeCard: { backgroundColor: BRAND, borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4 },
  upgradeCardTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  upgradeCardSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  upgradeCardArrow: { fontSize: 26, color: "#fff" },
  manageCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: BRAND + "44", marginBottom: 8 },
  manageCardLeft: { flex: 1 },
  manageCardTitle: { fontSize: 15, fontWeight: "700", color: TEXT },
  manageCardSub: { fontSize: 12, color: TEXT2, marginTop: 2 },
  manageBtn: { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  manageBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  shareCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, gap: 12, marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  shareTitle: { fontSize: 16, fontWeight: "700", color: TEXT },
  shareSub: { fontSize: 13, color: TEXT2 },
  shareMainBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 14, alignItems: "center", shadowColor: BRAND, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  shareMainBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  shareRow: { flexDirection: "row", gap: 8 },
  shareBtn: { flex: 1, backgroundColor: "#25D366", borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 4 },
  shareBtnFacebook: { backgroundColor: "#1877F2" },
  shareBtnSMS: { backgroundColor: "#475569" },
  shareBtnEmoji: { fontSize: 18 },
  shareBtnText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  settingsSectionTitle: { fontSize: 11, fontWeight: "700", color: TEXT2, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 4, marginTop: 14, marginBottom: 6 },
  settingsCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  settingsRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F0F2F8", gap: 12 },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsRowIcon: { fontSize: 18 },
  settingsRowLabel: { flex: 1, fontSize: 15, color: TEXT },
  settingsChevron: { fontSize: 20, color: "#C7D2E8" },
  feedbackBtn: { backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  feedbackBtnEmoji: { fontSize: 24 },
  feedbackBtnInfo: { flex: 1 },
  feedbackBtnTitle: { fontSize: 15, fontWeight: "600", color: TEXT },
  feedbackBtnSub: { fontSize: 12, color: TEXT2, marginTop: 2 },
  signOutBtn: { backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#FECDD3", marginTop: 12 },
  signOutText: { fontSize: 16, fontWeight: "600", color: "#E53935" },
  deleteBtn: { backgroundColor: "#E53935", borderRadius: 16, padding: 16, alignItems: "center", marginTop: 10 },
  deleteBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  version: { textAlign: "center", fontSize: 12, color: "#C0C8D8", marginTop: 16 },
  // ── Feedback modal ───────────────────────────────────────────────────
  modalContainer: { flex: 1, backgroundColor: BG },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 24, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F0F2F8" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: TEXT },
  modalClose: { fontSize: 16, color: BRAND, fontWeight: "600" },
  modalScroll: { padding: 20, gap: 8 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: TEXT2, marginTop: 8, marginBottom: 8 },
  subjectRow: { gap: 8, paddingBottom: 4 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#ECEEF5", borderWidth: 1.5, borderColor: "transparent" },
  subjectChipActive: { backgroundColor: BRAND + "15", borderColor: BRAND },
  subjectChipText: { fontSize: 13, fontWeight: "600", color: TEXT2 },
  subjectChipTextActive: { color: BRAND },
  modalTextarea: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1.5, borderColor: "#E0E4F0", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: TEXT, minHeight: 140, marginBottom: 8 },
  modalHint: { fontSize: 12, color: "#AAB4CC", textAlign: "center" },
  sendBtn: { backgroundColor: BRAND, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 16, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sentBox: { alignItems: "center", paddingTop: 60, gap: 12 },
  sentEmoji: { fontSize: 56 },
  sentTitle: { fontSize: 22, fontWeight: "700", color: TEXT },
  sentSub: { fontSize: 14, color: TEXT2, textAlign: "center" },
});
