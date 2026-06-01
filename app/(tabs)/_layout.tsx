import { Tabs } from "expo-router";
import { Platform, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { isWeb, webAuth, webDb } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const BRAND = "#4CAF82";

export default function TabLayout() {
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
      }}
    >
      {/* ── Pet Owner tabs ─────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
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
          title: "Pet Assistant",
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
  );
}
