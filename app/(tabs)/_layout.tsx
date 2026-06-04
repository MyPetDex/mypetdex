import { Tabs, useRouter } from "expo-router";
import { Platform, TouchableOpacity, View, Text, Pressable, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { isWeb, webAuth, webDb } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4486F4";

export default function TabLayout() {
  const { isDemoMode } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<string>("owner");

  useEffect(() => {
    if (!isWeb) return;
    const unsub = onAuthStateChanged(webAuth, async (user) => {
      if (user) {
        // Admin email always gets admin role regardless of Firestore doc
        if (user.email === "mypetdexapp@gmail.com") { setRole("admin"); return; }
        try {
          const snap = await getDoc(doc(webDb, "users", user.uid));
          if (snap.exists()) setRole(snap.data().role || "owner");
        } catch {}
      }
    });
    return unsub;
  }, []);

  const isProvider = role === "provider";
  const isShelter = role === "shelter";
  const isAdmin = role === "admin";

  return (
    <View style={{ flex: 1 }}>
      {isDemoMode && (
        <View style={styles.demoBanner}>
          <Text style={styles.demoBannerText}>👀 Demo Mode — view only, no changes saved</Text>
          <Pressable
            style={styles.demoBannerBtn}
            onPress={() => router.replace("/(auth)/sign-in" as any)}
          >
            <Text style={styles.demoBannerBtnText}>Sign Up Free →</Text>
          </Pressable>
        </View>
      )}
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: "#f0f0f0",
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
          height: Platform.OS === "ios" ? 82 : 62,
        },
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        animation: "fade",
      }}
    >
      {/* ── Pet Owner tabs ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Image
                source={require("../../assets/images/logo-transparent.png")}
                style={{ width: 28, height: 28, borderRadius: 6 }}
              />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#1a1a1a" }}>MyPetDex</Text>
            </View>
          ),
          href: isProvider || isShelter || isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          href: isProvider || isShelter || isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shop",
          href: isProvider || isShelter || isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "PetDex AI",
          href: isProvider || isShelter || isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: "Me",
          href: isProvider || isShelter || isAdmin ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Provider tabs ──────────────────────────────────────────── */}
      <Tabs.Screen
        name="provider-home"
        options={{
          title: "Dashboard",
          href: isProvider ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="provider-services"
        options={{
          title: "Services",
          href: isProvider ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="provider-bookings"
        options={{
          title: "Bookings",
          href: isProvider ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="provider-reviews"
        options={{
          title: "Reviews",
          href: isProvider ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="provider-profile"
        options={{
          title: "Profile",
          href: isProvider ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Shelter tabs ───────────────────────────────────────────── */}
      <Tabs.Screen
        name="shelter-home"
        options={{
          title: "Dashboard",
          href: isShelter ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shelter-pets"
        options={{
          title: "Our Pets",
          href: isShelter ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="paw-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shelter-add-pet"
        options={{
          title: "Add Pet",
          href: isShelter ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shelter-profile"
        options={{
          title: "Profile",
          href: isShelter ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Admin tabs — hidden, files kept for future use ─────────── */}
      <Tabs.Screen name="admin-dashboard" options={{ href: null }} />
      <Tabs.Screen name="admin-users" options={{ href: null }} />
      <Tabs.Screen name="admin-reviews" options={{ href: null }} />
      <Tabs.Screen name="admin-products" options={{ href: null }} />

      {/* ── Always hidden ──────────────────────────────────────────── */}
      <Tabs.Screen name="pets" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  demoBanner: {
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  demoBannerText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  demoBannerBtn: {
    backgroundColor: "#4486F4",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  demoBannerBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
