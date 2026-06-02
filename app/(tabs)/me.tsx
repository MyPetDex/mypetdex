import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, ActivityIndicator, Switch, Modal,
  Share, Linking, Platform, Alert,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import UpgradePrompt from "@/components/UpgradePrompt";
import { isWeb, webDb } from "@/lib/firebase";
import { collection as webCollection, onSnapshot as webOnSnapshot } from "firebase/firestore";
import _nativeFirestore from "@react-native-firebase/firestore";

const BRAND = "#4CAF82";
const BLUE = "#4486F4";

type MeTab = "pets" | "settings";

const APP_URL = "https://apps.apple.com/app/mypetdex/id6772248051";
const APP_MESSAGE = "🐾 Check out MyPetDex — the ultimate pet care app! Track health records, get AI advice, find local services & adopt pets near you.";

export default function MeScreen() {
  const [activeTab, setActiveTab] = useState<MeTab>("pets");
  const { user, signOut, isDemoMode } = useAuth();
  const { plan, maxPets } = usePlan();
  const router = useRouter();
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

  useEffect(() => {
    if (!user) return;

    const handleErr = () => setLoading(false);

    if (isWeb) {
      const ref = webCollection(webDb, "users", user.uid, "pets");
      const unsub = webOnSnapshot(ref, (snap) => {
        setPets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }, handleErr);
      return unsub;
    } else {
      const unsub = _nativeFirestore()
        .collection("users")
        .doc(user.uid)
        .collection("pets")
        .onSnapshot(
          (snap: any) => {
            setPets(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
            setLoading(false);
          },
          handleErr
        );
      return unsub;
    }
  }, [user]);

  const filtered = pets.filter((p) =>
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  function handleAddPet() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to add pets and save your data."); return; }
    if (pets.length >= maxPets) {
      setShowUpgrade(true);
    } else {
      router.push("/pet/add");
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
      const subject = encodeURIComponent(`[MyPetDex Feedback] ${feedbackSubject}`);
      const body = encodeURIComponent(
        `From: ${user?.displayName || "User"} (${user?.email})\n\nSubject: ${feedbackSubject}\n\n${feedbackMessage}`
      );
      await Linking.openURL(`mailto:help@mypetdex.app?subject=${subject}&body=${body}`);
      setFeedbackSent(true);
      setTimeout(() => {
        setShowFeedback(false);
        setFeedbackSent(false);
        setFeedbackMessage("");
        setFeedbackSubject("General Feedback");
      }, 2000);
    } catch {
      Alert.alert("Error", "Could not open mail app. Please email help@mypetdex.app directly.");
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
                      <Text style={styles.avatarEmoji}>
                        {pet.species === "cat" ? "🐱" : "🐶"}
                      </Text>
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.name}>{pet.name}</Text>
                      <Text style={styles.breed}>{pet.breed || pet.species}</Text>
                      <View style={styles.tags}>
                        {pet.age && (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>Age: {pet.age}</Text>
                          </View>
                        )}
                        {pet.weight && (
                          <View style={styles.tag}>
                            <Text style={styles.tagText}>{pet.weight} {pet.weightUnit || "lbs"}</Text>
                          </View>
                        )}
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
              <Switch value={notifications} onValueChange={(v) => { if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to manage your settings."); return; } setNotifications(v); }} trackColor={{ true: BRAND }} />
            </View>
            <View style={[styles.settingsRow, styles.settingsRowLast]}>
              <Text style={styles.settingsRowLabel}>Vaccine reminders</Text>
              <Switch value={reminders} onValueChange={(v) => { if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to manage your settings."); return; } setReminders(v); }} trackColor={{ true: BRAND }} />
            </View>
          </View>

          <Text style={styles.settingsSectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            {[
              { label: "Privacy Policy", icon: "🔒" },
              { label: "Terms of Service", icon: "📄" },
              { label: "Rate MyPetDex", icon: "⭐" },
            ].map((item, i, arr) => (
              <Pressable
                key={item.label}
                style={[styles.settingsRow, i === arr.length - 1 && styles.settingsRowLast]}
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

          <Pressable style={styles.signOutBtn} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
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
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  toggleRow: { flexDirection: "row", margin: 16, marginBottom: 8, backgroundColor: "#F0F0F0", borderRadius: 14, padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  toggleBtnActive: { backgroundColor: BRAND },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#fff", fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginVertical: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: "#eee" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  list: { padding: 16, paddingTop: 8, gap: 12 },
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 32, alignItems: "center", gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#1a1a1a" },
  emptySub: { fontSize: 14, color: "#888", textAlign: "center" },
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center" },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: "#f0f8f4", alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatarEmoji: { fontSize: 32 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  breed: { fontSize: 13, color: "#888", marginTop: 2 },
  tags: { flexDirection: "row", gap: 6, marginTop: 8 },
  tag: { backgroundColor: "#f0f8f4", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: BRAND, fontWeight: "500" },
  chevron: { fontSize: 22, color: "#ccc" },
  addBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  settingsScroll: { padding: 16, paddingBottom: 48, gap: 8 },
  profileCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 24, fontWeight: "700", color: "#fff" },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 17, fontWeight: "700", color: "#1a1a1a" },
  profileEmail: { fontSize: 13, color: "#888" },
  planBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  planBadgeText: { fontSize: 12, fontWeight: "700" },
  upgradeCard: { backgroundColor: BRAND + "15", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: BRAND + "33", marginBottom: 8 },
  upgradeCardTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  upgradeCardSub: { fontSize: 12, color: "#666", marginTop: 2 },
  upgradeCardArrow: { fontSize: 22, color: BRAND },
  manageCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1.5, borderColor: BRAND + "44", marginBottom: 8 },
  manageCardLeft: { flex: 1 },
  manageCardTitle: { fontSize: 15, fontWeight: "700", color: "#1a1a1a" },
  manageCardSub: { fontSize: 12, color: "#888", marginTop: 2 },
  manageBtn: { backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  manageBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  shareCard: { backgroundColor: "#fff", borderRadius: 16, padding: 18, gap: 12, marginBottom: 4 },
  shareTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  shareSub: { fontSize: 13, color: "#888" },
  shareMainBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  shareMainBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  shareRow: { flexDirection: "row", gap: 8 },
  shareBtn: { flex: 1, backgroundColor: "#25D366", borderRadius: 12, paddingVertical: 10, alignItems: "center", gap: 4 },
  shareBtnFacebook: { backgroundColor: "#1877F2" },
  shareBtnSMS: { backgroundColor: "#555" },
  shareBtnEmoji: { fontSize: 18 },
  shareBtnText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  settingsSectionTitle: { fontSize: 12, fontWeight: "700", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 4, marginTop: 12, marginBottom: 6 },
  settingsCard: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", marginBottom: 4 },
  settingsRow: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 12 },
  settingsRowLast: { borderBottomWidth: 0 },
  settingsRowIcon: { fontSize: 18 },
  settingsRowLabel: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  settingsChevron: { fontSize: 20, color: "#ccc" },
  feedbackBtn: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 4 },
  feedbackBtnEmoji: { fontSize: 24 },
  feedbackBtnInfo: { flex: 1 },
  feedbackBtnTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  feedbackBtnSub: { fontSize: 12, color: "#888", marginTop: 2 },
  signOutBtn: { backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#ffcccc", marginTop: 12 },
  signOutText: { fontSize: 16, fontWeight: "600", color: "#E53935" },
  version: { textAlign: "center", fontSize: 12, color: "#bbb", marginTop: 16 },
  modalContainer: { flex: 1, backgroundColor: "#f8f8f8" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingTop: 24, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  modalClose: { fontSize: 16, color: BLUE, fontWeight: "600" },
  modalScroll: { padding: 20, gap: 8 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 8, marginBottom: 8 },
  subjectRow: { gap: 8, paddingBottom: 4 },
  subjectChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F0F0F0", borderWidth: 1.5, borderColor: "transparent" },
  subjectChipActive: { backgroundColor: BRAND + "15", borderColor: BRAND },
  subjectChipText: { fontSize: 13, fontWeight: "600", color: "#666" },
  subjectChipTextActive: { color: BRAND },
  modalTextarea: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1, borderColor: "#E5E5E5", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#1a1a1a", minHeight: 140, marginBottom: 8 },
  modalHint: { fontSize: 12, color: "#aaa", textAlign: "center" },
  sendBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  sentBox: { alignItems: "center", paddingTop: 60, gap: 12 },
  sentEmoji: { fontSize: 56 },
  sentTitle: { fontSize: 22, fontWeight: "700", color: "#1a1a1a" },
  sentSub: { fontSize: 14, color: "#888", textAlign: "center" },
});
