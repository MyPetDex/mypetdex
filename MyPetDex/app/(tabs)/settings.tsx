import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import * as WebBrowser from "expo-web-browser";
import { webAuth, webDb } from "@/lib/firebase";
import { doc, deleteDoc, collection, getDocs } from "firebase/firestore";

const BRAND = "#4486F4";

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
            {
              label: "Privacy Policy", icon: "🔒",
              onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/privacy.html"),
            },
            {
              label: "Terms of Service", icon: "📄",
              onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/terms.html"),
            },
            {
              label: "Contact Support", icon: "💬",
              onPress: () => WebBrowser.openBrowserAsync("mailto:support@mypetdex.app"),
            },
            {
              label: "Rate MyPetDex", icon: "⭐",
              onPress: () => {},
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f8f8" },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  profileCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 26, fontWeight: "700", color: "#fff" },
  profileName: { fontSize: 18, fontWeight: "700", color: "#1a1a1a" },
  profileEmail: { fontSize: 13, color: "#888", marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#888", textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 4 },
  card: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden" },
  planCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  planName: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  planDesc: { fontSize: 13, color: "#888", marginTop: 2 },
  comingSoonBadge: { backgroundColor: "#F5F5F5", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#E0E0E0" },
  comingSoonText: { color: "#888", fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 12 },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  chevron: { fontSize: 20, color: "#ccc" },
  signOutBtn: { backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#ffcccc" },
  signOutText: { fontSize: 16, fontWeight: "600", color: "#E53935" },
  deleteBtn: { backgroundColor: "#E53935", borderRadius: 14, padding: 16, alignItems: "center" },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  version: { textAlign: "center", fontSize: 12, color: "#bbb" },
});
