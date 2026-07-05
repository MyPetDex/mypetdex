import { useEffect, useRef, Component, ReactNode } from "react";
import { Pressable, Text, View, ScrollView } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { registerForPushNotifications } from "@/lib/notifications";
import Purchases from "react-native-purchases";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://e61d654a15f008a795b08ad76f7ec859@o4511577571721216.ingest.us.sentry.io/4511577595445248',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

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

const BRAND = "#4C6EF5";

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

function tabsHomeHref(profile: { role?: string } | null | undefined, pendingRole: string) {
  const role = profile?.role || pendingRole;
  if (role === "shelter") return "/(tabs)/shelter-home" as const;
  if (role === "provider") return "/(tabs)/provider-home" as const;
  return "/(tabs)" as const;
}

function AuthGuard() {
  const { user, loading: authLoading, emailVerified, getPendingRole } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const segments = useSegments();
  const router = useRouter();
  const notifRegistered = useRef(false); // tracks if push was registered this session

  // Reset notif flag on sign out
  useEffect(() => {
    if (!user) notifRegistered.current = false;
  }, [user]);

  // Register push notifications for existing users who already completed onboarding
  // (new users get it at the end of onboarding.tsx instead)
  useEffect(() => {
    if (
      user &&
      !notifRegistered.current &&
      !authLoading &&
      !profileLoading &&
      emailVerified &&
      (profile?.city || profile?.businessName || profile?.shelterName || profile?.onboardingComplete)
    ) {
      notifRegistered.current = true;
      registerForPushNotifications(user.uid);
    }
  }, [user, authLoading, profileLoading, emailVerified, profile?.city, profile?.businessName, profile?.shelterName, profile?.onboardingComplete]);

  useEffect(() => {
    if (authLoading || (user && profileLoading)) return;

    const inAuthGroup = segments.some(s => s === "(auth)");
    const inOnboarding = segments.some(s => s === "onboarding");
    const inCheckEmail = segments.some(s => s === "check-email");
    const inExplore = segments.some(s => s === "explore");

    // Admin always bypasses onboarding and email verification
    const isAdmin = user?.email === "mypetdexapp@gmail.com";
    // User has completed onboarding if they have city, businessName, or shelterName
    const hasCompletedOnboarding = isAdmin || !!(profile?.city || profile?.businessName || profile?.shelterName || profile?.onboardingComplete);
    const needsEmailVerification = !isAdmin && !emailVerified;

    const onboardingHref = (() => {
      const role = getPendingRole();
      if (role === "owner" || role === "provider" || role === "shelter") {
        return `/onboarding?role=${role}` as const;
      }
      return "/onboarding" as const;
    })();
    const homeHref = tabsHomeHref(profile, getPendingRole());

    if (!user && !inAuthGroup && !inExplore) {
      router.replace("/(auth)/sign-in");
    } else if (user && inAuthGroup) {
      if (!hasCompletedOnboarding) {
        router.replace(onboardingHref);
      } else if (needsEmailVerification) {
        router.replace("/check-email");
      } else {
        router.replace(homeHref);
      }
    } else if (user && inOnboarding && hasCompletedOnboarding) {
      // Already completed onboarding — race condition guard: redirect away
      router.replace(needsEmailVerification ? "/check-email" : homeHref);
    } else if (user && inCheckEmail) {
      // Verified (or just became verified, e.g. on app foreground) — let them in
      if (!needsEmailVerification) {
        router.replace(homeHref);
      }
    } else if (user && !inAuthGroup && !inOnboarding && !inCheckEmail) {
      if (!hasCompletedOnboarding) {
        router.replace(onboardingHref);
      } else if (needsEmailVerification) {
        router.replace("/check-email");
      }
    }
  }, [user, authLoading, profile?.onboardingComplete, profile?.role, profile?.city, profile?.businessName, profile?.shelterName, profileLoading, segments, emailVerified, getPendingRole]);

  useEffect(() => {
    try {
      Purchases.configure({ apiKey: "appl_pEdUnYfNGuoftcDZxKvVuyYzYUb" });
    } catch (e) {
      console.log("RevenueCat unavailable in this environment");
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      Purchases.logIn(user.uid).catch(() => {});
    }
  }, [user?.uid]);

  return null;
}

export default Sentry.wrap(function RootLayout() {
  // Load Ionicons font — fixes empty-square tab bar icons on iOS and web
  const [fontsLoaded] = useFonts({ ...Ionicons.font });

  // Don't render until fonts are ready; avoids the brief empty-square flash
  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
    <AuthProvider>
      <AuthGuard />
      <StatusBar style="dark" />
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
        <Stack.Screen
          name="check-email"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="modal" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AuthProvider>
    </ErrorBoundary>
  );
});
