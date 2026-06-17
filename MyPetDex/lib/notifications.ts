import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers the device for push notifications using expo-notifications.
 * Saves the Expo push token to Firestore so the Cloud Function can send reminders.
 * Call this once after the user authenticates.
 */
export async function registerForPushNotifications(uid: string): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    // Physical device required — simulators can't receive push
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device");
      return;
    }

    // Request permission
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission denied");
      return;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "afceb31b-a93c-43e9-91dd-6ba8ca23b6ca",
    });
    const expoPushToken = tokenData.data;

    if (!expoPushToken) {
      console.log("No Expo push token returned");
      return;
    }

    // Save to Firestore (JS SDK — works on both iOS and web)
    await updateDoc(doc(db, "users", uid), { expoPushToken });
    console.log("Expo push token saved:", expoPushToken.substring(0, 30) + "...");

    // Android notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Pet Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4CAF82",
      });
    }
  } catch (err) {
    // Don't crash the app if notifications fail
    console.error("Push notification registration error:", err);
  }
}
