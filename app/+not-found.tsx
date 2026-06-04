import { useEffect, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { getRedirectResult } from "firebase/auth";
import { webAuth, isWeb } from "@/lib/firebase";

export default function NotFound() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function handleRedirect() {
      if (isWeb) {
        try {
          const result = await getRedirectResult(webAuth);
          if (result?.user) {
            router.replace("/(tabs)");
            return;
          }
        } catch (e) {}
      }
      setChecking(false);
    }
    handleRedirect();
  }, []);

  if (checking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4486F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>This screen doesn't exist.</Text>
      <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
        <Text style={styles.link}>Go to home screen!</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 18, fontWeight: "600", color: "#1a1a1a", marginBottom: 16 },
  link: { fontSize: 15, color: "#4486F4" },
});
