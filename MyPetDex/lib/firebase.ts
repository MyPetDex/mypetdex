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
  apiKey: "AIzaSyDaN37qj7QBWN3Ro98KOrhPk5i8rKVnWx8",
  authDomain: "auth.mypetdex.app",
  projectId: "mypetdex-c4315",
  storageBucket: "mypetdex-c4315.firebasestorage.app",
  messagingSenderId: "209772699227",
  appId: "1:209772699227:web:68d547574d8d068f6da97e",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth with AsyncStorage persistence — users stay logged in between app restarts
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

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
  const response = await fetch(localUri);
  const blob = await response.blob();
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
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
export const isWeb = false;
export const webAuth = auth;
export const webDb = db;
export const webFunctions = functions;
export const webStorage = storage;
