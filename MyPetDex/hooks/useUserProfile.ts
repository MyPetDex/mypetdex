import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isWeb, webDb } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import _nativeFirestore from "@react-native-firebase/firestore";

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  plan?: string;
  city?: string;
  state?: string;
  createdAt?: any;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    if (isWeb) {
      const ref = doc(webDb, "users", user.uid);
      return onSnapshot(ref, (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setLoading(false);
      }, () => {
        setProfile(null);
        setLoading(false);
      });
    } else {
      const unsub = _nativeFirestore()
        .collection("users")
        .doc(user.uid)
        .onSnapshot((snap: any) => {
          setProfile(snap.exists ? (snap.data() as UserProfile) : null);
          setLoading(false);
        }, () => {
          setProfile(null);
          setLoading(false);
        });
      return unsub;
    }
  }, [user]);

  return { profile, loading };
}
