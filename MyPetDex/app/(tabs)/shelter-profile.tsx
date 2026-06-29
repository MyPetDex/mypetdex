import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert,
  Share, Linking, Modal, Pressable, KeyboardAvoidingView, Platform,
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

export default function ShelterProfile() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [form, setForm] = useState({ shelterName: "", website: "", phone: "", city: "", state: "", ein: "", licenseNumber: "", description: "" });
  const router = useRouter();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    async function load() {
      const snap = await getDoc(doc(webDb, "users", user!.uid));
      if (snap.exists()) {
        const d = snap.data();
        setProfile(d);
        setForm({ shelterName: d.shelterName || "", website: d.website || "", phone: d.phone || "", city: d.city || "", state: d.state || "", ein: d.ein || "", licenseNumber: d.licenseNumber || "", description: d.description || "" });
      }
      setLoading(false);
    }
    load();
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(webDb, "users", user!.uid), form);
      setProfile((p: any) => ({ ...p, ...form }));
      setEditMode(false);
    } catch { Alert.alert("Error", "Failed to save."); }
    finally { setSaving(false); }
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
      <View style={s.header}>
        <View style={s.avatar}><Ionicons name="heart-outline" size={32} color="#fff" /></View>
        <Text style={s.name}>{profile?.shelterName || profile?.displayName || "Shelter"}</Text>
        <Text style={s.email}>{profile?.email || ""}</Text>
        <View style={[s.badge, profile?.verified ? s.badgeGreen : s.badgeOrange]}>
          <Ionicons name={profile?.verified ? "checkmark-circle" : "time-outline"} size={13} color="#fff" />
          <Text style={s.badgeText}>{profile?.verified ? "Verified Shelter" : "Pending Verification"}</Text>
        </View>
      </View>

      {editMode ? (
        <View style={s.editCard}>
          <Text style={s.editTitle}>Edit Profile</Text>
          {[
            { key: "shelterName", label: "Shelter Name", placeholder: "e.g. Second Chance Animal Shelter" },
            { key: "website", label: "Website", placeholder: "https://yourshelter.org" },
            { key: "phone", label: "Phone", placeholder: "+1 (555) 000-0000" },
            { key: "city", label: "City", placeholder: "e.g. Miami" },
            { key: "state", label: "State", placeholder: "e.g. FL" },
            { key: "ein", label: "EIN Number", placeholder: "xx-xxxxxxx" },
            { key: "licenseNumber", label: "License Number", placeholder: "e.g. NJ-2024-xxxxx" },
          ].map(f => (
            <View key={f.key}>
              <Text style={s.label}>{f.label}</Text>
              <TextInput style={s.input} value={(form as any)[f.key]} onChangeText={v => setForm(x => ({ ...x, [f.key]: v }))} placeholder={f.placeholder} />
            </View>
          ))}
          <Text style={s.label}>Description</Text>
          <TextInput style={[s.input, { height: 80 }]} value={form.description} onChangeText={v => setForm(x => ({ ...x, description: v }))} placeholder="About your shelter..." multiline />
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setEditMode(false)}><Text style={s.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={s.infoCard}>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditMode(true)}>
            <Ionicons name="pencil" size={15} color="#fff" />
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          {[
            { label: "Shelter Name", value: profile?.shelterName },
            { label: "Website", value: profile?.website },
            { label: "Phone", value: profile?.phone },
            { label: "Location", value: profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : profile?.city || profile?.state },
            { label: "EIN Number", value: profile?.ein },
            { label: "License #", value: profile?.licenseNumber },
          ].map(r => (
            <View key={r.label} style={s.row}>
              <Text style={s.rowLabel}>{r.label}</Text>
              <Text style={s.rowValue}>{r.value || "—"}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.sectionTitle}>Share MyPetDex</Text>
      <View style={s.settingsCard}>
        <TouchableOpacity style={s.menuRow} onPress={handleShareApp}>
          <Text style={s.menuIcon}>📤</Text>
          <Text style={s.menuLabel}>Share MyPetDex App</Text>
          <Ionicons name="chevron-forward" size={18} color="#ccc" />
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>Account</Text>
      <View style={s.settingsCard}>
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
      <View style={s.settingsCard}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FF" },
  content: { padding: 20, paddingBottom: 60 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  name: { fontSize: 22, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  email: { fontSize: 14, color: "#64748B", marginBottom: 10 },
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  badgeGreen: { backgroundColor: BRAND },
  badgeOrange: { backgroundColor: "#F5A623" },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  infoCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: BRAND, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, alignSelf: "flex-end", marginBottom: 12 },
  editBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  rowLabel: { fontSize: 13, color: "#64748B" },
  rowValue: { fontSize: 13, fontWeight: "600", color: "#1E293B", maxWidth: "55%", textAlign: "right" },
  editCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 20 },
  editTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1.5, borderColor: "#E2E8F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#1E293B", marginBottom: 14 },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", alignItems: "center" },
  cancelText: { color: "#64748B", fontWeight: "700" },
  saveBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: BRAND, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "700" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14 },
  signOutText: { color: "#EF4444", fontWeight: "700", fontSize: 15 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 8, marginBottom: 8 },
  settingsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 4, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  menuRowLast: { borderBottomWidth: 0 },
  menuIcon: { fontSize: 18 },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "600", color: "#1E293B" },
  deleteBtn: { backgroundColor: "#E53935", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 10 },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  version: { textAlign: "center", fontSize: 12, color: "#94A3B8", marginTop: 16, marginBottom: 8 },
  modalContainer: { flex: 1, padding: 20, paddingTop: 24, backgroundColor: "#F5F8FF" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B" },
  modalClose: { fontSize: 16, color: BRAND, fontWeight: "600" },
  feedbackInput: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", padding: 14, fontSize: 15, color: "#1E293B", minHeight: 140, marginBottom: 16 },
  sendBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  sendBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
