import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDaN37qj7QBWN3Ro98KOrhPk5i8rKVnWx8",
  authDomain: "mypetdex-c4315.firebaseapp.com",
  projectId: "mypetdex-c4315",
  storageBucket: "mypetdex-c4315.firebasestorage.app",
  messagingSenderId: "209772699227",
  appId: "1:209772699227:web:68d547574d8d068f6da97e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { GoogleAuthProvider, signInWithPopup };
export const db = getFirestore(app);

// --- App Check (reCAPTCHA v3) ------------------------------------------------
// Provide a `REACT_APP_RECAPTCHA_KEY` environment variable with your reCAPTCHA v3
// site key. Register both your production origin and http://localhost:3000 in
// the reCAPTCHA admin console and the Firebase App Check settings.

const RECAPTCHA_KEY = process.env.REACT_APP_RECAPTCHA_KEY;
if (!RECAPTCHA_KEY && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  // Enable debug mode for local development. This will print a debug token to
  // the browser console that you can add in the Firebase Console -> App Check
  // -> Debug tokens (or leave enabled during dev).
  // NOTE: set this only in development environments.
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.warn('App Check debug mode enabled for localhost. Set REACT_APP_RECAPTCHA_KEY for production.');
}

if (RECAPTCHA_KEY) {
  try {
    const provider = new ReCaptchaV3Provider(RECAPTCHA_KEY);
    initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
    console.log('Firebase App Check initialized');
  } catch (e) {
    console.warn('Could not initialize App Check:', e);
  }
} else {
  console.warn('REACT_APP_RECAPTCHA_KEY not set - App Check disabled');
}