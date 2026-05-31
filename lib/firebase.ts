import { Platform } from "react-native";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc as webDoc, collection as webCollection } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDaN37qj7QBWN3Ro98KOrhPk5i8rKVnWx8",
  authDomain: "app.mypetdex.app",
  projectId: "mypetdex-c4315",
  storageBucket: "mypetdex-c4315.firebasestorage.app",
  messagingSenderId: "209772699227",
  appId: "1:209772699227:web:68d547574d8d068f6da97e",
};

const webApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const webAuth = getAuth(webApp);
export const webDb = getFirestore(webApp);
export const webFunctions = getFunctions(webApp);
export const webStorage = getStorage(webApp);

export const isWeb = Platform.OS === "web";

let nativeAuth: any = null;
let nativeFirestore: any = null;
let nativeFunctions: any = null;
let nativeStorage: any = null;

if (!isWeb) {
  nativeAuth = require("@react-native-firebase/auth").default;
  nativeFirestore = require("@react-native-firebase/firestore").default;
  nativeFunctions = require("@react-native-firebase/functions").default;
  nativeStorage = require("@react-native-firebase/storage").default;
}

export const auth = isWeb ? webAuth : nativeAuth;
export const firestore = isWeb ? webDb : nativeFirestore;
export const functions = isWeb ? webFunctions : nativeFunctions;
export const storage = isWeb ? webStorage : nativeStorage;

export async function signInWithGoogleWeb() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(webAuth, provider);
  return result.user;
}

export const userDoc = (uid: string) => {
  if (isWeb) return webDoc(webDb, "users", uid);
  return nativeFirestore().collection("users").doc(uid);
};

export const petsCol = (uid: string) => {
  if (isWeb) return webCollection(webDb, "users", uid, "pets");
  return nativeFirestore().collection("users").doc(uid).collection("pets");
};

export const petDoc = (uid: string, petId: string) => {
  if (isWeb) return webDoc(webDb, "users", uid, "pets", petId);
  return nativeFirestore().collection("users").doc(uid).collection("pets").doc(petId);
};

export const callFunction = (name: string) => {
  if (isWeb) return httpsCallable(webFunctions, name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (nativeFunctions() as any).httpsCallable(name);
};

export async function uploadPetPhoto(uid: string, petId: string, localUri: string): Promise<string> {
  if (isWeb) {
    const { ref, uploadString, getDownloadURL } = require("firebase/storage");
    const storageRef = ref(webStorage, `users/${uid}/pets/${petId}/photo.jpg`);
    await uploadString(storageRef, localUri, "data_url");
    return getDownloadURL(storageRef);
  }
  const storageRef = nativeStorage().ref(`users/${uid}/pets/${petId}/photo.jpg`);
  await storageRef.putFile(localUri);
  return storageRef.getDownloadURL();
}
