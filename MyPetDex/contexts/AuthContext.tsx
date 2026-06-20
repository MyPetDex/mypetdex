import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import {
  auth, db, userRef,
  GoogleAuthProvider, OAuthProvider,
  onAuthStateChanged, signOut, signInAnonymously,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithCredential, updateProfile, sendEmailVerification,
  setDoc, getDoc, serverTimestamp,
} from "@/lib/firebase";

interface AuthContextValue {
  user: any;
  loading: boolean;
  emailVerified: boolean;
  refreshEmailVerification: () => Promise<boolean>;
  signInWithGoogle: () => void;
  setGooglePrompt: (fn: (() => void) | null) => void;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<any>;
  signInAnon: () => Promise<void>;
  signOut: () => Promise<void>;
  appleAvailable: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function ensureUserDoc(firebaseUser: any, role = "owner") {
  const ref = userRef(firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email || null,
      displayName: firebaseUser.displayName || null,
      plan: "free",
      role,
      createdAt: serverTimestamp(),
    });
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const isNewUser = useRef(false);
  const pendingRole = useRef("owner");

  // Google Sign In prompt — set by sign-in screen via expo-auth-session hook
  const googlePromptRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && isNewUser.current) {
        await ensureUserDoc(firebaseUser, pendingRole.current);
        isNewUser.current = false;
      }
      setUser(firebaseUser);
      setEmailVerified(!!firebaseUser?.emailVerified);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Re-checks emailVerified against Firebase Auth — call after sending/clicking a verification link
  const refreshEmailVerification = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await auth.currentUser.reload();
    } catch {
      // Network error or user deleted — fall through with last known state
    }
    const verified = !!auth.currentUser?.emailVerified;
    setEmailVerified(verified);
    return verified;
  }, []);

  // On app foreground, re-check verification so a user who verifies in their email app
  // and returns to MyPetDex is routed into the main app without manually tapping anything
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && auth.currentUser && !auth.currentUser.emailVerified) {
        refreshEmailVerification();
      }
    });
    return () => sub.remove();
  }, [refreshEmailVerification]);

  // Google Sign In — triggers the expo-auth-session prompt registered by sign-in screen
  const signInWithGoogle = useCallback(() => {
    if (googlePromptRef.current) {
      isNewUser.current = true;
      googlePromptRef.current();
    }
  }, []);

  const setGooglePrompt = useCallback((fn: (() => void) | null) => {
    googlePromptRef.current = fn;
  }, []);

  const signInWithApple = useCallback(async () => {
    const nonce = generateNonce();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce
    );
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    const { identityToken } = credential;
    if (!identityToken) throw new Error("No identity token");
    const provider = new OAuthProvider("apple.com");
    const firebaseCredential = provider.credential({
      idToken: identityToken,
      rawNonce: nonce,
    });
    isNewUser.current = true;
    await signInWithCredential(auth, firebaseCredential);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    isNewUser.current = true;
    return cred.user;
  }, []);

  const signInAnon = useCallback(async () => {
    isNewUser.current = true;
    await signInAnonymously(auth);
  }, []);

  const doSignOut = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      user, loading, appleAvailable, emailVerified, refreshEmailVerification,
      signInWithGoogle, setGooglePrompt,
      signInWithApple,
      signInWithEmail, signUpWithEmail,
      signInAnon, signOut: doSignOut,
    }),
    [user, loading, appleAvailable, emailVerified, refreshEmailVerification, signInWithGoogle, setGooglePrompt, signInWithApple, signInWithEmail, signUpWithEmail, signInAnon, doSignOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function generateNonce(length = 32): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}
