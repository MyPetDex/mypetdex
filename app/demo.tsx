import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { isWeb } from "@/lib/firebase";

const BRAND = "#4486F4";

// Replace these once the app is live on the stores
const APP_STORE_URL = "https://apps.apple.com/app/mypetdex"; // TODO: update after App Store submission
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.mypetdex"; // TODO: update after Play Store submission
const DEMO_EMAIL = "demo@mypetdex.app";
const DEMO_PASSWORD = "Demo2026!";

export default function DemoLandingPage() {
  const router = useRouter();

  // On web, detect desktop and show a "use mobile" message
  const isDesktop = isWeb && typeof window !== "undefined" && window.innerWidth > 768;

  // If already on the native app, go straight to demo sign-in
  if (!isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.logo}>🐾</Text>
          <Text style={styles.title}>Try MyPetDex Demo</Text>
          <Text style={styles.sub}>Sign in with the demo account to explore all features.</Text>
          <View style={styles.credBox}>
            <Text style={styles.credLabel}>Email</Text>
            <Text style={styles.credValue}>{DEMO_EMAIL}</Text>
            <View style={styles.divider} />
            <Text style={styles.credLabel}>Password</Text>
            <Text style={styles.credValue}>{DEMO_PASSWORD}</Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => router.replace("/(auth)/sign-in?demo=true")}>
            <Text style={styles.primaryBtnText}>Open Demo Account →</Text>
          </Pressable>
          <Pressable onPress={() => router.replace("/(auth)/sign-in")} style={{ marginTop: 12 }}>
            <Text style={styles.link}>Sign in with my own account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (isDesktop) {
    // Desktop web — push to mobile
    return (
      <div style={desktopStyles.wrap as any}>
        <div style={desktopStyles.card as any}>
          <div style={desktopStyles.logo as any}>🐾</div>
          <h1 style={desktopStyles.title as any}>MyPetDex is built for mobile</h1>
          <p style={desktopStyles.sub as any}>
            Download the app on your iPhone or Android for the best experience.
            Then sign in with the demo account to explore all features — free.
          </p>
          <div style={desktopStyles.storeRow as any}>
            <a href={APP_STORE_URL} style={desktopStyles.storeBtn as any} target="_blank">
              <span style={{ fontSize: 22 }}>🍎</span>
              <div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Download on the</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>App Store</div>
              </div>
            </a>
            <a href={PLAY_STORE_URL} style={desktopStyles.storeBtn as any} target="_blank">
              <span style={{ fontSize: 22 }}>▶️</span>
              <div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Get it on</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Google Play</div>
              </div>
            </a>
          </div>
          <div style={desktopStyles.credBox as any}>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>
              Once installed, sign in with the demo account:
            </p>
            <div style={desktopStyles.credRow as any}>
              <span style={desktopStyles.credLabel as any}>Email</span>
              <span style={desktopStyles.credValue as any}>{DEMO_EMAIL}</span>
            </div>
            <div style={desktopStyles.credRow as any}>
              <span style={desktopStyles.credLabel as any}>Password</span>
              <span style={desktopStyles.credValue as any}>{DEMO_PASSWORD}</span>
            </div>
          </div>
          <a href="https://www.mypetdex.app" style={desktopStyles.backLink as any}>← Back to MyPetDex.app</a>
        </div>
      </div>
    );
  }

  // Mobile web — auto sign in to demo
  if (typeof window !== "undefined") {
    window.location.href = "/?demo=true";
  }
  return null;
}

// ── Native styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFF" },
  inner: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: "800", color: "#1E293B", textAlign: "center", marginBottom: 8 },
  sub: { fontSize: 15, color: "#64748B", textAlign: "center", lineHeight: 22, marginBottom: 28 },
  credBox: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  credLabel: { fontSize: 11, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  credValue: { fontSize: 16, fontWeight: "600", color: "#1E293B", marginBottom: 12 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 12 },
  primaryBtn: { width: "100%", backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { fontSize: 14, color: BRAND, fontWeight: "600" },
});

// ── Desktop web styles ─────────────────────────────────────────────────────────
const desktopStyles = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #F0F4FF 0%, #E8F5FF 100%)", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: 20 },
  card: { background: "#fff", borderRadius: 24, padding: 48, maxWidth: 480, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.10)", textAlign: "center" },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 800, color: "#1E293B", marginBottom: 12, lineHeight: 1.3 },
  sub: { fontSize: 15, color: "#64748B", lineHeight: 1.6, marginBottom: 28 },
  storeRow: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 28 },
  storeBtn: { display: "flex", alignItems: "center", gap: 10, background: "#1E293B", color: "#fff", borderRadius: 12, padding: "12px 20px", textDecoration: "none", minWidth: 150 },
  credBox: { background: "#F8FAFF", borderRadius: 14, padding: 20, marginBottom: 24, textAlign: "left" },
  credRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E2E8F0" },
  credLabel: { fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" },
  credValue: { fontSize: 14, fontWeight: 600, color: "#1E293B" },
  backLink: { fontSize: 13, color: BRAND, textDecoration: "none", fontWeight: 600 },
};
