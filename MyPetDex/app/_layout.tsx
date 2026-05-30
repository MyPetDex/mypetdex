import { useEffect, Component, ReactNode } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";

// ── Error Boundary — catches JS crashes and shows the error on screen ──────────
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <View style={{ flex: 1, backgroundColor: "#fff", padding: 24, paddingTop: 80 }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#E53935", marginBottom: 12 }}>
            🚨 App Error (send this to developer)
          </Text>
          <ScrollView style={{ backgroundColor: "#f5f5f5", borderRadius: 8, padding: 12 }}>
            <Text style={{ fontSize: 13, color: "#333", fontFamily: "Courier", lineHeight: 20 }}>
              {err.name}: {err.message}{"\n\n"}{err.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const BRAND = "#4CAF82";

// Close button rendered as headerLeft for modal screens on iOS
function ModalCloseButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={{ marginLeft: 4 }}
    >
      <Text style={{ fontSize: 16, color: BRAND, fontWeight: "600" }}>✕ Close</Text>
    </Pressable>
  );
}

function AuthGuard() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || (user && profileLoading)) return;

    const inAuthGroup = segments.some(s => s === "(auth)");
    const inOnboarding = segments.some(s => s === "onboarding");
    const inExplore = segments.some(s => s === "explore");

    // User has completed onboarding if they have city, businessName, or shelterName
    const hasCompletedOnboarding = !!(profile?.city || profile?.businessName || profile?.shelterName || profile?.onboardingComplete);

    if (!user && !inAuthGroup && !inExplore) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      if (!hasCompletedOnboarding) {
        router.replace("/onboarding");
      } else {
        router.replace("/(tabs)");
      }
    } else if (user && inOnboarding && hasCompletedOnboarding) {
      // Already completed onboarding — race condition guard: redirect away
      router.replace("/(tabs)");
    } else if (user && !inAuthGroup && !inOnboarding) {
      if (!hasCompletedOnboarding) {
        router.replace("/onboarding");
      }
    }
  }, [user, authLoading, profile, profileLoading, segments]);

  return null;
}

export default function RootLayout() {
  // Load Ionicons font — fixes empty-square tab bar icons on iOS and web
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  // Don't render until fonts are ready; avoids the brief empty-square flash
  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
    <AuthProvider>
      <AuthGuard />
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/sign-in" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="pet/[id]"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Pet Details",
            headerLeft: () => <ModalCloseButton />,
          }}
        />
        <Stack.Screen
          name="pet/add"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Add Pet",
            headerLeft: () => <ModalCloseButton />,
          }}
        />
        <Stack.Screen
          name="settings/subscription"
          options={{
            presentation: "modal",
            headerShown: true,
            title: "Upgrade Plan",
            headerLeft: () => <ModalCloseButton />,
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="modal" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
    </ErrorBoundary>
  );
}
