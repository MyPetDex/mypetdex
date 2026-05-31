import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { isWeb, webAuth, webDb } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInAnonymously as webSignInAnonymously,
  signOut as webSignOut,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  getRedirectResult,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Native-only imports (lazy)
let GoogleSignin: any = null;
let statusCodes: any = null;
let nativeAuth: any = null;
let nativeFirestore: any = null;

if (!isWeb) {
  const gs = require("@react-native-google-signin/google-signin");
  GoogleSignin = gs.GoogleSignin;
  statusCodes = gs.statusCodes;
  nativeAuth = require("@react-native-firebase/auth").default;
  nativeFirestore = require("@react-native-firebase/firestore").default;

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
      ?? "209772699227-ilqlulmvqp12fau8bbvmq5ufvnbkoguc.apps.googleusercontent.com",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      ?? "209772699227-eibpfptsff0h497q956hlru2qbeu9pm9.apps.googleusercontent.com",
    offlineAccess: true,
  });
}

interface AuthContextValue {
  user: any;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
  appleAvailable: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function ensureUserDoc(firebaseUser: any) {
  if (!isWeb) return;
  const ref = doc(webDb, "users", firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // Read the intended role saved before the OAuth popup — defaults to "owner"
    const intendedRole =
      (typeof localStorage !== "undefined" && localStorage.getItem("mypetdex_role")) || "owner";
    if (typeof localStorage !== "undefined") localStorage.removeItem("mypetdex_role");
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email || null,
      displayName: firebaseUser.displayName || null,
      plan: "free",
      role: intendedRole,
      createdAt: serverTimestamp(),
    });
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const isNewUser = useRef(false);

  useEffect(() => {
    if (isWeb) {
      // Apple Sign In via Firebase OAuth popup is available on web.
      setAppleAvailable(true);
    } else if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  // ── Auth state listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (isWeb) {
      // Handle Safari redirect result on page load
      getRedirectResult(webAuth).then(async (result) => {
        if (result?.user) {
          await ensureUserDoc(result.user);
        }
      }).catch(() => {});

      const unsub = onAuthStateChanged(webAuth, async (firebaseUser) => {
        if (firebaseUser && isNewUser.current) {
          await ensureUserDoc(firebaseUser);
          isNewUser.current = false;
        }
        setUser(firebaseUser);
        setLoading(false);
      });
      return unsub;
    } else {
      const unsub = nativeAuth().onAuthStateChanged(async (firebaseUser: any) => {
        if (firebaseUser && isNewUser.current) {
          const ref = nativeFirestore().collection("users").doc(firebaseUser.uid);
          const snap = await ref.get();
          if (!snap.exists) {
            await ref.set({
              uid: firebaseUser.uid,
              email: firebaseUser.email || null,
              displayName: firebaseUser.displayName || null,
              plan: "free",
              role: "owner",
              createdAt: nativeFirestore.FieldValue.serverTimestamp(),
            });
          }
          isNewUser.current = false;
        }
        setUser(firebaseUser);
        setLoading(false);
      });
      return unsub;
    }
  }, []);

  // ── Google Sign In ────────────────────────────────────────────────────────
  const signInWithGoogle = useCallback(async () => {
    if (isWeb) {
      const provider = new GoogleAuthProvider();
      isNewUser.current = true;
      // Always use popup — works in all modern browsers including Safari.
      // signInWithRedirect requires /__/auth/ to be served by Firebase Hosting;
      // our Vercel proxy handles this, but popup is simpler and more reliable.
      await signInWithPopup(webAuth, provider);
    } else {
      try {
        await GoogleSignin.hasPlayServices();
        const response = await GoogleSignin.signIn();
        // Handle both v12 (returns { idToken }) and v16+ (returns { type, data: { idToken } })
        const idToken: string | null =
          (response as any).idToken ?? (response as any).data?.idToken ?? null;
        if (!idToken) throw new Error("Google Sign-In: no idToken returned.");
        const credential = nativeAuth.GoogleAuthProvider.credential(idToken);
        isNewUser.current = true;
        await nativeAuth().signInWithCredential(credential);
      } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) return;
        if (error.code === statusCodes.IN_PROGRESS) return;
        throw error;
      }
    }
  }, []);

  // ── Apple Sign In ─────────────────────────────────────────────────────────
  const signInWithApple = useCallback(async () => {
    if (isWeb) {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      isNewUser.current = true;
      // Use popup for all browsers — requires app.mypetdex.app to be an
      // authorized domain in Firebase console.
      await signInWithPopup(webAuth, provider);
    } else {
      try {
        const nonce = generateNonce();
        const hashedNonce = await sha256(nonce);
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
          nonce: hashedNonce,
        });
        const { identityToken } = credential;
        if (!identityToken) throw new Error("No identity token");
        // Use AppleAuthProvider.credential — the correct API for @react-native-firebase/auth v18+
        // nativeAuth.OAuthProvider.credential() is not a static method and throws silently
        const firebaseCredential = nativeAuth.AppleAuthProvider.credential(identityToken, nonce);
        isNewUser.current = true;
        await nativeAuth().signInWithCredential(firebaseCredential);
      } catch (error: any) {
        if (error.code === "ERR_REQUEST_CANCELED") return;
        throw error;
      }
    }
  }, []);

  // ── Anonymous ─────────────────────────────────────────────────────────────
  const signInAnonymously = useCallback(async () => {
    isNewUser.current = true;
    if (isWeb) {
      await webSignInAnonymously(webAuth);
    } else {
      await nativeAuth().signInAnonymously();
    }
  }, []);

  // ── Sign Out ──────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    if (isWeb) {
      await webSignOut(webAuth);
    } else {
      await Promise.allSettled([nativeAuth().signOut(), GoogleSignin.signOut()]);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signInWithGoogle, signInWithApple, signInAnonymously, signOut, appleAvailable }),
    [user, loading, signInWithGoogle, signInWithApple, signInAnonymously, signOut, appleAvailable]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Crypto helpers ────────────────────────────────────────────────────────────
// Use Math.random() — crypto.getRandomValues is not available in all RN/Hermes
// versions. A one-time nonce doesn't need cryptographic randomness.
function generateNonce(length = 32): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
}

// Pure-JS SHA-256 — no crypto.subtle required (works in all RN/Hermes versions)
async function sha256(input: string): Promise<string> {
  // Try Web Crypto first (available on web and newer RN)
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hash = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {}
  }
  return sha256Pure(input);
}

function sha256Pure(message: string): string {
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  // UTF-8 encode
  const bytes: number[] = [];
  for (let i = 0; i < message.length; i++) {
    const c = message.charCodeAt(i);
    if (c < 0x80) bytes.push(c);
    else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bitLen / Math.pow(2, i * 8)) & 0xff);
  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a;
  let h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
  for (let i = 0; i < bytes.length; i += 64) {
    const w: number[] = Array(64).fill(0);
    for (let j = 0; j < 16; j++)
      w[j] = ((bytes[i+j*4]<<24)|(bytes[i+j*4+1]<<16)|(bytes[i+j*4+2]<<8)|bytes[i+j*4+3])>>>0;
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j-15],7)^rotr(w[j-15],18)^(w[j-15]>>>3);
      const s1 = rotr(w[j-2],17)^rotr(w[j-2],19)^(w[j-2]>>>10);
      w[j] = (w[j-16]+s0+w[j-7]+s1)>>>0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let j = 0; j < 64; j++) {
      const S1=rotr(e,6)^rotr(e,11)^rotr(e,25), ch=(e&f)^(~e&g);
      const t1=(h+S1+ch+K[j]+w[j])>>>0;
      const S0=rotr(a,2)^rotr(a,13)^rotr(a,22), maj=(a&b)^(a&c)^(b&c);
      const t2=(S0+maj)>>>0;
      h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;
    h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(x=>x.toString(16).padStart(8,"0")).join("");
}
