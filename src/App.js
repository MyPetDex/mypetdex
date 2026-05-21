import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { hasFeature, UpgradePrompt } from './planUtils';
import { auth, db, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, requestNotificationPermission } from "./firebase";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  OAuthProvider,
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  doc, setDoc, getDoc, getDocs, collection, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, where
} from "firebase/firestore";

// ─── REFERRAL UTILITIES ──────────────────────────────────────────
function generateRefCode(name, uid) {
  const prefix = (name || "PET").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) || "MPD";
  const suffix = uid.slice(-4).toUpperCase();
  return `MPD-${prefix}-${suffix}`;
}
function getReferralCodeFromURL() {
  const fromURL = new URLSearchParams(window.location.search).get("ref");
  if (fromURL) sessionStorage.setItem("pendingRefCode", fromURL);
  return sessionStorage.getItem("pendingRefCode") || null;
}

const C = {
  bg: "#F5F8FF", card: "#FFFFFF", cardBorder: "#E2E8F0",
  green: "#3B82F6", gold: "#F59E0B", text: "#1E293B",
  muted: "#64748B", danger: "#E05C5C", inputBg: "#EEF4FF",
};
const font = "'Nunito', sans-serif";
const btn = (bg = C.green, color = "#0F1A14") => ({
  background: bg, color, border: "none", borderRadius: 12,
  padding: "12px 28px", fontFamily: font, fontWeight: 800,
  fontSize: 15, cursor: "pointer",
});
const input = {
  background: C.inputBg, border: `1.5px solid ${C.cardBorder}`,
  borderRadius: 10, padding: "11px 14px", color: C.text,
  fontFamily: font, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none",
};
const card = {
  background: C.card, border: `1.5px solid ${C.cardBorder}`,
  borderRadius: 18, padding: 22,
};
const label = {
  display: "block", color: C.muted, fontSize: 12, fontWeight: 700,
  marginBottom: 5, textTransform: "uppercase", letterSpacing: 1,
};

const DOG_BREEDS = [
  "Australian Shepherd","Labrador Retriever","Golden Retriever","German Shepherd",
  "French Bulldog","Bulldog","Poodle","Beagle","Rottweiler","Yorkshire Terrier",
  "Dachshund","Siberian Husky","Boxer","Shih Tzu","Doberman Pinscher",
  "Great Dane","Miniature Schnauzer","Cavalier King Charles Spaniel","Chihuahua",
  "Border Collie","Maltese","Pomeranian","Boston Terrier","Shetland Sheepdog",
  "Bernese Mountain Dog","Cocker Spaniel","Havanese","Brittany","Basenji",
  "Bichon Frise","Weimaraner","Vizsla","Belgian Malinois","Akita","Samoyed",
  "Alaskan Malamute","Bloodhound","Collie","Dalmatian","Irish Setter",
  "Jack Russell Terrier","Lhasa Apso","Mastiff","Newfoundland","Papillon",
  "Pug","Saint Bernard","Scottish Terrier","Whippet","Cane Corso",
  "Australian Cattle Dog","Blue Heeler","Rhodesian Ridgeback","Shiba Inu",
  "Chow Chow","Pit Bull Terrier","American Staffordshire Terrier","Bull Terrier",
  "West Highland White Terrier","Cairn Terrier","Airedale Terrier","Schnauzer",
  "Giant Schnauzer","Portuguese Water Dog","Flat-Coated Retriever","Chesapeake Bay Retriever",
  "Irish Wolfhound","Greyhound","Whippet","Italian Greyhound","Borzoi",
  "Dogo Argentino","Boerboel","Leonberger","Tibetan Mastiff","Anatolian Shepherd",
  "Great Pyrenees","Bouvier des Flandres","Belgian Tervuren","Belgian Sheepdog",
  "Old English Sheepdog","Bearded Collie","Miniature Pinscher","Toy Fox Terrier",
  "Brussels Griffon","Affenpinscher","Japanese Chin","Pekingese","Silky Terrier",
  "Chinese Crested","Xoloitzcuintli","Plott Hound","Treeing Walker Coonhound",
  "Black and Tan Coonhound","Bluetick Coonhound","Redbone Coonhound","Harrier",
  "Norwegian Elkhound","Finnish Spitz","Keeshond","American Eskimo Dog",
  "Spitz","Eurasier","Lagotto Romagnolo","Spinone Italiano","Bracco Italiano",
  "Mixed Breed","Other"
];
const CAT_BREEDS = [
  "Domestic Shorthair","Domestic Longhair","Maine Coon","Persian","Siamese",
  "Ragdoll","Bengal","British Shorthair","Abyssinian","Russian Blue",
  "Scottish Fold","Sphynx","Norwegian Forest Cat","Birman","Tonkinese",
  "American Shorthair","Burmese","Devon Rex","Cornish Rex","Oriental",
  "Turkish Angora","Himalayan","Savannah","Manx","Exotic Shorthair",
  "Chartreux","Egyptian Mau","Balinese","Somali","Singapura",
  "Ocicat","American Curl","Scottish Straight","Selkirk Rex","LaPerm",
  "Ragamuffin","Chausie","Pixiebob","Bombay","Havana Brown",
  "Colorpoint Shorthair","Javanese","Turkish Van","Siberian","Nebelung",
  "Korat","Asian","Burmilla","Tiffanie","Australian Mist",
  "Toyger","California Spangled","Serengeti","Peterbald","Don Sphynx",
  "Mixed","Other"
];
const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa",
  "Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan",
  "Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];
const VACCINES_DOG = ["Rabies","DHPP","Bordetella","Leptospirosis","Lyme Disease","Canine Influenza","Other"];
const VACCINES_CAT = ["Rabies","FVRCP","FeLV","FIV","Bordetella","Other"];
// eslint-disable-next-line no-unused-vars
const SEED_PROVIDERS = [
  { id:1, name:"Happy Paws Grooming", state:"New Jersey", city:"Princeton", service:"Grooming", price:"$40-$80", rating:4.8, reviews:127, googleReview:"https://maps.google.com", logo:"🐩" },
  { id:2, name:"Garden State Dog Walking", state:"New Jersey", city:"Newark", service:"Dog Walking", price:"$20-$35/hr", rating:4.9, reviews:89, googleReview:"https://maps.google.com", logo:"🦮" },
  { id:3, name:"PetMed NJ", state:"New Jersey", city:"Trenton", service:"Veterinary", price:"$60-$200", rating:4.7, reviews:212, googleReview:"https://maps.google.com", logo:"🩺" },
  { id:4, name:"Sunny Paws Grooming", state:"Florida", city:"Miami", service:"Grooming", price:"$35-$75", rating:4.6, reviews:98, googleReview:"https://maps.google.com", logo:"🐾" },
  { id:5, name:"Empire Pet Care", state:"New York", city:"New York City", service:"Dog Walking", price:"$25-$40/hr", rating:4.8, reviews:310, googleReview:"https://maps.google.com", logo:"🗽" },
];
// eslint-disable-next-line no-unused-vars
const DOG_RECIPES = [
  { id:1, name:"Chicken & Rice Bowl", time:"25 min", emoji:"🍚", ingredients:["1 cup cooked chicken","1/2 cup brown rice","1 carrot (diced)","1/2 cup peas"], steps:["Cook chicken thoroughly","Boil rice until soft","Steam carrots and peas","Mix all together, cool before serving"] },
  { id:2, name:"Peanut Butter Treats", time:"15 min", emoji:"🥜", ingredients:["1 cup oat flour","1/2 cup peanut butter (xylitol-free)","2 eggs","1/4 cup water"], steps:["Preheat oven to 350F","Mix all ingredients into dough","Roll and cut into shapes","Bake 15 min until golden"] },
  { id:3, name:"Sweet Potato & Turkey", time:"30 min", emoji:"🍠", ingredients:["1 cup ground turkey","1 sweet potato (mashed)","1/2 cup green beans","1 tbsp olive oil"], steps:["Brown turkey in pan","Boil and mash sweet potato","Steam green beans","Combine with olive oil, cool before serving"] },
];
// eslint-disable-next-line no-unused-vars
const CAT_RECIPES = [
  { id:1, name:"Tuna & Pumpkin Pate", time:"10 min", emoji:"🐟", ingredients:["1 can tuna in water","2 tbsp pumpkin puree","1 tbsp plain yogurt"], steps:["Drain tuna well","Blend with pumpkin and yogurt","Serve at room temp","Store remainder in fridge max 2 days"] },
  { id:2, name:"Chicken Liver Bites", time:"20 min", emoji:"🍗", ingredients:["1/2 cup chicken liver","1 egg","2 tbsp oat flour"], steps:["Cook liver until fully done","Mash with fork","Mix in egg and flour","Form small bites, bake 12 min at 325F"] },
  { id:3, name:"Salmon Mousse", time:"10 min", emoji:"🍣", ingredients:["1 can salmon (no salt)","1 tbsp plain cream cheese","1 tsp parsley"], steps:["Drain salmon","Blend with cream cheese until smooth","Garnish with parsley","Serve small portions"] },
];
// eslint-disable-next-line no-unused-vars
const SHELTERS = [
  { id:1, name:"Second Chance Animal Shelter", state:"New Jersey", city:"Camden", pets:[{name:"Bella",type:"Dog",breed:"Labrador Mix",age:"2yr",emoji:"🐕"},{name:"Mochi",type:"Cat",breed:"Tabby",age:"1yr",emoji:"🐈"}] },
  { id:2, name:"Florida Pet Rescue", state:"Florida", city:"Orlando", pets:[{name:"Rocky",type:"Dog",breed:"Pitbull Mix",age:"3yr",emoji:"🐕"},{name:"Luna",type:"Cat",breed:"Siamese",age:"4mo",emoji:"🐈"}] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Avatar({ emoji, size = 54, img }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: C.cardBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0, overflow: "hidden" }}>
      {img ? <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : emoji}
    </div>
  );
}
function Badge({ text, color = C.green }) {
  return <span style={{ background: color + "22", color, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700, border: `1px solid ${color}44` }}>{text}</span>;
}
function Field({ label: lbl, type = "text", value, onChange, placeholder, as, options, required }) {
  if (as === "select") return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={label}>{lbl}</span>
      <div style={{ position: "relative" }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...input, appearance: "none", paddingRight: 36 }}>
          <option value="">Select...</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted, fontSize: 14 }}>▼</span>
      </div>
    </label>
  );
  if (as === "textarea") return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={label}>{lbl}</span>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} style={{ ...input, resize: "vertical" }} />
    </label>
  );
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <span style={label}>{lbl}{required && " *"}</span>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={input} />
    </label>
  );
}
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 36, height: 36, border: `3px solid ${C.cardBorder}`, borderTop: `3px solid ${C.green}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );
}
function Toast({ message }) {
  return (
    <div style={{ position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)", background: C.green, color: "#0F1A14", padding: "12px 24px", borderRadius: 12, fontFamily: font, fontWeight: 800, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", whiteSpace: "nowrap" }}>
      {message}
    </div>
  );
}
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

export default function App() {
  const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const [user, setUser] = useState(null); // eslint-disable-line no-unused-vars
  const [profile, setProfile] = useState(null);
  const urlPlanFromURL = new URLSearchParams(window.location.search).get("plan");
  if (urlPlanFromURL) sessionStorage.setItem("selectedPlan", urlPlanFromURL);
  const urlPlan = sessionStorage.getItem("selectedPlan") || "free";
  const urlRoleFromURL = new URLSearchParams(window.location.search).get("role");
  if (urlRoleFromURL) sessionStorage.setItem("selectedRole", urlRoleFromURL);
  const urlRole = sessionStorage.getItem("selectedRole") || "owner";
  // Show role picker on fresh open; skip if URL has ?role= or role already chosen this session
  const [screen, setScreen] = useState(() =>
    (urlRoleFromURL || sessionStorage.getItem("selectedRole")) ? "landing" : "role-pick"
  );
  const [loading, setLoading] = useState(true);
  const [appleSignInPending, setAppleSignInPending] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authLoadingMsg, setAuthLoadingMsg] = useState("Signing in...");
  const [tab, setTab] = useState("home");
  const [authError, setAuthError] = useState("");
  const authErrTimer = useRef(null);
  const showAuthError = (msg) => {
    setAuthError(msg);
    if (authErrTimer.current) clearTimeout(authErrTimer.current);
    authErrTimer.current = setTimeout(() => setAuthError(""), 6000);
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      select {
        background-color: ${C.inputBg} !important;
      -webkit-box-shadow: 0 0 0px 1000px ${C.inputBg} inset !important;
      -webkit-text-fill-color: ${C.text} !important;
        border: 1.5px solid ${C.cardBorder} !important;
        border-radius: 10px !important;
        padding: 11px 14px !important;
        color: ${C.text} !important;
        font-family: ${font} !important;
        font-size: 14px !important;
        width: 100% !important;
        box-sizing: border-box !important;
        outline: none !important;
        cursor: pointer !important;
      }
      select option {
        background: ${C.card} !important;
        color: ${C.text} !important;
      }
      select:focus {
        border-color: ${C.green} !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);


  // Handle redirect result on page load (mobile Google/Apple auth)
  useEffect(() => {
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
        const u = result.user;
        setAuthLoading(false);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) { setProfile(snap.data()); setScreen("app"); }
        else { setUser(u); setScreen("google-role"); }
      } else {
        setAuthLoading(false);
      }
    }).catch((e) => {
      setAuthLoading(false);
      if (e.code !== "auth/popup-closed-by-user") {
        console.error("Redirect sign-in error:", e);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setTimeout(() => requestNotificationPermission(firebaseUser.uid), 3000);
        // Handle payment success redirect
      const paymentStatus = new URLSearchParams(window.location.search).get('payment');
      const paymentPlan = new URLSearchParams(window.location.search).get('plan');
      const paymentBilling = new URLSearchParams(window.location.search).get('billing') || 'monthly';

      // After email verification, redirect to Stripe for paid plans
      if (paymentStatus === 'pending' && paymentPlan && (paymentPlan === 'plus' || paymentPlan === 'family')) {
        const PRICES = {
          plus: "price_1TVxf1KrbYhlx0Wng1THRLur",
          family: "price_1TVxjIKrbYhlx0WnXcSBrbcG"
        };
        try {
          const res = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/createCheckoutSession", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceId: PRICES[paymentPlan], userId: firebaseUser.uid, email: firebaseUser.email, plan: paymentPlan, billing: "monthly" })
          });
          const data = await res.json();
          if (data.url) { window.location.href = data.url; return; }
        } catch(e) { console.error("Checkout redirect error:", e); }
      }

      if (paymentStatus === 'success' && paymentPlan) {
        try {
          const { updateDoc } = await import('firebase/firestore');
          await updateDoc(doc(db, 'users', firebaseUser.uid), { plan: paymentPlan, billing: paymentBilling });
          window.history.replaceState({}, '', window.location.pathname);
        } catch(e) { console.error('Plan update error:', e); }
      }
      const isOAuthUser = firebaseUser.providerData?.some(p =>
          p.providerId === 'google.com' || p.providerId === 'apple.com'
        );
      if (firebaseUser.email === 'mypetdexapp@gmail.com') {
          setScreen('admin');
          setLoading(false);
        } else if (!firebaseUser.emailVerified && !isOAuthUser && firebaseUser.email !== 'demo@mypetdex.app') {
          setScreen('verify');
          setLoading(false);
        } else {
          try {
            const snap = await getDoc(doc(db, "users", firebaseUser.uid));
            // Always load fresh plan from Firestore — never use cached plan
            const freshData = snap.exists() ? snap.data() : {};
            const userData = { 
              email: firebaseUser.email, 
              role: "owner", 
              plan: "free",
              ...freshData,
              uid: firebaseUser.uid
            };
            // Generate and save refCode if missing
            if (!userData.refCode && snap.exists()) {
              const newRefCode = generateRefCode(userData.name || userData.email, firebaseUser.uid);
              userData.refCode = newRefCode;
              userData.referralCount = userData.referralCount || 0;
              try {
                await updateDoc(doc(db, "users", firebaseUser.uid), { 
                  refCode: newRefCode, 
                  referralCount: userData.referralCount 
                });
                console.log("✅ RefCode generated and saved:", newRefCode);
              } catch(e) { console.error("RefCode save error:", e); }
            }
            // Sync refCode if missing
            if (snap.exists() && !snap.data().refCode) {
              const newRefCode = generateRefCode(userData.name || userData.email, firebaseUser.uid);
              await updateDoc(doc(db, "users", firebaseUser.uid), { refCode: newRefCode, referralCount: snap.data().referralCount || 0 });
              userData.refCode = newRefCode;
            }
            setProfile(userData);
          } catch (e) {
            console.error("Error loading profile:", e);
          }
          setScreen('app');
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        // Show role picker on fresh open; go to landing if role already chosen this session
        setScreen(sessionStorage.getItem("selectedRole") ? "landing" : "role-pick");
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === 'true') {
      setLoading(true);
      signInWithEmailAndPassword(auth, 'demo@mypetdex.app', 'Demo2026!')
        .then(() => {
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch(err => {
          console.log('Demo login failed:', err);
          setLoading(false);
        });
    }
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: font }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 52 }}>🐾</div>
        <div style={{ color: C.green, fontWeight: 900, fontSize: 24, marginTop: 8 }}>MyPetDex</div>
        <Spinner />
      </div>
    </div>
  );

  // ── Auth error toast shown on top of any screen ──────────────────────────────

  // Unified Google sign-in — popup on desktop, redirect on mobile
  // eslint-disable-next-line no-unused-vars
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    if (isMobileDevice) {
      setAuthLoading(true);
      setAuthLoadingMsg("Redirecting to Google...");
      await signInWithRedirect(auth, provider);
    } else {
      try {
        const result = await signInWithPopup(auth, provider);
        const u = result.user;
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) { setProfile(snap.data()); setScreen("app"); }
        else { setUser(u); setScreen("google-role"); }
      } catch (e) {
        if (e.code !== "auth/popup-closed-by-user") {
          showAuthError("Google sign-in failed. Please try again or use email.");
        }
      }
    }
  };

  // Unified Apple sign-in — popup on desktop, redirect on mobile
  // eslint-disable-next-line no-unused-vars
  const handleAppleSignIn = async () => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    if (isMobileDevice) {
      setAuthLoading(true);
      setAuthLoadingMsg("Redirecting to Apple...");
      await signInWithRedirect(auth, provider);
    } else {
      try {
        const result = await signInWithPopup(auth, provider);
        const u = result.user;
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) { setProfile(snap.data()); setScreen("app"); }
        else { setUser(u); setScreen("google-role"); }
      } catch (e) {
        if (e.code !== "auth/popup-closed-by-user") {
          showAuthError("Apple Sign-In failed. Please try again or use email.");
        }
      }
    }
  };

  const wrap = (el) => (
    <>
      {/* Branded auth loading screen — shown during redirect on mobile */}
      {authLoading && (
        <div style={{ position: "fixed", inset: 0, background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10000, fontFamily: font }}>
          <img src="/logo.png" alt="MyPetDex" style={{ width: 90, height: 90, borderRadius: 24, marginBottom: 24, boxShadow: "0 4px 24px rgba(59,130,246,0.2)" }} />
          <div style={{ fontWeight: 900, fontSize: 28, color: "#1E293B", letterSpacing: -0.5, marginBottom: 8 }}>MyPetDex</div>
          <div style={{ color: "#64748B", fontSize: 15, marginBottom: 32 }}>{authLoadingMsg}</div>
          <div style={{ width: 40, height: 40, border: "3px solid #E2E8F0", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {authError && (
        <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: C.danger, color: "#fff", padding: "13px 24px", borderRadius: 14, fontFamily: font, fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", maxWidth: "88vw", textAlign: "center", lineHeight: 1.4 }}>
          {authError}
        </div>
      )}
      {appleSignInPending && (
        <div style={{ position: "fixed", inset: 0, background: "#FFFFFF", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10000, fontFamily: font }}>
          <img src="/logo.png" alt="MyPetDex" style={{ width: 90, height: 90, borderRadius: 24, marginBottom: 24, boxShadow: "0 4px 24px rgba(59,130,246,0.2)" }} />
          <div style={{ fontWeight: 900, fontSize: 28, color: "#1E293B", letterSpacing: -0.5, marginBottom: 8 }}>MyPetDex</div>
          <div style={{ color: "#64748B", marginTop: 10, fontSize: 15 }}>Signing in with Apple…</div>
          <div style={{ marginTop: 32, width: 40, height: 40, border: "3px solid #E2E8F0", borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {el}
    </>
  );

  if (screen === "role-pick") return wrap(<RolePickerScreen onSelectRole={(role) => {
    sessionStorage.setItem("selectedRole", role);
    setScreen("landing");
  }} onLogin={() => setScreen("login")} />);
  if (screen === "admin") return wrap(<AdminDashboard onLogout={async () => { await signOut(auth); setScreen("landing"); }} />);
  if (screen === "landing") return wrap(<Landing onRegister={() => setScreen("register")} onLogin={() => setScreen("login")} onGoogle={async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        setProfile(snap.data());
        setScreen("app");
      } else {
        setUser(u);
        setScreen("google-role");
      }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        console.error("Google sign in error:", e);
        showAuthError("Google sign-in failed. Please try again or use email to sign in.");
      }
    }
  }} onApple={async () => {
    try {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      setAppleSignInPending(true);
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const snap = await getDoc(doc(db, "users", u.uid));
      setAppleSignInPending(false);
      if (snap.exists()) { setProfile(snap.data()); setScreen("app"); }
      else { setUser(u); setScreen("google-role"); }
    } catch (e) {
      setAppleSignInPending(false);
      if (e.code !== "auth/popup-closed-by-user") {
        console.error("Apple sign in error:", e);
        showAuthError("Apple Sign-In failed. Please try again or use Google or email.");
      }
    }
  }} urlRole={urlRole} onBack={() => { sessionStorage.removeItem("selectedRole"); sessionStorage.removeItem("selectedPlan"); setScreen("role-pick"); }} />);
  if (screen === "google-role") return wrap(<GoogleRoleScreen user={user} initialPlan={urlPlan} initialRole={urlRole} onSuccess={(p) => { setProfile(p); setScreen("app"); }} onLogout={async () => { await signOut(auth); setScreen("landing"); }} />);
  if (screen === "register") return wrap(<RegisterScreen onBack={() => setScreen("landing")} onSuccess={(p) => { setProfile(p); p.skipVerify ? setScreen("app") : setScreen("verify"); }} initialPlan={urlPlan} initialRole={urlRole} onApple={async () => { try { const provider = new OAuthProvider("apple.com"); provider.addScope("email"); provider.addScope("name"); const result = await signInWithPopup(auth, provider); const u = result.user; const snap = await getDoc(doc(db, "users", u.uid)); if (snap.exists()) { setProfile(snap.data()); setScreen("app"); } else { setUser(u); setScreen("google-role"); } } catch (e) { if (e.code !== "auth/popup-closed-by-user") { console.error("Apple sign in error:", e); showAuthError("Apple Sign-In isn't configured yet — please use Google or email to sign in."); } } }} onGoogle={async () => { try { const provider = new GoogleAuthProvider(); const result = await signInWithPopup(auth, provider); const u = result.user; const snap = await getDoc(doc(db, "users", u.uid)); if (snap.exists()) { setProfile(snap.data()); setScreen("app"); } else { setUser(u); setScreen("google-role"); } } catch (e) { if (e.code !== "auth/popup-closed-by-user") { console.error("Google sign in error:", e); showAuthError("Google sign-in failed. Please try again or use email to sign in."); } } }} />);
  if (screen === "login") return wrap(<LoginScreen onBack={() => setScreen("landing")} onSuccess={(p) => { setProfile(p); setScreen("app"); }} onReset={() => setScreen("reset")} onApple={async () => {
    try {
      const provider = new OAuthProvider("apple.com");
      provider.addScope("email");
      provider.addScope("name");
      setAppleSignInPending(true);
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const snap = await getDoc(doc(db, "users", u.uid));
      setAppleSignInPending(false);
      if (snap.exists()) { setProfile(snap.data()); setScreen("app"); }
      else { setUser(u); setScreen("google-role"); }
    } catch (e) {
      setAppleSignInPending(false);
      if (e.code !== "auth/popup-closed-by-user") {
        console.error("Apple sign in error:", e);
        showAuthError("Apple Sign-In failed. Please try again or use Google or email.");
      }
    }
  }} onGoogle={async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const u = result.user;
      const snap = await getDoc(doc(db, "users", u.uid));
      if (snap.exists()) {
        setProfile(snap.data());
        setScreen("app");
      } else {
        setUser(u);
        setScreen("google-role");
      }
    } catch (e) {
      if (e.code !== "auth/popup-closed-by-user") {
        console.error("Google sign in error:", e);
        showAuthError("Google sign-in failed. Please try again or use email to sign in.");
      }
    }
  }} />);
  if (screen === "reset") return wrap(<ResetPasswordScreen onBack={() => setScreen("login")} />);
  if (screen === "verify") return wrap(<VerifyEmail onVerified={async () => {
    const u = auth.currentUser;
    if (!u) return;
    // Force token refresh first
    try { await u.getIdToken(true); } catch(e) { console.error("Token refresh error:", e); }
    // Load profile from Firestore first (with retry - wait longer to ensure data is fresh)
    let userData = { email: u.email, role: urlRole || "owner", plan: "free" };
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise(r => setTimeout(r, 1500));
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          userData = snap.data();
          setProfile(userData);
          if (userData.pendingPlan) break; // Got what we need
          if (i === 4) break; // Last attempt
        }
      } catch(e) { console.error("Profile load attempt", i+1, "error:", e); }
    }
    // Save pending pet with correct verified uid
    const pendingPetStr = sessionStorage.getItem("pendingPet");
    if (pendingPetStr) {
      try {
        const pet = JSON.parse(pendingPetStr);
        if (pet.name) {
          const existingPets = await getDocs(query(collection(db, "pets"), where("uid", "==", u.uid)));
          if (existingPets.empty) {
            await addDoc(collection(db, "pets"), {
              name: pet.name, type: pet.type || "Dog",
              breed: pet.breed || "", age: pet.age || "",
              weight: pet.weight || "", feeding: "",
              nextVet: "", notes: "", vaccines: [], reminders: [],
              photoURL: "", uid: u.uid, ownerEmail: u.email,
              createdAt: new Date().toISOString()
            });
            console.log("✅ Pet saved after verification for uid:", u.uid);
          }
          sessionStorage.removeItem("pendingPet");
        }
      } catch(petErr) { console.error("Pet save error:", petErr); }
    }

    // Check if user has a pending paid plan to redirect to Stripe
    const pendingPlan = userData.pendingPlan;
    if (pendingPlan === "plus" || pendingPlan === "family") {
      await updateDoc(doc(db, "users", u.uid), { pendingPlan: null });
      const PRICES = {
        plus: "price_1TVxf1KrbYhlx0Wng1THRLur",
        family: "price_1TVxjIKrbYhlx0WnXcSBrbcG"
      };
      try {
        const res = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/createCheckoutSession", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId: PRICES[pendingPlan], userId: u.uid, email: u.email, plan: pendingPlan, billing: "monthly" })
        });
        const data = await res.json();
        if (data.url) { window.location.href = data.url; return; }
      } catch(e) { console.error("Checkout redirect error:", e); }
    }

    // Send welcome email only once — check flag first
    if (!userData.welcomeEmailSent) {
      try {
        await updateDoc(doc(db, "users", u.uid), { welcomeEmailSent: true });
        const res = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/sendVerifiedEmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: userData.role || "owner", email: u.email, name: userData.name || u.email.split("@")[0], profile: userData })
        });
        console.log("sendVerifiedEmail status:", res.status);
      } catch (emailErr) {
        console.error("Welcome email error:", emailErr);
      }
    }
    sessionStorage.removeItem("selectedRole");
    sessionStorage.removeItem("selectedPlan");
    setScreen("app");
  }} onLogout={async () => { await signOut(auth); sessionStorage.removeItem("selectedRole"); sessionStorage.removeItem("selectedPlan"); setScreen("role-pick"); }} />);
  if (screen === "app") return wrap(<MainApp user={user} profile={profile} tab={tab} setTab={setTab} onLogout={async () => { await signOut(auth); sessionStorage.removeItem("selectedRole"); sessionStorage.removeItem("selectedPlan"); setScreen("role-pick"); }} />);
}
function SubscriberList({ subscribers, C, card }) {
  const [subFilter, setSubFilter] = useState("all");
  const filtered = subscribers.filter(s => {
    if (subFilter === "active") return !s.cancelAtPeriodEnd;
    if (subFilter === "cancelling") return s.cancelAtPeriodEnd;
    return true;
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["all","All"],["active","✅ Active"],["cancelling","⚠️ Cancelling"]].map(([val, lbl]) => (
          <button key={val} onClick={() => setSubFilter(val)} style={{ padding: "6px 14px", fontSize: 12, borderRadius: 8, border: "1px solid " + (subFilter === val ? C.green : C.cardBorder), background: subFilter === val ? C.green + "22" : "none", color: subFilter === val ? C.green : C.muted, cursor: "pointer", fontWeight: 600 }}>{lbl}</button>
        ))}
      </div>
      {filtered.map(s => {
        const isCancelling = s.cancelAtPeriodEnd;
        const cancelDate = s.cancelAt ? new Date(s.cancelAt * 1000).toLocaleDateString() : "—";
        return (
          <div key={s.id} style={{ ...card, marginBottom: 10, borderLeft: "3px solid " + (isCancelling ? C.gold : C.green) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{s.name || s.email}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{s.email}</div>
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Joined: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</div>
                {isCancelling && <div style={{ color: C.gold, fontSize: 11, fontWeight: 700, marginTop: 2 }}>⚠️ Cancels {cancelDate}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ background: s.plan === "family" ? C.gold + "22" : C.green + "22", color: s.plan === "family" ? C.gold : C.green, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>{s.plan}</span>
                {isCancelling
                  ? <div style={{ background: C.gold + "22", color: C.gold, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginTop: 4 }}>Cancelling</div>
                  : <div style={{ background: C.green + "22", color: C.green, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginTop: 4 }}>Active</div>
                }
                <div style={{ color: C.muted, fontSize: 11, marginTop: 2, textTransform: "capitalize" }}>{s.billing || "monthly"}</div>
                <div style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>
                  ${s.plan === "plus" ? (s.billing === "yearly" ? "2.39" : "2.99") : (s.billing === "yearly" ? "3.99" : "4.99")}/mo
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminDashboard({ onLogout }) {
  const [adminTab, setAdminTab] = useState("shelters");
  const [shelters, setShelters] = useState([]);
  const [providers, setProviders] = useState([]);
  const [shelterPets, setShelterPets] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [subscribers, setSubscribers] = useState([]);

  useEffect(() => {
    const qSubs = query(collection(db, "users"), where("plan", "in", ["plus", "family"]));
    const unsubSubs = onSnapshot(qSubs, snap => setSubscribers(
      snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.stripeCustomerId) // Only count users with active Stripe customer
    ));
    const q1 = query(collection(db, "users"), where("role", "==", "shelter"));
    const unsub1 = onSnapshot(q1, snap => setShelters(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const q2 = query(collection(db, "users"), where("role", "==", "provider"));
    const unsub2 = onSnapshot(q2, snap => setProviders(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub3 = onSnapshot(collection(db, "shelterPets"), snap => {
      const petsMap = {};
      snap.docs.forEach(d => {
        const pet = { id: d.id, ...d.data() };
        if (!petsMap[pet.uid]) petsMap[pet.uid] = [];
        petsMap[pet.uid].push(pet);
      });
      setShelterPets(petsMap);
      setLoading(false);
    });
    return () => { unsubSubs(); unsub1(); unsub2(); unsub3(); };
  }, []);

  const updateStatus = async (uid, status) => {
    await updateDoc(doc(db, "users", uid), { status });
  };

  const toggleSuspend = async (uid, suspended) => {
    await updateDoc(doc(db, "users", uid), { suspended: !suspended });
  };

  const statusBadge = (status) => {
    const colors = { approved: C.green, rejected: C.danger, pending: C.gold };
    const labels = { approved: "✓ Approved", rejected: "✗ Rejected", pending: "⏳ Pending" };
    const s = status || "pending";
    return <span style={{ background: colors[s] + "22", color: colors[s], borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{labels[s]}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ background: C.card, borderBottom: "1px solid " + C.cardBorder, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>🛡️</span>
          <div>
            <span style={{ color: C.green, fontWeight: 900, fontSize: 20 }}>MyPetDex</span>
            <span style={{ color: C.gold, fontSize: 11, fontWeight: 800, marginLeft: 8, background: C.gold + "22", borderRadius: 6, padding: "2px 8px" }}>ADMIN</span>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: "1px solid " + C.cardBorder, borderRadius: 8, padding: "5px 12px", color: C.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>Sign out</button>
      </div>
      <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ ...card, flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{shelters.length}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>🏠 Shelters</div>
          </div>
          <div style={{ ...card, flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{providers.length}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>🛎️ Providers</div>
          </div>
          <div style={{ ...card, flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.gold }}>{shelters.filter(s => !s.status || s.status === "pending").length}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>⏳ Pending</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["shelters","providers","reviews","shop","subscribers","sitereviews"].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} style={{ ...btn(adminTab === t ? C.green : C.card, adminTab === t ? "#0F1A14" : C.muted), border: "1px solid " + (adminTab === t ? C.green : C.cardBorder), flex: 1, padding: "8px", fontSize: 12 }}>
              {t === "shelters" ? "🏠 Shelters" : t === "providers" ? "🛎️ Providers" : t === "reviews" ? "⭐ Reviews" : t === "shop" ? "🛒 Shop" : t === "subscribers" ? "💰 Subs" : "🌟 Site Reviews"}
            </button>
          ))}
        </div>
        {loading && <Spinner />}
        {!loading && adminTab === "shelters" && (
          shelters.length === 0
            ? <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No shelters registered yet.</div>
            : shelters.map(s => (
              <div key={s.id} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{s.shelterName || s.name || s.email}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{s.email}</div>
                    {s.ein && <div style={{ color: C.muted, fontSize: 12 }}>EIN: {s.ein}</div>}
                    {s.license && <div style={{ color: C.muted, fontSize: 12 }}>License: {s.license}</div>}
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Joined: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "N/A"}</div>
                  </div>
                  {statusBadge(s.status)}
                </div>
                <div onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} style={{ color: C.green, fontSize: 13, cursor: "pointer", fontWeight: 700, marginBottom: 8 }}>
                  🐶 {shelterPets[s.uid]?.length || 0} pets listed {expandedId === s.id ? "▲" : "▼"}
                </div>
                {expandedId === s.id && (shelterPets[s.uid] || []).map(pet => (
                  <div key={pet.id} style={{ background: C.bg, borderRadius: 10, padding: "8px 12px", marginBottom: 6, fontSize: 13, color: C.muted }}>
                    <strong style={{ color: C.text }}>{pet.name}</strong> · {pet.type} · {pet.breed} · Age: {pet.age}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {(!s.status || s.status === "pending") && <>
                    <button onClick={() => updateStatus(s.uid, "approved")} style={{ ...btn(C.green), padding: "7px 16px", fontSize: 13 }}>✓ Approve</button>
                    <button onClick={() => updateStatus(s.uid, "rejected")} style={{ ...btn(C.danger), padding: "7px 16px", fontSize: 13 }}>✗ Reject</button>
                  </>}
                  {s.status === "approved" && <button onClick={() => updateStatus(s.uid, "rejected")} style={{ ...btn(C.danger), padding: "7px 16px", fontSize: 13 }}>✗ Revoke</button>}
                  {s.status === "rejected" && <button onClick={() => updateStatus(s.uid, "approved")} style={{ ...btn(C.green), padding: "7px 16px", fontSize: 13 }}>✓ Approve</button>}
                  <button onClick={() => toggleSuspend(s.uid, s.suspended)} style={{ ...btn(s.suspended ? C.gold : C.cardBorder, s.suspended ? "#0F1A14" : C.muted), padding: "7px 16px", fontSize: 13, border: "1px solid " + (s.suspended ? C.gold : C.cardBorder) }}>
                    {s.suspended ? "🔓 Unsuspend" : "🔒 Suspend"}
                  </button>
                </div>
              </div>
            ))
        )}
        {!loading && adminTab === "providers" && (
          providers.length === 0
            ? <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No service providers registered yet.</div>
            : providers.map(p => (
              <div key={p.id} style={{ ...card, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{p.businessName || p.name || p.email}</div>
                    <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{p.email}</div>
                    {p.service && <div style={{ color: C.muted, fontSize: 12 }}>Service: {p.service}</div>}
                    {p.priceRange && <div style={{ color: C.muted, fontSize: 12 }}>Price: {p.priceRange}</div>}
                    {p.state && <div style={{ color: C.muted, fontSize: 12 }}>📍 {p.city}, {p.state}</div>}
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Joined: {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
                    {statusBadge(p.status)}
                    {p.suspended && <span style={{ background: C.danger + "22", color: C.danger, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>🔒 Suspended</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {(!p.status || p.status === "pending") && <>
                    <button onClick={() => updateStatus(p.uid, "approved")} style={{ ...btn(C.green), padding: "7px 16px", fontSize: 13 }}>✓ Approve</button>
                    <button onClick={() => updateStatus(p.uid, "rejected")} style={{ ...btn(C.danger), padding: "7px 16px", fontSize: 13 }}>✗ Reject</button>
                  </>}
                  {p.status === "approved" && <button onClick={() => updateStatus(p.uid, "rejected")} style={{ ...btn(C.danger), padding: "7px 16px", fontSize: 13 }}>✗ Revoke</button>}
                  {p.status === "rejected" && <button onClick={() => updateStatus(p.uid, "approved")} style={{ ...btn(C.green), padding: "7px 16px", fontSize: 13 }}>✓ Approve</button>}
                  <button onClick={() => toggleSuspend(p.uid, p.suspended)} style={{ ...btn(p.suspended ? C.gold : C.cardBorder, p.suspended ? "#0F1A14" : C.muted), padding: "7px 16px", fontSize: 13, border: "1px solid " + (p.suspended ? C.gold : C.cardBorder) }}>
                    {p.suspended ? "🔓 Unsuspend" : "🔒 Suspend"}
                  </button>
                </div>
              </div>
            ))
        )}
        {!loading && adminTab === "reviews" && <AdminReviews />}
        {!loading && adminTab === "sitereviews" && <AdminSiteReviews />}
        {!loading && adminTab === "shop" && <AdminShop />}
        {!loading && adminTab === "subscribers" && (
          <div>
            {/* Revenue Summary */}
            {(() => {
              const plusMonthly = subscribers.filter(s => s.plan === "plus" && s.billing !== "yearly");
              const plusYearly = subscribers.filter(s => s.plan === "plus" && s.billing === "yearly");
              const familyMonthly = subscribers.filter(s => s.plan === "family" && s.billing !== "yearly");
              const familyYearly = subscribers.filter(s => s.plan === "family" && s.billing === "yearly");
              const mrrPlus = (plusMonthly.length * 2.99) + (plusYearly.length * 2.39);
              const mrrFamily = (familyMonthly.length * 4.99) + (familyYearly.length * 3.99);
              const totalMRR = mrrPlus + mrrFamily;
              return (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <div style={{ ...card, flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>${totalMRR.toFixed(2)}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Est. MRR</div>
                    </div>
                    <div style={{ ...card, flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{subscribers.length}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Total Paid</div>
                    </div>
                    <div style={{ ...card, flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>${(totalMRR * 12).toFixed(2)}</div>
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Est. ARR</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <div style={{ ...card, flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.green }}>{plusMonthly.length}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Plus Monthly</div>
                      <div style={{ color: C.green, fontSize: 11 }}>${(plusMonthly.length * 2.99).toFixed(2)}/mo</div>
                    </div>
                    <div style={{ ...card, flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.green }}>{plusYearly.length}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Plus Yearly</div>
                      <div style={{ color: C.green, fontSize: 11 }}>${(plusYearly.length * 2.39).toFixed(2)}/mo</div>
                    </div>
                    <div style={{ ...card, flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.gold }}>{familyMonthly.length}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Family Monthly</div>
                      <div style={{ color: C.gold, fontSize: 11 }}>${(familyMonthly.length * 4.99).toFixed(2)}/mo</div>
                    </div>
                    <div style={{ ...card, flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: C.gold }}>{familyYearly.length}</div>
                      <div style={{ color: C.muted, fontSize: 11 }}>Family Yearly</div>
                      <div style={{ color: C.gold, fontSize: 11 }}>${(familyYearly.length * 3.99).toFixed(2)}/mo</div>
                    </div>
                  </div>
                </div>
              );
            })()}
            {/* Subscriber List */}
            {subscribers.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 30 }}>No paid subscribers yet</div>}
            <SubscriberList subscribers={subscribers} C={C} card={card} />
          </div>
        )}
      </div>
    </div>
  );
}



// ─── Smart Date Picker ───────────────────────────────────────────────────────
function SmartDatePicker({ label, value, onChange }) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 5 + i);
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

  const parsed = value && value.includes("-") ? value.split("-") : ["", "", ""];
  const [selYear, setSelYear] = useState(parsed[0] || "");
  const [selMonth, setSelMonth] = useState(parsed[1] || "");
  const [selDay, setSelDay] = useState(parsed[2] || "");

  const update = (y, m, d) => {
    setSelYear(y); setSelMonth(m); setSelDay(d);
    if (y && m && d) onChange(`${y}-${m}-${d}`);
  };

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={selMonth} onChange={e => update(selYear, e.target.value, selDay)}
          style={{ flex: 2, padding: "10px 8px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.inputBg, color: C.text, fontFamily: font, fontSize: 14 }}>
          <option value="">Month</option>
          {months.map((m, i) => <option key={m} value={String(i+1).padStart(2,"0")}>{m}</option>)}
        </select>
        <select value={selDay} onChange={e => update(selYear, selMonth, e.target.value)}
          style={{ flex: 1, padding: "10px 8px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.inputBg, color: C.text, fontFamily: font, fontSize: 14 }}>
          <option value="">Day</option>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={selYear} onChange={e => update(e.target.value, selMonth, selDay)}
          style={{ flex: 2, padding: "10px 8px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.inputBg, color: C.text, fontFamily: font, fontSize: 14 }}>
          <option value="">Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}
// ─── Pet QR Modal ────────────────────────────────────────────────────────────
function PetQRModal({ pet, onClose }) {
  const petUrl = `https://app.mypetdex.app/pet/${pet.id}`;
  const [copied, setCopied] = useState(false);
  const copyLink = () => {
    navigator.clipboard.writeText(petUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:C.card, borderRadius:24, padding:28, maxWidth:380, width:"100%", position:"relative", boxShadow:"0 20px 60px rgba(0,0,0,0.2)", textAlign:"center" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.muted }}>✕</button>
        <div style={{ fontSize:40, marginBottom:8 }}>🐾</div>
        <div style={{ fontFamily:font, fontWeight:900, fontSize:20, color:C.text, marginBottom:4 }}>{pet.name.trim()}'s QR Code</div>
        <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>Anyone can scan this to see {pet.name.trim()}'s emergency info — no app needed.</div>
        <div style={{ display:"flex", justifyContent:"center", marginBottom:20, padding:16, background:C.inputBg, borderRadius:16 }}>
          <QRCodeSVG value={petUrl} size={180} fgColor={C.text} bgColor="transparent" />
        </div>
        <div style={{ background:C.inputBg, border:`1.5px solid ${C.cardBorder}`, borderRadius:10, padding:"10px 14px", fontSize:12, color:C.text, fontFamily:"monospace", marginBottom:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{petUrl}</div>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          <button onClick={copyLink} style={{ ...btn(copied ? "#22c55e" : C.green), flex:1, fontSize:13 }}>{copied ? "✓ Copied!" : "📋 Copy Link"}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Meet ${pet.name} on MyPetDex! 🐾 ${petUrl}`)}`} target="_blank" rel="noreferrer" style={{ ...btn("#25D366","#fff"), flex:1, fontSize:13, textDecoration:"none" }}>📱 Share</a>
        </div>
        <div style={{ color:C.muted, fontSize:11, marginTop:8 }}>💡 Print this QR and attach it to {pet.name.trim()}'s collar tag</div>
      </div>
    </div>
  );
}// ─── Referral Widget ─────────────────────────────────────────────────────────
// ─── Site Review Widget ──────────────────────────────────────────────────────
function SiteReviewWidget({ user, profile }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: "", petName: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.comment.trim() || form.comment.trim().length < 20) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "siteReviews"), {
        uid: user.uid,
        email: user.email,
        name: profile?.name || user.email.split("@")[0],
        petName: form.petName,
        rating: form.rating,
        comment: form.comment.trim(),
        status: "pending",
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
      setTimeout(() => { setOpen(false); setSubmitted(false); }, 3000);
    } catch(e) { console.error("Review error:", e); }
    setSubmitting(false);
  };

  return (
    <>
      <div style={{ ...card, marginBottom: 14, background: C.gold + "11", border: `1.5px solid ${C.gold}44` }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>⭐ Share Your Experience</div>
        <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Love MyPetDex? Leave a review and help other pet owners discover us!</div>
        <button onClick={() => setOpen(true)} style={{ ...btn(C.gold, "#fff"), fontSize: 13, padding: "8px 20px" }}>✍️ Write a Review</button>
      </div>
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 24, maxWidth: 460, width: "100%", position: "relative" }}>
            <button onClick={() => setOpen(false)} style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button>
            {submitted ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48 }}>🎉</div>
                <div style={{ color: C.green, fontWeight: 800, fontSize: 16, marginTop: 8 }}>Thank you for your review!</div>
                <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Your review will appear on our website after approval.</div>
              </div>
            ) : (
              <>
                <div style={{ fontFamily: font, fontWeight: 900, fontSize: 18, color: C.text, marginBottom: 4 }}>⭐ Write a Review</div>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Your review helps other pet owners find MyPetDex</div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Rating</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} onClick={() => setForm(f=>({...f, rating: s}))} style={{ fontSize: 28, cursor: "pointer", opacity: s <= form.rating ? 1 : 0.3 }}>⭐</span>
                    ))}
                  </div>
                </div>
                <Field label="Your Pet's Name (optional)" value={form.petName} onChange={v => setForm(f=>({...f, petName: v}))} placeholder="e.g. Buddy" />
                <Field label="Your Review *" as="textarea" value={form.comment} onChange={v => setForm(f=>({...f, comment: v}))} placeholder="Tell us about your experience with MyPetDex... (min 20 characters)" />
                <button onClick={submit} disabled={submitting || form.comment.trim().length < 20} style={{ ...btn(C.green), width: "100%", opacity: form.comment.trim().length < 20 ? 0.5 : 1 }}>
                  {submitting ? "Submitting..." : "Submit Review →"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// eslint-disable-next-line no-unused-vars
function ReferralWidget({ profile }) {
  const [copied, setCopied] = useState(false);
  const refCode = profile?.refCode || generateRefCode(profile?.name || profile?.email || "user", profile?.uid || "000");
  const referralCount = profile?.referralCount || 0;
  const referralLink = `https://app.mypetdex.app?ref=${refCode}`;
  const tiers = [
    { min: 0, max: 2, label: "Standard Access", icon: "🥉", color: "#94a3b8" },
    { min: 3, max: 4, label: "Priority Access", icon: "🥈", color: C.green },
    { min: 5, max: Infinity, label: "Founding Member", icon: "🥇", color: C.gold },
  ];
  const currentTier = tiers.find(t => referralCount >= t.min && referralCount <= t.max) || tiers[0];
  const nextTier = tiers.find(t => t.min > referralCount);
  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div style={{ ...card, marginBottom: 14, border: `1.5px solid ${C.green}33` }}>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 4 }}>🐾 Invite Friends & Unlock Rewards</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>Share your unique link and earn exclusive benefits as you grow your referrals.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, background: currentTier.color + "18", borderRadius: 12, padding: "12px 16px" }}>
        <div style={{ fontSize: 28 }}>{currentTier.icon}</div>
        <div>
          <div style={{ fontFamily: font, fontWeight: 800, color: currentTier.color, fontSize: 15 }}>{currentTier.label}</div>
          <div style={{ color: C.muted, fontSize: 12 }}>{referralCount} friend{referralCount !== 1 ? "s" : ""} invited{nextTier ? ` · ${nextTier.min - referralCount} more to unlock ${nextTier.label}` : " · Maximum tier reached! 🎉"}</div>
        </div>
      </div>
      <div style={{ height: 6, background: C.cardBorder, borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ height: "100%", width: `${Math.min((referralCount / 5) * 100, 100)}%`, background: `linear-gradient(90deg, ${C.green}, ${C.gold})`, borderRadius: 3 }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, background: C.inputBg, border: `1.5px solid ${C.cardBorder}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: C.text, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{referralLink}</div>
        <button onClick={copyLink} style={{ ...btn(copied ? "#22c55e" : C.green), padding: "10px 14px", fontSize: 12, flexShrink: 0 }}>{copied ? "✓ Copied!" : "Copy"}</button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a href={`https://wa.me/?text=${encodeURIComponent(`Join me on MyPetDex! 🐾 ${referralLink}`)}`} target="_blank" rel="noreferrer" style={{ ...btn("#25D366", "#fff"), flex: 1, fontSize: 12, textDecoration: "none", textAlign: "center" }}>📱 WhatsApp</a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`} target="_blank" rel="noreferrer" style={{ ...btn("#1877F2", "#fff"), flex: 1, fontSize: 12, textDecoration: "none", textAlign: "center" }}>📘 Facebook</a>
        <a href={`mailto:?subject=Join me on MyPetDex!&body=${encodeURIComponent(`Check out MyPetDex 🐾 ${referralLink}`)}`} style={{ ...btn(C.cardBorder, C.text), flex: 1, fontSize: 12, textDecoration: "none", textAlign: "center" }}>✉️ Email</a>
      </div>
    </div>
  );
}
// ─── Upgrade Screen ───────────────────────────────────────────────────────────
function UpgradeScreen({ user, profile, onClose }) {
  const [loading, setLoading] = useState(null);
  const [yearly, setYearly] = useState(false);

  const PRICES = {
    plus:   { monthly: "price_1TVxf1KrbYhlx0Wng1THRLur", yearly: "price_1TVxh8KrbYhlx0WnnS2EoPCv" },
    family: { monthly: "price_1TVxjIKrbYhlx0WnXcSBrbcG", yearly: "price_1TVxkvKrbYhlx0WnsGIFaP3d" },
  };

  const startCheckout = async (plan) => {
    const priceId = PRICES[plan][yearly ? "yearly" : "monthly"];
    const billing = yearly ? "yearly" : "monthly";
    setLoading(plan);
    try {
      const res = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/createCheckoutSession", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, userId: user.uid, email: user.email, plan, billing })
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Something went wrong. Please try again.");
    } catch (e) {
      alert("Something went wrong. Please try again.");
    }
    setLoading(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.card, borderRadius: 20, padding: 28, maxWidth: 480, width: "100%", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="/logo.png" alt="MyPetDex" style={{ width: 56, height: 56, objectFit: "contain" }} />
          <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: "8px 0 4px" }}>Upgrade MyPetDex</h2>
          <p style={{ color: C.muted, fontSize: 13 }}>Start your 1-month free trial — cancel anytime</p>
        </div>

        {/* Monthly/Yearly Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: !yearly ? C.text : C.muted }}>Monthly</span>
          <div onClick={() => setYearly(y => !y)} style={{ width: 44, height: 24, borderRadius: 12, background: yearly ? C.green : C.cardBorder, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
            <div style={{ position: "absolute", top: 3, left: yearly ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: yearly ? C.text : C.muted }}>Yearly</span>
          {yearly && <span style={{ background: C.green, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Save 20%</span>}
        </div>

        {/* Plus Plan */}
        <div style={{ ...card, marginBottom: 12, border: `2px solid ${C.green}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 16 }}>Plus Plan</div>
              <div style={{ color: C.muted, fontSize: 12 }}>Up to 3 pets</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.green, fontWeight: 900, fontSize: 20 }}>
                {yearly ? "$2.39" : "$2.99"}<span style={{ fontSize: 13 }}>/mo</span>
              </div>
              {yearly && <div style={{ color: C.muted, fontSize: 11 }}>$28.80 billed yearly</div>}
              <div style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>30 days FREE</div>
            </div>
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>✅ AI Pet Assistant &nbsp; ✅ Pet Recipes &nbsp; ✅ 3 Pets</div>
          <button onClick={() => startCheckout("plus")} disabled={loading === "plus"} style={{ ...btn(C.green), width: "100%" }}>
            {loading === "plus" ? "Loading..." : "🎁 Start Free Trial — Plus"}
          </button>
        </div>

        {/* Family Plan */}
        <div style={{ ...card, marginBottom: 16, border: `2px solid ${C.gold}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 16 }}>Family Plan</div>
              <div style={{ color: C.muted, fontSize: 12 }}>Unlimited pets</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: C.gold, fontWeight: 900, fontSize: 20 }}>
                {yearly ? "$3.99" : "$4.99"}<span style={{ fontSize: 13 }}>/mo</span>
              </div>
              {yearly && <div style={{ color: C.muted, fontSize: 11 }}>$48.00 billed yearly</div>}
              <div style={{ color: C.gold, fontSize: 11, fontWeight: 700 }}>30 days FREE</div>
            </div>
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>✅ Everything in Plus &nbsp; ✅ Unlimited Pets &nbsp; ✅ AI Assistant</div>
          <button onClick={() => startCheckout("family")} disabled={loading === "family"} style={{ ...btn(C.gold), width: "100%" }}>
            {loading === "family" ? "Loading..." : "🎁 Start Free Trial — Family"}
          </button>
        </div>

        <p style={{ color: C.muted, fontSize: 11, textAlign: "center" }}>No charge for 30 days. Subscription automatically renews unless cancelled at least 24 hours before the end of the trial period. Manage or cancel anytime in your Apple ID subscription settings.</p>
      </div>
    </div>
  );
}

// ─── Admin Shop Manager ───────────────────────────────────────────────────────
function AdminShop() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", desc: "", price: "", emoji: "🛍️", url: "" });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "shopProducts"), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addProduct = async () => {
    if (!form.name || !form.url) return;
    await addDoc(collection(db, "shopProducts"), { ...form, createdAt: new Date().toISOString() });
    setForm({ name: "", desc: "", price: "", emoji: "🛍️", url: "" });
    setAdding(false);
  };

  const deleteProduct = async (id) => {
    if (window.confirm("Delete this product?")) await deleteDoc(doc(db, "shopProducts", id));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 900, fontSize: 16 }}>🛒 Shop Products</div>
        <button onClick={() => setAdding(!adding)} style={{ ...btn(C.green), padding: "8px 16px", fontSize: 13 }}>+ Add Product</button>
      </div>
      {adding && (
        <div style={{ ...card, marginBottom: 16 }}>
          <Field label="Product Name" value={form.name} onChange={set("name")} placeholder="Zesty Paws Multivitamin" />
          <Field label="Description" value={form.desc} onChange={set("desc")} placeholder="8-in-1 multivitamin for dogs" />
          <Field label="Price" value={form.price} onChange={set("price")} placeholder="$32.97" />
          <Field label="Emoji" value={form.emoji} onChange={set("emoji")} placeholder="💊" />
          <Field label="Amazon Affiliate URL" value={form.url} onChange={set("url")} placeholder="https://amzn.to/..." />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={addProduct} style={{ ...btn(C.green), flex: 1 }}>💾 Save Product</button>
            <button onClick={() => setAdding(false)} style={{ ...btn(C.cardBorder, C.muted), flex: 1 }}>Cancel</button>
          </div>
        </div>
      )}
      {loading && <Spinner />}
      {!loading && products.length === 0 && (
        <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No products yet. Click "+ Add Product" to add your first one.</div>
      )}
      {products.map(p => (
        <div key={p.id} style={{ ...card, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 28 }}>{p.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{p.name}</div>
            <div style={{ color: C.muted, fontSize: 12 }}>{p.desc}</div>
            <div style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{p.price} on Amazon</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={p.url} target="_blank" rel="noreferrer" style={{ ...btn(C.green), padding: "6px 12px", fontSize: 12, textDecoration: "none" }}>🔗 View</a>
            <button onClick={() => deleteProduct(p.id)} style={{ ...btn(C.danger), padding: "6px 12px", fontSize: 12 }}>🗑️</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reviews"), snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);
  return (
    <div>
      {reviews.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No reviews yet.</div>}
      {reviews.map(r => (
        <div key={r.id} style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: C.text, fontWeight: 800 }}>{r.ownerName} → {r.providerName}</div>
              <div style={{ color: C.gold }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{r.comment}</div>
              {r.reply && <div style={{ color: C.green, fontSize: 12, marginTop: 4 }}>Reply: {r.reply}</div>}
            </div>
            <button onClick={async () => { if (window.confirm("Delete this review?")) await deleteDoc(doc(db, "reviews", r.id)); }}
              style={{ ...btn(C.danger), padding: "6px 12px", fontSize: 12 }}>🗑️ Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminSiteReviews() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "siteReviews"), snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
    return unsub;
  }, []);

  const approve = async (id) => await updateDoc(doc(db, "siteReviews", id), { status: "approved" });
  const reject = async (id) => await updateDoc(doc(db, "siteReviews", id), { status: "rejected" });
  const deleteReview = async (id) => await deleteDoc(doc(db, "siteReviews", id));

  const pending = reviews.filter(r => r.status === "pending");
  const approved = reviews.filter(r => r.status === "approved");

  return (
    <div>
      <div style={{ color: C.text, fontWeight: 900, fontSize: 16, marginBottom: 16 }}>🌟 Site Reviews ({reviews.length})</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ ...card, flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.gold }}>{pending.length}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>⏳ Pending</div>
        </div>
        <div style={{ ...card, flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.green }}>{approved.length}</div>
          <div style={{ color: C.muted, fontSize: 11 }}>✅ Approved</div>
        </div>
      </div>
      {reviews.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No reviews yet.</div>}
      {reviews.map(r => (
        <div key={r.id} style={{ ...card, marginBottom: 12, borderLeft: `3px solid ${r.status === "approved" ? C.green : r.status === "rejected" ? C.danger : C.gold}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 800, color: C.text }}>{r.name} {r.petName && `& ${r.petName}`}</div>
              <div style={{ color: C.muted, fontSize: 12 }}>{r.email}</div>
              <div style={{ color: C.gold }}>{"⭐".repeat(r.rating)}</div>
            </div>
            <span style={{ background: r.status === "approved" ? C.green + "22" : r.status === "rejected" ? C.danger + "22" : C.gold + "22", color: r.status === "approved" ? C.green : r.status === "rejected" ? C.danger : C.gold, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
              {r.status === "approved" ? "✅ Approved" : r.status === "rejected" ? "✗ Rejected" : "⏳ Pending"}
            </span>
          </div>
          <div style={{ color: C.text, fontSize: 13, marginBottom: 12, fontStyle: "italic" }}>"{r.comment}"</div>
          <div style={{ display: "flex", gap: 8 }}>
            {r.status !== "approved" && <button onClick={() => approve(r.id)} style={{ ...btn(C.green), padding: "6px 14px", fontSize: 12 }}>✓ Approve</button>}
            {r.status !== "rejected" && <button onClick={() => reject(r.id)} style={{ ...btn(C.danger), padding: "6px 14px", fontSize: 12 }}>✗ Reject</button>}
            <button onClick={() => deleteReview(r.id)} style={{ ...btn(C.cardBorder, C.muted), padding: "6px 14px", fontSize: 12 }}>🗑️ Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function VerifyEmail({ onVerified, onLogout }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const user = auth.currentUser;

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        await currentUser.reload();
        if (currentUser.emailVerified) {
          clearInterval(interval);
          await onVerified();
        }
      } catch(e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, [onVerified]);

  const resend = async () => {
    if (!user) { setMessage("No signed-in user."); return; }
    setSending(true); setMessage("");
    try {
      const sendVerification = httpsCallable(getFunctions(), "sendBrandedVerificationEmail");
      await sendVerification({});
      setMessage("Verification email sent! Check your inbox.");
    } catch (e) {
      setMessage("Could not send verification email. Try again later.");
    }
    setSending(false);
  };

  const check = async () => {
    if (!user) { setMessage("No signed-in user."); return; }
    setSending(true); setMessage("");
    try {
      let verified = false;
      for (let i = 0; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await user.reload();
        if (user.emailVerified) { verified = true; break; }
      }
      if (verified) {
        await onVerified();
      } else {
        setMessage("Email still not verified. Please check your inbox and follow the link.");
      }
    } catch (e) {
      setMessage("Error checking verification. Try again.");
    }
    setSending(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, padding: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>📧</div>
          <h2 style={{ color: C.text, fontWeight: 900 }}>Verify Your Email</h2>
          <p style={{ color: C.muted }}>We sent a verification link to <strong style={{ color: C.text }}>{user?.email}</strong>. Click the link to verify.</p>
          <p style={{ color: C.muted, fontSize: 13 }}>📬 Can't find it? Check your spam folder.</p>
          {message && <div style={{ background: C.green + "22", border: "1px solid " + C.green, borderRadius: 10, padding: "10px 14px", color: C.green, fontSize: 13, margin: "12px 0" }}>{message}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            <button onClick={resend} disabled={sending} style={{ ...btn(C.green), minWidth: 160 }}>{sending ? "Sending..." : "Resend Email"}</button>
            <button onClick={check} disabled={sending} style={{ ...btn(C.cardBorder, C.green), minWidth: 160, border: "1px solid " + C.green }}>{sending ? "Checking..." : "I've Verified"}</button>
          </div>
          <button onClick={onLogout} style={{ marginTop: 16, background: "none", border: "none", color: C.muted, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

// ─── Google Role Picker ───────────────────────────────────────────────────────
function GoogleRoleScreen({ user, initialPlan = "free", initialRole = "", onSuccess, onLogout }) {
  const [role, setRole] = useState(initialRole);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState(1);
  const [petForm, setPetForm] = useState({ name:"", type:"Dog", breed:"", age:"" });
  const [displayName, setDisplayName] = useState(user?.displayName || "");

  const submit = async () => {
    if (!role) { setError("Please select your role to continue"); return; }
    if (role === "owner" && step === 1) { setStep(2); return; }
    setLoading(true);
    try {
      const refCode = generateRefCode(user.displayName || user.email, user.uid);
      const referredBy = getReferralCodeFromURL();
      const profile = {
        uid: user.uid, email: user.email,
        name: displayName || user.displayName || "", role,
        plan: "free", createdAt: new Date().toISOString(),
        pendingPlan: (role === "owner" && (initialPlan === "plus" || initialPlan === "family")) ? initialPlan : null,
        welcomeEmailSent: false,
        skipVerify: true,
        refCode, referredBy: referredBy || null, referralCount: 0,
        ...(role === "provider" ? { businessName: bizForm.businessName, service: bizForm.service, priceRange: bizForm.priceRange, phone: bizForm.phone, website: bizForm.website, address: bizForm.address, state: bizForm.state, city: bizForm.city, googleReview: bizForm.googleReview, bio: bizForm.bio, status: "pending" } : {}),
        ...(role === "shelter" ? { shelterName: bizForm.shelterName, ein: bizForm.ein, license: bizForm.license, phone: bizForm.phone, website: bizForm.website, address: bizForm.address, state: bizForm.state, city: bizForm.city, googleReview: bizForm.googleReview, status: "pending" } : {}),
      };
      await setDoc(doc(db, "users", user.uid), profile);
      if (referredBy) {
        try {
          const refQ = query(collection(db, "users"), where("refCode", "==", referredBy));
          const refSnap = await getDocs(refQ);
          if (!refSnap.empty) {
            const referrer = refSnap.docs[0];
            await updateDoc(doc(db, "users", referrer.id), { referralCount: (referrer.data().referralCount || 0) + 1 });
            console.log("✅ Referral credited to:", referrer.data().email);
          }
        } catch(refErr) { console.error("Referral credit error:", refErr); }
      }
      // Add pet if owner
      if (role === "owner" && petForm.name) {
        await addDoc(collection(db, "pets"), {
          name: petForm.name, type: petForm.type, breed: petForm.breed,
          age: petForm.age || "", weight: "", feeding: "", nextVet: "", notes: "",
          vaccines: [], reminders: [], photoURL: "",
          uid: user.uid, ownerEmail: user.email, createdAt: new Date().toISOString()
        });
      }
      sessionStorage.removeItem("selectedPlan");
      // Only send welcome email if NOT going to Stripe — webhook handles paid plan emails
      if (role !== "owner" || (initialPlan !== "plus" && initialPlan !== "family")) {
        try {
          const name = user.displayName?.split(" ")[0] || user.email?.split("@")[0];
          await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/sendVerifiedEmail", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role, email: user.email, name, profile })
          });
          await updateDoc(doc(db, "users", user.uid), { welcomeEmailSent: true });
        } catch (emailErr) { console.error("Welcome email error:", emailErr); }
      }

      // Redirect to Stripe if pending paid plan
      if (role === "owner" && (initialPlan === "plus" || initialPlan === "family")) {
        const PRICES = {
          plus: "price_1TVxf1KrbYhlx0Wng1THRLur",
          family: "price_1TVxjIKrbYhlx0WnXcSBrbcG"
        };
        try {
          const res = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/createCheckoutSession", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ priceId: PRICES[initialPlan], userId: user.uid, email: user.email, plan: initialPlan, billing: "monthly" })
          });
          const data = await res.json();
          if (data.url) { window.location.href = data.url; return; }
        } catch(e) { console.error("Checkout redirect error:", e); }
      }

      onSuccess(profile);
    } catch (e) { setError("Something went wrong. Please try again."); }
    setLoading(false);
  };

  const roleCard = (r, emoji, title, desc) => (
    <div onClick={() => setRole(r)} style={{ ...card, cursor: "pointer", border: `2px solid ${role === r ? C.green : C.cardBorder}`, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 34 }}>{emoji}</div>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginTop: 6 }}>{title}</div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{desc}</div>
    </div>
  );

  const [bizForm, setBizForm] = useState({ businessName:"", service:"Grooming", priceRange:"", phone:"", website:"", address:"", state:"", city:"", googleReview:"", bio:"", shelterName:"", ein:"", license:"" });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 460 }}>
        <img src="/logo.png" alt="MyPetDex" style={{ width: 72, height: 72, objectFit: "contain", marginBottom: 8 }} />
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 24, margin: "0 0 8px", textAlign: "center" }}>
          {initialRole === "provider" ? "🛎️ Your Business Details" : initialRole === "shelter" ? "🏠 Your Shelter Details" : `Welcome, ${user?.displayName?.split(" ")[0] || "Friend"}!`}
        </h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 24, textAlign: "center" }}>
          {initialRole === "provider" ? "Tell us about your business" : initialRole === "shelter" ? "Tell us about your shelter" : "One last step — how will you use MyPetDex?"}
        </p>
        {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <Field label="Full Name" value={displayName} onChange={setDisplayName} placeholder="Your full name" />

        {/* Role picker — only shown when no initialRole */}
        {step === 1 && !initialRole && <>
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {roleCard("owner", "🐾", "Pet Owner", "Manage my pets")}
            {roleCard("provider", "🛎️", "Service Provider", "Offer pet services")}
            {roleCard("shelter", "🏠", "Shelter", "Post adoptions")}
          </div>
        </>}

        {/* Pet details — owner step 2 OR owner with initialRole */}
        {((step === 2 && role === "owner") || (initialRole === "owner" && step === 1)) && <>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Tell us about your pet (optional):</p>
          <Field label="Pet Name" value={petForm.name} onChange={v => setPetForm(f=>({...f,name:v}))} placeholder="Buddy" />
          <Field label="Pet Type" as="select" value={petForm.type} onChange={v => setPetForm(f=>({...f,type:v}))} options={["Dog","Cat"]} />
          <Field label="Breed" as="select" value={petForm.breed} onChange={v => setPetForm(f=>({...f,breed:v}))} options={petForm.type === "Cat" ? CAT_BREEDS : DOG_BREEDS} />
          <Field label="Age" value={petForm.age} onChange={v => setPetForm(f=>({...f,age:v}))} placeholder="e.g. 2 years" />
          {!initialRole && <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, fontFamily:font, marginBottom:12 }}>← Back</button>}
        </>}

        {/* Provider details */}
        {(initialRole === "provider" || (role === "provider" && step === 1)) && <>
          <Field label="Business Name" value={bizForm.businessName} onChange={v => setBizForm(f=>({...f,businessName:v}))} placeholder="Happy Paws Grooming" />
          <Field label="Service Type" as="select" value={bizForm.service} onChange={v => setBizForm(f=>({...f,service:v}))} options={["Grooming","Dog Walking","Veterinary","Training","Boarding","Daycare","Other"]} />
          <Field label="Price Range" value={bizForm.priceRange} onChange={v => setBizForm(f=>({...f,priceRange:v}))} placeholder="e.g. $40-$80" />
          <Field label="Phone Number" value={bizForm.phone} onChange={v => setBizForm(f=>({...f,phone:v}))} placeholder="+1 (555) 000-0000" />
          <Field label="Website (optional)" value={bizForm.website} onChange={v => setBizForm(f=>({...f,website:v}))} placeholder="https://yourwebsite.com" />
          <Field label="Street Address (optional)" value={bizForm.address} onChange={v => setBizForm(f=>({...f,address:v}))} placeholder="123 Main St" />
          <Field label="State" as="select" value={bizForm.state} onChange={v => setBizForm(f=>({...f,state:v}))} options={US_STATES} />
          <Field label="City" value={bizForm.city} onChange={v => setBizForm(f=>({...f,city:v}))} placeholder="Newark" />
          <Field label="Google Review Link (optional)" value={bizForm.googleReview} onChange={v => setBizForm(f=>({...f,googleReview:v}))} placeholder="https://maps.google.com/..." />
          <Field label="About Your Business" as="textarea" value={bizForm.bio} onChange={v => setBizForm(f=>({...f,bio:v}))} placeholder="Tell pet owners what makes you special..." />
        </>}

        {/* Shelter details */}
        {(initialRole === "shelter" || (role === "shelter" && step === 1)) && <>
          <Field label="Shelter Name" value={bizForm.shelterName} onChange={v => setBizForm(f=>({...f,shelterName:v}))} placeholder="Second Chance Animal Shelter" />
          <Field label="EIN Number" value={bizForm.ein} onChange={v => setBizForm(f=>({...f,ein:v}))} placeholder="xx-xxxxxxx" />
          <Field label="State License #" value={bizForm.license} onChange={v => setBizForm(f=>({...f,license:v}))} placeholder="NJ-2024-xxxxx" />
          <Field label="Phone Number" value={bizForm.phone} onChange={v => setBizForm(f=>({...f,phone:v}))} placeholder="+1 (555) 000-0000" />
          <Field label="Website (optional)" value={bizForm.website} onChange={v => setBizForm(f=>({...f,website:v}))} placeholder="https://yourshelter.org" />
          <Field label="Street Address" value={bizForm.address} onChange={v => setBizForm(f=>({...f,address:v}))} placeholder="123 Main St" />
          <Field label="State" as="select" value={bizForm.state} onChange={v => setBizForm(f=>({...f,state:v}))} options={US_STATES} />
          <Field label="City" value={bizForm.city} onChange={v => setBizForm(f=>({...f,city:v}))} placeholder="Camden" />
          <Field label="Google Review Link (optional)" value={bizForm.googleReview} onChange={v => setBizForm(f=>({...f,googleReview:v}))} placeholder="https://maps.google.com/..." />
        </>}

        <button style={{ ...btn(C.green), width: "100%", marginTop: 8 }} onClick={submit} disabled={loading}>
          {loading ? "Setting up your account..." : !initialRole && step === 1 && role === "owner" ? "Next →" : "Get Started →"}
        </button>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: font, marginTop: 16, width: "100%", textAlign: "center" }}>Sign out</button>
      </div>
    </div>
  );
}

// ─── Landing ─────────────────────────────────────────────────────────────────
// ─── Shared auth buttons ──────────────────────────────────────────────────────
function AuthButtons({ onApple, onGoogle, onEmail, emailLabel = "Create Free Account →", confirmLabel = "I confirm I am signing up as a Pet Owner and agree to the Terms of Service." }) {
  const [confirmed, setConfirmed] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const handleAction = (fn) => {
    if (!confirmed || !ageConfirmed) { setShowWarning(true); return; }
    fn();
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, background: "#EEF4FF", borderRadius: 10, padding: "10px 14px", maxWidth: 340, width: "100%" }}>
        <input type="checkbox" id="roleConfirm" checked={confirmed} onChange={e => { setConfirmed(e.target.checked); setShowWarning(false); }} style={{ marginTop: 2, cursor: "pointer", width: 16, height: 16, flexShrink: 0 }} />
        <label htmlFor="roleConfirm" style={{ color: "#1E293B", fontSize: 12, cursor: "pointer", fontFamily: font, lineHeight: 1.5 }}>{confirmLabel}</label>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16, background: "#EEF4FF", borderRadius: 10, padding: "10px 14px", maxWidth: 340, width: "100%" }}>
        <input type="checkbox" id="ageConfirmBtn" checked={ageConfirmed} onChange={e => { setAgeConfirmed(e.target.checked); setShowWarning(false); }} style={{ marginTop: 2, cursor: "pointer", width: 16, height: 16, flexShrink: 0 }} />
        <label htmlFor="ageConfirmBtn" style={{ color: "#1E293B", fontSize: 12, cursor: "pointer", fontFamily: font, lineHeight: 1.5 }}>I confirm I am <strong>13 years of age or older</strong>.</label>
      </div>
      {showWarning && <p style={{ color: "#E05C5C", fontSize: 12, marginBottom: 8, maxWidth: 340, textAlign: "center" }}>Please check both boxes before signing up.</p>}
      <button onClick={() => handleAction(onApple)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", maxWidth: 340, padding: "13px 20px", background: (confirmed && ageConfirmed) ? "#000" : "#94a3b8", border: "none", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 15, color: "#fff", cursor: (confirmed && ageConfirmed) ? "pointer" : "not-allowed", marginBottom: 12 }}>
        <svg width="18" height="18" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.2-155.3-127.1C46.8 790.4 0 663.4 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
        Sign up with Apple
      </button>
      <button onClick={() => handleAction(onGoogle)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", maxWidth: 340, padding: "13px 20px", background: "#fff", border: `1.5px solid ${(confirmed && ageConfirmed) ? "#E2E8F0" : "#cbd5e1"}`, borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 15, color: (confirmed && ageConfirmed) ? "#1E293B" : "#94a3b8", cursor: (confirmed && ageConfirmed) ? "pointer" : "not-allowed", marginBottom: 12 }}>
        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
        Sign up with Google
      </button>
      <div style={{ display: "flex", alignItems: "center", width: "100%", maxWidth: 340, margin: "4px 0 12px" }}>
        <div style={{ flex: 1, height: 1, background: C.cardBorder }} />
        <span style={{ color: C.muted, fontSize: 12, margin: "0 12px" }}>or</span>
        <div style={{ flex: 1, height: 1, background: C.cardBorder }} />
      </div>
      <button style={{ ...btn((confirmed && ageConfirmed) ? C.green : "#94a3b8"), width: "100%", maxWidth: 340, cursor: (confirmed && ageConfirmed) ? "pointer" : "not-allowed" }} onClick={() => handleAction(onEmail)}>{emailLabel}</button>
    </>
  );
}

// ─── Pet Owner Landing ────────────────────────────────────────────────────────
function OwnerLanding({ onRegister, onLogin, onGoogle, onApple, onBack }) {
  const [selectedPlan, setSelectedPlan] = useState("free");
  const plans = [
    { id: "free",   label: "Free",   price: "$0",       sub: "1 pet · No AI",           color: C.muted },
    { id: "plus",   label: "Plus",   price: "$2.99/mo", sub: "3 pets · AI · 30-day trial", color: C.green },
    { id: "family", label: "Family", price: "$4.99/mo", sub: "Unlimited · AI · 30-day trial", color: C.gold },
  ];
  const handleRegister = () => { sessionStorage.setItem("selectedPlan", selectedPlan); onRegister(); };
  const handleGoogle  = () => { sessionStorage.setItem("selectedPlan", selectedPlan); onGoogle(); };
  const handleApple   = () => { sessionStorage.setItem("selectedPlan", selectedPlan); onApple(); };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 400, marginBottom: 8 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>← Not a pet owner?</button>
        <span><span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>Already have an account? </span><button onClick={onLogin} style={{ background: "none", border: "none", color: C.green, fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>Sign In</button></span>
      </div>
      <img src="/logo.png" alt="MyPetDex" style={{ width: 90, height: 90, objectFit: "contain", marginBottom: 8 }} />
      <div style={{ background: C.green, color: "#fff", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🐾 For Pet Owners</div>
      <h1 style={{ color: C.green, fontWeight: 900, fontSize: 38, margin: 0, letterSpacing: -1, textAlign: "center" }}>MyPetDex</h1>
      <p style={{ color: C.muted, fontSize: 16, textAlign: "center", maxWidth: 320, marginBottom: 4 }}>Everything your pet needs — in one simple app.</p>
      <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", maxWidth: 300, marginBottom: 20 }}>Health records · Reminders · AI Assistant · Nutrition · Adoption</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center", maxWidth: 340 }}>
        {["🐾 Pet Profiles","💉 Vaccines","⏰ Reminders","🤖 AI Tips","🍽️ Recipes","❤️ Adoption"].map(f => (
          <span key={f} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: C.text, fontWeight: 600 }}>{f}</span>
        ))}
      </div>
      <div style={{ width: "100%", maxWidth: 340, marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 10, textAlign: "center" }}>Choose your plan</div>
        <div style={{ display: "flex", gap: 8 }}>
          {plans.map(p => (
            <div key={p.id} onClick={() => setSelectedPlan(p.id)} style={{ flex: 1, background: C.card, border: `2px solid ${selectedPlan === p.id ? p.color : C.cardBorder}`, borderRadius: 12, padding: "10px 6px", textAlign: "center", cursor: "pointer", transition: "border 0.15s" }}>
              <div style={{ color: p.color, fontWeight: 900, fontSize: 13 }}>{p.label}</div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 12, marginTop: 2 }}>{p.price}</div>
              <div style={{ color: C.muted, fontSize: 10, marginTop: 3, lineHeight: 1.3 }}>{p.sub}</div>
            </div>
          ))}
        </div>
        {selectedPlan !== "free" && <div style={{ textAlign: "center", color: C.green, fontSize: 12, fontWeight: 700, marginTop: 8 }}>🎁 30-day free trial — no credit card needed to start</div>}
      </div>
      <AuthButtons onApple={handleApple} onGoogle={handleGoogle} onEmail={handleRegister}
        emailLabel={selectedPlan === "free" ? "Create Free Account →" : `Start ${selectedPlan === "plus" ? "Plus" : "Family"} Free Trial →`}
        confirmLabel="I confirm I am signing up as a Pet Owner and agree to the Terms of Service." />
      <p style={{ color: C.muted, fontSize: 11, marginTop: 16, textAlign: "center" }}>Free plan available · Plus $2.99/mo · Family $4.99/mo</p>
      <div style={{ marginTop: 12, background: C.card, borderRadius: 12, padding: "10px 18px", border: `1px solid ${C.cardBorder}`, maxWidth: 340 }}>
        <p style={{ color: C.muted, fontSize: 11, margin: 0, textAlign: "center" }}>🔒 Your data is encrypted and never shared with third parties.</p>
      </div>
    </div>
  );
}

// ─── Provider Landing ─────────────────────────────────────────────────────────
function ProviderLanding({ onRegister, onLogin, onGoogle, onApple, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 400, marginBottom: 8 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>← Not a service provider?</button>
        <span><span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>Already have an account? </span><button onClick={onLogin} style={{ background: "none", border: "none", color: C.green, fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>Sign In</button></span>
      </div>
      <img src="/logo.png" alt="MyPetDex" style={{ width: 90, height: 90, objectFit: "contain", marginBottom: 8 }} />
      <div style={{ background: C.green, color: "#fff", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🛎️ For Service Providers</div>
      <h1 style={{ color: C.green, fontWeight: 900, fontSize: 32, margin: "0 0 8px", letterSpacing: -1, textAlign: "center" }}>Grow Your Pet Business</h1>
      <p style={{ color: C.muted, fontSize: 15, textAlign: "center", maxWidth: 320, marginBottom: 4 }}>Join MyPetDex and get discovered by local pet owners looking for your services.</p>
      <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", maxWidth: 300, marginBottom: 20 }}>Grooming · Walking · Veterinary · Training · Boarding & more</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center", maxWidth: 340 }}>
        {["📍 Local Discovery","⭐ Reviews","📅 Bookings","💼 Business Profile","📊 Analytics","🎉 6-Month Free Trial"].map(f => (
          <span key={f} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: C.text, fontWeight: 600 }}>{f}</span>
        ))}
      </div>
      <AuthButtons onApple={onApple} onGoogle={onGoogle} onEmail={onRegister} emailLabel="Join as Provider →" confirmLabel="I confirm I am signing up as a Service Provider and agree to the Terms of Service." />
      <div style={{ marginTop: 16, background: "#FFF9E6", borderRadius: 12, padding: "10px 18px", border: "1px solid #F59E0B", maxWidth: 340 }}>
        <p style={{ color: "#92400E", fontSize: 11, margin: 0, textAlign: "center", fontWeight: 700 }}>🎉 Free for 6 months — then only 5% commission on bookings. No monthly fees ever!</p>
      </div>
      <div style={{ marginTop: 10, background: C.card, borderRadius: 12, padding: "10px 18px", border: `1px solid ${C.cardBorder}`, maxWidth: 340 }}>
        <p style={{ color: C.muted, fontSize: 11, margin: 0, textAlign: "center" }}>🔒 Your data is encrypted and never shared with third parties.</p>
      </div>
    </div>
  );
}

// ─── Shelter Landing ──────────────────────────────────────────────────────────
function ShelterLanding({ onRegister, onLogin, onGoogle, onApple, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: 400, marginBottom: 8 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>← Not an animal shelter?</button>
        <span><span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>Already have an account? </span><button onClick={onLogin} style={{ background: "none", border: "none", color: C.green, fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>Sign In</button></span>
      </div>
      <img src="/logo.png" alt="MyPetDex" style={{ width: 90, height: 90, objectFit: "contain", marginBottom: 8 }} />
      <div style={{ background: "#22c55e", color: "#fff", borderRadius: 20, padding: "4px 16px", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>🏠 For Animal Shelters</div>
      <h1 style={{ color: C.green, fontWeight: 900, fontSize: 32, margin: "0 0 8px", letterSpacing: -1, textAlign: "center" }}>Help Pets Find Forever Homes</h1>
      <p style={{ color: C.muted, fontSize: 15, textAlign: "center", maxWidth: 320, marginBottom: 4 }}>List your adoptable pets and connect with loving families in your area.</p>
      <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", maxWidth: 300, marginBottom: 20 }}>Dogs · Cats · Rabbits · Birds · and more</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap", justifyContent: "center", maxWidth: 340 }}>
        {["🐾 Pet Listings","❤️ Adoption Requests","📍 Local Visibility","🔔 Notifications","📋 Pet Profiles","✅ Always Free"].map(f => (
          <span key={f} style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: C.text, fontWeight: 600 }}>{f}</span>
        ))}
      </div>
      <AuthButtons onApple={onApple} onGoogle={onGoogle} onEmail={onRegister} emailLabel="Register Your Shelter →" confirmLabel="I confirm I am registering as an Animal Shelter and agree to the Terms of Service." />
      <div style={{ marginTop: 16, background: "#F0FDF4", borderRadius: 12, padding: "10px 18px", border: "1px solid #22c55e", maxWidth: 340 }}>
        <p style={{ color: "#166534", fontSize: 11, margin: 0, textAlign: "center", fontWeight: 700 }}>✅ Shelter access is always FREE on MyPetDex — forever!</p>
      </div>
      <div style={{ marginTop: 10, background: C.card, borderRadius: 12, padding: "10px 18px", border: `1px solid ${C.cardBorder}`, maxWidth: 340 }}>
        <p style={{ color: C.muted, fontSize: 11, margin: 0, textAlign: "center" }}>🔒 Your data is encrypted and never shared with third parties.</p>
      </div>
    </div>
  );
}

// ─── Role Picker ──────────────────────────────────────────────────────────────
function RolePickerScreen({ onSelectRole, onLogin }) {
  const roles = [
    {
      id: "owner",
      emoji: "🐾",
      title: "Pet Owner",
      desc: "Manage health records, reminders, AI tips & more",
      color: C.green,
      light: "#EEF4FF",
    },
    {
      id: "provider",
      emoji: "🛎️",
      title: "Service Provider",
      desc: "Grow your pet business & get discovered locally",
      color: C.gold,
      light: "#FFF9E6",
    },
    {
      id: "shelter",
      emoji: "🏠",
      title: "Animal Shelter",
      desc: "List adoptable pets & connect with loving families",
      color: "#22c55e",
      light: "#F0FDF4",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: font, padding: "24px 20px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <img src="/logo.png" alt="MyPetDex" style={{ width: 80, height: 80, objectFit: "contain", marginBottom: 10 }} />
      <h1 style={{ color: C.green, fontWeight: 900, fontSize: 34, margin: "0 0 6px", letterSpacing: -1 }}>MyPetDex</h1>
      <p style={{ color: C.muted, fontSize: 15, margin: "0 0 32px", textAlign: "center" }}>Welcome! How are you joining today?</p>

      {/* Role cards */}
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
        {roles.map(r => (
          <button key={r.id} onClick={() => onSelectRole(r.id)} style={{ display: "flex", alignItems: "center", gap: 18, background: C.card, border: `2px solid ${C.cardBorder}`, borderRadius: 18, padding: "18px 20px", cursor: "pointer", textAlign: "left", fontFamily: font, transition: "border-color 0.15s, box-shadow 0.15s", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = r.color; e.currentTarget.style.boxShadow = `0 4px 16px ${r.color}33`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: r.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
              {r.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 17, marginBottom: 3 }}>{r.title}</div>
              <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.4 }}>{r.desc}</div>
            </div>
            <div style={{ color: C.muted, fontSize: 20, flexShrink: 0 }}>›</div>
          </button>
        ))}
      </div>

      {/* Sign in link */}
      <div style={{ marginTop: 32, textAlign: "center" }}>
        <span style={{ color: C.muted, fontSize: 14 }}>Already have an account? </span>
        <button onClick={onLogin} style={{ background: "none", border: "none", color: C.green, fontWeight: 900, fontSize: 14, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>Sign In</button>
      </div>

      <div style={{ marginTop: 20, background: C.card, borderRadius: 12, padding: "10px 18px", border: `1px solid ${C.cardBorder}`, maxWidth: 400, width: "100%" }}>
        <p style={{ color: C.muted, fontSize: 11, margin: 0, textAlign: "center" }}>🔒 Your data is encrypted and never shared with third parties.</p>
      </div>
    </div>
  );
}

// ─── Landing Router ───────────────────────────────────────────────────────────
function Landing({ onRegister, onLogin, onGoogle, onApple, urlRole, onBack }) {
  if (urlRole === "provider") return <ProviderLanding onRegister={onRegister} onLogin={onLogin} onGoogle={onGoogle} onApple={onApple} onBack={onBack} />;
  if (urlRole === "shelter") return <ShelterLanding onRegister={onRegister} onLogin={onLogin} onGoogle={onGoogle} onApple={onApple} onBack={onBack} />;
  return <OwnerLanding onRegister={onRegister} onLogin={onLogin} onGoogle={onGoogle} onApple={onApple} onBack={onBack} />;
}

// ─── Register ────────────────────────────────────────────────────────────────
function RegisterScreen({ onBack, onSuccess, initialPlan = "free", initialRole = "", onApple, onGoogle }) {
  const [role, setRole] = useState(initialRole);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingCred, setPendingCred] = useState(null); // created at Step 1
  const [form, setForm] = useState({
    name:"", email:"", password:"", confirmPassword:"",
    petName:"", petType:"Dog", petBreed:"", petAge:"", petWeight:"",
    state:"", city:"",
    businessName:"", service:"", priceRange:"", googleReview:"", bio:"",
    phone:"", website:"", address:"",
    shelterName:"", ein:"", license:"",
  });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      // Account already created at Step 1 — just use the stored credential
      const cred = pendingCred;
      const { password, confirmPassword, ...formWithoutPassword } = form;
      // Always start on free plan — Stripe will upgrade after payment
      const refCode = generateRefCode(form.name, cred.user.uid);
      const referredBy = getReferralCodeFromURL();
      const profile = { 
        ...formWithoutPassword, role, uid: cred.user.uid, plan: "free", 
        createdAt: new Date().toISOString(),
        pendingPlan: (initialPlan === "plus" || initialPlan === "family") ? initialPlan : null,
        refCode, referredBy: referredBy || null, referralCount: 0,
      };
      await setDoc(doc(db, "users", cred.user.uid), profile);
      if (referredBy) {
        try {
          const refQ = query(collection(db, "users"), where("refCode", "==", referredBy));
          const refSnap = await getDocs(refQ);
          if (!refSnap.empty) {
            const referrer = refSnap.docs[0];
            await updateDoc(doc(db, "users", referrer.id), { referralCount: (referrer.data().referralCount || 0) + 1 });
            console.log("✅ Referral credited to:", referrer.data().email);
          }
        } catch(refErr) { console.error("Referral credit error:", refErr); }
      }
      if (role === "owner" && form.petName) {
        try {
          await addDoc(collection(db, "pets"), {
            name: form.petName, type: form.petType, breed: form.petBreed,
            age: form.petAge, weight: form.petWeight, feeding: "",
            nextVet: "", notes: "", vaccines: [], reminders: [],
            photoURL: "", uid: cred.user.uid, ownerEmail: cred.user.email, createdAt: new Date().toISOString()
          });
          console.log("Pet saved successfully for", cred.user.uid);
        } catch(petErr) {
          console.error("Pet save error:", petErr);
          // Store in sessionStorage as backup
          sessionStorage.setItem("pendingPet", JSON.stringify({
            name: form.petName, type: form.petType, breed: form.petBreed,
            age: form.petAge, weight: form.petWeight
          }));
        }
      }
      // Send branded verification email via Cloud Function
      try {
        const continueUrl = (initialPlan === "plus" || initialPlan === "family")
          ? "https://app.mypetdex.app?payment=pending&plan=" + initialPlan
          : "https://app.mypetdex.app";
        const sendVerification = httpsCallable(getFunctions(), "sendBrandedVerificationEmail");
        await sendVerification({
          role,
          name: form.name || form.contactName || "",
          businessName: form.businessName || "",
          shelterName: form.shelterName || "",
          plan: initialPlan || "free",
          continueUrl,
        });
        console.log("Branded verification email sent to:", cred.user.email);
      } catch (verErr) {
        console.error("Verification email error:", verErr.message);
      }
      onSuccess(profile);
    } catch (e) {
      setError(e.message.includes("email-already-in-use") ? "This email is already registered!" : e.message);
    }
    setLoading(false);
  };

  const roleCard = (r, emoji, title, desc) => (
    <div onClick={() => setRole(r)} style={{ ...card, cursor: "pointer", border: `2px solid ${role === r ? C.green : C.cardBorder}`, flex: 1, textAlign: "center" }}>
      <div style={{ fontSize: 34 }}>{emoji}</div>
      <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginTop: 6 }}>{title}</div>
      <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{desc}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, padding: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 460 }}>
        <button onClick={() => step === 2 ? setStep(1) : onBack()} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 20 }}>← Back</button>
         <h2 style={{ color: C.text, fontWeight: 900, fontSize: 26, margin: "0 0 8px" }}>
          {initialRole === "provider" ? "🛎️ Service Provider Signup" : initialRole === "shelter" ? "🏠 Shelter Signup" : "Create Account"}
        </h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>
          {initialRole === "provider" ? "Join MyPetDex as a service provider — free to join!" : initialRole === "shelter" ? "Register your shelter — always free on MyPetDex!" : "Join the MyPetDex community"}
        </p>
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>🔒 Your data is encrypted using industry-standard protocols and never shared with third parties.</p>
        </div>
        {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {step === 1 && <>
          {!initialRole && <>
          <p style={{ ...label, marginBottom: 12 }}>I am a...</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {roleCard("owner","🐾","Pet Owner","Manage my pets")}
            {roleCard("provider","🛎️","Service Provider","Offer pet services")}
            {roleCard("shelter","🏠","Shelter","Post adoptions")}
          </div>
          </>}
          <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="Jane Smith" required />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" required />
          <Field label="Password (min 8 characters + special character)" type="password" value={form.password} onChange={set("password")} placeholder="e.g. MyPet@2024" required />
          <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={set("confirmPassword")} placeholder="Re-enter your password" required />
          <button style={{ ...btn(), width: "100%" }} disabled={loading} onClick={async () => {
            if ((!role && !initialRole) || !form.name || !form.email || !form.password) { setError("Please fill in all fields and select a role"); return; }
            if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) { setError("Password must include at least one special character (e.g. @, #, !)"); return; }
            if (form.password !== form.confirmPassword) { setError("Passwords do not match"); return; }
            setLoading(true); setError("");
            try {
              const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
              setPendingCred(cred);
              setLoading(false); setError(""); setStep(2);
            } catch(e) {
              if (e.code === "auth/email-already-in-use") {
                setError("This email is already registered! Please sign in instead.");
              } else {
                setError(e.message);
              }
              setLoading(false);
            }
          }}>{loading ? "Creating account..." : "Continue"}</button>
          {initialRole && <>
            <div style={{ display: "flex", alignItems: "center", width: "100%", margin: "16px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.cardBorder }} />
              <span style={{ color: C.muted, fontSize: 12, margin: "0 12px" }}>or</span>
              <div style={{ flex: 1, height: 1, background: C.cardBorder }} />
            </div>
            <button onClick={onApple} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "13px 20px", background: "#000", border: "1.5px solid #000", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 15, color: "#fff", cursor: "pointer", marginBottom: 12 }}>
              <svg width="18" height="18" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.2-155.3-127.1C46.8 790.4 0 663.4 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
              Continue with Apple
            </button>
            <button onClick={onGoogle} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "13px 20px", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 15, color: "#1E293B", cursor: "pointer", marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Continue with Google
            </button>
          </>}
        </>}
        {step === 2 && role === "owner" && <>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Tell us about your pet and location</p>
          <Field label="Pet Name" value={form.petName} onChange={set("petName")} placeholder="Buddy" required />
          <Field label="Pet Type" as="select" value={form.petType} onChange={set("petType")} options={["Dog","Cat"]} />
          <Field label="Breed" as="select" value={form.petBreed} onChange={set("petBreed")} options={form.petType === "Cat" ? CAT_BREEDS : DOG_BREEDS} />
          <Field label="Age" value={form.petAge} onChange={set("petAge")} placeholder="e.g. 2 years" />
          <Field label="Weight" value={form.petWeight} onChange={set("petWeight")} placeholder="e.g. 55 lbs" />
          <Field label="Your State" as="select" value={form.state} onChange={set("state")} options={US_STATES} />
          <Field label="Your City" value={form.city} onChange={set("city")} placeholder="Princeton" />
          <button style={{ ...btn(), width: "100%" }} onClick={submit} disabled={loading}>{loading ? "Creating Account..." : "Create Account"}</button>
        </>}
        {step === 2 && role === "provider" && <>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Tell us about your business</p>
          <Field label="Business Name" value={form.businessName} onChange={set("businessName")} placeholder="Happy Paws Grooming" required />
          <Field label="Service Type" as="select" value={form.service} onChange={set("service")} options={["Grooming","Dog Walking","Veterinary","Training","Boarding","Daycare","Other"]} />
          <Field label="Price Range" value={form.priceRange} onChange={set("priceRange")} placeholder="e.g. $40-$80" />
          <Field label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="+1 (555) 000-0000" />
          <Field label="Website (optional)" value={form.website} onChange={set("website")} placeholder="https://yourwebsite.com" />
          <Field label="Street Address (optional)" value={form.address} onChange={set("address")} placeholder="123 Main St" />
          <Field label="State" as="select" value={form.state} onChange={set("state")} options={US_STATES} />
          <Field label="City" value={form.city} onChange={set("city")} placeholder="Newark" />
          <Field label="Google Review Link (optional)" value={form.googleReview} onChange={set("googleReview")} placeholder="https://maps.google.com/..." />
          <Field label="About Your Business" as="textarea" value={form.bio} onChange={set("bio")} placeholder="Tell pet owners what makes you special..." />
          <div style={{ ...card, background: "#EEF4FF", marginBottom: 16 }}>
            <p style={{ color: C.gold, fontSize: 12, fontWeight: 700, margin: 0 }}>🎉 6-Month Free Trial — then only 5% commission on bookings. No monthly fees!</p>
          </div>
          <button style={{ ...btn(), width: "100%" }} onClick={submit} disabled={loading}>{loading ? "Creating Account..." : "Create Provider Account"}</button>
        </>}
        {step === 2 && role === "shelter" && <>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Shelter verification (approved within 24hr)</p>
          <Field label="Shelter Name" value={form.shelterName} onChange={set("shelterName")} placeholder="Second Chance Animal Shelter" required />
          <Field label="EIN Number" value={form.ein} onChange={set("ein")} placeholder="xx-xxxxxxx" />
          <Field label="State License #" value={form.license} onChange={set("license")} placeholder="NJ-2024-xxxxx" />
          <Field label="Phone Number" value={form.phone} onChange={set("phone")} placeholder="+1 (555) 000-0000" />
          <Field label="Website (optional)" value={form.website} onChange={set("website")} placeholder="https://yourshelter.org" />
          <Field label="Street Address" value={form.address} onChange={set("address")} placeholder="123 Main St" />
          <Field label="State" as="select" value={form.state} onChange={set("state")} options={US_STATES} />
          <Field label="City" value={form.city} onChange={set("city")} placeholder="Camden" />
          <Field label="Google Review Link (optional)" value={form.googleReview} onChange={set("googleReview")} placeholder="https://maps.google.com/..." />
          <div style={{ ...card, background: "#EEF4FF", marginBottom: 16 }}>
            <p style={{ color: C.green, fontSize: 12, fontWeight: 700, margin: 0 }}>Shelter access is always FREE on MyPetDex!</p>
          </div>
          <button style={{ ...btn(), width: "100%" }} onClick={submit} disabled={loading}>{loading ? "Submitting..." : "Submit for Approval"}</button>
        </>}
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onBack, onSuccess, onReset, onApple, onGoogle }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) { setError("Please enter your email and password"); return; }
    setLoading(true); setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      onSuccess(snap.exists() ? snap.data() : { email, role: "owner" });
    } catch (e) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 380 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 20 }}>← Back</button>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 26, margin: "0 0 24px" }}>Welcome back 👋</h2>
        {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="password" />
        <button style={{ ...btn(), width: "100%", marginTop: 8 }} onClick={login} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>

        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button onClick={onReset} style={{ background: "none", border: "none", color: C.green, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: font, textDecoration: "underline" }}>
            Forgot your password?
          </button>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", width: "100%", margin: "16px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.cardBorder }} />
          <span style={{ color: C.muted, fontSize: 12, margin: "0 12px" }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.cardBorder }} />
        </div>

        {/* Apple Sign In */}
        <button onClick={onApple} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "13px 20px", background: "#000", border: "1.5px solid #000", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 15, color: "#fff", cursor: "pointer", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <svg width="18" height="18" viewBox="0 0 814 1000" fill="white"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105.3-57.2-155.3-127.1C46.8 790.4 0 663.4 0 541.8c0-194.3 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg>
          Continue with Apple
        </button>

        {/* Google Sign In */}
        <button onClick={onGoogle} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "13px 20px", background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, fontFamily: font, fontWeight: 700, fontSize: 15, color: "#1E293B", cursor: "pointer", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
function ResetPasswordScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) { setError("Please enter your email address"); return; }
    setLoading(true);
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      setError("");
    } catch(e) {
      setError("Could not send reset email. Please check your email address.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: 16 }}>
      <div style={{ ...card, maxWidth: 400, width: "100%", padding: 32 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 20 }}>← Back</button>
        <img src="/logo.png" alt="MyPetDex" style={{ width: 56, height: 56, objectFit: "contain", display: "block", margin: "0 auto 16px" }} />
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 24, textAlign: "center", margin: "0 0 8px" }}>Reset Password</h2>
        <p style={{ color: C.muted, fontSize: 14, textAlign: "center", marginBottom: 24 }}>Enter your email and we'll send you a reset link.</p>
        {sent ? (
          <div style={{ background: "#22c55e22", border: "1px solid #22c55e", borderRadius: 10, padding: "12px 16px", color: "#16a34a", fontSize: 14, textAlign: "center" }}>
            ✅ Reset link sent! Check your inbox at {email}
          </div>
        ) : (
          <>
            {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
            <button style={{ ...btn(), width: "100%", marginTop: 16 }} onClick={handleReset} disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link 🐾"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main App Shell ───────────────────────────────────────────────────────────

function FeedbackButton({ user, tab }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "Bug Report", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const subjects = ["Bug Report", "Feature Request", "General Feedback", "Account Issue", "Report Inappropriate Content"];

  const send = async () => {
    if (!form.message.trim()) { setError("Please describe your issue or feedback"); return; }
    if (form.message.trim().length < 20) { setError("Please provide at least 20 characters so we can help you better"); return; }
    setSending(true); setError("");
    try {
      const body = new FormData();
      body.append("subject", form.subject);
      body.append("message", form.message);
      body.append("email", user?.email || "unknown");
      await fetch("https://formsubmit.co/help@mypetdex.app", { method: "POST", body });
      setSent(true);
      setTimeout(() => { setSent(false); setOpen(false); setForm({ subject: "Bug Report", message: "" }); }, 2500);
    } catch (e) {
      setError("Failed to send. Please email help@mypetdex.app directly.");
    }
    setSending(false);
  };

  return (
    <>
      {/* Floating button — hidden on AI tab to avoid covering the send button */}
      {tab !== "ai" && <button onClick={() => setOpen(true)} style={{
        position: "fixed", bottom: 90, right: 16, zIndex: 998,
        background: C.green, color: "#fff", border: "none",
        borderRadius: "50%", width: 44, height: 44,
        cursor: "pointer", boxShadow: "0 4px 16px rgba(59,130,246,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20
      }}>
        💬
      </button>}

      {/* Modal overlay */}
      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: C.card, borderRadius: 20, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>💬 Send Feedback</div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button>
            </div>
            <p style={{ color: C.muted, fontSize: 13, marginBottom: 16 }}>Facing an issue or have a suggestion? Let us know and we'll get right on it!</p>

            {sent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <div style={{ color: C.green, fontWeight: 800, fontSize: 16, marginTop: 8 }}>Thank you!</div>
                <div style={{ color: C.muted, fontSize: 13 }}>We'll look into it shortly.</div>
              </div>
            ) : (
              <>
                {/* Subject */}
                <label style={{ display: "block", marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>Subject</span>
                  <div style={{ position: "relative" }}>
                    <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      style={{ ...input, appearance: "none", paddingRight: 36, marginTop: 4 }}>
                      {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: C.muted, fontSize: 14 }}>▼</span>
                  </div>
                </label>

                {/* Message */}
                <label style={{ display: "block", marginBottom: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: ".08em" }}>Your Message</span>
                  <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue or feedback in detail..." rows={4}
                    style={{ ...input, resize: "vertical", marginTop: 4 }} />
                </label>

                {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}

                <button onClick={send} disabled={sending} style={{ ...btn(C.green), width: "100%" }}>
                  {sending ? "Sending..." : "Send Feedback →"}
                </button>
                <p style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 10 }}>
                  Or email us directly at help@mypetdex.app
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MainApp({ user, profile, tab, setTab, onLogout }) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const [openAdd, setOpenAdd] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [expanded, setExpanded] = useState({ services: false, ai: false, shop: false });
  const role = currentProfile?.role || "owner";
  const isOwner = role === "owner" || role === "petowner";
  const isProvider = role === "provider";
  const isShelter = role === "shelter";
  const isDemo = user?.email === 'demo@mypetdex.app';

  const toggleExpand = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const navItem = (id, icon, label, indent = false) => (
    <button key={id} onClick={() => { setTab(id); setSidebarOpen(false); }} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: indent ? "8px 16px 8px 36px" : "10px 16px",
      background: tab === id ? C.green + "18" : "none",
      border: "none", borderRadius: 10, cursor: "pointer",
      color: tab === id ? C.green : C.text,
      fontFamily: font, fontWeight: tab === id ? 800 : 600,
      fontSize: indent ? 13 : 14, textAlign: "left",
      borderLeft: tab === id ? `3px solid ${C.green}` : "3px solid transparent",
      marginBottom: 2
    }}>
      <span style={{ fontSize: indent ? 14 : 16 }}>{icon}</span>
      {label}
    </button>
  );

  const expandItem = (key, icon, label) => (
    <div key={key}>
      <button onClick={() => toggleExpand(key)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        width: "100%", padding: "10px 16px", background: "none", border: "none",
        borderRadius: 10, cursor: "pointer", color: C.text,
        fontFamily: font, fontWeight: 600, fontSize: 14,
        borderLeft: "3px solid transparent", marginBottom: 2
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>{label}
        </div>
        <span style={{ fontSize: 10, color: C.muted }}>{expanded[key] ? "▲" : "▼"}</span>
      </button>
    </div>
  );

  const Sidebar = () => (
    <div style={{
      width: 220, height: "100vh", background: C.card,
      borderRight: `1px solid ${C.cardBorder}`, padding: "20px 12px",
      display: "flex", flexDirection: "column", position: "fixed",
      top: 0, left: 0, overflowY: "auto",
      zIndex: 200, transition: "transform 0.25s ease",
      transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100vw)") : "translateX(0)",
      boxShadow: isMobile && sidebarOpen ? "4px 0 20px rgba(0,0,0,0.1)" : "none",
      visibility: isMobile && !sidebarOpen ? "hidden" : "visible"
    }} className={!sidebarOpen ? "sidebar-fixed" : ""}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "0 4px" }}>
        <img src="/logo.png" alt="MyPetDex" style={{ width: 32, height: 32, objectFit: "contain" }} />
        <span style={{ color: C.green, fontWeight: 900, fontSize: 18, paddingLeft: 8 }}>MyPetDex</span>
        {isMobile && <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.muted, lineHeight: 1 }}>✕</button>}
      </div>

      {/* User info */}
      <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px", marginBottom: 20 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13 }}>Hi, {currentProfile?.name?.split(" ")[0] || "Friend"} 👋</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{currentProfile?.role === "provider" ? "Service Provider" : currentProfile?.role === "shelter" ? "Animal Shelter" : currentProfile?.plan ? currentProfile.plan.charAt(0).toUpperCase() + currentProfile.plan.slice(1) + " Plan" : "Free Plan"}</div>
      </div>

      {/* Nav items */}
      <div>
        {navItem("home", "🏠", "Home")}
        {isOwner && navItem("pets", "🐾", "My Pets")}

        {isOwner && <>
          {navItem("services", "🛎️", "Local Services")}
          {expanded.services && <>

          </>}
        </>}

        {isOwner && navItem("ai", "🤖", "MyPetDex AI Assistant")}
        {isOwner && navItem("recipes", "🍽️", "Pet Recipes")}

        {isOwner && navItem("adoption", "❤️", "Adopt a Pet")}

        {isOwner && <>
          {expandItem("shop", "🛒", "Shop")}
          {expanded.shop && <>
            {navItem("shop", "📦", "Amazon Products", true)}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 8px 36px", color: C.muted, fontSize: 13, fontWeight: 600 }}>
              <span style={{ fontSize: 14 }}>🐾</span> Chewy <span style={{ background: C.gold + "33", color: C.gold, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 6, marginLeft: 4 }}>Soon</span>
            </div>
          </>}
        </>}

        {isProvider && <>
          {navItem("profile", "📋", "My Business")}
          {navItem("bookings", "📅", "Bookings")}
        </>}

        {isShelter && <>
          {navItem("listings", "🐶", "Listings")}
        </>}
      </div>

      {/* Bottom items */}
      <div style={{ borderTop: `1px solid ${C.cardBorder}`, paddingTop: 12, marginTop: 12 }}>
        {navItem("settings", "⚙️", "Settings")}
        <button onClick={onLogout} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 16px", background: "none", border: "none",
          borderRadius: 10, cursor: "pointer", color: C.muted,
          fontFamily: font, fontWeight: 600, fontSize: 14, textAlign: "left",
          borderLeft: "3px solid transparent"
        }}>
          <span>🚪</span> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, display: "flex", overflowX: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      {showUpgrade && <UpgradeScreen user={user} profile={currentProfile} onClose={() => setShowUpgrade(false)} />}
      <Sidebar />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 199
        }} />
      )}

      {/* Main content */}
      <><style>{`.main-content { margin-left: 240px; padding-left: 10px; } @media(max-width:768px){ .main-content { margin-left: 0 !important; padding-left: 0 !important; } }`}</style><div style={{ flex: 1, minHeight: "100vh" }} className="main-content">
        {/* Top bar - mobile only */}
        <div style={{ background: C.card, borderBottom: `1px solid ${C.cardBorder}`, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 100 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: C.text, display: isMobile ? "block" : "none" }}>☰</button>
          <span onClick={() => setTab("home")} style={{ color: C.green, fontWeight: 900, fontSize: 18, flex: 1, textAlign: "center", cursor: "pointer" }}>MyPetDex</span>
        </div>

        {isDemo && <div style={{ background: C.gold + "22", borderBottom: "1px solid " + C.gold, padding: "8px 16px", textAlign: "center", fontSize: 12, color: C.gold, fontWeight: 700 }}>👀 Demo Mode — browse only, editing disabled</div>}

        <div style={{ padding: "20px 24px", maxWidth: 680 }}>
          {tab === "home" && <HomeTab profile={currentProfile} user={user} isOwner={isOwner} isProvider={isProvider} isShelter={isShelter} setTab={setTab} isDemo={isDemo} onAddPet={() => { setTab("pets"); setOpenAdd(true); }} />}
          {tab === "pets" && isOwner && <PetsTab user={user} profile={currentProfile} isDemo={isDemo} onUpgrade={() => setShowUpgrade(true)} openAdd={openAdd} onOpenAddDone={() => setOpenAdd(false)} />}
          {(tab === "services" || tab === "groomers" || tab === "walkers" || tab === "sitters" || tab === "daycare" || tab === "vets") && isOwner && <ServicesTab profile={currentProfile} user={user} serviceFilter={tab} />}
          {tab === "ai" && isOwner && <AITab profile={currentProfile} user={user} onUpgrade={() => setShowUpgrade(true)} />}
          {tab === "recipes" && isOwner && <RecipesTab profile={currentProfile} user={user} onUpgrade={() => setShowUpgrade(true)} />}
          {tab === "adoption" && isOwner && <AdoptionTab profile={currentProfile} />}
          {tab === "shop" && isOwner && <ShopTab />}
          {tab === "profile" && isProvider && <ProviderProfile profile={currentProfile} />}
          {tab === "bookings" && isProvider && <BookingsTab />}
          {tab === "listings" && isShelter && <ShelterListings user={user} isDemo={isDemo} />}
          {tab === "settings" && <SettingsTab user={user} profile={currentProfile} onProfileUpdate={setCurrentProfile} onLogout={onLogout} isDemo={isDemo} />}
        </div>
        <FeedbackButton user={user} tab={tab} />
      </div></>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ profile, user, isOwner, isProvider, isShelter, setTab, onAddPet, isDemo }) {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    if (!user || !isOwner) return;
    const q = query(collection(db, "pets"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      setPets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, isOwner]);

  const referralCount = profile?.referralCount || 0;
  const tiers = [
    { min: 0, max: 2, label: "Standard Access", icon: "🥉", color: "#94a3b8" },
    { min: 3, max: 4, label: "Priority Access", icon: "🥈", color: C.green },
    { min: 5, max: Infinity, label: "Founding Member", icon: "🥇", color: C.gold },
  ];
  const currentTier = tiers.find(t => referralCount >= t.min && referralCount <= t.max) || tiers[0];
  const nextTier = tiers.find(t => t.min > referralCount);

  const InviteBanner = isOwner ? (
    <div onClick={() => setTab("settings")} style={{ ...card, marginBottom: 16, border: `1.5px solid ${currentTier.color}55`, background: currentTier.color + "0f", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 30, flexShrink: 0 }}>{currentTier.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: currentTier.color }}>{currentTier.label}</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
          {nextTier ? `${nextTier.min - referralCount} more friend${nextTier.min - referralCount !== 1 ? "s" : ""} to unlock ${nextTier.label} ${nextTier.icon}` : "Maximum tier reached! 🎉"}
        </div>
      </div>
      <div style={{ ...btn(C.green), fontSize: 12, padding: "8px 12px", flexShrink: 0 }}>Invite →</div>
    </div>
  ) : null;

  if (isProvider) return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22 }}>Provider Dashboard 🛎️</h2>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.gold, fontWeight: 800, fontSize: 16 }}>🎉 6-Month Free Trial Active</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>After trial: only 5% commission on completed bookings. No monthly fees, ever!</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[["Total Views","24"],["Bookings","0"],["Earnings","$0"],["Rating","--"]].map(([k,v]) => (
          <div key={k} style={{ ...card, textAlign: "center" }}>
            <div style={{ color: C.green, fontWeight: 900, fontSize: 26 }}>{v}</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{k}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (isShelter) return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22 }}>Shelter Dashboard 🏠</h2>
      <div style={{ ...card }}>
        <div style={{ color: C.green, fontWeight: 800 }}>Shelter Access Always Free</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Post available pets and connect them with loving homes.</div>
      </div>
    </div>
  );

  return (
    <div>
      {!isDemo && InviteBanner}
      {/* ── My Pets Section ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>My Pets</h2>
        {!isDemo && <button onClick={onAddPet} style={{ ...btn(C.cardBorder, C.green), padding: "6px 14px", fontSize: 13, border: `1px solid ${C.green}` }}>+ Add Pet</button>}
      </div>

      {pets.length === 0 && (
        <div style={{ background: "linear-gradient(135deg,#3B82F6,#6366f1)", borderRadius: 16, padding: "18px 20px", marginBottom: 16, color: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>👋 Welcome to MyPetDex!</div>
          <div style={{ fontSize: 13, marginBottom: 10, opacity: 0.9 }}>Get started in 3 easy steps:</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>✅ Add your first pet</div>
          <div style={{ fontSize: 13, marginBottom: 4, opacity: 0.7 }}>○ Add vaccines & health records</div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>○ Set up reminders</div>
        </div>
      )}
      {pets.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 24, marginBottom: 20 }}>
          <img src="/logo.png" alt="MyPetDex" style={{ width: 56, height: 56, objectFit: "contain" }} />
          <div style={{ color: C.text, fontWeight: 800, marginTop: 8 }}>No pets added yet!</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 6, textAlign: "center" }}>Start by adding your first pet to track their health, vaccines, and reminders.</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Tap "Add Pet" to get started</div>
        </div>
      )}

      {/* ── All Pets as Cards ── */}
      {pets.map(pet => (
        <div key={pet.id} style={{ ...card, marginBottom: 14, cursor: "pointer" }} onClick={() => setTab("pets")}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar emoji={pet.type === "Cat" ? "🐱" : "🐶"} size={60} img={pet.photoURL} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{pet.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed}{pet.age ? ` · ${pet.age} yrs` : ""}{pet.weight ? ` · ${pet.weight} lbs` : ""}</div>
              <Badge text={"📍 " + (profile?.city || "--") + ", " + (profile?.state || "--")} color={C.muted} />
            </div>
            <div style={{ color: C.muted, fontSize: 18 }}>›</div>
          </div>
          {pet.nextVet && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: C.gold + "18", borderRadius: 10, color: C.gold, fontSize: 12, fontWeight: 700 }}>
              🗓️ Next vet: {pet.nextVet}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {[{ emoji:"💉", label:"Vaccines", val: (pet.vaccines||[]).length },{ emoji:"⏰", label:"Reminders", val: (pet.reminders||[]).length }].map(({ emoji, label, val }) => (
              <div key={label} style={{ background: C.inputBg, borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{emoji}</span>
                <div>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{label}</div>
                  <div style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>{val} recorded</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ── Quick Actions ── */}
      <div style={{ ...card }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Quick Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["🛎️","Find Services","services"],["🍽️","Pet Recipes","recipes"],["❤️","Adopt a Pet","adoption"],["🐾","My Pets","pets"]].map(([e,l,t]) => (
            <button key={t} onClick={() => setTab(t)} style={{ ...btn(C.cardBorder, C.text), border: `1px solid ${C.cardBorder}`, padding: "12px 8px", borderRadius: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "center", fontSize: 13 }}>
              <span>{e}</span>{l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Pets Tab ─────────────────────────────────────────────────────────────────
function PetsTab({ user, profile, isDemo, onUpgrade, openAdd, onOpenAddDone }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  useEffect(() => {
    if (openAdd) { setAdding(true); if (onOpenAddDone) onOpenAddDone(); }
  }, [openAdd, onOpenAddDone]);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [form, setForm] = useState({ name:"", type:"Dog", breed:"", age:"", weight:"", nextVet:"", notes:"", feeding:"" });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pets"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      setPets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const selectedPet = pets.find(p => p.id === selectedPetId) || null;

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, (compressed) => setPhotoPreview(compressed));
  };

  const petLimit = profile?.plan === "family" ? Infinity : profile?.plan === "plus" ? 3 : 1;
  const addPet = async () => {
    if (!form.name) return;
    if (pets.length >= petLimit) {
      alert(`Your ${profile?.plan || "free"} plan allows up to ${petLimit === Infinity ? "unlimited" : petLimit} pet${petLimit === 1 ? "" : "s"}. Upgrade at home.mypetdex.app to add more!`);
      return;
    }
    await addDoc(collection(db, "pets"), {
      ...form, uid: user.uid, ownerEmail: user.email,
      photoURL: photoPreview || "",
      vaccines: [], reminders: [],
      createdAt: new Date().toISOString()
    });
    setAdding(false);
    setPhotoPreview(null);
    setForm({ name:"", type:"Dog", breed:"", age:"", weight:"", nextVet:"", notes:"", feeding:"" });
  };

  const deletePet = async (id) => {
    await deleteDoc(doc(db, "pets", id));
    setSelectedPetId(null);
  };

  if (selectedPet) return (
    <PetDetail pet={selectedPet} user={user} profile={profile} isDemo={isDemo} onBack={() => setSelectedPetId(null)} onDelete={() => deletePet(selectedPet.id)} />
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>My Pets</h2>
        {!isDemo && (pets.length < petLimit) && <button style={btn(C.green)} onClick={() => setAdding(true)}>+ Add Pet</button>}
        {!isDemo && (pets.length >= petLimit) && <button onClick={onUpgrade} style={{ ...btn(C.green), fontSize: 13 }}>⬆️ Upgrade for More Pets</button>}
      </div>
      {loading && <Spinner />}
      {!loading && pets.length === 0 && !adding && (
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48 }}>🐾</div>
          <div style={{ color: C.text, fontWeight: 800, marginTop: 12 }}>No pets yet!</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Add your first pet to get started</div>
        </div>
      )}
      {pets.map(pet => (
        <div key={pet.id} style={{ ...card, marginBottom: 14, cursor: "pointer" }} onClick={() => setSelectedPetId(pet.id)}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar emoji={pet.type === "Cat" ? "🐱" : "🐶"} size={52} img={pet.photoURL} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{pet.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed}{pet.age ? ` · ${pet.age} yrs` : ""}{pet.weight ? ` · ${pet.weight} lbs` : ""}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {(pet.vaccines || []).slice(0,3).map(v => <Badge key={v.id} text={"💉 " + v.name} color={C.green} />)}
              </div>
            </div>
            <div style={{ color: C.muted, fontSize: 18 }}>›</div>
          </div>
          {pet.nextVet && <div style={{ marginTop: 10, padding: "8px 12px", background: C.gold + "18", borderRadius: 10, color: C.gold, fontSize: 12, fontWeight: 700 }}>🗓️ Next vet: {pet.nextVet}</div>}
        </div>
      ))}
      {adding && pets.length >= petLimit && (
        <div style={{ ...card, textAlign: "center", padding: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🐾</div>
          <p style={{ color: C.text, fontWeight: 700, fontSize: 16, margin: "0 0 8px" }}>Pet limit reached</p>
          <p style={{ color: C.muted, fontSize: 14, margin: "0 0 16px" }}>Your {profile?.plan || "free"} plan allows up to {petLimit} pet{petLimit === 1 ? "" : "s"}.</p>
          <button style={btn(C.green, "#fff")} onClick={onUpgrade}>⬆️ Upgrade for More Pets</button>
          <div style={{ marginTop: 12 }}><button style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14 }} onClick={() => setAdding(false)}>Cancel</button></div>
        </div>
      )}
      {adding && pets.length < petLimit && (
        <div style={{ ...card }}>
          <h3 style={{ color: C.text, margin: "0 0 16px" }}>Add New Pet</h3>
          <div style={{ marginBottom: 20 }}>
            <span style={label}>Pet Photo (optional)</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: `3px solid ${C.green}` }} />
              ) : (
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.cardBorder, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🐾</div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ ...btn(C.cardBorder, C.muted), cursor: "pointer", fontSize: 13, padding: "8px 16px", display: "inline-block" }}>
                  📷 {photoPreview ? "Change Photo" : "Choose Photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
                </label>
                {photoPreview && (
                  <button onClick={() => setPhotoPreview(null)} style={{ background: "none", border: `1px solid ${C.danger}`, borderRadius: 8, color: C.danger, cursor: "pointer", fontSize: 12, fontFamily: font, padding: "4px 10px" }}>Remove</button>
                )}
              </div>
            </div>
            {photoPreview && (
              <div style={{ marginTop: 8, padding: "8px 12px", background: C.green + "18", borderRadius: 10, border: `1px solid ${C.green}44` }}>
                <span style={{ color: C.green, fontSize: 12, fontWeight: 700 }}>Photo selected - will be saved when you click Save Pet below</span>
              </div>
            )}
          </div>
          <Field label="Pet Name" value={form.name} onChange={set("name")} placeholder="Buddy" required />
          <Field label="Type" as="select" value={form.type} onChange={set("type")} options={["Dog","Cat"]} />
          <Field label="Breed" as="select" value={form.breed} onChange={set("breed")} options={form.type === "Cat" ? CAT_BREEDS : form.type === "Dog" ? DOG_BREEDS : ["Mixed","Other"]} />
          <Field label="Age" value={form.age} onChange={set("age")} placeholder="2 years" />
          <Field label="Weight" value={form.weight} onChange={set("weight")} placeholder="55 lbs" />
          <Field label="Feeding Schedule" value={form.feeding} onChange={set("feeding")} placeholder="e.g. 8am and 6pm, 1 cup each" />
          <SmartDatePicker label="Next Vet Visit" value={form.nextVet} onChange={set("nextVet")} />
          <Field label="Notes" as="textarea" value={form.notes} onChange={set("notes")} placeholder="Anything special about your pet..." />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button style={{ ...btn(C.green), flex: 1, fontSize: 16 }} onClick={addPet}>💾 Save Pet</button>
            <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => { setAdding(false); setPhotoPreview(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pet Detail ───────────────────────────────────────────────────────────────
function PetDetail({ pet, user, profile, isDemo, onBack, onDelete }) {
  const [activeTab, setActiveTab] = useState("info");
  const [vaccines, setVaccines] = useState(pet.vaccines || []);
  const [reminders, setReminders] = useState(pet.reminders || []);
  const [vForm, setVForm] = useState({ name:"", date:"", nextDue:"", vet:"", notes:"" });
  const [rForm, setRForm] = useState({ title:"", date:"", time:"", repeat:"None", notes:"" });
  const [addingV, setAddingV] = useState(false);
  const [vError, setVError] = useState("");
  const [addingR, setAddingR] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [toast, setToast] = useState("");
  const [showQR, setShowQR] = useState(false);
  const setV = k => v => setVForm(f => ({ ...f, [k]: v }));
  const setR = k => v => setRForm(f => ({ ...f, [k]: v }));

  useEffect(() => { setVaccines(pet.vaccines || []); }, [pet.vaccines]);
  useEffect(() => { setReminders(pet.reminders || []); }, [pet.reminders]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file, (compressed) => setPendingPhoto(compressed));
  };

  const savePhoto = async () => {
    if (!pendingPhoto) return;
    setSavingPhoto(true);
    try {
      await updateDoc(doc(db, "pets", pet.id), { photoURL: pendingPhoto });
      setPendingPhoto(null);
      showToast("✅ Photo saved!");
    } catch (e) {
      showToast("Error saving photo. Try again.");
    }
    setSavingPhoto(false);
  };

  const parseLocalDate = (str) => { const [y,m,d] = str.split("-"); return new Date(y, m-1, d); };
  const saveVaccine = async () => {
    if (!vForm.name) { setVError("Please select a vaccine name."); return; }
    const today = new Date(); today.setHours(0,0,0,0);
    if (vForm.date) {
      const given = parseLocalDate(vForm.date);
      if (given > today) { setVError("\"Date Given\" cannot be in the future — enter the date the vaccine was actually administered."); return; }
    }
    if (vForm.nextDue) {
      const nextDue = parseLocalDate(vForm.nextDue);
      if (nextDue <= today) { setVError("\"Next Due Date\" must be a future date."); return; }
      if (vForm.date) {
        const given = parseLocalDate(vForm.date);
        if (nextDue <= given) { setVError("\"Next Due Date\" must be after the date given."); return; }
      }
    }
    setVError("");
    const newV = { ...vForm, id: Date.now().toString() };
    const updated = [...vaccines, newV];
    setVaccines(updated);
    await updateDoc(doc(db, "pets", pet.id), { vaccines: updated });
    setVForm({ name:"", date:"", nextDue:"", vet:"", notes:"" });
    setAddingV(false);
    showToast("✅ Vaccine saved!");
  };

  const deleteVaccine = async (id) => {
    const updated = vaccines.filter(v => v.id !== id);
    setVaccines(updated);
    await updateDoc(doc(db, "pets", pet.id), { vaccines: updated });
  };

 const saveReminder = async () => {
    if (!rForm.title) return;
    let updated;
    if (editingReminderId) {
      updated = reminders.map(r => r.id === editingReminderId ? { ...rForm, id: editingReminderId } : r);
      setEditingReminderId(null);
    } else {
      const newR = { ...rForm, id: Date.now().toString() };
      updated = [...reminders, newR];
    }
    setReminders(updated);
    await updateDoc(doc(db, "pets", pet.id), { reminders: updated });
    setRForm({ title:"", date:"", time:"", repeat:"None", notes:"" });
    setAddingR(false);
    showToast("✅ Reminder saved!");
  };

  const deleteReminder = async (id) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    await updateDoc(doc(db, "pets", pet.id), { reminders: updated });
  };

  const vaccineOptions = pet.type === "Cat" ? VACCINES_CAT : VACCINES_DOG;
  const tabStyle = (t) => ({ background: "none", border: "none", color: activeTab === t ? C.green : C.muted, fontFamily: font, fontWeight: 800, fontSize: 13, cursor: "pointer", padding: "8px 12px", borderBottom: `2px solid ${activeTab === t ? C.green : "transparent"}` });

  return (
    <div>
      {toast && <Toast message={toast} />}
      {showQR && <PetQRModal pet={pet} onClose={() => setShowQR(false)} />}
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 16 }}>← Back to Pets</button>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Avatar emoji={pet.type === "Cat" ? "🐱" : "🐶"} size={80} img={pendingPhoto || pet.photoURL} />
            {!isDemo && <label style={{ background: C.cardBorder, border: "1px solid " + C.cardBorder, borderRadius: 8, cursor: "pointer", fontSize: 11, padding: "6px 10px", display: "inline-block", textAlign: "center", color: C.muted, fontFamily: font, fontWeight: 700 }}>
              📷 Change Photo
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
            </label>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 22 }}>{pet.name}</div>
              <button onClick={() => setShowQR(true)} style={{ ...btn(C.inputBg, C.green), padding:"4px 10px", fontSize:12, border:`1px solid ${C.green}33` }}>🔗 QR</button>
            </div>
            <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed}{pet.age ? ` · ${pet.age} yrs` : ""}{pet.weight ? ` · ${pet.weight} lbs` : ""}</div>
            {pet.feeding && <div style={{ color: C.green, fontSize: 12, marginTop: 4 }}>🍽️ {pet.feeding}</div>}
          </div>
        </div>
        {pendingPhoto && (
          <div style={{ marginTop: 14, padding: 14, background: C.green + "18", borderRadius: 12, border: `1px solid ${C.green}44` }}>
            <div style={{ color: C.green, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📸 New photo selected - ready to save!</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btn(C.green), flex: 1, fontSize: 14 }} onClick={savePhoto} disabled={savingPhoto}>
                {savingPhoto ? "Saving..." : "💾 Save Photo"}
              </button>
              <button onClick={() => setPendingPhoto(null)} style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "10px 16px" }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.cardBorder}`, marginBottom: 16 }}>
        <button style={tabStyle("info")} onClick={() => setActiveTab("info")}>Info</button>
        <button style={tabStyle("vaccines")} onClick={() => setActiveTab("vaccines")}>💉 Vaccines ({vaccines.length})</button>
        <button style={tabStyle("reminders")} onClick={() => setActiveTab("reminders")}>⏰ Reminders</button>
        <button style={tabStyle("calories")} onClick={() => setActiveTab("calories")}>🔢 Calories</button>
      </div>

      {activeTab === "info" && <EditPetInfo pet={pet} onDelete={onDelete} onSaved={() => showToast("✅ Pet info updated!")} isDemo={isDemo} />}

      {activeTab === "vaccines" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800 }}>Vaccine Records</div>
            {!isDemo && <button style={{ ...btn(C.green), padding: "8px 16px", fontSize: 13 }} onClick={() => setAddingV(true)}>+ Add</button>}
          </div>
          {vaccines.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 30 }}><div style={{ fontSize: 32, marginBottom: 8 }}>💉</div><div style={{ fontWeight: 800, color: C.text, marginBottom: 6 }}>No vaccines recorded yet</div><div style={{ fontSize: 13 }}>Add your pet's first vaccine to start tracking and receive reminders.</div></div>}
          {vaccines.map(v => (
            <div key={v.id} style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 800 }}>💉 {v.name}</div>
                  {v.date && <div style={{ color: C.muted, fontSize: 12 }}>Given: {v.date}</div>}
                  {v.nextDue && (() => { const nd = new Date(v.nextDue.replace(/-/g,"/")); const isPast = nd < new Date(); return <div style={{ color: isPast ? C.danger : C.gold, fontSize: 12, fontWeight: isPast ? 700 : 400 }}>{isPast ? "⚠️ Overdue: " : "Next due: "}{v.nextDue}</div>; })()}
                  {v.vet && <div style={{ color: C.muted, fontSize: 12 }}>Vet: {v.vet}</div>}
                  {v.notes && <div style={{ color: C.muted, fontSize: 12 }}>{v.notes}</div>}
                </div>
                <button onClick={() => deleteVaccine(v.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 18 }}>🗑️</button>
              </div>
            </div>
          ))}
          {addingV && (
            <div style={{ ...card, marginTop: 12 }}>
              <h4 style={{ color: C.text, margin: "0 0 14px" }}>Add Vaccine Record</h4>
              <Field label="Vaccine Name" as="select" value={vForm.name} onChange={setV("name")} options={vaccineOptions} />
              <SmartDatePicker label="Date Given" value={vForm.date} onChange={setV("date")} />
              <SmartDatePicker label="Next Due Date" value={vForm.nextDue} onChange={setV("nextDue")} />
              <Field label="Veterinarian" value={vForm.vet} onChange={setV("vet")} placeholder="Dr. Smith" />
              <Field label="Notes" as="textarea" value={vForm.notes} onChange={setV("notes")} placeholder="Any notes..." />
              {vError && <div style={{ color: C.danger, fontSize: 13, marginBottom: 10, padding: "8px 12px", background: C.danger + "11", borderRadius: 8 }}>⚠️ {vError}</div>}
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btn(C.green)} onClick={saveVaccine}>💾 Save</button>
                <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => { setAddingV(false); setVError(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "reminders" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800 }}>Reminders</div>
            {!isDemo && <button style={{ ...btn(C.green), padding: "8px 16px", fontSize: 13 }} onClick={() => setAddingR(true)}>+ Add</button>}
          </div>
          {reminders.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 30 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div><div style={{ fontWeight: 800, color: C.text, marginBottom: 6 }}>No reminders set yet</div><div style={{ fontSize: 13 }}>Add a reminder for vaccines, vet visits, or medications — we'll email you automatically.</div></div>}
          {reminders.map(r => (
            <div key={r.id} style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 800 }}>⏰ {r.title}</div>
                  {r.date && <div style={{ color: C.muted, fontSize: 12 }}>📅 {r.date} {r.time && "at " + r.time}</div>}
                  {r.repeat !== "None" && <Badge text={"🔁 " + r.repeat} color={C.gold} />}
                  {r.notes && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{r.notes}</div>}
                </div>
              {!isDemo && <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setRForm({ title: r.title, date: r.date, time: r.time, repeat: r.repeat, notes: r.notes || "" }); setEditingReminderId(r.id); setAddingR(true); }} style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontSize: 16 }}>✏️</button>
                  <button onClick={() => deleteReminder(r.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 16 }}>🗑️</button>
                </div>}
              </div>
            </div>
          ))}
          {addingR && (
            <div style={{ ...card, marginTop: 12 }}>
              <h4 style={{ color: C.text, margin: "0 0 14px" }}>Add Reminder</h4>
              <Field label="Reminder Title" value={rForm.title} onChange={setR("title")} placeholder="e.g. Vet checkup, Flea treatment..." required />
              <SmartDatePicker label="Date" value={rForm.date} onChange={setR("date")} />
              <div style={{ marginBottom: 14 }}>
                <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Time</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select value={rForm.time ? rForm.time.split(":")[0] : "08"} onChange={e => { const parts = rForm.time ? rForm.time.split(":") : ["08","00 AM"]; const ampm = parts[1] ? (parts[1].includes("PM") ? "PM" : "AM") : "AM"; const min = parts[1] ? parts[1].replace(" AM","").replace(" PM","") : "00"; setR("time")(e.target.value + ":" + min + " " + ampm); }} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.bg, color: C.text, fontFamily: font, fontSize: 16, fontWeight: 700 }}>
                    {["01","02","03","04","05","06","07","08","09","10","11","12"].map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <div style={{ color: C.text, fontWeight: 900, fontSize: 20 }}>:</div>
                  <select value={rForm.time ? rForm.time.split(":")[1]?.replace(" AM","").replace(" PM","") : "00"} onChange={e => { const parts = rForm.time ? rForm.time.split(":") : ["08","00 AM"]; const ampm = parts[1] ? (parts[1].includes("PM") ? "PM" : "AM") : "AM"; setR("time")(parts[0] + ":" + e.target.value + " " + ampm); }} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.bg, color: C.text, fontFamily: font, fontSize: 16, fontWeight: 700 }}>
                    {["00","05","10","15","20","25","30","35","40","45","50","55"].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <select value={rForm.time ? (rForm.time.includes("PM") ? "PM" : "AM") : "AM"} onChange={e => { const parts = rForm.time ? rForm.time.split(":") : ["08","00 AM"]; const min = parts[1] ? parts[1].replace(" AM","").replace(" PM","") : "00"; setR("time")(parts[0] + ":" + min + " " + e.target.value); }} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.cardBorder}`, background: C.bg, color: C.text, fontFamily: font, fontSize: 16, fontWeight: 700 }}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <Field label="Repeat" as="select" value={rForm.repeat} onChange={setR("repeat")} options={["None","Daily","Weekly","Monthly","Yearly"]} />
              <Field label="Notes" as="textarea" value={rForm.notes} onChange={setR("notes")} placeholder="Any notes..." />
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btn(C.green)} onClick={saveReminder}>💾 Save</button>
                <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => setAddingR(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === "calories" && <CalcTab pet={pet} profile={profile} />}
    </div>
  );
}

function CalcTab({ pet, profile }) {
  const [neutered, setNeutered] = useState(true);
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [healthGoal, setHealthGoal] = useState("maintain");
  const [lifeStage, setLifeStage] = useState("adult");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const age = pet?.age?.toLowerCase() || "";
    const isdog = (pet?.type || "Dog") !== "Cat";
    if (age.includes("puppy") || age.includes("kitten") || age.includes("month")) {
      setLifeStage("puppy");
    } else if (parseFloat(age) >= (isdog ? 7 : 10)) {
      setLifeStage("senior");
    } else {
      setLifeStage("adult");
    }
  }, [pet]);

  const parseWeightKg = () => {
    const w = pet?.weight || "";
    const num = parseFloat(w);
    if (isNaN(num)) return null;
    if (w.toLowerCase().includes("kg")) return num;
    return num * 0.453592;
  };

  const calculate = () => {
    const weightKg = parseWeightKg();
    if (!weightKg || weightKg <= 0) {
      setResult({ error: "Could not parse weight. Make sure pet weight is set (e.g. 55 lbs or 25 kg)." });
      return;
    }

    // RER formula — WSAVA Global Nutrition Guidelines
    const RER = 70 * Math.pow(weightKg, 0.75);
    const isCat = (pet?.type || "Dog") === "Cat";

    // WSAVA-aligned multipliers (source: WSAVA Global Nutrition Guidelines)
    let multiplier = 1.6;

    if (isCat) {
      // Cat multipliers — WSAVA/AAFCO
      if (lifeStage === "puppy") {
        multiplier = 2.5; // kitten
      } else if (lifeStage === "senior") {
        multiplier = 1.1; // senior cat
      } else if (healthGoal === "pregnant") {
        multiplier = 1.6;
      } else if (healthGoal === "nursing") {
        multiplier = 2.0;
      } else if (healthGoal === "lose") {
        multiplier = 0.8;
      } else if (healthGoal === "gain") {
        multiplier = 1.6;
      } else {
        multiplier = neutered ? 1.2 : 1.4; // adult cat
      }
    } else {
      // Dog multipliers — WSAVA/AAFCO
      if (lifeStage === "puppy") {
        const ageMonths = parseFloat(pet?.age) || 12;
        multiplier = ageMonths < 4 ? 3.0 : 2.0; // <4 months vs 4mo+
      } else if (lifeStage === "senior") {
        multiplier = 1.4; // senior/obese prone dog
      } else if (healthGoal === "pregnant") {
        multiplier = 1.8;
      } else if (healthGoal === "nursing") {
        multiplier = 2.5;
      } else if (healthGoal === "lose") {
        multiplier = 1.0; // weight loss = 1.0 x RER (WSAVA)
      } else if (healthGoal === "gain") {
        multiplier = 1.7; // weight gain
      } else {
        // Adult dog — base multiplier by neuter status
        multiplier = neutered ? 1.6 : 1.8;
        // Activity level adjustment on top (WSAVA)
        if (activityLevel === "low") multiplier -= 0.2;
        if (activityLevel === "active") multiplier += 0.2;
        if (activityLevel === "very_active") multiplier += 0.4;
        // Cap to reasonable range
        multiplier = Math.min(Math.max(multiplier, 1.0), 2.5);
      }
    }

    const dailyKcal = Math.round(RER * multiplier);

    // Meals per day recommendation
    const mealsPerDay = lifeStage === "puppy"
      ? (parseFloat(pet?.age) < 6 ? 4 : 3)
      : 2;

    const kibbleCups = (dailyKcal / 350).toFixed(1);
    const wetFoodGrams = Math.round(dailyKcal / 1.0);
    const rawGrams = Math.round(dailyKcal / 1.2);
    const kibblePerMeal = (parseFloat(kibbleCups) / mealsPerDay).toFixed(2);
    const rawPerMeal = Math.round(rawGrams / mealsPerDay);

    setResult({
      weightKg: weightKg.toFixed(1),
      weightLbs: (weightKg * 2.20462).toFixed(1),
      RER: Math.round(RER),
      MER: dailyKcal,
      multiplier: multiplier.toFixed(2),
      kibbleCups,
      kibblePerMeal,
      wetFoodGrams,
      rawGrams,
      rawPerMeal,
      mealsPerDay,
      lifeStage,
    });
  };

  const activityOptions = [
    { id: "low", label: "🛋️ Low", desc: "mostly resting" },
    { id: "moderate", label: "🚶 Moderate", desc: "daily walks" },
    { id: "active", label: "🏃 Active", desc: "runs/plays daily" },
    { id: "very_active", label: "⚡ Very Active", desc: "working/sport dog" },
  ];
  const healthGoalOptions = [
    { id: "maintain", label: "✅ Maintain weight" },
    { id: "lose", label: "⬇️ Lose weight" },
    { id: "gain", label: "⬆️ Gain weight" },
    { id: "pregnant", label: "🤰 Pregnant" },
    { id: "nursing", label: "🍼 Nursing" },
  ];
  const lifeStageOptions = [
    { id: "puppy", label: "🐶 Puppy / Kitten" },
    { id: "adult", label: "🐕 Adult" },
    { id: "senior", label: "👴 Senior" },
  ];

  return (
    <div>
      <div style={{ ...card, marginBottom: 16, background: C.green + "11", border: "1px solid " + C.green + "33" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>📊 {pet.name}'s Weight</div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 22, marginTop: 2 }}>{pet.weight || "Not set"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Formula: NRC/AAFCO</div>
            <div style={{ color: C.muted, fontSize: 11 }}>RER = 70 x kg^0.75</div>
          </div>
        </div>
        {!pet.weight && <div style={{ color: C.gold, fontSize: 12, marginTop: 8 }}>⚠️ Add weight to pet profile for accurate results</div>}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Life Stage</div>
        <div style={{ display: "flex", gap: 8 }}>
          {lifeStageOptions.map(o => (
            <button key={o.id} onClick={() => setLifeStage(o.id)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, fontFamily: font, fontSize: 12, fontWeight: lifeStage === o.id ? 800 : 600, background: lifeStage === o.id ? C.green : C.cardBorder, color: lifeStage === o.id ? "#0F1A14" : C.muted, border: "1.5px solid " + (lifeStage === o.id ? C.green : C.cardBorder), cursor: "pointer" }}>{o.label}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Reproductive Status</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["true", "✂️ Spayed/Neutered"], ["false", "🔵 Intact"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setNeutered(val === "true")} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, fontFamily: font, fontSize: 12, fontWeight: neutered === (val === "true") ? 800 : 600, background: neutered === (val === "true") ? C.green : C.cardBorder, color: neutered === (val === "true") ? "#0F1A14" : C.muted, border: "1.5px solid " + (neutered === (val === "true") ? C.green : C.cardBorder), cursor: "pointer" }}>{lbl}</button>
          ))}
        </div>
      </div>
      {lifeStage === "adult" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Activity Level</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {activityOptions.map(o => (
              <button key={o.id} onClick={() => setActivityLevel(o.id)} style={{ padding: "10px 8px", borderRadius: 10, fontFamily: font, fontSize: 12, fontWeight: activityLevel === o.id ? 800 : 600, background: activityLevel === o.id ? C.green : C.cardBorder, color: activityLevel === o.id ? "#0F1A14" : C.muted, border: "1.5px solid " + (activityLevel === o.id ? C.green : C.cardBorder), cursor: "pointer", textAlign: "left" }}>
                <div>{o.label}</div>
                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Goal</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {healthGoalOptions.map(o => (
            <button key={o.id} onClick={() => setHealthGoal(o.id)} style={{ padding: "10px 14px", borderRadius: 10, fontFamily: font, fontSize: 13, fontWeight: healthGoal === o.id ? 800 : 600, background: healthGoal === o.id ? C.green + "22" : "none", color: healthGoal === o.id ? C.green : C.muted, border: "1.5px solid " + (healthGoal === o.id ? C.green : C.cardBorder), cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {o.label}
              {healthGoal === o.id && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>
      <button onClick={calculate} style={{ ...btn(C.green), width: "100%", fontSize: 16, marginBottom: 20 }}>🔢 Calculate Daily Calories</button>
      {result?.error && <div style={{ ...card, border: "1px solid " + C.danger, color: C.danger, fontSize: 13, padding: 16 }}>{result.error}</div>}
      {result && !result.error && (
        <div>
          <div style={{ ...card, marginBottom: 14, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Daily Calories for {pet.name}</div>
            <div style={{ color: C.green, fontWeight: 900, fontSize: 52, lineHeight: 1, margin: "12px 0 4px" }}>{result.MER}</div>
            <div style={{ color: C.muted, fontSize: 13 }}>kcal / day</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>RER: {result.RER} kcal x {result.multiplier} multiplier</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <span style={{ background: C.green + "22", color: C.green, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{result.weightKg} kg / {result.weightLbs} lbs</span>
              <span style={{ background: C.gold + "22", color: C.gold, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{result.mealsPerDay}x meals/day</span>
            </div>
          </div>
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🍽️ Feeding Guide</div>
            {[{ icon: "🥣", type: "Dry Kibble", total: result.kibbleCups + " cups/day", perMeal: result.kibblePerMeal + " cups per meal", note: "~350 kcal/cup average" }, { icon: "🥫", type: "Wet Food", total: result.wetFoodGrams + "g / day", perMeal: Math.round(result.wetFoodGrams / result.mealsPerDay) + "g per meal", note: "~1 kcal/gram average" }, { icon: "🥩", type: "Raw / Homemade", total: result.rawGrams + "g / day", perMeal: result.rawPerMeal + "g per meal", note: "~1.2 kcal/gram average" }].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? "1px solid " + C.cardBorder : "none" }}>
                <div style={{ fontSize: 28 }}>{f.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.text, fontWeight: 800, fontSize: 13 }}>{f.type}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{f.note}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>{f.total}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{f.perMeal}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...card, background: C.danger + "08", border: "1px solid " + C.danger + "22", marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11 }}>⚕️ This calculator uses the NRC/AAFCO RER formula. Results are estimates — always consult your veterinarian before changing your pet's diet.</div>
          </div>
        </div>
      )}
    </div>
  );
}
// ─── Edit Pet Info ────────────────────────────────────────────────────────────
function EditPetInfo({ pet, onDelete, onSaved, isDemo }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: pet.name || "", type: pet.type || "Dog", breed: pet.breed || "",
    age: pet.age || "", weight: pet.weight || "", nextVet: pet.nextVet || "",
    feeding: pet.feeding || "", notes: pet.notes || ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name) { setError("Pet name is required"); return; }
    setSaving(true); setError("");
    try {
      await updateDoc(doc(db, "pets", pet.id), form);
      setEditing(false);
      onSaved && onSaved();
    } catch (e) {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  };

  if (editing) return (
    <div style={{ ...card }}>
      <h3 style={{ color: C.text, margin: "0 0 16px" }}>✏️ Edit Pet Info</h3>
      {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 14 }}>{error}</div>}
      <Field label="Pet Name" value={form.name} onChange={set("name")} placeholder="Buddy" required />
      <Field label="Type" as="select" value={form.type} onChange={set("type")} options={["Dog","Cat"]} />
      <Field label="Breed" as="select" value={form.breed} onChange={set("breed")} options={form.type === "Cat" ? CAT_BREEDS : form.type === "Dog" ? DOG_BREEDS : ["Mixed","Other"]} />
      <Field label="Age" value={form.age} onChange={set("age")} placeholder="2 years" />
      <Field label="Weight" value={form.weight} onChange={set("weight")} placeholder="55 lbs" />
      <Field label="Feeding Schedule" value={form.feeding} onChange={set("feeding")} placeholder="8am and 6pm, 1 cup each" />
      <SmartDatePicker label="Next Vet Visit" value={form.nextVet} onChange={set("nextVet")} />
      <Field label="Notes" as="textarea" value={form.notes} onChange={set("notes")} placeholder="Anything special..." />
      <div style={{ display: "flex", gap: 10 }}>
        <button style={{ ...btn(C.green), flex: 1 }} onClick={save} disabled={saving}>{saving ? "Saving..." : "💾 Save Changes"}</button>
        <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => { setEditing(false); setError(""); }}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>Pet Information</div>
          {!isDemo && <button onClick={() => setEditing(true)} style={{ background: C.green + "22", border: "1.5px solid " + C.green, borderRadius: 10, padding: "7px 16px", color: C.green, fontFamily: font, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            ✏️ Edit Info
          </button>}
        </div>
        {[["Type",pet.type],["Breed",pet.breed],["Age",pet.age],["Weight",pet.weight],["Next Vet",pet.nextVet],["Feeding",pet.feeding]].filter(([,v])=>v).map(([k,v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
            <span style={{ color: C.muted, fontSize: 13 }}>{k}</span>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{v}</span>
          </div>
        ))}
        {!pet.type && !pet.breed && !pet.age && (
          <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: "10px 0" }}>No details yet — tap Edit Info to add!</div>
        )}
      </div>
      {pet.notes && <div style={{ ...card, marginBottom: 12 }}><div style={{ color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>NOTES</div><div style={{ color: C.text, fontSize: 13 }}>{pet.notes}</div></div>}
      {!isDemo && <button onClick={onDelete} style={{ ...btn(C.danger + "22", C.danger), border: "1px solid " + C.danger, width: "100%" }}>🗑️ Delete Pet</button>}
    </div>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────
function StarRating({ rating, onRate, size = 22 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1,2,3,4,5].map(star => (
        <span key={star} onClick={() => onRate && onRate(star)}
          onMouseEnter={() => onRate && setHover(star)}
          onMouseLeave={() => onRate && setHover(0)}
          style={{ fontSize: size, cursor: onRate ? "pointer" : "default", color: star <= (hover || rating) ? "#F5C842" : "#1E3526" }}>★</span>
      ))}
    </div>
  );
}

// ─── Report Button (Apple 1.2 / Google UGC compliance) ───────────────────────
function ReportButton({ contentId, contentType, reporterUid }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const REASONS = [
    "Inaccurate or misleading information",
    "Spam or fake listing",
    "Inappropriate content",
    "Suspected animal abuse or neglect",
    "Other",
  ];

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        contentId,
        contentType,
        reason,
        reporterUid: reporterUid || null,
        createdAt: new Date().toISOString(),
        status: "pending",
      });
      setSubmitted(true);
    } catch (e) {
      console.error("Report error:", e);
    }
    setSubmitting(false);
  };

  if (submitted) return (
    <span style={{ fontSize: 12, color: C.muted, padding: "6px 10px" }}>✅ Reported — thank you</span>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: "6px 10px", display: "flex", alignItems: "center", gap: 4 }}>
      🚩 Report
    </button>
  );

  return (
    <div style={{ marginTop: 10, background: C.inputBg, borderRadius: 10, padding: 14, border: "1px solid " + C.cardBorder }}>
      <div style={{ color: C.text, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Report this listing</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {REASONS.map(r => (
          <label key={r} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="radio" name={"report-" + contentId} value={r} checked={reason === r} onChange={() => setReason(r)} style={{ accentColor: C.green }} />
            <span style={{ color: C.muted, fontSize: 13 }}>{r}</span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={!reason || submitting} style={{ ...btn(C.danger, "#fff"), fontSize: 13, padding: "8px 16px", opacity: !reason ? 0.5 : 1 }}>
          {submitting ? "Sending…" : "Submit Report"}
        </button>
        <button onClick={() => { setOpen(false); setReason(""); }} style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "8px 14px" }}>Cancel</button>
      </div>
    </div>
  );
}

function ProviderCard({ p, user, profile }) {
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [myReview, setMyReview] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "reviews"), where("providerId", "==", p.uid), where("status", "==", "visible"));
    const unsub = onSnapshot(q, snap => {
      const revs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReviews(revs);
      if (user) setMyReview(revs.find(r => r.ownerId === user.uid) || null);
    });
    return unsub;
  }, [p.uid, user]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  const submitReview = async () => {
    if (!rating || !comment.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "reviews"), {
        providerId: p.uid,
        providerName: p.businessName || p.name,
        ownerId: user.uid,
        ownerName: profile?.name || user.email,
        rating,
        comment: comment.trim(),
        reply: "",
        status: "visible",
        createdAt: new Date().toISOString(),
      });
      setShowReviewForm(false);
      setRating(0);
      setComment("");
    } catch (e) {
      console.error("Review error:", e);
    }
    setSubmitting(false);
  };

  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: p.isVerified ? C.green + "22" : C.inputBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, border: `1.5px solid ${p.isVerified ? C.green + "44" : C.cardBorder}` }}>
          {SERVICE_ICONS[p.service] || "🛎️"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>{p.businessName || p.name}</div>
            {p.isVerified
              ? <span style={{ background: C.green + "22", color: C.green, fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 20 }}>⭐ On MyPetDex</span>
              : <span style={{ background: C.inputBg, color: C.muted, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, border: `1px solid ${C.cardBorder}` }}>📍 Local Business</span>
            }
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>📍 {p.city}, {p.state}</div>
          {p.address && !p.isVerified && <div style={{ color: C.muted, fontSize: 11, marginTop: 1 }}>{p.address}</div>}
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            {p.service && <Badge text={`${SERVICE_ICONS[p.service] || ""} ${p.service}`} color={C.green} />}
            {p.priceRange && <Badge text={p.priceRange} color={C.gold} />}
          </div>
          {p.bio && <div style={{ color: C.muted, fontSize: 12, marginTop: 6, fontStyle: "italic" }}>"{p.bio}"</div>}
          {/* MyPetDex reviews */}
          {avgRating && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
              <StarRating rating={Math.round(avgRating)} size={14} />
              <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>{avgRating}</span>
              <span style={{ color: C.muted, fontSize: 11 }}>({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
            </div>
          )}
          {/* Google rating for seeded providers */}
          {!p.isVerified && p.googleRating && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5 }}>
              <span style={{ fontSize: 12 }}>⭐</span>
              <span style={{ color: C.gold, fontSize: 12, fontWeight: 700 }}>{p.googleRating}</span>
              <span style={{ color: C.muted, fontSize: 11 }}>Google ({p.googleReviewCount?.toLocaleString() || 0} reviews)</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {p.isVerified && <button style={{ ...btn(C.green), fontSize: 13, padding: "9px 18px" }}>📅 Book Now</button>}
        {p.website && <a href={p.website} target="_blank" rel="noreferrer" style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "9px 18px", textDecoration: "none" }}>🌐 Website</a>}
        {p.googleMapsUrl && <a href={p.googleMapsUrl} target="_blank" rel="noreferrer" style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "9px 18px", textDecoration: "none" }}>🗺️ Maps</a>}
        {p.googleReview && <a href={p.googleReview} target="_blank" rel="noreferrer" style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "9px 18px", textDecoration: "none" }}>🌐 Google</a>}
        {p.phone && <a href={`tel:${p.phone}`} style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "9px 18px", textDecoration: "none" }}>📞 Call</a>}
        {p.isVerified && <button onClick={() => setShowReviews(!showReviews)} style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "9px 18px" }}>
          ⭐ Reviews {reviews.length > 0 ? "(" + reviews.length + ")" : ""}
        </button>}
        {p.isVerified && user && !myReview && (
          <button onClick={() => setShowReviewForm(!showReviewForm)} style={{ ...btn("transparent", C.green), border: "1px solid " + C.green, fontSize: 13, padding: "9px 18px" }}>
            ✍️ Review
          </button>
        )}
      </div>
      {user && <ReportButton contentId={p.id || p.uid} contentType="provider" reporterUid={user.uid} />}
      {showReviewForm && !myReview && (
        <div style={{ marginTop: 14, background: C.inputBg, borderRadius: 12, padding: 16, border: "1px solid " + C.cardBorder }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Your Review</div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: C.muted, fontSize: 12, marginBottom: 6 }}>Rating</div>
            <StarRating rating={rating} onRate={setRating} size={28} />
          </div>
          <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience..." rows={3} style={{ background: C.inputBg, border: "1.5px solid " + C.cardBorder, borderRadius: 10, padding: "11px 14px", color: C.text, fontFamily: font, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", resize: "vertical", marginBottom: 10 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={submitReview} disabled={!rating || !comment.trim() || submitting} style={{ ...btn(C.green), flex: 1, opacity: (!rating || !comment.trim()) ? 0.5 : 1 }}>
              {submitting ? "Submitting..." : "💾 Submit"}
            </button>
            <button onClick={() => setShowReviewForm(false)} style={{ ...btn(C.cardBorder, C.muted) }}>Cancel</button>
          </div>
        </div>
      )}
      {showReviews && (
        <div style={{ marginTop: 14 }}>
          {reviews.length === 0 ? (
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 16 }}>No reviews yet. Be the first!</div>
          ) : (
            reviews.map(r => (
              <div key={r.id} style={{ background: C.inputBg, borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid " + C.cardBorder }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{r.ownerName}</div>
                    <StarRating rating={r.rating} size={14} />
                  </div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                </div>
                <div style={{ color: C.text, fontSize: 13, marginTop: 6 }}>{r.comment}</div>
                {r.reply && (
                  <div style={{ marginTop: 10, background: C.card, borderRadius: 10, padding: "10px 12px", border: "1px solid " + C.cardBorder }}>
                    <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🛎️ Provider Response:</div>
                    <div style={{ color: C.text, fontSize: 13 }}>{r.reply}</div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const SERVICE_TYPES_LIST = [
  { label: "Grooming",    emoji: "✂️",  color: "#8b5cf6", desc: "Baths, cuts & styling" },
  { label: "Dog Walking", emoji: "🐕",  color: "#10b981", desc: "Daily walks & exercise" },
  { label: "Veterinary",  emoji: "🏥",  color: "#ef4444", desc: "Clinics & animal hospitals" },
  { label: "Boarding",    emoji: "🏨",  color: "#f59e0b", desc: "Overnight & pet hotels" },
  { label: "Training",    emoji: "🎓",  color: "#3b82f6", desc: "Obedience & behaviour" },
  { label: "Daycare",     emoji: "🌞",  color: "#ec4899", desc: "Full & half-day care" },
];
const SERVICE_ICONS = Object.fromEntries(SERVICE_TYPES_LIST.map(s => [s.label, s.emoji]));
const COVERED_CITIES = ["New York, NY","Los Angeles, CA","Chicago, IL","Houston, TX","Philadelphia, PA","Phoenix, AZ","Miami, FL","Atlanta, GA","Boston, MA","Seattle, WA","Denver, CO","Dallas, TX","San Diego, CA","Nashville, TN","Portland, OR","Las Vegas, NV","Austin, TX","San Francisco, CA","Charlotte, NC","Tampa, FL","Minneapolis, MN","Newark, NJ","Jersey City, NJ","Edison, NJ","East Brunswick, NJ","Hoboken, NJ","Pittsburgh, PA","Orlando, FL","Jacksonville, FL","Raleigh, NC","Richmond, VA","Columbus, OH","Indianapolis, IN","Kansas City, MO","St. Louis, MO","Detroit, MI","San Antonio, TX","Salt Lake City, UT","Sacramento, CA","New Orleans, LA","Memphis, TN","Louisville, KY","Oklahoma City, OK"];
const COVERED_STATES = [
  { abbr: "NY", name: "New York" }, { abbr: "CA", name: "California" },
  { abbr: "IL", name: "Illinois" }, { abbr: "TX", name: "Texas" },
  { abbr: "PA", name: "Pennsylvania" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "FL", name: "Florida" }, { abbr: "GA", name: "Georgia" },
  { abbr: "MA", name: "Massachusetts" }, { abbr: "WA", name: "Washington" },
  { abbr: "CO", name: "Colorado" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "OR", name: "Oregon" }, { abbr: "NV", name: "Nevada" },
  { abbr: "NC", name: "North Carolina" }, { abbr: "MN", name: "Minnesota" },
  { abbr: "NJ", name: "New Jersey" }, { abbr: "VA", name: "Virginia" },
  { abbr: "OH", name: "Ohio" }, { abbr: "IN", name: "Indiana" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MI", name: "Michigan" },
  { abbr: "UT", name: "Utah" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "KY", name: "Kentucky" }, { abbr: "OK", name: "Oklahoma" },
];

function ServicesTab({ profile, user, serviceFilter }) {
  const serviceMap = { groomers:"Grooming", walkers:"Dog Walking", sitters:"Boarding", daycare:"Daycare", vets:"Veterinary" };
  const [filterService, setFilterService] = useState(serviceMap[serviceFilter] || "");
  const [filterCity, setFilterCity] = useState("");
  const [searched, setSearched] = useState(false);
  const [realProviders, setRealProviders] = useState([]);
  const [seedProviders, setSeedProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q1 = query(collection(db, "users"), where("role", "==", "provider"), where("status", "==", "approved"));
    const unsub1 = onSnapshot(q1, snap => setRealProviders(snap.docs.map(d => ({ id: d.id, ...d.data(), isVerified: true }))));
    getDocs(query(collection(db, "seedProviders"))).then(snap => {
      setSeedProviders(snap.docs.map(d => ({ id: d.id, ...d.data(), isVerified: false })));
      setLoading(false);
    }).catch(() => setLoading(false));
    return unsub1;
  }, []);

  const allProviders = [...realProviders, ...seedProviders];
  const cityInput = filterCity.trim().toLowerCase();
  const filtered = allProviders.filter(p => {
    const svcMatch = !filterService || p.service === filterService;
    const cityMatch = !cityInput ||
      (p.city || "").toLowerCase().includes(cityInput) ||
      (p.state || "").toLowerCase().includes(cityInput) ||
      `${p.city} ${p.state}`.toLowerCase().includes(cityInput);
    return svcMatch && cityMatch;
  });
  // Verified first, then by Google rating
  const sorted = [...filtered].sort((a, b) => {
    if (b.isVerified !== a.isVerified) return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
    return (b.googleRating || 0) - (a.googleRating || 0);
  });

  const doSearch = () => setSearched(true);
  const reset = () => { setFilterCity(""); setFilterService(""); setSearched(false); };
  const cityNotCovered = searched && cityInput && sorted.length === 0 &&
    !COVERED_CITIES.some(c => c.toLowerCase().includes(cityInput));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>
          {filterService ? `${SERVICE_ICONS[filterService]} ${filterService} Near You` : "Find Pet Services 🛎️"}
        </h2>
        <p style={{ color: C.muted, fontSize: 13 }}>
          {loading ? "Loading providers..." : `${allProviders.length}+ providers across 20 US cities`}
        </p>
      </div>

      {/* Search bar */}
      <div style={{ ...card, marginBottom: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: filterService ? 10 : 0 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>📍</span>
            <input
              type="text"
              placeholder="City or state — e.g. Miami, FL or NJ"
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doSearch()}
              style={{ ...input, paddingLeft: 36, marginBottom: 0 }}
            />
          </div>
          <button onClick={doSearch} style={{ ...btn(C.green), padding: "0 18px", flexShrink: 0 }}>🔍</button>
        </div>
        {filterService && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: C.green + "18", border: `1px solid ${C.green}44`, borderRadius: 20, padding: "4px 12px", fontSize: 12, color: C.green, fontWeight: 700 }}>
              {SERVICE_ICONS[filterService]} {filterService}
            </div>
            <button onClick={() => setFilterService("")} style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", padding: 0 }}>✕ Clear</button>
          </div>
        )}
      </div>

      {/* Service type cards */}
      {!searched && !loading && (
        <>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Browse by Service</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {SERVICE_TYPES_LIST.map(s => (
              <button key={s.label} onClick={() => { setFilterService(s.label); doSearch(); }}
                style={{ background: filterService === s.label ? s.color + "22" : C.card, border: `1.5px solid ${filterService === s.label ? s.color : C.cardBorder}`, borderRadius: 14, padding: "14px 10px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.emoji}</div>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 12 }}>{s.label}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{s.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ color: C.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Browse by State</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8, marginBottom: 20 }}>
            {COVERED_STATES.map(s => (
              <button key={s.abbr} onClick={() => { setFilterCity(s.abbr); doSearch(); }}
                style={{ background: C.card, border: `1.5px solid ${C.cardBorder}`, borderRadius: 12, padding: "10px 8px", cursor: "pointer", textAlign: "center", fontFamily: font, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.green; e.currentTarget.style.background = C.green + "11"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.cardBorder; e.currentTarget.style.background = C.card; }}>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>{s.abbr}</div>
                <div style={{ color: C.muted, fontSize: 10, marginTop: 2, lineHeight: 1.2 }}>{s.name}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {loading && <Spinner />}

      {/* Results header */}
      {searched && !loading && sorted.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>
            {sorted.length} provider{sorted.length !== 1 ? "s" : ""} found
            {filterCity ? ` in "${filterCity}"` : ""}
            {filterService ? ` · ${filterService}` : ""}
          </div>
          <button onClick={reset} style={{ background: "none", border: "none", color: C.green, fontSize: 12, cursor: "pointer", fontFamily: font, fontWeight: 700 }}>← New Search</button>
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && sorted.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "36px 24px" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
          <div style={{ color: C.text, fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
            {cityNotCovered ? "No providers in this area yet" : "No providers found"}
          </div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
            {cityNotCovered
              ? `We currently cover 20 major US cities. "${filterCity}" isn't in our directory yet — but we're expanding soon!`
              : "Try adjusting your city or service type."}
          </div>
          {cityNotCovered && (
            <div style={{ background: C.inputBg, borderRadius: 12, padding: "12px 16px", marginBottom: 16, textAlign: "left" }}>
              <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Currently available in:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {COVERED_CITIES.slice(0, 10).map(c => (
                  <button key={c} onClick={() => { setFilterCity(c.split(",")[0]); doSearch(); }}
                    style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 16, padding: "3px 10px", fontSize: 11, color: C.text, cursor: "pointer", fontFamily: font }}>
                    {c}
                  </button>
                ))}
                <span style={{ color: C.muted, fontSize: 11, padding: "3px 4px" }}>+10 more</span>
              </div>
            </div>
          )}
          <button onClick={reset} style={{ ...btn(C.green), fontSize: 13 }}>🔄 Start Over</button>
        </div>
      )}

      {searched && sorted.map(p => <ProviderCard key={p.id} p={p} user={user} profile={profile} />)}
    </div>
  );
}
const AI_DAILY_LIMITS = { free: 0, plus: 20, family: 50 };

function AITab({ profile, user, onUpgrade }) {
  const [msgCount, setMsgCount] = useState(0);
  const plan = profile?.plan || "free";
  const dailyLimit = AI_DAILY_LIMITS[plan] || 0;
  const today = new Date().toDateString();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("ai_usage") || "{}");
    if (stored.date === today) setMsgCount(stored.count || 0);
    else { localStorage.setItem("ai_usage", JSON.stringify({ date: today, count: 0 })); setMsgCount(0); }
  }, [today]);

  const trackMessage = () => {
    const newCount = msgCount + 1;
    setMsgCount(newCount);
    localStorage.setItem("ai_usage", JSON.stringify({ date: today, count: newCount }));
  };
  const [pets, setPets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [petsLoaded, setPetsLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pets"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const petList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPets(petList);
      setPetsLoaded(true);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!petsLoaded) return;
    const firstName = profile?.name?.split(" ")[0] || "there";
    let greeting = "";
    if (pets.length === 0) {
      greeting = "Hi " + firstName + "! Welcome to PetDex AI 🐾\n\nI don't see any pets in your profile yet. Please add a pet first so I can give you personalized advice!";
    } else if (pets.length === 1) {
      const p = pets[0];
      greeting = "Hi " + firstName + "! Welcome to PetDex AI 🐾\n\nI'm here to help with " + p.name + (p.breed ? " (" + p.breed + ")" : "") + ". What would you like to know today?";
    } else {
      const petList = pets.map((p, i) => (i+1) + ". " + p.name + " — " + p.type + (p.breed ? ", " + p.breed : "") + (p.age ? ", " + p.age + " old" : "")).join("\n");
      greeting = "Hi " + firstName + "! Welcome to PetDex AI 🐾\n\nWhich pet can I help you with today?\n\n" + petList + "\n\nType the number or your pet's name to get started.";
    }
    setMessages([{ role: "assistant", content: greeting }]);
  }, [petsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildSystemPrompt = () => {
    const firstName = profile?.name?.split(" ")[0] || "the user";
    let petContext = pets.length === 0 ? "The user has not added any pets yet." : pets.map(p =>
      `- ${p.name}: ${p.type}${p.breed ? ", breed: " + p.breed : ""}${p.age ? ", age: " + p.age : ""}${p.weight ? ", weight: " + p.weight : ""}${p.notes ? ", notes: " + p.notes : ""}`
    ).join("\n");
    return `You are PetDex AI, a warm and knowledgeable pet care assistant for MyPetDex. You are talking to ${firstName}.

IMPORTANT: You already know everything about their pets listed below. NEVER ask what type of pet they have or basic info you already know. Use this info to give specific, personalized advice.

Their pets:
${petContext}

Guidelines:
- Address pets by their name always
- Give breed-specific advice based on the known breed
- Reference their pet's actual age and weight when relevant
- If user has multiple pets and doesn't specify which one, ask which pet they mean
- Be warm, friendly, and concise
- Use pet emojis sparingly 🐾
- For medical emergencies, always recommend seeing a vet immediately
- Keep responses under 200 words unless truly needed`;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (msgCount >= dailyLimit) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ You've reached your daily limit of ${dailyLimit} messages. Your limit resets tomorrow! Upgrade to Family plan for 50 messages/day. 🐾` }]);
      return;
    }
    trackMessage();
    setInput("");
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const response = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/aiProxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: buildSystemPrompt(), messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await response.json();
      const reply = data?.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Could not connect. Please check your connection and try again." }]);
    }
    setLoading(false);
  };

  if (!hasFeature(profile, 'ai')) return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>PetDex AI Assistant</h2>
      <div style={{ background: "#fef9c3", border: "1px solid #eab308", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#713f12" }}>⚠️ <strong>Important:</strong> AI responses are for informational purposes only and are not a substitute for professional veterinary advice. Always consult your vet for medical decisions.</div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Your personal pet care expert</p>
      <UpgradePrompt feature="PetDex AI Assistant" requiredPlan="Plus" onUpgrade={onUpgrade} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>PetDex AI Assistant</h2>
        <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>Personalized advice for {pets.length > 0 ? pets.map(p => p.name).join(" & ") : "your pets"}</p>
      </div>
      <div style={{ background: "#fef9c3", border: "1px solid #eab308", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#713f12" }}>⚠️ <strong>Important:</strong> AI responses are informational only and not a substitute for professional veterinary advice. Always consult your vet.</div>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: "12px 16px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: msg.role === "user" ? C.green : C.card, border: msg.role === "assistant" ? "1px solid " + C.cardBorder : "none", color: msg.role === "user" ? "#0F1A14" : C.text, fontFamily: font, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "12px 16px", borderRadius: "18px 18px 18px 4px", background: C.card, border: "1px solid " + C.cardBorder, color: C.muted, fontFamily: font, fontSize: 14 }}>
              <style>{`@keyframes blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }`}</style>
              <span style={{ animation: "blink 1.4s infinite", animationDelay: "0s" }}>●</span>
              <span style={{ animation: "blink 1.4s infinite", animationDelay: "0.2s" }}>●</span>
              <span style={{ animation: "blink 1.4s infinite", animationDelay: "0.4s" }}>●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ paddingTop: 12, borderTop: "1px solid " + C.cardBorder }}>
        <span style={{ fontSize: 11, color: C.muted, display: "block", textAlign: "right", marginBottom: 6 }}>{msgCount}/{dailyLimit} messages used today</span>
        <div style={{ display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder={"Ask about " + (pets[0]?.name || "your pet") + "..."} style={{ background: C.inputBg, border: "1.5px solid " + C.cardBorder, borderRadius: 24, padding: "12px 18px", color: C.text, fontFamily: font, fontSize: 14, flex: 1, boxSizing: "border-box", outline: "none" }} />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{ ...btn(C.green), borderRadius: "50%", width: 46, height: 46, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: loading || !input.trim() ? 0.5 : 1, flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  );
}
const INGREDIENTS = {
  proteins: [
    { id: "chicken", label: "🍗 Chicken", popular: true },
    { id: "beef", label: "🥩 Beef", popular: true },
    { id: "turkey", label: "🦃 Turkey", popular: true },
    { id: "salmon", label: "🐟 Salmon", popular: true },
    { id: "egg", label: "🥚 Eggs", popular: true },
    { id: "lamb", label: "🐑 Lamb", popular: false },
    { id: "duck", label: "🦆 Duck", popular: false },
    { id: "tuna", label: "🐠 Tuna", popular: false },
    { id: "cod", label: "🐡 Cod", popular: false },
    { id: "venison", label: "🦌 Venison", popular: false },
    { id: "pork", label: "🐷 Pork", popular: false },
    { id: "cottage_cheese", label: "🧀 Cottage Cheese", popular: false },
  ],
  carbs: [
    { id: "white_rice", label: "🍚 White Rice", popular: true },
    { id: "sweet_potato", label: "🍠 Sweet Potato", popular: true },
    { id: "brown_rice", label: "🌾 Brown Rice", popular: true },
    { id: "oats", label: "🌾 Oats", popular: false },
    { id: "quinoa", label: "🌿 Quinoa", popular: false },
    { id: "potato", label: "🥔 Potato", popular: false },
    { id: "lentils", label: "🫘 Lentils", popular: false },
    { id: "barley", label: "🌾 Barley", popular: false },
  ],
  fats: [
    { id: "olive_oil", label: "🫒 Olive Oil", popular: true },
    { id: "fish_oil", label: "🐟 Fish Oil", popular: true },
    { id: "coconut_oil", label: "🥥 Coconut Oil", popular: false },
    { id: "flaxseed", label: "🌱 Flaxseed", popular: false },
  ],
  veggies: [
    { id: "carrots", label: "🥕 Carrots", popular: true },
    { id: "peas", label: "🫛 Peas", popular: true },
    { id: "spinach", label: "🥬 Spinach", popular: true },
    { id: "broccoli", label: "🥦 Broccoli", popular: true },
    { id: "zucchini", label: "🥒 Zucchini", popular: false },
    { id: "green_beans", label: "🫘 Green Beans", popular: false },
    { id: "kale", label: "🥬 Kale", popular: false },
    { id: "celery", label: "🌿 Celery", popular: false },
    { id: "beets", label: "🫀 Beets", popular: false },
  ],
  fruits: [
    { id: "blueberries", label: "🫐 Blueberries", popular: true },
    { id: "apple", label: "🍎 Apple (no seeds)", popular: true },
    { id: "banana", label: "🍌 Banana", popular: false },
    { id: "watermelon", label: "🍉 Watermelon (no seeds)", popular: false },
    { id: "mango", label: "🥭 Mango", popular: false },
    { id: "strawberries", label: "🍓 Strawberries", popular: false },
  ],
};

// Hard-coded toxicity blocklist — ASPCA + AVMA verified toxic foods
// eslint-disable-next-line no-unused-vars
const TOXIC_INGREDIENTS = {
  dog: ["grapes", "raisins", "onion", "onions", "garlic", "leek", "chive", "chocolate", "xylitol", "macadamia", "avocado", "alcohol", "caffeine", "coffee", "tea", "nutmeg", "raw yeast", "yeast dough", "mushroom", "wild mushroom"],
  cat: ["grapes", "raisins", "onion", "onions", "garlic", "leek", "chive", "chocolate", "xylitol", "alcohol", "caffeine", "coffee", "tea", "raw fish", "raw meat", "dog food", "milk", "dairy", "macadamia", "avocado", "mushroom"],
};

const HEALTH_CONDITIONS = [
  { id: "healthy", label: "✅ Healthy / Maintenance" },
  { id: "weight_loss", label: "⚖️ Weight Loss" },
  { id: "weight_gain", label: "📈 Weight Gain / Underweight" },
  { id: "joint_support", label: "🦴 Joint Support / Arthritis" },
  { id: "sensitive_stomach", label: "🫀 Sensitive Stomach" },
  { id: "kidney_support", label: "💧 Kidney Support (Low Phosphorus)" },
  { id: "skin_coat", label: "✨ Skin & Coat Health" },
  { id: "high_energy", label: "⚡ High Energy / Working Dog" },
  { id: "senior", label: "👴 Senior Pet" },
  { id: "puppy", label: "🐶 Puppy / Kitten" },
  { id: "allergies", label: "🌿 Food Allergies / Sensitivities" },
  { id: "diabetes", label: "💉 Diabetes Management" },
];

const ACTIVITY_LEVELS = [
  { id: "low", label: "🛋️ Low (mostly resting)" },
  { id: "moderate", label: "🚶 Moderate (daily walks)" },
  { id: "active", label: "🏃 Active (runs/plays daily)" },
  { id: "very_active", label: "⚡ Very Active (working dog)" },
];

function RecipesTab({ profile, user, onUpgrade }) {
  const plan = profile?.plan || "free";
  const dailyLimit = AI_DAILY_LIMITS[plan] || 0;
  const today = new Date().toDateString();
  const getCount = () => { const s = JSON.parse(localStorage.getItem("ai_usage") || "{}"); return s.date === today ? s.count || 0 : 0; };
  const trackMessage = () => { const c = getCount() + 1; localStorage.setItem("ai_usage", JSON.stringify({ date: today, count: c })); };
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState({ proteins: [], carbs: [], fats: [], veggies: [], fruits: [] });
  const [showAll, setShowAll] = useState({ proteins: false, carbs: false, fats: false, veggies: false, fruits: false });
  const [healthCondition, setHealthCondition] = useState("healthy");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [excludeIngredients, setExcludeIngredients] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [viewSaved, setViewSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "pets"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      const petList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPets(petList);
      if (petList.length === 1) setSelectedPet(petList[0]);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "savedRecipes"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      setSavedRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const toggleIngredient = (category, id) => {
    setSelected(prev => {
      const current = prev[category];
      const isSelected = current.includes(id);
      if (category === "fats" && !isSelected && current.length >= 2) return prev;
      return { ...prev, [category]: isSelected ? current.filter(i => i !== id) : [...current, id] };
    });
  };

  const totalSelected = Object.values(selected).flat().length;

  const generateRecipe = async () => {
    if (!selectedPet) return;
    if (getCount() >= dailyLimit) {
      alert(`⚠️ You've reached your daily AI limit of ${dailyLimit} requests. Resets tomorrow!`);
      return;
    }
    trackMessage();
    setGenerating(true);
    setRecipe(null);

    try {
      // Build pet profile for getRecipe Cloud Function
      const petAge = (selectedPet.age || "adult").toLowerCase();
      const isPuppy = petAge.includes("puppy") || petAge.includes("kitten") || petAge.includes("month");
      const isSenior = !isPuppy && (parseFloat(selectedPet.age) >= (selectedPet.type === "Cat" ? 10 : 7));

      // Parse weight — default to lbs if no unit specified
      const rawWeight = parseFloat(selectedPet.weight) || 22;
      const weightKg = (selectedPet.weight || "").toLowerCase().includes("kg")
        ? rawWeight
        : rawWeight * 0.453592;

      // Estimate age in months
      let ageMonths = 24;
      if (petAge.includes("month")) ageMonths = parseFloat(petAge) || 6;
      else if (isPuppy) ageMonths = 6;
      else if (isSenior) ageMonths = selectedPet.type === "Cat" ? 130 : 90;
      else ageMonths = parseFloat(selectedPet.age) * 12 || 24;

      const petProfile = {
        name: selectedPet.name,
        species: (selectedPet.type || "Dog").toLowerCase(),
        breed: selectedPet.breed || "mixed breed",
        weight_kg: Math.round(weightKg * 100) / 100,
        age_months: ageMonths,
        neutered: selectedPet.neutered !== false,
        activity_level: activityLevel === "very_active" ? "very_high" : activityLevel,
        health_goal: healthCondition === "healthy" ? "maintain"
          : healthCondition === "overweight" ? "lose"
          : healthCondition === "underweight" ? "gain"
          : "maintain",
        life_stage: isPuppy ? "puppy" : isSenior ? "senior" : "adult",
      };

      // Call verified getRecipe Cloud Function — pulls from Firestore library
      const response = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/getRecipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pet: petProfile }),
      });

      const data = await response.json();

      if (data.error) {
        setRecipe({ error: data.error });
      } else {
        // Format response to match existing recipe display structure
        setRecipe({
          name: "Verified Recipe for " + selectedPet.name,
          emoji: selectedPet.type === "Cat" ? "🐱" : "🐶",
          prepTime: "20 minutes",
          servings: "1 day",
          dailyAmount: data.daily_calories + " kcal/day",
          calories: data.daily_calories + " kcal per day",
          rawText: data.recipe, // full Claude presentation
          source: data.source,
          ingredients: [],
          steps: [],
          nutrition: { protein: "AAFCO verified", fat: "AAFCO verified", carbs: "USDA sourced", moisture: "varies" },
          tips: "Ingredients scaled to your pet's exact WSAVA calorie target.",
          disclaimer: "This recipe is sourced from our AAFCO/USDA verified database. Always consult your veterinarian before changing your pet's diet.",
          rer: data.rer,
          multiplier: data.multiplier,
          weight_kg: data.weight_kg,
        });
      }
      setStep(4);
    } catch (err) {
      setRecipe({ error: "Could not load recipe. Please try again." });
      setStep(4);
    }
    setGenerating(false);
  };

  const saveRecipe = async () => {
    if (!recipe || !user) return;
    await addDoc(collection(db, "savedRecipes"), { ...recipe, uid: user.uid, petId: selectedPet?.id, petName: selectedPet?.name, createdAt: new Date().toISOString() });
    alert("Recipe saved! ✅");
  };

  const resetBuilder = () => {
    setStep(1);
    setRecipe(null);
    setSelected({ proteins: [], carbs: [], fats: [], veggies: [], fruits: [] });
    setHealthCondition("healthy");
    setActivityLevel("moderate");
    setExcludeIngredients("");
  };

  const renderIngredientSection = (category, emoji, label) => {
    const items = showAll[category] ? INGREDIENTS[category] : INGREDIENTS[category].filter(i => i.popular);
    const hasMore = INGREDIENTS[category].some(i => !i.popular);
    return (
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{emoji} {label}</div>
          {category === "fats" && <span style={{ color: C.muted, fontSize: 11 }}>max 2</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {items.map(item => {
            const isSelected = selected[category].includes(item.id);
            return (
              <button key={item.id} onClick={() => toggleIngredient(category, item.id)} style={{ background: isSelected ? C.green : C.cardBorder, color: isSelected ? "#0F1A14" : C.muted, border: "1.5px solid " + (isSelected ? C.green : C.cardBorder), borderRadius: 20, padding: "7px 14px", fontFamily: font, fontWeight: isSelected ? 800 : 600, fontSize: 13, cursor: "pointer" }}>
                {item.label}
              </button>
            );
          })}
          {hasMore && (
            <button onClick={() => setShowAll(prev => ({ ...prev, [category]: !prev[category] }))} style={{ background: "none", border: "1.5px dashed " + C.cardBorder, color: C.muted, borderRadius: 20, padding: "7px 14px", fontFamily: font, fontSize: 12, cursor: "pointer" }}>
              {showAll[category] ? "Show less ↑" : "More ↓"}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!hasFeature(profile, 'recipes')) return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Recipe Builder 🍽️</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>AI-powered balanced meal generator</p>
      <UpgradePrompt feature="Recipe Builder" requiredPlan="Plus" onUpgrade={onUpgrade} />
    </div>
  );
  if (viewSaved) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setViewSaved(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font }}>← Back</button>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 20, margin: 0 }}>Saved Recipes 📚</h2>
      </div>
      {savedRecipes.length === 0 && <div style={{ ...card, textAlign: "center", padding: 40, color: C.muted }}>No saved recipes yet. Generate one!</div>}
      {savedRecipes.map(r => (
        <div key={r.id} style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{r.emoji} {r.name}</div>
            <span style={{ color: C.muted, fontSize: 11 }}>For {r.petName}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: C.green + "22", color: C.green, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>⏱️ {r.prepTime}</span>
            <span style={{ background: C.gold + "22", color: C.gold, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>🔥 {r.calories}</span>
          </div>
          <button onClick={async () => await deleteDoc(doc(db, "savedRecipes", r.id))} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 12, fontFamily: font, marginTop: 8 }}>🗑️ Delete</button>
        </div>
      ))}
    </div>
  );

  if (step === 4) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={resetBuilder} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font }}>← New Recipe</button>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 20, margin: 0 }}>Your Recipe 🍽️</h2>
      </div>
      {recipe?.error ? (
        <div style={{ ...card, color: C.danger, textAlign: "center", padding: 40 }}>{recipe.error}</div>
      ) : recipe ? (
        <div>
          {/* Header card */}
          <div style={{ ...card, marginBottom: 14, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{recipe.emoji}</div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>{recipe.name}</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Made for {selectedPet?.name}</div>
            {/* Calorie stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {[["🔥 Daily Calories", recipe.calories], ["⚖️ Pet Weight", recipe.weight_kg + " kg"]].map(([k, v]) => (
                <div key={k} style={{ background: C.inputBg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{k}</div>
                  <div style={{ color: C.green, fontWeight: 800, fontSize: 13, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            {/* Verified source badge */}
            <div style={{ background: C.green + "18", border: "1px solid " + C.green + "44", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: C.green, fontWeight: 700, marginBottom: 8 }}>
              ✅ AAFCO Compliant Template · Scaled to Target · WSAVA Calorie Formula
            </div>
            {/* Supplementation disclaimer */}
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#1E40AF", marginBottom: 8 }}>
              💊 <strong>Supplement note:</strong> Whole foods alone rarely meet 100% of AAFCO trace minerals. A vet-recommended multivitamin supplement should be added to guarantee a nutritionally complete meal.
            </div>
            <div style={{ background: C.gold + "11", border: "1px solid " + C.gold + "44", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: C.muted }}>
              ⚠️ Always consult your veterinarian before changing your pet's diet.
            </div>
          </div>

          {/* Full verified recipe text from Firestore library */}
          {recipe.rawText && (
            <div style={{ ...card, marginBottom: 14 }}>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🍽️ Your Verified Recipe</div>
              <div style={{ color: C.text, fontSize: 13, lineHeight: 1.8 }}>
                {recipe.rawText.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  // H2 headers (##)
                  if (trimmed.startsWith("## ")) return <div key={i} style={{ fontWeight: 900, fontSize: 15, color: C.text, marginTop: 16, marginBottom: 6 }}>{trimmed.replace(/^## /, "")}</div>;
                  // H3 headers (###)
                  if (trimmed.startsWith("### ")) return <div key={i} style={{ fontWeight: 800, fontSize: 14, color: C.green, marginTop: 12, marginBottom: 4 }}>{trimmed.replace(/^### /, "")}</div>;
                  // Dividers
                  if (trimmed === "---") return <hr key={i} style={{ border: "none", borderTop: "1px solid " + C.cardBorder, margin: "10px 0" }} />;
                  // Table rows
                  if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
                    if (trimmed.includes("---")) return null;
                    const cells = trimmed.split("|").filter(c => c.trim());
                    return <div key={i} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid " + C.cardBorder, fontSize: 12 }}>
                      {cells.map((cell, j) => <span key={j} style={{ flex: j === 0 ? 2 : 1, color: j === 0 ? C.text : C.green, fontWeight: j === 1 ? 700 : 400 }}>{cell.trim().replace(/\*\*/g, "")}</span>)}
                    </div>;
                  }
                  // Checkmark lines
                  if (trimmed.startsWith("✓ ")) return <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 13 }}><span style={{ color: C.green }}>✓</span><span style={{ color: C.text }}>{trimmed.slice(2).replace(/\*\*/g, "")}</span></div>;
                  // Empty lines
                  if (!trimmed) return <div key={i} style={{ height: 6 }} />;
                  // Bold (**text**)
                  const boldParts = trimmed.split(/\*\*([^*]+)\*\*/g);
                  return <div key={i} style={{ color: C.text, fontSize: 13, marginBottom: 2 }}>
                    {boldParts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                  </div>;
                })}
              </div>
            </div>
          )}

          {/* Source attribution */}
          <div style={{ ...card, marginBottom: 14, background: C.inputBg }}>
            <div style={{ color: C.muted, fontSize: 11, lineHeight: 1.6 }}>
              📚 <strong style={{ color: C.text }}>Source:</strong> {recipe.source}<br/>
              🧮 <strong style={{ color: C.text }}>Formula:</strong> RER = 70 × {recipe.weight_kg}kg^0.75 × {recipe.multiplier} (WSAVA multiplier)
            </div>
          </div>

          {/* Full legal vet disclaimer */}
          <div style={{ ...card, marginBottom: 14, background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <div style={{ color: "#DC2626", fontWeight: 800, fontSize: 12, marginBottom: 6 }}>⚕️ Important Veterinary Disclaimer</div>
            <div style={{ color: "#7F1D1D", fontSize: 11, lineHeight: 1.7 }}>
              MyPetDex is an educational formulation tool based on published AAFCO 2023 and WSAVA nutritional guidelines. It does not substitute for personalized veterinary advice, medical diagnosis, or treatment. <strong>Always consult your veterinarian or a board-certified veterinary nutritionist before switching your pet to a homemade diet</strong>, especially if your pet has underlying health conditions, allergies, or is pregnant/nursing. Nutrient needs vary by individual pet.
            </div>
            <div style={{ color: "#991B1B", fontSize: 10, marginTop: 8, fontStyle: "italic" }}>
              Recipe data sourced from AAFCO 2023 Nutrient Profiles · USDA FoodData Central (public domain) · WSAVA Global Nutrition Guidelines
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button onClick={saveRecipe} style={{ ...btn(C.green), flex: 1 }}>💾 Save Recipe</button>
            <button onClick={resetBuilder} style={{ ...btn(C.cardBorder, C.muted), flex: 1 }}>🔄 New Recipe</button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const stepTitles = ["", "Which pet?", "Pick ingredients", "Health & lifestyle"];
  const stepSubs = ["", "Select the pet you're cooking for", "Choose what you have available", "Tell us about your pet's needs"];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>Recipe Builder 🍽️</h2>
        <button onClick={() => setViewSaved(true)} style={{ background: "none", border: "1px solid " + C.cardBorder, borderRadius: 8, padding: "5px 12px", color: C.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>📚 Saved ({savedRecipes.length})</button>
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Verified recipes · AAFCO/USDA standards · WSAVA calorie formula</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[1, 2, 3].map(s => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: step >= s ? C.green : C.cardBorder }} />)}
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{stepTitles[step]}</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{stepSubs[step]}</div>
      </div>
      {step === 1 && (
        <div>
          {pets.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 40, color: C.muted }}>Add a pet first to generate recipes!</div>
          ) : (
            <div>
              {pets.map(pet => (
                <div key={pet.id} onClick={() => setSelectedPet(pet)} style={{ ...card, marginBottom: 12, cursor: "pointer", border: "2px solid " + (selectedPet?.id === pet.id ? C.green : C.cardBorder), background: selectedPet?.id === pet.id ? C.green + "11" : C.card }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <Avatar emoji={pet.type === "Cat" ? "🐱" : "🐶"} size={52} img={pet.photoURL} />
                    <div>
                      <div style={{ color: C.text, fontWeight: 900, fontSize: 17 }}>{pet.name}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed}{pet.age ? ` · ${pet.age} yrs` : ""}{pet.weight ? ` · ${pet.weight} lbs` : ""}</div>
                    </div>
                    {selectedPet?.id === pet.id && <div style={{ marginLeft: "auto", color: C.green, fontSize: 22 }}>✓</div>}
                  </div>
                </div>
              ))}
              <button onClick={() => selectedPet && setStep(2)} disabled={!selectedPet} style={{ ...btn(C.green), width: "100%", marginTop: 8, opacity: selectedPet ? 1 : 0.4 }}>Continue →</button>
            </div>
          )}
        </div>
      )}
      {step === 2 && (
        <div>
          <div style={{ ...card, marginBottom: 20, background: C.green + "11", border: "1px solid " + C.green + "33" }}>
            <div style={{ color: C.green, fontSize: 13, fontWeight: 700 }}>Building for: {selectedPet?.name} ({selectedPet?.weight})</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Select what you have available. Portions scaled to your pet's WSAVA calorie target.</div>
          </div>
          {renderIngredientSection("proteins", "🥩", "Proteins (required)")}
          {renderIngredientSection("carbs", "🍚", "Carbs")}
          {renderIngredientSection("fats", "🫒", "Fats (max 2)")}
          {renderIngredientSection("veggies", "🥦", "Vegetables")}
          {renderIngredientSection("fruits", "🍎", "Fruits")}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🚫 Any ingredients to exclude?</div>
            <input value={excludeIngredients} onChange={e => setExcludeIngredients(e.target.value)} placeholder="e.g. dairy, fish, nuts..." style={{ background: C.inputBg, border: "1.5px solid " + C.cardBorder, borderRadius: 10, padding: "11px 14px", color: C.text, fontFamily: font, fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none" }} />
            {/* Toxicity blocklist warning */}
            <div style={{ marginTop: 12, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ color: "#DC2626", fontWeight: 800, fontSize: 12, marginBottom: 4 }}>🚨 Hard-blocked toxic ingredients (ASPCA verified)</div>
              <div style={{ color: "#7F1D1D", fontSize: 11, lineHeight: 1.6 }}>
                These are <strong>never</strong> included in any recipe: grapes, raisins, onions, garlic, chocolate, xylitol, macadamia nuts, avocado, alcohol, caffeine, raw yeast dough, and wild mushrooms.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ ...btn(C.cardBorder, C.muted) }}>← Back</button>
            <button onClick={() => selected.proteins.length > 0 && setStep(3)} disabled={selected.proteins.length === 0} style={{ ...btn(C.green), flex: 1, opacity: selected.proteins.length > 0 ? 1 : 0.4 }}>Continue ({totalSelected} selected) →</button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Health condition</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {HEALTH_CONDITIONS.map(h => (
                <div key={h.id} onClick={() => setHealthCondition(h.id)} style={{ ...card, cursor: "pointer", padding: "12px 16px", border: "2px solid " + (healthCondition === h.id ? C.green : C.cardBorder), background: healthCondition === h.id ? C.green + "11" : C.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: C.text, fontSize: 14 }}>{h.label}</span>
                  {healthCondition === h.id && <span style={{ color: C.green }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Activity level</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ACTIVITY_LEVELS.map(a => (
                <div key={a.id} onClick={() => setActivityLevel(a.id)} style={{ ...card, cursor: "pointer", padding: "12px 16px", border: "2px solid " + (activityLevel === a.id ? C.green : C.cardBorder), background: activityLevel === a.id ? C.green + "11" : C.card, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: C.text, fontSize: 14 }}>{a.label}</span>
                  {activityLevel === a.id && <span style={{ color: C.green }}>✓</span>}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ ...btn(C.cardBorder, C.muted) }}>← Back</button>
            <button onClick={generateRecipe} disabled={generating} style={{ ...btn(C.green), flex: 1 }}>{generating ? "Finding best recipe... 🔍" : "✨ Get Verified Recipe"}</button>
          </div>
          {generating && (
            <div style={{ ...card, marginTop: 16, textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
              <div style={{ color: C.green, fontWeight: 800, fontSize: 15 }}>Creating {selectedPet?.name}'s recipe...</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Calculating portions based on weight and health needs</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shop Tab ─────────────────────────────────────────────────────────────
function ShopTab() {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "shopProducts"), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);
  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Pet Shop 🛒</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>Top-rated pet products — powered by Amazon</p>
      <p style={{ color: C.muted, fontSize: 11, marginBottom: 18 }}>⚠️ Prices shown are approximate and may vary. You will pay the current Amazon price at checkout — not the price listed here.</p>
      <div style={{ background: "#3B82F618", border: "1px solid #3B82F644", borderRadius: 12, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#3B82F6" }}>
        🌟 All products are Amazon's Choice or Best Sellers — recommended for pet owners
      </div>
      {products.map((p, i) => (
        <div key={i} style={{ ...card, marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 32, minWidth: 44, textAlign: "center" }}>{p.emoji}</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14 }}>{p.name}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>{p.desc}</div>
            <div style={{ color: C.green, fontWeight: 700, fontSize: 13, marginTop: 4 }}>{p.price} on Amazon</div>
          </div>
          <a href={p.url} target="_blank" rel="noreferrer" style={{ ...btn(C.green), padding: "8px 14px", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" }}>Buy Now</a>
        </div>
      ))}
      <p style={{ color: C.muted, fontSize: 11, textAlign: "center", marginTop: 16 }}>MyPetDex earns a small commission on purchases — at no extra cost to you 🐾</p>
    </div>
  );
}
// ─── Adoption Tab ─────────────────────────────────────────────────────────────
function AdoptionTab({ profile }) {
  const [filterType, setFilterType] = useState("Dog");
  const [zipCode, setZipCode] = useState(profile?.zip || "");
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shelterListings, setShelterListings] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "shelterPets"), where("status", "==", "Available")),
      snap => setShelterListings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return unsub;
  }, []);

  const getStateFromZip = (zip) => {
    const z = parseInt(zip);
    if (z >= 1001 && z <= 2791) return "MA";
    if (z >= 6001 && z <= 6999) return "CT";
    if (z >= 7001 && z <= 8999) return "NJ";
    if (z >= 10001 && z <= 14999) return "NY";
    if (z >= 19701 && z <= 19999) return "DE";
    if (z >= 20001 && z <= 20599) return "DC";
    if (z >= 20601 && z <= 21999) return "MD";
    if (z >= 22001 && z <= 24699) return "VA";
    if (z >= 25001 && z <= 26999) return "WV";
    if (z >= 27001 && z <= 28999) return "NC";
    if (z >= 29001 && z <= 29999) return "SC";
    if (z >= 30001 && z <= 31999) return "GA";
    if (z >= 32001 && z <= 34999) return "FL";
    if (z >= 35001 && z <= 36999) return "AL";
    if (z >= 37001 && z <= 38599) return "TN";
    if (z >= 38600 && z <= 39999) return "MS";
    if (z >= 40001 && z <= 42799) return "KY";
    if (z >= 43001 && z <= 45999) return "OH";
    if (z >= 46001 && z <= 47999) return "IN";
    if (z >= 48001 && z <= 49999) return "MI";
    if (z >= 50001 && z <= 52999) return "IA";
    if (z >= 53001 && z <= 54999) return "WI";
    if (z >= 55001 && z <= 56799) return "MN";
    if (z >= 57001 && z <= 57999) return "SD";
    if (z >= 58001 && z <= 58999) return "ND";
    if (z >= 59001 && z <= 59999) return "MT";
    if (z >= 60001 && z <= 62999) return "IL";
    if (z >= 63001 && z <= 65999) return "MO";
    if (z >= 66001 && z <= 67999) return "KS";
    if (z >= 68001 && z <= 69999) return "NE";
    if (z >= 70001 && z <= 71599) return "LA";
    if (z >= 71601 && z <= 72999) return "AR";
    if (z >= 73001 && z <= 74999) return "OK";
    if (z >= 75001 && z <= 79999) return "TX";
    if (z >= 80001 && z <= 81999) return "CO";
    if (z >= 82001 && z <= 83199) return "WY";
    if (z >= 83200 && z <= 83999) return "ID";
    if (z >= 84001 && z <= 84999) return "UT";
    if (z >= 85001 && z <= 86599) return "AZ";
    if (z >= 87001 && z <= 88499) return "NM";
    if (z >= 88901 && z <= 89999) return "NV";
    if (z >= 90001 && z <= 96199) return "CA";
    if (z >= 96701 && z <= 96999) return "HI";
    if (z >= 97001 && z <= 97999) return "OR";
    if (z >= 98001 && z <= 99499) return "WA";
    if (z >= 99501 && z <= 99999) return "AK";
    if (z >= 15001 && z <= 19699) return "PA";
    if (z >= 2801 && z <= 2999) return "RI";
    if (z >= 3001 && z <= 3999) return "NH";
    if (z >= 4001 && z <= 4999) return "ME";
    if (z >= 5001 && z <= 5999) return "VT";
    return "NJ";
  };

  const searchPets = async () => {
    if (!zipCode || zipCode.length < 5) return;
    setLoading(true);
    setError("");
    setPets([]);
    const state = getStateFromZip(zipCode);
    const speciesFilter = filterType === "Dog" ? "Dog" : "Cat";
    try {
      const res = await fetch("https://api.rescuegroups.org/v5/public/animals/search", {
        method: "POST",
        headers: { "Authorization": "a0XsphJP", "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            filters: [
              { fieldName: "statuses.name", operation: "equals", criteria: "Available" },
              { fieldName: "locations.state", operation: "equals", criteria: state },
              { fieldName: "species.singular", operation: "equals", criteria: speciesFilter }
            ],
            limit: 12,
            include: ["pictures", "orgs", "locations"]
          }
        })
      });
      const data = await res.json();
      const animals = (data.data || []).filter(a => {
        const attr = a.attributes;
        const orgId = a.relationships?.orgs?.data?.[0]?.id;
        const org = data.included?.find(i => i.type === "orgs" && i.id === orgId);
        const hasUrl = attr.url && attr.url.startsWith("http");
        const hasOrgUrl = org?.attributes?.url && org.attributes.url.startsWith("http");
        return hasUrl || hasOrgUrl;
      }).map(a => {
        const attr = a.attributes;
        const locId = a.relationships?.locations?.data?.[0]?.id;
        const orgId = a.relationships?.orgs?.data?.[0]?.id;
        const loc = data.included?.find(i => i.type === "locations" && i.id === locId);
        const org = data.included?.find(i => i.type === "orgs" && i.id === orgId);
        return {
          id: a.id,
          name: attr.name,
          breed: attr.breedString || attr.breedPrimary || "",
          age: attr.ageGroup || "",
          sex: attr.sex || "",
          photo: attr.pictureThumbnailUrl || "",
          url: attr.url && attr.url.startsWith("http") ? attr.url : "",
          city: loc?.attributes?.city || org?.attributes?.city || state,
          orgName: org?.attributes?.name || "",
          orgUrl: org?.attributes?.url || "",
          description: attr.descriptionText?.slice(0, 120) || ""
        };
      });
      setPets(animals);
      if (animals.length === 0) setError("No pets found in your area. Try a different zip code.");
    } catch (e) {
      setError("Could not load pets. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Adopt a Pet ❤️</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Find your next best friend — real pets available near you</p>

      {/* Search filters */}
      <div style={{ ...card, marginBottom: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          <div>
            <span style={label}>Pet Type</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...input, appearance: "none" }}>
              <option value="Dog">🐶 Dogs</option>
              <option value="Cat">🐱 Cats</option>
            </select>
          </div>
          <div>
            <span style={label}>Your Zip Code</span>
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="e.g. 08701" maxLength={5} style={input} />
          </div>
        </div>
        <button onClick={searchPets} disabled={!zipCode || zipCode.length < 5 || loading} style={{ ...btn(C.green), width: "100%", opacity: !zipCode || zipCode.length < 5 ? 0.5 : 1 }}>
          {loading ? "🔍 Searching..." : "🐾 Find Adoptable Pets Near Me"}
        </button>
      </div>

      {/* Cat adoption coming soon banner */}
      {filterType === "Cat" && (
        <div style={{ ...card, marginBottom: 18, background: "linear-gradient(135deg, #fff7ed, #fef3c7)", border: "1.5px solid #f59e0b33", textAlign: "center", padding: "18px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>🐱</div>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#92400e", marginBottom: 4 }}>Cat Adoption — Featured Listings Coming Soon!</div>
          <div style={{ color: "#b45309", fontSize: 13 }}>We're onboarding cat-friendly shelters to MyPetDex. In the meantime, search below to find cats available near you.</div>
        </div>
      )}

      {/* MyPetDex shelter listings */}
      {shelterListings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.green, marginBottom: 10 }}>⭐ Featured — Listed by Local Shelters</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {shelterListings.map(pet => (
              <div key={pet.id} style={{ ...card, padding: 12 }}>
                {pet.photoURL && <img src={pet.photoURL} alt={pet.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />}
                <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{pet.name}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{pet.type} · {pet.breed}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{pet.city}, {pet.state}</div>
                <div style={{ background: C.green + "22", borderRadius: 8, padding: "4px 8px", fontSize: 11, color: C.green, fontWeight: 700, marginTop: 6, display: "inline-block" }}>⭐ On MyPetDex</div>
                <ReportButton contentId={pet.id} contentType="shelter_listing" reporterUid={profile?.uid} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

      {/* RescueGroups results */}
      {pets.length > 0 && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 10 }}>🐾 Available Near You ({pets.length} found)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {pets.map(pet => (
              <a key={pet.id} href={pet.url || pet.orgUrl || "#"} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }} onClick={e => { if(!pet.url && !pet.orgUrl) e.preventDefault(); }}>
                <div style={{ ...card, padding: 12, cursor: "pointer", transition: "transform 0.2s" }}>
                  {pet.photo
                    ? <img src={pet.photo} alt={pet.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, marginBottom: 8 }} />
                    : <div style={{ width: "100%", height: 120, background: C.inputBg, borderRadius: 10, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{filterType === "Dog" ? "🐶" : "🐱"}</div>
                  }
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{pet.name}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{pet.breed}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{pet.age} · {pet.sex}</div>
                  <div style={{ color: C.muted, fontSize: 11 }}>{pet.city}</div>
                  <div style={{ ...btn(C.green), fontSize: 11, padding: "6px 10px", marginTop: 8, textAlign: "center", borderRadius: 8 }}>{pet.url ? `Meet ${pet.name} →` : `View at Shelter →`}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && pets.length === 0 && shelterListings.length === 0 && !error && (
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❤️</div>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>Find your next best friend</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Enter your zip code and search for real adoptable pets near you — powered by RescueGroups.org</div>
        </div>
      )}
    </div>
  );
}
// ─── Provider Profile ─────────────────────────────────────────────────────────
function ProviderProfile({ profile }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    businessName: profile?.businessName || "",
    service: profile?.service || "",
    priceRange: profile?.priceRange || "",
    city: profile?.city || "",
    state: profile?.state || "",
    bio: profile?.bio || "",
    googleReview: profile?.googleReview || "",
  });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), form);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
  };

  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>My Business Profile 📋</h2>
      {saved && <div style={{ background: C.green + "22", border: "1px solid " + C.green, borderRadius: 10, padding: "10px 14px", color: C.green, fontSize: 13, marginBottom: 14 }}>✅ Profile updated!</div>}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar emoji="🛎️" size={56} />
            <div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{profile?.businessName || "Your Business"}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>📍 {profile?.city || "--"}, {profile?.state || "--"}</div>
              <Badge text={profile?.service || "Service"} color={C.green} />
            </div>
          </div>
          {!editing && <button onClick={() => setEditing(true)} style={{ background: C.green + "22", border: "1.5px solid " + C.green, borderRadius: 10, padding: "7px 16px", color: C.green, fontFamily: font, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>✏️ Edit</button>}
        </div>
        {editing ? (
          <div>
            <Field label="Business Name" value={form.businessName} onChange={set("businessName")} placeholder="Happy Paws Grooming" />
            <Field label="Service Type" as="select" value={form.service} onChange={set("service")} options={["Grooming","Dog Walking","Veterinary","Training","Boarding","Daycare","Other"]} />
            <Field label="Price Range" value={form.priceRange} onChange={set("priceRange")} placeholder="e.g. $40-$80" />
            <Field label="City" value={form.city} onChange={set("city")} placeholder="Newark" />
            <Field label="State" as="select" value={form.state} onChange={set("state")} options={US_STATES} />
            <Field label="Google Review Link" value={form.googleReview} onChange={set("googleReview")} placeholder="https://maps.google.com/..." />
            <Field label="About Your Business" as="textarea" value={form.bio} onChange={set("bio")} placeholder="Tell pet owners what makes you special..." />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btn(C.green), flex: 1 }} onClick={save} disabled={saving}>{saving ? "Saving..." : "💾 Save Changes"}</button>
              <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div>
            {[["Service", profile?.service || "--"], ["Price Range", profile?.priceRange || "--"], ["City", profile?.city || "--"], ["State", profile?.state || "--"], ["Google Reviews", profile?.googleReview ? "✅ Added" : "❌ Not added"]].map(([k,v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid " + C.cardBorder }}>
                <span style={{ color: C.muted, fontSize: 13 }}>{k}</span>
                <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
            {profile?.bio && <div style={{ marginTop: 12, color: C.muted, fontSize: 13, fontStyle: "italic" }}>"{profile.bio}"</div>}
          </div>
        )}
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["Bookings","0"],["Reviews","0"],["Rating","New ⭐"],["Earnings","$0"]].map(([k,v]) => (
            <div key={k} style={{ background: C.inputBg, borderRadius: 10, padding: 12 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{k}</div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>🎉 6-Month Free Trial Active</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>After your trial, you only pay 5% commission on completed bookings. No monthly fees, ever!</div>
      </div>
      <ProviderReviews profile={profile} />
    </div>
  );
}

function ProviderReviews({ profile }) {
  const [reviews, setReviews] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [replying, setReplying] = useState({});

  useEffect(() => {
    if (!profile?.uid) return;
    const q = query(collection(db, "reviews"), where("providerId", "==", profile.uid));
    const unsub = onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [profile?.uid]);

  const submitReply = async (reviewId) => {
    const reply = replyText[reviewId]?.trim();
    if (!reply) return;
    setReplying(r => ({ ...r, [reviewId]: true }));
    try {
      await updateDoc(doc(db, "reviews", reviewId), { reply });
      setReplyText(r => ({ ...r, [reviewId]: "" }));
    } catch (e) {
      console.error("Reply error:", e);
    }
    setReplying(r => ({ ...r, [reviewId]: false }));
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div style={{ ...card, marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>⭐ My Reviews</div>
        {avgRating && <div style={{ color: C.gold, fontWeight: 800 }}>{avgRating} ★ ({reviews.length})</div>}
      </div>
      {reviews.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 16 }}>No reviews yet</div>}
      {reviews.map(r => (
        <div key={r.id} style={{ background: C.inputBg, borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ color: C.text, fontWeight: 800 }}>{r.ownerName}</div>
            <div style={{ color: C.gold }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
          </div>
          <div style={{ color: C.text, fontSize: 13, marginBottom: 8 }}>{r.comment}</div>
          {r.reply ? (
            <div style={{ background: C.card, borderRadius: 10, padding: "10px 12px", border: "1px solid " + C.cardBorder }}>
              <div style={{ color: C.green, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>🛎️ Your Response:</div>
              <div style={{ color: C.text, fontSize: 13 }}>{r.reply}</div>
            </div>
          ) : (
            <div>
              <textarea value={replyText[r.id] || ""} onChange={e => setReplyText(t => ({ ...t, [r.id]: e.target.value }))}
                placeholder="Reply to this review..." rows={2}
                style={{ background: C.inputBg, border: "1.5px solid " + C.cardBorder, borderRadius: 10, padding: "8px 12px", color: C.text, fontFamily: font, fontSize: 13, width: "100%", boxSizing: "border-box", outline: "none", resize: "vertical", marginBottom: 8 }} />
              <button onClick={() => submitReply(r.id)} disabled={replying[r.id] || !replyText[r.id]?.trim()}
                style={{ ...btn(C.green), fontSize: 13, padding: "8px 16px", opacity: !replyText[r.id]?.trim() ? 0.5 : 1 }}>
                {replying[r.id] ? "Replying..." : "💬 Reply"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
// ─── Bookings Tab ─────────────────────────────────────────────────────────────
function BookingsTab() {
  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Bookings 📅</h2>
      <div style={{ ...card, textAlign: "center", padding: 50 }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>📅</div>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>No bookings yet</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 6 }}>Once pet owners book your services, they'll appear here!</div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function DeleteAccountButton({ user, onLogout }) {
  const [step, setStep] = useState("idle"); // idle | warn | confirm
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [typed, setTyped] = useState("");

  const handleDelete = async () => {
    if (typed.trim().toUpperCase() !== "DELETE") {
      setError('Please type DELETE to confirm.');
      return;
    }
    setDeleting(true); setError("");
    try {
      const functions = getFunctions();
      const deleteAccount = httpsCallable(functions, "deleteAccount");
      await deleteAccount();
      onLogout();
    } catch (e) {
      console.error("Delete account error:", e);
      setError("Could not delete account. Please try again or contact help@mypetdex.app");
      setDeleting(false);
    }
  };

  const reset = () => { setStep("idle"); setTyped(""); setError(""); };

  // Step 1 — entry point
  if (step === "idle") return (
    <button onClick={() => setStep("warn")} style={{ ...btn(C.danger + "11", C.danger), border: "1px solid " + C.danger + "44", width: "100%", marginBottom: 10 }}>
      🗑️ Delete My Account
    </button>
  );

  // Step 2 — what will be deleted + subscription warning
  if (step === "warn") return (
    <div style={{ ...card, border: "1.5px solid " + C.danger, marginBottom: 10 }}>
      <div style={{ color: C.danger, fontWeight: 800, fontSize: 16, marginBottom: 12 }}>⚠️ Delete Account</div>
      <div style={{ color: C.text, fontWeight: 600, fontSize: 13, marginBottom: 8 }}>The following will be permanently deleted:</div>
      {["Your account and login credentials", "All pet profiles and health records", "All saved recipes and AI chat history", "All reviews you have written"].map(item => (
        <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
          <span style={{ color: C.danger, fontSize: 12, marginTop: 1 }}>✕</span>
          <span style={{ color: C.muted, fontSize: 13 }}>{item}</span>
        </div>
      ))}
      <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, padding: "10px 12px", margin: "14px 0", fontSize: 13, color: "#92400E" }}>
        <strong>⚠️ Active subscription?</strong> Deleting your account does not automatically cancel your subscription. Please cancel your subscription first in <strong>Settings → Subscriptions</strong> (iOS) or <strong>Google Play → Subscriptions</strong> (Android) to avoid future charges.
      </div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>Your data will be permanently removed within 30 days. This action cannot be undone.</div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => setStep("confirm")} style={{ ...btn(C.danger, "#fff"), flex: 1 }}>Continue</button>
        <button onClick={reset} style={{ ...btn(C.cardBorder, C.muted) }}>Cancel</button>
      </div>
    </div>
  );

  // Step 3 — type to confirm
  return (
    <div style={{ ...card, border: "1.5px solid " + C.danger, marginBottom: 10 }}>
      <div style={{ color: C.danger, fontWeight: 800, fontSize: 15, marginBottom: 10 }}>Final confirmation</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Type <strong style={{ color: C.text }}>DELETE</strong> below to permanently delete your account.</div>
      <input
        value={typed}
        onChange={e => { setTyped(e.target.value); setError(""); }}
        placeholder="Type DELETE"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid " + (error ? C.danger : C.cardBorder), fontSize: 15, fontFamily: "monospace", boxSizing: "border-box", marginBottom: 10, color: C.text, background: C.card }}
      />
      {error && <div style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleDelete} disabled={deleting} style={{ ...btn(C.danger, "#fff"), flex: 1, opacity: deleting ? 0.7 : 1 }}>
          {deleting ? "Deleting…" : "Delete My Account"}
        </button>
        <button onClick={reset} disabled={deleting} style={{ ...btn(C.cardBorder, C.muted) }}>Cancel</button>
      </div>
    </div>
  );
}
function SettingsTab({ user, profile, onProfileUpdate, onLogout, isDemo }) {
  const [section, setSection] = useState("main");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: profile?.name || "", city: profile?.city || "", state: profile?.state || "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    if (!form.name) { setError("Name is required"); return; }
    setSaving(true); setError("");
    try {
      const updated = { ...profile, ...form };
      await updateDoc(doc(db, "users", user.uid), form);
      onProfileUpdate(updated);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  };

  if (section === "privacy") return (
    <div>
      <button onClick={() => setSection("main")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 16 }}>← Back</button>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Privacy Policy 🔒</h2>
      <div style={{ ...card, marginBottom: 14, background: C.green + "11", border: `1px solid ${C.green}44` }}>
        <div style={{ color: C.green, fontWeight: 900, fontSize: 15, marginBottom: 6 }}>🔒 Your Data is Encrypted</div>
        <div style={{ color: C.text, fontSize: 13, lineHeight: 1.7 }}>All data transmitted and stored on MyPetDex is encrypted using industry-standard protocols. We do not sell, share, or monetize your personal or pet information under any circumstances.</div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>What we collect</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>We collect your name, email, city, state, and pet information solely to provide our service. We do NOT collect payment info, government IDs, or precise location.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>How we use your data</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Your data is used only to provide pet care services, show local providers, and maintain your pet health records. We never sell your data to third parties.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>AI Assistant & Recipe Data</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>The AI Assistant sends your messages and pet context to Anthropic's API for processing. Pet recipes are NOT sent to AI for generation — they are pre-formulated AAFCO/USDA verified templates stored in our database. Claude AI only presents the selected recipe.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Nutrition Data Sources</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Calorie targets use the WSAVA RER formula. Recipe templates are sourced from AAFCO 2023 Nutrient Profiles and USDA FoodData Central — all public-domain standards. This is informational only and not a substitute for veterinary advice.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Toxicity Safeguards</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Ingredients toxic to pets per ASPCA guidelines — including grapes, onions, garlic, chocolate, xylitol, and macadamia nuts — are permanently hard-blocked from all recipe suggestions.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Your rights</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>You can access, edit, or delete your data at any time. To delete your account go to Settings → Delete Account. Data is permanently removed within 30 days.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Security</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Your data is protected by Firebase Authentication, Firestore Security Rules, and HTTPS/TLS encryption. Only you can access your data.</div></div>
      <div style={{ ...card }}><div style={{ color: C.muted, fontSize: 12 }}>Effective: April 1, 2026 · Last updated: May 21, 2026 · Contact: help@mypetdex.app</div></div>
    </div>
  );

  if (section === "terms") return (
    <div>
      <button onClick={() => setSection("main")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 16 }}>← Back</button>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Terms of Service 📋</h2>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Acceptance</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>By using MyPetDex, you agree to these terms. MyPetDex is a pet care management platform providing health records, reminders, AI assistance, and verified pet nutrition tools.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Veterinary Disclaimer</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>MyPetDex is an educational tool — NOT a substitute for professional veterinary advice, diagnosis, or treatment. Always consult a licensed veterinarian or board-certified veterinary nutritionist before changing your pet's diet, especially for pets with health conditions.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Nutrition & Recipe Standards</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Pet recipes are AAFCO compliant templates scaled to your pet's WSAVA calorie target — they are not AI-generated. Data is sourced from AAFCO 2023 Nutrient Profiles, USDA FoodData Central, and WSAVA Global Nutrition Guidelines. Whole food recipes may not meet 100% of AAFCO trace minerals — always add a vet-recommended multivitamin supplement.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Toxicity Safeguards</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Ingredients toxic to pets per ASPCA guidelines are hard-blocked from all recipes. Users are responsible for verifying the safety of any additional ingredients not in our platform.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Subscriptions</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Plus ($2.99/mo) and Family ($4.99/mo) plans include a 30-day free trial. No credit card required during trial. Cancel anytime from Settings. Governed by the laws of New Jersey, USA.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Service Providers</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Service providers on MyPetDex are independent businesses. MyPetDex does not guarantee service quality. Always verify credentials before booking.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Acceptable Use</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>You agree not to use MyPetDex for illegal purposes, upload false information, or attempt to access other users' data.</div></div>
      <div style={{ ...card }}><div style={{ color: C.muted, fontSize: 12 }}>Effective: April 1, 2026 · Last updated: May 21, 2026 · Contact: help@mypetdex.app</div></div>
    </div>
  );

  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Settings ⚙️</h2>
      <div style={{ ...card, marginBottom: 14, background: C.green + "11", border: `1px solid ${C.green}33` }}>
        <div style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>🔒 Your Privacy is Protected</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Your data is encrypted and never shared with third parties.</div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>My Profile</div>
          {!editing && !isDemo && (
            <button onClick={() => setEditing(true)} style={{ background: C.green + "22", border: "1.5px solid " + C.green, borderRadius: 10, padding: "7px 16px", color: C.green, fontFamily: font, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              ✏️ Edit Profile
            </button>
          )}
        </div>
        {saved && <div style={{ background: C.green + "22", border: `1px solid ${C.green}`, borderRadius: 10, padding: "10px 14px", color: C.green, fontSize: 13, marginBottom: 14 }}>✅ Profile updated successfully!</div>}
        {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        {editing ? (
          <>
            <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="Your name" required />
            <Field label="City" value={form.city} onChange={set("city")} placeholder="Your city" />
            <Field label="State" as="select" value={form.state} onChange={set("state")} options={US_STATES} />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...btn(C.green), flex: 1 }} onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "💾 Save Changes"}</button>
              <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => { setEditing(false); setError(""); }}>Cancel</button>
            </div>
          </>
        ) : (
          [["Name", profile?.name || "--"],["City", profile?.city || "--"],["State", profile?.state || "--"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
              <span style={{ color: C.muted, fontSize: 13 }}>{k}</span>
              <span style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{v}</span>
            </div>
          ))
        )}
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Account</div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Email</span>
          <span style={{ color: C.text, fontSize: 13 }}>{user?.email}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cardBorder}` }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Account Type</span>
          <span style={{ color: C.green, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{profile?.role}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", alignItems: "center" }}>
          <div>
            <span style={{ color: C.muted, fontSize: 13 }}>Plan</span>
            <span style={{ color: C.green, fontSize: 13, fontWeight: 700, marginLeft: 8, textTransform: "capitalize" }}>{profile?.plan || "free"}{profile?.billing ? " · " + profile.billing : ""}</span>
          </div>
          {profile?.plan && profile.plan !== "free" && profile?.stripeCustomerId && (
            <button onClick={async () => {
              try {
                const res = await fetch("https://us-central1-mypetdex-c4315.cloudfunctions.net/createPortalSession", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: user.uid })
                });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
                else alert("Could not open subscription portal. Please contact help@mypetdex.app");
              } catch (e) { alert("Something went wrong. Please try again."); }
            }} style={{ background: C.danger + "22", border: "1.5px solid " + C.danger, borderRadius: 10, padding: "7px 14px", color: C.danger, fontFamily: font, fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
              Manage Subscription
            </button>
          )}
        </div>
      </div>
      {!isDemo && <SiteReviewWidget user={user} profile={profile} />}
      {!isDemo && <ReferralWidget profile={profile} />}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 18, padding: 22, marginBottom: 14 }}>
        <div style={{ color: "#1E293B", fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Legal</div>
        <div onClick={() => window.open("https://home.mypetdex.app/privacy.html", "_blank")} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.cardBorder}`, cursor: "pointer" }}>
          <span style={{ color: C.text, fontSize: 13 }}>🔒 Privacy Policy</span><span style={{ color: C.muted }}>›</span>
        </div>
        <div onClick={() => window.open("https://home.mypetdex.app/terms.html", "_blank")} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", cursor: "pointer" }}>
          <span style={{ color: C.text, fontSize: 13 }}>📋 Terms of Service</span><span style={{ color: C.muted }}>›</span>
        </div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>🆕 What's New</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 8, fontWeight: 700 }}>Version 1.6 — May 2026</div>
        {[
          "✅ Live payments — Plus & Family plans now available",
          "✅ Monthly & Yearly billing toggle",
          "✅ Manage Subscription — cancel or switch plans anytime",
          "✅ Add Pet now goes straight to form from Home",
          "✅ New logo across app and emails",
          "✅ Improved welcome emails with branding",
          "✅ Privacy & Terms standalone pages",
          "🔜 iOS & Android app coming soon"
        ].map((item, i) => (
          <div key={i} style={{ color: C.muted, fontSize: 13, padding: "5px 0", borderBottom: i < 7 ? `1px solid ${C.cardBorder}` : "none" }}>{item}</div>
        ))}
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>❓ FAQ</div>
        {[
          ["Is MyPetDex free?", "Yes! The basic plan is free forever. Plus and Family plans unlock advanced features."],
          ["Is my data private?", "Absolutely. Your data is encrypted and never shared with third parties."],
          ["Can I add multiple pets?", "Yes! Free plan supports 1 pet, Plus supports 3, and Family supports unlimited pets."],
          ["Is the AI a real vet?", "No. The AI provides informational guidance only. Always consult your vet for medical advice."],
          ["When is the mobile app launching?", "iOS & Android apps are coming soon. Join the waitlist at home.mypetdex.app!"]
        ].map(([q, a], i) => (
          <div key={i} style={{ padding: "10px 0", borderBottom: i < 4 ? `1px solid ${C.cardBorder}` : "none" }}>
            <div style={{ color: C.text, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{q}</div>
            <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>{a}</div>
          </div>
        ))}
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Contact Us</div>
        <div style={{ color: C.muted, fontSize: 13 }}>📧 help@mypetdex.app</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>🌐 mypetdex.app</div>
      </div>
      {!isDemo && <DeleteAccountButton user={user} onLogout={onLogout} />}
      <button onClick={onLogout} style={{ ...btn(C.danger + "22", C.danger), border: "1px solid " + C.danger, width: "100%", marginTop: 10 }}>Sign Out</button>
    </div>
  );
}

// ─── Shelter Listings ─────────────────────────────────────────────────────────
function ShelterListings({ user }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name:"", type:"Dog", breed:"", age:"", notes:"" });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "shelterPets"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => { setPets(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); });
    return unsub;
  }, [user]);

  const addPet = async () => {
    if (!form.name) return;
    await addDoc(collection(db, "shelterPets"), { ...form, uid: user.uid, status: "Available", createdAt: new Date().toISOString() });
    setAdding(false);
    setForm({ name:"", type:"Dog", breed:"", age:"", notes:"" });
  };

  const deletePet = async (id) => await deleteDoc(doc(db, "shelterPets", id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>Our Pets 🐶</h2>
        <button style={btn(C.green)} onClick={() => setAdding(true)}>+ Add Pet</button>
      </div>
      {loading && <Spinner />}
      {!loading && pets.length === 0 && !adding && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No pets listed yet. Add your first pet!</div>}
      {pets.map(pet => (
        <div key={pet.id} style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <Avatar emoji={pet.type === "Cat" ? "🐈" : "🐕"} size={48} />
              <div>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{pet.name}</div>
                <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed} · {pet.age}</div>
                <Badge text="Available" color={C.green} />
              </div>
            </div>
            <button onClick={() => deletePet(pet.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 18 }}>🗑️</button>
          </div>
        </div>
      ))}
      {adding && (
        <div style={{ ...card, marginTop: 14 }}>
          <h3 style={{ color: C.text, margin: "0 0 16px" }}>Add Available Pet</h3>
          <Field label="Name" value={form.name} onChange={set("name")} placeholder="Charlie" required />
          <Field label="Type" as="select" value={form.type} onChange={set("type")} options={["Dog","Cat"]} />
          <Field label="Breed" as="select" value={form.breed} onChange={set("breed")} options={form.type === "Cat" ? CAT_BREEDS : form.type === "Dog" ? DOG_BREEDS : ["Mixed","Other"]} />
          <Field label="Age" value={form.age} onChange={set("age")} placeholder="1yr" />
          <Field label="Notes" as="textarea" value={form.notes} onChange={set("notes")} placeholder="Personality, special needs..." />
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ ...btn(C.green), flex: 1 }} onClick={addPet}>💾 Save</button>
            <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}