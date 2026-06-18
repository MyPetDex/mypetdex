import { Tabs } from "expo-router";
import { Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";

const BRAND = "#4486F4";

export default function TabLayout() {
  const { user } = useAuth();
  const { profile } = useUserProfile();

  // Determine role: admin email always gets admin, otherwise from profile
  const role = user?.email === "mypetdexapp@gmail.com"
    ? "admin"
    : (profile?.role || "owner");

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
          headerTitle: () => (
            <Image
              source={require("../../assets/images/logo-transparent.png")}
              style={{ height: 32, width: 130 }}
              resizeMode="contain"
            />
          ),
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
          title: "MyPetDex AI",
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

      {/* ── Admin tabs ─────────────────────────────────────────────── */}
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          title: "Dashboard",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bar-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-users"
        options={{
          title: "Users",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-reviews"
        options={{
          title: "Reviews",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-products"
        options={{
          title: "Products",
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pricetag-outline" size={size} color={color} />
          ),
        }}
      />

      {/* ── Always hidden ──────────────────────────────────────────── */}
      <Tabs.Screen name="pets" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
