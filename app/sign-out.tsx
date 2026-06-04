import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { webAuth } from "@/lib/firebase";

export default function SignOutPage() {
  useEffect(() => {
    signOut(webAuth).finally(() => {
      router.replace("/(auth)/sign-in" as any);
    });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#4486F4" />
    </View>
  );
}
