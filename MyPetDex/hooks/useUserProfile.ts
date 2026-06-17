import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  plan?: string;
  city?: string;
  state?: string;
  businessName?: string;
  shelterName?: string;
  onboardingComplete?: boolean;
  createdAt?: any;
  [key: string]: any;
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

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        setLoading(false);
      },
      () => {
        setProfile(null);
        setLoading(false);
      }
    );
    return unsub;
  }, [user]);

  return { profile, loading };
}
