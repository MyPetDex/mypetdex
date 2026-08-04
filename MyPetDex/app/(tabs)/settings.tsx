import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Linking, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import * as WebBrowser from "expo-web-browser";
import { auth, db, webAuth, webDb } from "@/lib/firebase";
import { doc, deleteDoc, collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

const BRAND = "#4C6EF5";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const isPasswordUser = !!auth.currentUser?.providerData?.some((p) => p.providerId === "password");

  function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "Are you sure? This cannot be undone.",
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
        Alert.alert("Error", "Could not delete your account. Please try again.");
      }
      console.error("Delete account failed:", e);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSendFeedback() {
    if (!feedbackText.trim() || feedbackText.trim().length < 10) {
      Alert.alert("Too short", "Please write at least 10 characters.");
      return;
    }
    setFeedbackSending(true);
    try {
      await addDoc(collection(db, "feedback"), {
        message: feedbackText.trim(),
        subject: "General Feedback",
        uid: auth.currentUser?.uid ?? "anonymous",
        email: auth.currentUser?.email ?? "",
        createdAt: serverTimestamp(),
      });
      setFeedbackText("");
      setFeedbackVisible(false);
      Alert.alert("Thank you!", "Your feedback has been sent.");
    } catch {
      Alert.alert("Error", "Could not send feedback. Please email help@mypetdex.app");
    } finally {
      setFeedbackSending(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters.");
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      Alert.alert("Error", 'Password must include at least one special character (e.g. @, #, !)');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    try {
      const currentUser = auth.currentUser!;
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      Alert.alert("Success", "Your password has been updated.");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        Alert.alert("Error", "Current password is incorrect.");
      } else {
        Alert.alert("Error", "Could not update password. Please try again.");
      }
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Feedback Modal */}
      <Modal visible={feedbackVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFeedbackVisible(false)}>
        <KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Feedback</Text>
              <Pressable onPress={() => setFeedbackVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>We read every message. What's on your mind?</Text>
            <TextInput
              style={styles.feedbackInput}
              multiline
              numberOfLines={6}
              placeholder="Tell us what you love, what's broken, or what you'd like to see..."
              placeholderTextColor="#aaa"
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
              autoFocus
            />
            <Pressable
              style={[styles.sendBtn, feedbackSending && { opacity: 0.6 }]}
              onPress={handleSendFeedback}
              disabled={feedbackSending}
            >
              <Text style={styles.sendBtnText}>{feedbackSending ? "Sending…" : "Send Feedback"}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={showChangePassword} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowChangePassword(false)}>
        <KeyboardAvoidingView style={{ flexShrink: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowChangePassword(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.fieldLabel}>Current Password</Text>
            <TextInput
              style={styles.passwordInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>New Password</Text>
            <TextInput
              style={styles.passwordInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 8 characters + special character"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
            />
            <Text style={styles.fieldLabel}>Confirm New Password</Text>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
            />
            <Pressable
              style={[styles.sendBtn, passwordSaving && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={passwordSaving}
            >
              {passwordSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>Update Password</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0) || "?"}
          </Text>
        </View>
        <View>
          <Text style={styles.profileName}>{user?.displayName || "Pet Owner"}</Text>
          <Text style={styles.profileEmail}>{user?.email || ""}</Text>
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Plan</Text>
        <View style={styles.planCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>Free Plan</Text>
            <Text style={styles.planDesc}>Plus & Family plans — unlimited pets, AI & recipes</Text>
          </View>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Push notifications</Text>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: BRAND }} />
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Vaccine reminders</Text>
            <Switch value={reminders} onValueChange={setReminders} trackColor={{ true: BRAND }} />
          </View>
        </View>
      </View>

      {/* Legal & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal & Support</Text>
        <View style={styles.card}>
          {[
            ...(isPasswordUser
              ? [{ label: "Change Password", icon: "🔑", onPress: () => setShowChangePassword(true) }]
              : []),
            {
              label: "Privacy Policy", icon: "🔒",
              onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/privacy.html"),
            },
            {
              label: "Terms of Service", icon: "📄",
              onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/terms.html"),
            },
            {
              label: "Send Feedback", icon: "💬",
              onPress: () => setFeedbackVisible(true),
            },
            {
              label: "Rate MyPetDex", icon: "⭐",
              onPress: () => Linking.openURL("https://apps.apple.com/app/mypetdex/id6772248051?action=write-review"),
            },
          ].map((item, i, arr) => (
            <Pressable key={item.label} style={[styles.row, i === arr.length - 1 && styles.rowLast]} onPress={item.onPress}>
              <Text style={styles.rowIcon}>{item.icon}</Text>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Sign Out */}
      <Pressable style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* Delete Account */}
      <Pressable
        style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        <Text style={styles.deleteText}>{deleting ? "Deleting…" : "Delete Account"}</Text>
      </Pressable>

      <Text style={styles.version}>MyPetDex v1.0.0</Text>
    </ScrollView>
  );
}

const TEXT = "#0F172A";
const TEXT2 = "#64748B";
const BG = "#F4F6FB";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48, gap: 20 },
  profileCard: { backgroundColor: "#fff", borderRadius: 20, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: BRAND + "35" },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  profileName: { fontSize: 18, fontWeight: "700", color: TEXT },
  profileEmail: { fontSize: 13, color: TEXT2, marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: TEXT2, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  planCard: { backgroundColor: "#fff", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { fontSize: 16, fontWeight: "600", color: TEXT },
  planDesc: { fontSize: 13, color: TEXT2, marginTop: 2 },
  comingSoonBadge: { backgroundColor: "#F0F2F8", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#DDE2F0" },
  comingSoonText: { color: TEXT2, fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#F0F2F8", gap: 12 },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: 15, color: TEXT },
  chevron: { fontSize: 20, color: "#C7D2E8" },
  signOutBtn: { backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#FECDD3" },
  signOutText: { fontSize: 16, fontWeight: "600", color: "#E53935" },
  deleteBtn: { backgroundColor: "#E53935", borderRadius: 16, padding: 16, alignItems: "center" },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  version: { textAlign: "center", fontSize: 12, color: "#C0C8D8" },
  modalContainer: { flexGrow: 1, padding: 24, paddingTop: 32, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: TEXT },
  modalClose: { fontSize: 20, color: TEXT2, padding: 4 },
  modalSubtitle: { fontSize: 14, color: TEXT2, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: TEXT2, marginTop: 12, marginBottom: 8 },
  passwordInput: { borderWidth: 1.5, borderColor: "#E0E4F0", borderRadius: 16, padding: 14, fontSize: 15, color: TEXT, backgroundColor: "#F8F9FC", marginBottom: 4 },
  feedbackInput: { borderWidth: 1.5, borderColor: "#E0E4F0", borderRadius: 16, padding: 14, fontSize: 15, color: TEXT, minHeight: 140, marginBottom: 16, backgroundColor: "#F8F9FC" },
  sendBtn: { backgroundColor: BRAND, borderRadius: 16, padding: 16, alignItems: "center", marginTop: 16, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 8, elevation: 4 },
  sendBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
