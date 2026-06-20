import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Image, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { webAuth } from "@/lib/firebase";
import { sendEmailVerification } from "firebase/auth";

const BRAND = "#4486F4";

export default function CheckEmailScreen() {
  const router = useRouter();
  const { user, signOut, refreshEmailVerification } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const hasSentRef = useRef(false);

  // Send the initial verification email exactly once per mount — guards against
  // double-sends from React StrictMode / navigation re-renders invalidating the link
  useEffect(() => {
    if (hasSentRef.current || !webAuth.currentUser || webAuth.currentUser.emailVerified) return;
    hasSentRef.current = true;
    sendEmailVerification(webAuth.currentUser).catch(console.error);
  }, []);

  // Tick down the resend cooldown once a second
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch {}
  }

  async function handleCheckVerified() {
    setChecking(true);
    setError("");
    const verified = await refreshEmailVerification();
    setChecking(false);
    if (verified) {
      router.replace("/(tabs)");
    } else {
      setError("Not verified yet. Open the link in the email we sent, then try again.");
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setResending(true);
    setError("");
    setResent(false);
    try {
      if (webAuth.currentUser) {
        await sendEmailVerification(webAuth.currentUser);
        setResent(true);
        setResendCooldown(60);
      }
    } catch {
      setError("Could not resend the email. Please try again in a moment.");
    }
    setResending(false);
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={handleSignOut} hitSlop={16} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.content}>
        <Image
          source={require("../assets/images/logo-transparent.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={{ fontSize: 56, marginBottom: 8 }}>📧</Text>
        <Text style={styles.title}>Check Your Inbox</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{" "}
          <Text style={{ fontWeight: "700", color: "#1a1a1a" }}>{user?.email}</Text>.
          {" "}Check your inbox and spam folder. Once verified, tap the button below.
        </Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {resent ? <Text style={styles.success}>Verification email resent!</Text> : null}

        <Pressable
          style={[styles.primaryBtn, checking && styles.btnDisabled]}
          onPress={handleCheckVerified}
          disabled={checking}
        >
          {checking
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>I've Verified My Email</Text>}
        </Pressable>

        <Pressable
          style={[styles.secondaryBtn, (resending || resendCooldown > 0) && styles.btnDisabled]}
          onPress={handleResend}
          disabled={resending || resendCooldown > 0}
        >
          {resending
            ? <ActivityIndicator color={BRAND} />
            : <Text style={styles.secondaryBtnText}>
                {resendCooldown > 0 ? `Resend Verification Email (${resendCooldown}s)` : "Resend Verification Email"}
              </Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f8f8f8" },
  header: { backgroundColor: "#f8f8f8" },
  headerRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10 },
  signOutBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  signOutText: { fontSize: 14, color: "#aaa", fontWeight: "500" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  logo: { width: 100, height: 100, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: "800", color: "#1a1a1a", marginBottom: 10, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  error: { color: "#E53935", fontSize: 14, textAlign: "center", marginBottom: 14 },
  success: { color: "#2E7D32", fontSize: 14, textAlign: "center", marginBottom: 14 },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 14, paddingVertical: 16, alignItems: "center", width: "100%", marginBottom: 12 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#fff", borderRadius: 14, paddingVertical: 16, alignItems: "center", width: "100%", borderWidth: 1, borderColor: "#e0e0e0" },
  secondaryBtnText: { color: BRAND, fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
});
