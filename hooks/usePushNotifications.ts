import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { isWeb, webDb } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import firestore from "@react-native-firebase/firestore";

// How notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (isWeb || !Device.isDevice) return null;

  // Check/request permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Pet Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4486F4",
    });
  }

  // Get Expo push token
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: "afceb31b-a93c-43e9-91dd-6ba8ca23b6ca",
  });
  return tokenData.data;
}

export function usePushNotifications(userId: string | undefined) {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!userId || isWeb) return;

    // Register and save token to Firestore
    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      try {
        await firestore().collection("users").doc(userId).update({ expoPushToken: token });
      } catch {}
    });

    // Listen for notifications received while app is open
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    // Listen for user tapping a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [userId]);
}
