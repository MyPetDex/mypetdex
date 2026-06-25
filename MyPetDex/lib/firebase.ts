import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth, getReactNativePersistence,
  GoogleAuthProvider, OAuthProvider,
  onAuthStateChanged, signOut, signInAnonymously,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithCredential, updateProfile, sendEmailVerification,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initializeFirestore, doc, collection, getDoc, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, getDocs, query, where,
  orderBy, serverTimestamp, arrayUnion, arrayRemove, increment,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBdAkYiA3HJe5a0uvdbeRK_iD-GOljg38U",
  authDomain: "auth.mypetdex.app",
  projectId: "mypetdex-c4315",
  storageBucket: "mypetdex-c4315.firebasestorage.app",
  messagingSenderId: "209772699227",
  appId: "1:209772699227:web:68d547574d8d068f6da97e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth with AsyncStorage persistence — users stay logged in between app restarts
let auth: ReturnType<typeof initializeAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialized — get existing instance
  const { getAuth } = require("firebase/auth");
  auth = getAuth(app);
}
export { auth };

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const functions = getFunctions(app);
export const storage = getStorage(app);

// ── Firestore path helpers ────────────────────────────────────────────────────
export const userRef = (uid: string) => doc(db, "users", uid);
export const petsRef = (uid: string) => collection(db, "users", uid, "pets");
export const petRef = (uid: string, petId: string) => doc(db, "users", uid, "pets", petId);

// ── Storage helper ────────────────────────────────────────────────────────────
export async function uploadPetPhoto(uid: string, petId: string, localUri: string): Promise<string> {
  const storageRef = ref(storage, `users/${uid}/pets/${petId}/photo.jpg`);
  try {
    console.error("[uploadPetPhoto] start", { uid, petId, localUri });

    const response = await fetch(localUri);
    console.error("[uploadPetPhoto] fetch response", {
      ok: response.ok,
      status: response.status,
      contentType: response.headers.get("content-type"),
    });

    if (!response.ok) {
      throw new Error(`Failed to read photo (${response.status})`);
    }

    const blob = await response.blob();
    console.error("[uploadPetPhoto] blob ready", {
      localUri,
      size: blob.size,
      type: blob.type,
    });

    if (!blob.size) {
      throw new Error("Photo file is empty");
    }

    const contentType = blob.type && blob.type !== "application/octet-stream"
      ? blob.type
      : "image/jpeg";

    console.error("[uploadPetPhoto] uploading", { contentType, path: `users/${uid}/pets/${petId}/photo.jpg` });
    await uploadBytes(storageRef, blob, { contentType });

    const downloadURL = await getDownloadURL(storageRef);
    console.error("[uploadPetPhoto] success", { downloadURL });
    return downloadURL;
  } catch (err: unknown) {
    const firebaseErr = err as { code?: string; message?: string; customData?: { serverResponse?: string } };
    console.error("[uploadPetPhoto] failed", {
      localUri,
      code: firebaseErr?.code,
      message: firebaseErr?.message ?? String(err),
      serverResponse: firebaseErr?.customData?.serverResponse,
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }
}

// ── Callable functions ────────────────────────────────────────────────────────
export const callFunction = <T = unknown>(name: string) =>
  httpsCallable<unknown, T>(functions, name);

// Re-export so screens only need to import from "@/lib/firebase"
export {
  GoogleAuthProvider, OAuthProvider,
  onAuthStateChanged, signOut, signInAnonymously,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithCredential, updateProfile, sendEmailVerification,
  doc, collection, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, getDocs, query, where, orderBy, serverTimestamp,
  arrayUnion, arrayRemove, increment,
  ref, uploadBytes, getDownloadURL,
};

// Legacy compat aliases
export const webAuth = auth;
export const webDb = db;
export const webFunctions = functions;
export const webStorage = storage;
