import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";
import * as WebBrowser from "expo-web-browser";
import { isWeb, webDb } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import firestore from "@react-native-firebase/firestore";
import { registerForPushNotifications } from "@/hooks/usePushNotifications";

const BRAND = "#4486F4";

export default function SettingsScreen() {
  const { user, signOut, isDemoMode } = useAuth();
  const { plan } = usePlan();
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [reminders, setReminders] = useState(true);

  // Load saved preferences from Firestore
  useEffect(() => {
    if (!user || isDemoMode || isWeb) return;
    firestore().collection("users").doc(user.uid).get().then(snap => {
      if (snap.exists) {
        const data = snap.data() || {};
        if (data.notificationsEnabled !== undefined) setNotifications(data.notificationsEnabled);
        if (data.remindersEnabled !== undefined) setReminders(data.remindersEnabled);
      }
    }).catch(() => {});
  }, [user]);

  function demoBlock() {
    if (isDemoMode) { Alert.alert("Demo Mode", "Sign up free to change settings."); return true; }
    return false;
  }

  async function toggleNotifications(val: boolean) {
    if (demoBlock()) return;
    setNotifications(val);
    if (val) {
      // Re-request permission and refresh token
      const token = await registerForPushNotifications();
      if (!token) {
        Alert.alert("Permission Denied", "Please enable notifications in your iPhone Settings → MyPetDex.");
        setNotifications(false);
        return;
      }
    }
    if (!isWeb && user) {
      await firestore().collection("users").doc(user.uid).update({ notificationsEnabled: val });
    }
  }

  async function toggleReminders(val: boolean) {
    if (demoBlock()) return;
    setReminders(val);
    if (!isWeb && user) {
      await firestore().collection("users").doc(user.uid).update({ remindersEnabled: val });
    }
  }

  const planLabel = plan === "plus" ? "Plus Plan" : plan === "family" ? "Family Plan" : "Free Plan";

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
            <Text style={styles.planName}>{planLabel}</Text>
            <Text style={styles.planDesc}>Plus & Family plans — unlimited pets, AI & recipes</Text>
          </View>
          <Pressable style={styles.upgradeBtn} onPress={() => router.push("/settings/subscription")}>
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </Pressable>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Push notifications</Text>
            <Switch value={notifications} onValueChange={toggleNotifications} trackColor={{ true: BRAND }} disabled={isDemoMode} />
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Vaccine & reminder alerts</Text>
            <Switch value={reminders} onValueChange={toggleReminders} trackColor={{ true: BRAND }} disabled={isDemoMode || !notifications} />
          </View>
        </View>
      </View>

      {/* Legal & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal & Support</Text>
        <View style={styles.card}>
          {[
            { label: "Privacy Policy", icon: "🔒", onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/privacy.html") },
            { label: "Terms of Service", icon: "📄", onPress: () => WebBrowser.openBrowserAsync("https://home.mypetdex.app/terms.html") },
            { label: "Contact Support", icon: "💬", onPress: () => WebBrowser.openBrowserAsync("mailto:support@mypetdex.app") },
            { label: "Rate MyPetDex", icon: "⭐", onPress: () => {} },
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
  upgradeBtn: { backgroundColor: BRAND + "15", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: BRAND + "33" },
  upgradeBtnText: { color: BRAND, fontSize: 13, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", gap: 12 },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: 15, color: "#1a1a1a" },
  chevron: { fontSize: 20, color: "#ccc" },
  signOutBtn: { backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", borderWidth: 1, borderColor: "#ffcccc" },
  signOutText: { fontSize: 16, fontWeight: "600", color: "#E53935" },
  version: { textAlign: "center", fontSize: 12, color: "#bbb" },
});
