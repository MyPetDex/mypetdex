import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { webAuth } from "@/lib/firebase";

const DEMO_EMAIL = "demo@mypetdex.app";
const DEMO_PASSWORD = "Demo1234!";
const BRAND = "#4486F4";

export default function DemoLoginScreen() {
  const router = useRouter();
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    async function signInDemo() {
      try {
        setStatus("Loading demo account...");
        await signInWithEmailAndPassword(webAuth, DEMO_EMAIL, DEMO_PASSWORD);
        setStatus("Welcome to MyPetDex!");
        // Small delay so the success message is visible
        setTimeout(() => router.replace("/(tabs)"), 800);
      } catch (e: any) {
        setStatus("Could not load demo. Please try again.");
        setTimeout(() => router.replace("/(auth)/sign-in"), 2000);
      }
    }
    signInDemo();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🐾</Text>
      <Text style={styles.title}>MyPetDex</Text>
      <ActivityIndicator size="large" color={BRAND} style={{ marginTop: 24 }} />
      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  logo: { fontSize: 56 },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a1a" },
  status: { fontSize: 15, color: "#888", marginTop: 12 },
});
