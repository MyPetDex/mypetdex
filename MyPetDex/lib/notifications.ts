import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
      return;
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "afceb31b-a93c-43e9-91dd-6ba8ca23b6ca",
    });
    const expoPushToken = tokenData.data;

    if (!expoPushToken) {
      return;
    }

    // Save to a private subcollection, not the user document. Provider user docs
    // are readable by any signed-in user for business listings, and a push token
    // there would let anyone send notifications to that device.
    await setDoc(
      doc(db, "users", uid, "private", "push"),
      { expoPushToken, updatedAt: serverTimestamp() },
      { merge: true }
    );

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
