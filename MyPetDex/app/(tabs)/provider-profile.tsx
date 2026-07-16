import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Share, Linking, Alert, Modal, TextInput, Pressable, KeyboardAvoidingView, Platform,
} from "react-native";
import { webDb, webAuth, callFunction } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

const BRAND = "#4486F4";
const APP_URL = "https://apps.apple.com/app/mypetdex/id6772248051";
const APP_MESSAGE = "🐾 Check out MyPetDex — the ultimate pet care app! Track health records, get AI advice, find local services & adopt pets near you.";

export default function ProviderProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ businessName: "", service: "", phone: "", website: "", bio: "", priceRange: "", city: "", state: "" });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      const snap = await getDoc(doc(webDb, "users", user!.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        setEditForm({
          businessName: data.businessName || "",
          service: data.service || data.serviceType || "",
          phone: data.phone || "",
          website: data.website || "",
          bio: data.bio || "",
          priceRange: data.priceRange || "",
          city: data.city || "",
          state: data.state || "",
        });
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function handleSaveEdit() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(webDb, "users", user.uid), {
        businessName: editForm.businessName.trim(),
        service: editForm.service,
        serviceType: editForm.service,
        phone: editForm.phone.trim(),
        website: editForm.website.trim(),
        bio: editForm.bio.trim(),
        priceRange: editForm.priceRange.trim(),
        city: editForm.city.trim(),
        state: editForm.state.trim(),
      });
      setProfile((p: any) => ({ ...p, ...editForm, serviceType: editForm.service }));
      setShowEdit(false);
    } catch {
      Alert.alert("Error", "Could not save changes. Please try again.");
    }
    setSaving(false);
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/sign-in");
  }

  async function handleShareApp() {
    try {
      await Share.share({
        message: `${APP_MESSAGE}\n\n${APP_URL}`,
        url: APP_URL,
        title: "MyPetDex — Your Pet Care App",
      });
    } catch {}
  }

  async function sendFeedback() {
    if (!feedbackMessage.trim() || feedbackMessage.trim().length < 10) {
      Alert.alert("Too short", "Please write at least 10 characters.");
      return;
    }
    setFeedbackSending(true);
    try {
      const fn = callFunction("sendFeedback");
      await fn({ subject: "General Feedback", message: feedbackMessage.trim() });
      setFeedbackMessage("");
      setShowFeedback(false);
      Alert.alert("Thank you!", "Your feedback has been sent.");
    } catch {
      Alert.alert("Error", "Could not send feedback. Please email help@mypetdex.app directly.");
    }
    setFeedbackSending(false);
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "Are you sure? This permanently deletes your account and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDeleteAccount },
      ],
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

  if (loading) return <View style={s.center}><ActivityIndicator color={BRAND} size="large" /></View>;

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{(profile?.businessName || profile?.displayName || "P").charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={s.name}>{profile?.businessName || profile?.displayName || "Provider"}</Text>
      <Text style={s.email}>{profile?.email || ""}</Text>

      <View style={[s.badge, profile?.verified ? s.badgeGreen : s.badgeOrange]}>
        <Ionicons name={profile?.verified ? "checkmark-circle" : "time-outline"} size={14} color="#fff" />
        <Text style={s.badgeText}>{profile?.verified ? "Verified Provider" : "Pending Verification"}</Text>
      </View>

      <TouchableOpacity style={s.editBtn} onPress={() => setShowEdit(true)}>
        <Ionicons name="pencil-outline" size={16} color={BRAND} />
        <Text style={s.editBtnText}>Edit Profile</Text>
      </TouchableOpacity>

      <View style={s.card}>
        <Row icon="briefcase-outline" label="Service Type" value={profile?.service || profile?.serviceType} />
        <Row icon="location-outline" label="Location" value={profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : profile?.city || profile?.state} />
        <Row icon="call-outline" label="Phone" value={profile?.phone} />
        <Row icon="globe-outline" label="Website" value={profile?.website} />
        <Row icon="star-outline" label="Google Reviews" value={profile?.googleReviewUrl ? "Linked" : "Not linked"} />
        <Row icon="pricetag-outline" label="Price Range" value={profile?.priceRange} />
      </View>

      <Text style={s.sectionTitle}>Share MyPetDex</Text>
      <View style={s.card}>
        <TouchableOpacity style={s.menuRow} onPress={handleShareApp}>
          <Text style={s.menuIcon}>📤</Text>
          <Text style={s.menuLabel}>Share MyPetDex App</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Account</Text>
      <View style={s.card}>
        {[
          { icon: "🔒", label: "Privacy Policy", onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/privacy.html") },
          { icon: "📄", label: "Terms of Service", onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/terms.html") },
          { icon: "⭐", label: "Rate MyPetDex", onPress: () => Linking.openURL("https://apps.apple.com/app/mypetdex/id6772248051?action=write-review") },
        ].map((item, i, arr) => (
          <TouchableOpacity
            key={item.label}
            style={[s.menuRow, i === arr.length - 1 && s.menuRowLast]}
            onPress={item.onPress}
          >
            <Text style={s.menuIcon}>{item.icon}</Text>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.sectionTitle}>Support</Text>
      <View style={s.card}>
        <TouchableOpacity style={[s.menuRow, s.menuRowLast]} onPress={() => setShowFeedback(true)}>
          <Text style={s.menuIcon}>💬</Text>
          <Text style={s.menuLabel}>Send Feedback</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        <Text style={s.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[s.deleteBtn, deleting && { opacity: 0.6 }]}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        <Text style={s.deleteBtnText}>{deleting ? "Deleting…" : "Delete Account"}</Text>
      </TouchableOpacity>

      <Text style={s.version}>MyPetDex v1.0.0 · help@mypetdex.app</Text>

      {/* ── Edit Profile Modal ─────────────────────────────────── */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView style={s.modalContainer} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setShowEdit(false)}>
                <Text style={s.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            {[
              { label: "Business Name", key: "businessName", placeholder: "Your business name" },
              { label: "Phone", key: "phone", placeholder: "+1 (555) 000-0000" },
              { label: "Website", key: "website", placeholder: "https://yoursite.com" },
              { label: "Price Range", key: "priceRange", placeholder: "e.g. $30–$60" },
              { label: "City", key: "city", placeholder: "City" },
              { label: "State", key: "state", placeholder: "e.g. NJ" },
            ].map(field => (
              <View key={field.key} style={{ marginBottom: 14 }}>
                <Text style={s.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={s.fieldInput}
                  value={(editForm as any)[field.key]}
                  onChangeText={v => setEditForm(f => ({ ...f, [field.key]: v }))}
                  placeholder={field.placeholder}
                  placeholderTextColor="#aaa"
                />
              </View>
            ))}
            <View style={{ marginBottom: 14 }}>
              <Text style={s.fieldLabel}>Bio</Text>
              <TextInput
                style={[s.fieldInput, { height: 100, textAlignVertical: "top" }]}
                value={editForm.bio}
                onChangeText={v => setEditForm(f => ({ ...f, bio: v }))}
                placeholder="Tell clients about your services..."
                placeholderTextColor="#aaa"
                multiline
              />
            </View>
            <Pressable
              style={[s.sendBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveEdit}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.sendBtnText}>Save Changes</Text>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showFeedback} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowFeedback(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Send Feedback</Text>
              <Pressable onPress={() => setShowFeedback(false)}>
                <Text style={s.modalClose}>Cancel</Text>
              </Pressable>
            </View>
            <TextInput
              style={s.feedbackInput}
              multiline
              numberOfLines={6}
              placeholder="Describe your issue, suggestion or question... (min 10 characters)"
              placeholderTextColor="#aaa"
              value={feedbackMessage}
              onChangeText={setFeedbackMessage}
              textAlignVertical="top"
              autoFocus
            />
            <Pressable
              style={[s.sendBtn, (feedbackSending || feedbackMessage.trim().length < 10) && { opacity: 0.5 }]}
              onPress={sendFeedback}
              disabled={feedbackSending || feedbackMessage.trim().length < 10}
            >
              {feedbackSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.sendBtnText}>Send Feedback →</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon as any} size={18} color="#64748B" />
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 60, alignItems: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  name: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  email: { fontSize: 14, color: "#64748B", marginBottom: 12 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 24 },
  badgeGreen: { backgroundColor: BRAND },
  badgeOrange: { backgroundColor: "#F5A623" },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 4, width: "100%", marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowLabel: { flex: 1, fontSize: 14, color: "#64748B" },
  rowValue: { fontSize: 14, fontWeight: "600", color: "#1E293B", maxWidth: "50%", textAlign: "right" },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  signOutText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, alignSelf: "flex-start", width: "100%", marginTop: 8, marginBottom: 8 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1E293B" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: BRAND, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24 },
  editBtnText: { color: BRAND, fontWeight: "700", fontSize: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldInput: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 15, color: "#1E293B" },
  deleteBtn: { backgroundColor: "#E53935", borderRadius: 14, padding: 16, alignItems: "center", width: "100%", marginTop: 10 },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  version: { textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 16 },
  modalContainer: { flex: 1, padding: 20, paddingTop: 24, backgroundColor: "#F5F8FF" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
  modalClose: { fontSize: 16, color: BRAND, fontWeight: "600" },
  feedbackInput: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 14, fontSize: 15, color: "#1E293B", minHeight: 140, marginBottom: 16 },
  sendBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
