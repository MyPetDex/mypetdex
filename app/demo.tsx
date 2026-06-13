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

const logoSrc = require("@/assets/images/logo-transparent.png");

export default function DemoLandingPage() {
  const router = useRouter();

  // On web, detect desktop and show a "use mobile" message
  const isDesktop = isWeb && typeof window !== "undefined" && window.innerWidth > 768;

  // If already on the native app, go straight to demo sign-in
  if (!isWeb) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Image source={logoSrc} style={styles.logoImg} />
          <Text style={styles.title}>Try MyPetDex Demo</Text>
          <Text style={styles.sub}>Tap below to explore all features with a demo account — no sign up needed.</Text>
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
            <img src={logoSrc} alt="MyPetDex" style={{ width: 52, height: 52, objectFit: "contain", borderRadius: 12 }} />
            <span style={{ fontFamily: "Arial Black, sans-serif", fontWeight: 900, fontSize: 22, color: "#1E293B" }}>MyPetDex</span>
          </div>
          <h1 style={desktopStyles.title as any}>Built for mobile</h1>
          <p style={desktopStyles.sub as any}>
            Download the app on your iPhone or Android for the best experience.
            Then sign in with the demo account to explore all features — free.
          </p>
          <div style={desktopStyles.storeRow as any}>
            <a href={APP_STORE_URL} style={desktopStyles.storeBtn as any} target="_blank">
              <svg width="22" height="22" viewBox="0 0 814 1000" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-127.4C46 790.7 0 663 0 541.8c0-207.9 135.4-317.9 268.5-317.9 99.6 0 182.8 65.8 244.9 65.8 59.2 0 152.1-69.6 266.4-69.6zm-166.3-123.8c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
              <div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Download on the</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>App Store</div>
              </div>
            </a>
            <a href={PLAY_STORE_URL} style={desktopStyles.storeBtn as any} target="_blank">
              <svg width="22" height="22" viewBox="0 0 512 512" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l2.7 1.5 247.2-247v-5.8L47 0zm217.3 248L204 188.7 51.1 343.4l2.3 1.3L264.3 248zm205.6 109.1l-56.1-32.1-63.7 63.7 63.7 63.7 56.1-32.1c16-9.2 16-24.1 0-33.2z"/></svg>
              <div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>Get it on</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Google Play</div>
              </div>
            </a>
          </div>
          <div style={desktopStyles.credBox as any}>
            <p style={{ color: "#64748B", fontSize: 13, marginBottom: 16, textAlign: "center" as const }}>
              Already have the app? Scan to open the demo instantly:
            </p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https%3A%2F%2Fapp.mypetdex.app%3Fdemo%3Dtrue&color=1E293B&bgcolor=ffffff&margin=10&qzone=1"
                alt="Scan to open demo"
                style={{ width: 160, height: 160, borderRadius: 12 }}
              />
            </div>
            <p style={{ color: "#94A3B8", fontSize: 12, textAlign: "center" as const }}>
              Point your phone camera at this code
            </p>
          </div>
          <a href="https://www.mypetdex.app" style={desktopStyles.backLink as any}>← Back to website</a>
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
  logoImg: { width: 80, height: 80, marginBottom: 16 },
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
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(145deg, ${BRAND}18 0%, #EEF4FF 60%, #fff 100%)`, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", padding: 20 },
  card: { background: "#fff", borderRadius: 28, padding: 48, maxWidth: 460, width: "100%", boxShadow: `0 4px 6px rgba(0,0,0,0.04), 0 20px 60px ${BRAND}22`, textAlign: "center", border: `1px solid ${BRAND}18` },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 800, color: "#1E293B", marginBottom: 10, lineHeight: 1.3 },
  sub: { fontSize: 14, color: "#64748B", lineHeight: 1.7, marginBottom: 28 },
  storeRow: { display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 },
  storeBtn: { display: "flex", alignItems: "center", gap: 10, background: BRAND, color: "#fff", borderRadius: 14, padding: "13px 22px", textDecoration: "none", minWidth: 150, boxShadow: `0 4px 16px ${BRAND}44` },
  credBox: { background: `${BRAND}08`, borderRadius: 16, padding: 20, marginBottom: 24, border: `1px solid ${BRAND}20` },
  credRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #E2E8F0" },
  credLabel: { fontSize: 12, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" },
  credValue: { fontSize: 14, fontWeight: 600, color: "#1E293B" },
  backLink: { fontSize: 13, color: BRAND, textDecoration: "none", fontWeight: 600, opacity: 0.8 },
};
