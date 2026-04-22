import { useState, useEffect, useRef } from "react";
import emailjs from "@emailjs/browser";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, collection, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, where
} from "firebase/firestore";
import { canAddPet, hasFeature, UpgradePrompt } from './planUtils';
const C = {
  bg: "#0F1A14", card: "#16251B", cardBorder: "#1E3526",
  green: "#3DD68C", gold: "#F5C842", text: "#EFF6F1",
  muted: "#7A9E89", danger: "#E05C5C", inputBg: "#0D1710",
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
  "Pug","Saint Bernard","Scottish Terrier","Whippet","Mixed Breed","Other"
];
const CAT_BREEDS = [
  "Domestic Shorthair","Domestic Longhair","Maine Coon","Persian","Siamese",
  "Ragdoll","Bengal","British Shorthair","Abyssinian","Russian Blue",
  "Scottish Fold","Sphynx","Norwegian Forest Cat","Birman","Tonkinese",
  "American Shorthair","Burmese","Devon Rex","Cornish Rex","Oriental",
  "Turkish Angora","Himalayan","Savannah","Manx","Exotic Shorthair",
  "Chartreux","Egyptian Mau","Balinese","Somali","Singapura","Mixed","Other"
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
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...input, appearance: "none" }}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
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

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null); // eslint-disable-line no-unused-vars
  // eslint-disable-next-line no-unused-vars
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("landing");
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [tab, setTab] = useState("home");

  useEffect(() => {
    // Inject dark theme styles for select elements
    const style = document.createElement('style');
    style.textContent = `
      select {
        background: ${C.inputBg} !important;
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
        padding: 8px !important;
      }
      select:focus {
        border-color: ${C.green} !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  // Auth state listener - controls loading and screen routing
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        if (firebaseUser.email === 'mypetdexapp@gmail.com') {
          setScreen('admin');
          setLoading(false);
        } else if (!firebaseUser.emailVerified && firebaseUser.email !== 'demo@mypetdex.app') {
          setScreen('verify');
          setLoading(false);
        } else {
          try {
            const snap = await getDoc(doc(db, "users", firebaseUser.uid));
            setProfile(snap.exists() ? snap.data() : { email: firebaseUser.email, role: "owner", uid: firebaseUser.uid });
          } catch (e) {
            console.error("Error loading profile:", e);
          }
          setScreen('app');
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setScreen('landing');
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // Auto demo login from URL
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

  if (new URLSearchParams(window.location.search).get('demo')) return null;
  if (screen === "admin") return <AdminDashboard onLogout={async () => { await signOut(auth); setScreen("landing"); }} />;
  if (screen === "landing") return <Landing onRegister={() => setScreen("register")} onLogin={() => setScreen("login")} />;
  if (screen === "register") return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={(p) => { setProfile(p); setScreen("app"); }} />;
  if (screen === "login") return <LoginScreen onBack={() => setScreen("landing")} onSuccess={(p) => { setProfile(p); setScreen("app"); }} />;
  if (screen === "verify") return <VerifyEmail onVerified={async () => {
    const u = auth.currentUser;
    if (!u) return;
    const snap = await getDoc(doc(db, "users", u.uid));
    const userData = snap.exists() ? snap.data() : { email: u.email, role: "owner", uid: u.uid };
    setProfile(userData);
    setScreen("app");
  }} onLogout={async () => { await signOut(auth); setScreen("landing"); }} />;
  if (screen === "app") return <MainApp user={user} profile={profile} tab={tab} setTab={setTab} onLogout={async () => { await signOut(auth); setScreen("landing"); }} />;
}

// ─── Landing ─────────────────────────────────────────────────────────────────
function Landing({ onRegister, onLogin }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: font, padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 72, marginBottom: 8 }}>🐾</div>
      <h1 style={{ color: C.green, fontWeight: 900, fontSize: 42, margin: 0, letterSpacing: -1 }}>MyPetDex</h1>
      <p style={{ color: C.muted, fontSize: 16, marginBottom: 40, textAlign: "center", maxWidth: 320 }}>Everything you need to care for your pet in one place.</p>
      <div style={{ display: "flex", gap: 14 }}>
        <button style={btn(C.green)} onClick={onRegister}>Get Started Free</button>
        <button style={{ ...btn("transparent", C.green), border: `1.5px solid ${C.green}` }} onClick={onLogin}>Sign In</button>
      </div>
      <p style={{ color: C.muted, fontSize: 12, marginTop: 32 }}>🐶 Pet Owners · 🛎️ Service Providers · 🏠 Shelters</p>
      <div style={{ marginTop: 20, background: C.card, borderRadius: 12, padding: "10px 18px", border: `1px solid ${C.cardBorder}` }}>
        <p style={{ color: C.muted, fontSize: 11, margin: 0, textAlign: "center" }}>🔒 Your data is 100% private. We never share your or your pet's information with anyone.</p>
      </div>
    </div>
  );
}

// ─── Register ────────────────────────────────────────────────────────────────
function RegisterScreen({ onBack, onSuccess }) {
  const [role, setRole] = useState("");
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name:"", email:"", password:"",
    petName:"", petType:"Dog", petBreed:"", petAge:"", petWeight:"",
    state:"", city:"",
    businessName:"", service:"", priceRange:"", googleReview:"", bio:"",
    shelterName:"", ein:"", license:"",
  });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.email || !form.password) { setError("Please fill in all required fields"); return; }
    setLoading(true); setError("");
      try {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const { password, ...formWithoutPassword } = form;
      const profile = { ...formWithoutPassword, role, uid: cred.user.uid, createdAt: new Date().toISOString() , plan: "free", billingCycle: "monthly"};
      await setDoc(doc(db, "users", cred.user.uid), profile);
      if (role === "owner" && form.petName) {
        await addDoc(collection(db, "pets"), {
          name: form.petName, type: form.petType, breed: form.petBreed,
          age: form.petAge, weight: form.petWeight, feeding: "",
          nextVet: "", notes: "", vaccines: [], reminders: [],
          photoURL: "", uid: cred.user.uid, createdAt: new Date().toISOString()
        });
      }
// Send welcome email (providers and shelters only — owners get it after email verification)
try {
  // Always notify John
  await emailjs.send(
    "service_7k1uaus",
    "template_2wbilsd",
    {
      to_email: "mypetdexapp@gmail.com",
      to_name: "John (Admin)",
      subject_line: `New ${role} signup: ${form.email}`,
      message_body: `A new ${role} just signed up!\n\nEmail: ${form.email}\nRole: ${role}\nTime: ${new Date().toLocaleString()}`,
    },
    { publicKey: "Fp0nQuFeAXba8AMsM" }
  );

  // Send welcome email immediately for providers and shelters only
  if (role === "provider" || role === "shelter") {
    let subject_line = "";
    let message_body = "";
    if (role === "provider") {
      subject_line = "Welcome to MyPetDex – Provider Account 🐾";
      message_body = `Hi ${form.businessName || form.email.split("@")[0]},\n\nWelcome to MyPetDex! Your provider account is ready.\n\n💰 Service Fee: 5% per booking after your first 6 months free.\n\n📋 Required Documents:\n${form.licensed === "yes" ? "- Business License\n- Google Business Page\n- Google Reviews Page" : "- Google Reviews Page"}\n\nPlease reply to this email with your documents to activate your listing.\n\nThe MyPetDex Team\nhelp@mypetdex.app`;
    } else if (role === "shelter") {
      subject_line = "Welcome to MyPetDex – Shelter Account 🐾";
      message_body = `Hi ${form.shelterName || form.email.split("@")[0]},\n\nWelcome to MyPetDex! Your shelter account is ready.\n\n📋 Required Documents:\n- Shelter Name\n- Website\n- License Number\n\nPlease reply with your documents to complete verification.\n\n🐶 Adoption Listings: Once verified, you can submit pets for adoption.\n\nThe MyPetDex Team\nhelp@mypetdex.app`;
    }
    await emailjs.send(
      "service_7k1uaus",
      "template_2wbilsd",
      { to_email: form.email, subject_line, message_body },
      { publicKey: "Fp0nQuFeAXba8AMsM" }
    );
  }
} catch (emailErr) {
  console.error("Welcome email error:", emailErr);
}

      // Send verification email and do NOT let user into the app until verified
      try {
        await sendEmailVerification(cred.user, { url: window.location.origin });
      } catch (verErr) {
        console.error("Verification email error:", verErr);
      }
      // Do not call onSuccess(profile) here; onAuthStateChanged will show the verify screen
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
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 20 }}>Back</button>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 26, margin: "0 0 8px" }}>Create Account</h2>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 16 }}>Join the MyPetDex community 🐾</p>
        <div style={{ background: C.card, border: `1px solid ${C.cardBorder}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>🔒 Your personal and pet information is private and never shared with third parties.</p>
        </div>
        {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {step === 1 && <>
          <p style={{ ...label, marginBottom: 12 }}>I am a...</p>
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {roleCard("owner","🐾","Pet Owner","Manage my pets")}
            {roleCard("provider","🛎️","Service Provider","Offer pet services")}
            {roleCard("shelter","🏠","Shelter","Post adoptions")}
          </div>
          <Field label="Full Name" value={form.name} onChange={set("name")} placeholder="Jane Smith" required />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@email.com" required />
          <Field label="Password (min 6 characters)" type="password" value={form.password} onChange={set("password")} placeholder="password" required />
          <button style={{ ...btn(), width: "100%" }} onClick={() => { if (!role || !form.name || !form.email || !form.password) { setError("Please fill in all fields and select a role"); return; } setError(""); setStep(2); }}>Continue</button>
        </>}
        {step === 2 && role === "owner" && <>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Tell us about your pet and location</p>
          <Field label="Pet Name" value={form.petName} onChange={set("petName")} placeholder="Buddy" required />
          <Field label="Pet Type" as="select" value={form.petType} onChange={set("petType")} options={["Dog","Cat","Rabbit","Bird","Other"]} />
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
          <Field label="State" as="select" value={form.state} onChange={set("state")} options={US_STATES} />
          <Field label="City" value={form.city} onChange={set("city")} placeholder="Newark" />
          <Field label="Google Review Link" value={form.googleReview} onChange={set("googleReview")} placeholder="https://maps.google.com/..." />
          <Field label="About Your Business" as="textarea" value={form.bio} onChange={set("bio")} placeholder="Tell pet owners what makes you special..." />
          <div style={{ ...card, background: "#1a2e1e", marginBottom: 16 }}>
          </div>
          <button style={{ ...btn(), width: "100%" }} onClick={submit} disabled={loading}>{loading ? "Creating Account..." : "Create Provider Account"}</button>
        </>}
        {step === 2 && role === "shelter" && <>
          <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Shelter verification (approved within 24hr)</p>
          <Field label="Shelter Name" value={form.shelterName} onChange={set("shelterName")} placeholder="Second Chance Animal Shelter" required />
          <Field label="EIN Number" value={form.ein} onChange={set("ein")} placeholder="xx-xxxxxxx" />
          <Field label="State License #" value={form.license} onChange={set("license")} placeholder="NJ-2024-xxxxx" />
          <Field label="State" as="select" value={form.state} onChange={set("state")} options={US_STATES} />
          <Field label="City" value={form.city} onChange={set("city")} placeholder="Camden" />
          <div style={{ ...card, background: "#1a2e1e", marginBottom: 16 }}>
            <p style={{ color: C.green, fontSize: 12, fontWeight: 700, margin: 0 }}>Shelter access is always FREE on MyPetDex!</p>
          </div>
          <button style={{ ...btn(), width: "100%" }} onClick={submit} disabled={loading}>{loading ? "Submitting..." : "Submit for Approval"}</button>
        </>}
      </div>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onBack, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const login = async () => {
    if (!email || !password) { setError("Please enter your email and password"); return; }
    setLoading(true); setError("");
    try {
      // Sign in. onAuthStateChanged will handle redirecting to verify/app based on email verification.
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  };

  const forgotPassword = async () => {
    if (!email) { setError("Please enter your email address first"); return; }
    setLoading(true); setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (e) {
      setError("Could not send reset email. Please check your email address.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 380 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 20 }}>Back</button>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 26, margin: "0 0 24px" }}>Welcome back 🐾</h2>
        {resetSent && (
          <div style={{ background: C.green + "22", border: `1px solid ${C.green}`, borderRadius: 10, padding: "10px 14px", color: C.green, fontSize: 13, marginBottom: 16 }}>
            ✅ Password reset email sent! Check your inbox.
          </div>
        )}
        {error && <div style={{ background: C.danger + "22", border: `1px solid ${C.danger}`, borderRadius: 10, padding: "10px 14px", color: C.danger, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="password" />
        <button style={{ ...btn(), width: "100%", marginTop: 8 }} onClick={login} disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
        <button onClick={forgotPassword} disabled={loading} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 13, fontFamily: font, marginTop: 14, width: "100%", textAlign: "center" }}>
          Forgot password?
        </button>
      </div>
    </div>
  );
}

// ─── Verify Email Screen ──────────────────────────────────────────────────────
function VerifyEmail({ onVerified, onLogout }) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const user = auth.currentUser;

  const resend = async () => {
    if (!user) { setMessage("No signed-in user."); return; }
    setSending(true); setMessage("");
    try {
      await sendEmailVerification(user, { url: window.location.origin });
      setMessage("Verification email sent. Check your inbox.");
    } catch (e) {
      console.error("resend error", e);
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
      console.error("verify check error", e);
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
          <p style={{ color: C.muted }}>We've sent a verification link to <strong style={{ color: C.text }}>{user?.email}</strong>. Please open that email and click the link to verify your address.</p>
          <p style={{ color: C.muted, fontSize: 13, marginTop: -8 }}>📬 Can't find it? Check your <strong style={{ color: C.text }}>spam or junk folder</strong>.</p>
          {message && <div style={{ background: C.green + "22", border: `1px solid ${C.green}`, borderRadius: 10, padding: "10px 14px", color: C.green, fontSize: 13, margin: "12px 0" }}>{message}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
            <button onClick={resend} disabled={sending} style={{ ...btn(C.green), minWidth: 160 }}>{sending ? "Sending..." : "Resend Email"}</button>
            <button onClick={check} disabled={sending} style={{ ...btn(C.cardBorder, C.green), minWidth: 160, border: `1px solid ${C.green}` }}>{sending ? "Checking..." : "I've Verified"}</button>
          </div>
          <button onClick={onLogout} style={{ marginTop: 16, background: "none", border: "none", color: C.muted, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }) {
  const [adminTab, setAdminTab] = useState("shelters");
  const [shelters, setShelters] = useState([]);
  const [providers, setProviders] = useState([]);
  const [shelterPets, setShelterPets] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
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

    return () => { unsub1(); unsub2(); unsub3(); };
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
      <div style={{ background: C.card, borderBottom: `1px solid ${C.cardBorder}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>🛡️</span>
          <div>
            <span style={{ color: C.green, fontWeight: 900, fontSize: 20 }}>MyPetDex</span>
            <span style={{ color: C.gold, fontSize: 11, fontWeight: 800, marginLeft: 8, background: C.gold + "22", borderRadius: 6, padding: "2px 8px" }}>ADMIN</span>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: "none", border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "5px 12px", color: C.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>Sign out</button>
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
          {["shelters", "providers"].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} style={{ ...btn(adminTab === t ? C.green : C.card, adminTab === t ? "#0F1A14" : C.muted), border: `1px solid ${adminTab === t ? C.green : C.cardBorder}`, flex: 1, padding: "10px", fontSize: 14 }}>
              {t === "shelters" ? "🏠 Shelters" : "🛎️ Service Providers"}
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
                    {pet.notes && <div style={{ marginTop: 2 }}>{pet.notes}</div>}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {(!s.status || s.status === "pending") && <>
                    <button onClick={() => updateStatus(s.uid, "approved")} style={{ ...btn(C.green), padding: "7px 16px", fontSize: 13 }}>✓ Approve</button>
                    <button onClick={() => updateStatus(s.uid, "rejected")} style={{ ...btn(C.danger), padding: "7px 16px", fontSize: 13 }}>✗ Reject</button>
                  </>}
                  {s.status === "approved" && <button onClick={() => updateStatus(s.uid, "rejected")} style={{ ...btn(C.danger), padding: "7px 16px", fontSize: 13 }}>✗ Revoke</button>}
                  {s.status === "rejected" && <button onClick={() => updateStatus(s.uid, "approved")} style={{ ...btn(C.green), padding: "7px 16px", fontSize: 13 }}>✓ Approve</button>}
                  <button onClick={() => toggleSuspend(s.uid, s.suspended)} style={{ ...btn(s.suspended ? C.gold : C.cardBorder, s.suspended ? "#0F1A14" : C.muted), padding: "7px 16px", fontSize: 13, border: `1px solid ${s.suspended ? C.gold : C.cardBorder}` }}>
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
                    {p.bio && <div style={{ color: C.muted, fontSize: 12, marginTop: 4, fontStyle: "italic" }}>"{p.bio}"</div>}
                    <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>Joined: {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A"}</div>
                  </div>
                  {p.suspended && <span style={{ background: C.danger + "22", color: C.danger, borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>🔒 Suspended</span>}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => toggleSuspend(p.uid, p.suspended)} style={{ ...btn(p.suspended ? C.gold : C.cardBorder, p.suspended ? "#0F1A14" : C.muted), padding: "7px 16px", fontSize: 13, border: `1px solid ${p.suspended ? C.gold : C.cardBorder}` }}>
                    {p.suspended ? "🔓 Unsuspend" : "🔒 Suspend"}
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ─── Main App Shell
// eslint-disable-next-line no-unused-vars
function MainApp({ user, profile, tab, setTab, onLogout }) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const role = currentProfile?.role || "owner";
  const isOwner = role === "owner";
  const isProvider = role === "provider";
  const isShelter = role === "shelter";
  const ownerTabs = ["home","pets","services","ai","recipes","adoption","settings"];
  const providerTabs = ["home","profile","bookings","settings"];
  const shelterTabs = ["home","listings","settings"];
  const tabs = isOwner ? ownerTabs : isProvider ? providerTabs : shelterTabs;
 const tabIcon = { home:"🏠", pets:"🐾", services:"🛎️", ai:"🤖", recipes:"🍽️", adoption:"❤️", profile:"📋", bookings:"📅", listings:"🐶", settings:"⚙️" };
  const tabLabel = { home:"Home", pets:"My Pets", services:"Services", ai:"AI Chat", recipes:"Recipes", adoption:"Adopt", profile:"My Business", bookings:"Bookings", listings:"Listings", settings:"Settings" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font, paddingBottom: 80 }}>
      <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap" rel="stylesheet" />
      <div style={{ background: C.card, borderBottom: `1px solid ${C.cardBorder}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 26 }}>🐾</span>
          <span style={{ color: C.green, fontWeight: 900, fontSize: 20 }}>MyPetDex</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Hi, {currentProfile?.name?.split(" ")[0] || "Friend"}</span>
          <button onClick={onLogout} style={{ background: "none", border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "5px 12px", color: C.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>
      <div style={{ padding: "20px 16px", maxWidth: 540, margin: "0 auto" }}>
        {tab === "home" && <HomeTab profile={currentProfile} user={user} isOwner={isOwner} isProvider={isProvider} isShelter={isShelter} setTab={setTab} />}
{tab === "pets" && isOwner && <PetsTab user={user} profile={currentProfile} />}
        {tab === "services" && isOwner && <ServicesTab profile={currentProfile} />}
        {tab === "recipes" && isOwner && <RecipesTab profile={currentProfile} user={user} />}
        {tab === "ai" && isOwner && <AITab profile={currentProfile} user={user} />}
        {tab === "adoption" && isOwner && <AdoptionTab profile={currentProfile} />}
        {tab === "profile" && isProvider && <ProviderProfile profile={currentProfile} />}
        {tab === "bookings" && isProvider && <BookingsTab />}
        {tab === "listings" && isShelter && <ShelterListings user={user} />}
        {tab === "settings" && <SettingsTab user={user} profile={currentProfile} onProfileUpdate={setCurrentProfile} onLogout={onLogout} />}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.cardBorder}`, display: "flex", justifyContent: "space-around", padding: "10px 0 6px" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: tab === t ? C.green : C.muted, fontFamily: font, fontWeight: 700, fontSize: 10 }}>
            <span style={{ fontSize: 20 }}>{tabIcon[t]}</span>
            {tabLabel[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ profile, user, isOwner, isProvider, isShelter, setTab }) {
  const [pets, setPets] = useState([]);

  useEffect(() => {
    if (!user || !isOwner) return;
    const q = query(collection(db, "pets"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, snap => {
      setPets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user, isOwner]);

  if (isProvider) return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22 }}>Provider Dashboard 🛎️</h2>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.gold, fontWeight: 800, fontSize: 16 }}>30-Day Free Trial Active</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>After trial: 10-15% commission only on bookings. No monthly fees!</div>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>My Pets 🐾</h2>
        <button onClick={() => { if (canAddPet(profile, pets.length)) { setTab("pets"); } else { alert(`Your ${profile?.plan || 'free'} plan allows ${profile?.plan === 'plus' ? '3' : '1'} pet. Upgrade to add more!`); } }} style={{ ...btn(C.cardBorder, C.green), padding: "6px 14px", fontSize: 13, border: `1px solid ${C.green}` }}>+ Add Pet</button>
      </div>
      {pets.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 40 }}>🐾</div>
          <div style={{ color: C.text, fontWeight: 800, marginTop: 8 }}>No pets yet!</div>
          <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Tap "Add Pet" to get started</div>
        </div>
      )}
      {pets.map(pet => (
        <div key={pet.id} style={{ ...card, marginBottom: 14, cursor: "pointer" }} onClick={() => setTab("pets")}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar emoji={pet.type === "Cat" ? "🐱" : "🐶"} size={60} img={pet.photoURL} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{pet.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed} · {pet.age} · {pet.weight}</div>
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
function PetsTab({ user, profile }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
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

  const addPet = async () => {
    if (!form.name) return;
    await addDoc(collection(db, "pets"), {
      ...form, uid: user.uid,
      photoURL: photoPreview || "",
      vaccines: [], reminders: [],
      ownerEmail: user.email,
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
   <PetDetail pet={selectedPet} user={user} profile={profile} onBack={() => setSelectedPetId(null)} onDelete={() => deletePet(selectedPet.id)} />
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>My Pets 🐾</h2>
        <button style={btn(C.green)} onClick={() => setAdding(true)}>+ Add Pet</button>
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
              <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed} · {pet.age} · {pet.weight}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {(pet.vaccines || []).slice(0,3).map(v => <Badge key={v.id} text={"💉 " + v.name} color={C.green} />)}
              </div>
            </div>
            <div style={{ color: C.muted, fontSize: 18 }}>›</div>
          </div>
          {pet.nextVet && <div style={{ marginTop: 10, padding: "8px 12px", background: C.gold + "18", borderRadius: 10, color: C.gold, fontSize: 12, fontWeight: 700 }}>🗓️ Next vet: {pet.nextVet}</div>}
        </div>
      ))}
      {adding && (
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
          </div>
          <Field label="Pet Name" value={form.name} onChange={set("name")} placeholder="Buddy" required />
          <Field label="Type" as="select" value={form.type} onChange={set("type")} options={["Dog","Cat","Rabbit","Bird","Other"]} />
          <Field label="Breed" as="select" value={form.breed} onChange={set("breed")} options={form.type === "Cat" ? CAT_BREEDS : form.type === "Dog" ? DOG_BREEDS : ["Mixed","Other"]} />
          <Field label="Age" value={form.age} onChange={set("age")} placeholder="2 years" />
          <Field label="Weight" value={form.weight} onChange={set("weight")} placeholder="55 lbs" />
          <Field label="Feeding Schedule" value={form.feeding} onChange={set("feeding")} placeholder="e.g. 8am and 6pm, 1 cup each" />
          <Field label="Next Vet Visit" type="date" value={form.nextVet} onChange={set("nextVet")} />
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
function PetDetail({ pet, user, profile, onBack, onDelete }) {
  const [activeTab, setActiveTab] = useState("info");
  const [vaccines, setVaccines] = useState(pet.vaccines || []);
  const [reminders, setReminders] = useState(pet.reminders || []);
  const [vForm, setVForm] = useState({ name:"", date:"", nextDue:"", vet:"", notes:"" });
  const [rForm, setRForm] = useState({ title:"", date:"", time:"", repeat:"None", notes:"" });
  const [addingV, setAddingV] = useState(false);
  const [addingR, setAddingR] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [toast, setToast] = useState("");
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

  const saveVaccine = async () => {
    if (!vForm.name) return;
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
    updated = reminders.map(r => r.id === editingReminderId ? { ...rForm, id: editingReminderId, sent: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } : r);
    setEditingReminderId(null);
  } else {
    const newR = { ...rForm, id: Date.now().toString(), sent: false, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
    updated = [...reminders, newR];
  }
  setReminders(updated);
  await updateDoc(doc(db, "pets", pet.id), { reminders: updated });
  setRForm({ title: "", date: "", time: "", repeat: "None" });
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
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 16 }}>← Back to Pets</button>
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Avatar emoji={pet.type === "Cat" ? "🐱" : "🐶"} size={80} img={pendingPhoto || pet.photoURL} />
            <label style={{ background: C.cardBorder, border: `1px solid ${C.cardBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 11, padding: "6px 10px", display: "inline-block", textAlign: "center", color: C.muted, fontFamily: font, fontWeight: 700 }}>
              📷 Change Photo
              <input type="file" accept="image/*" onChange={handlePhotoSelect} style={{ display: "none" }} />
            </label>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 22 }}>{pet.name}</div>
            <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed} · {pet.age} · {pet.weight}</div>
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
        <button style={tabStyle("reminders")} onClick={() => setActiveTab("reminders")}>⏰ Reminders ({reminders.length})</button>
        <button style={tabStyle("calories")} onClick={() => setActiveTab("calories")}>🔢 Calories</button>
      </div>
      {activeTab === "info" && <EditPetInfo pet={pet} onDelete={onDelete} onSaved={() => showToast("✅ Pet info updated!")} />}
      {activeTab === "vaccines" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800 }}>Vaccine Records</div>
            <button style={{ ...btn(C.green), padding: "8px 16px", fontSize: 13 }} onClick={() => setAddingV(true)}>+ Add</button>
          </div>
          {vaccines.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 30 }}>No vaccines recorded yet</div>}
          {vaccines.map(v => (
            <div key={v.id} style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 800 }}>💉 {v.name}</div>
                  {v.date && <div style={{ color: C.muted, fontSize: 12 }}>Given: {v.date}</div>}
                  {v.nextDue && <div style={{ color: C.gold, fontSize: 12 }}>Next due: {v.nextDue}</div>}
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
              <Field label="Date Given" type="date" value={vForm.date} onChange={setV("date")} />
              <Field label="Next Due Date" type="date" value={vForm.nextDue} onChange={setV("nextDue")} />
              <Field label="Veterinarian" value={vForm.vet} onChange={setV("vet")} placeholder="Dr. Smith" />
              <Field label="Notes" as="textarea" value={vForm.notes} onChange={setV("notes")} placeholder="Any notes..." />
              <div style={{ display: "flex", gap: 10 }}>
                <button style={btn(C.green)} onClick={saveVaccine}>💾 Save</button>
                <button style={{ ...btn(C.cardBorder, C.muted) }} onClick={() => setAddingV(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {activeTab === "reminders" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800 }}>Reminders</div>
            <button style={{ ...btn(C.green), padding: "8px 16px", fontSize: 13 }} onClick={() => setAddingR(true)}>+ Add</button>
          </div>
          {reminders.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 30 }}>No reminders set yet</div>}
          {reminders.map(r => (
            <div key={r.id} style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ color: C.text, fontWeight: 800 }}>⏰ {r.title}</div>
                  {r.date && <div style={{ color: C.muted, fontSize: 12 }}>📅 {r.date} {r.time && "at " + r.time}</div>}
                  {r.repeat !== "None" && <Badge text={"🔁 " + r.repeat} color={C.gold} />}
                  {r.notes && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{r.notes}</div>}
                </div>
                <button onClick={() => {
  setRForm({ title: r.title, date: r.date, time: r.time, repeat: r.repeat, notes: r.notes });
  setEditingReminderId(r.id);
  setAddingR(true);
}} style={{ background: "none", border: "none", cursor: "pointer", color: C.green, fontSize: 16, marginRight: 8 }}>✏️</button>
<button onClick={() => deleteReminder(r.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 16 }}>🗑️</button>
              </div>
            </div>
          ))}
          {addingR && (
            <div style={{ ...card, marginTop: 12 }}>
              <h4 style={{ color: C.text, margin: "0 0 14px" }}>Add Reminder</h4>
              <Field label="Reminder Title" value={rForm.title} onChange={setR("title")} placeholder="e.g. Vet checkup, Flea treatment..." required />
              <Field label="Date" type="date" value={rForm.date} onChange={setR("date")} />
              <Field label="Time" type="time" value={rForm.time} onChange={setR("time")} />
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

// ─── Edit Pet Info ────────────────────────────────────────────────────────────
function EditPetInfo({ pet, onDelete, onSaved }) {
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
      <Field label="Type" as="select" value={form.type} onChange={set("type")} options={["Dog","Cat","Rabbit","Bird","Other"]} />
      <Field label="Breed" as="select" value={form.breed} onChange={set("breed")} options={form.type === "Cat" ? CAT_BREEDS : form.type === "Dog" ? DOG_BREEDS : ["Mixed","Other"]} />
      <Field label="Age" value={form.age} onChange={set("age")} placeholder="2 years" />
      <Field label="Weight" value={form.weight} onChange={set("weight")} placeholder="55 lbs" />
      <Field label="Feeding Schedule" value={form.feeding} onChange={set("feeding")} placeholder="8am and 6pm, 1 cup each" />
      <Field label="Next Vet Visit" type="date" value={form.nextVet} onChange={set("nextVet")} />
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
          <button onClick={() => setEditing(true)} style={{ background: C.green + "22", border: `1.5px solid ${C.green}`, borderRadius: 10, padding: "7px 16px", color: C.green, fontFamily: font, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
            ✏️ Edit Info
          </button>
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
      <button onClick={onDelete} style={{ ...btn(C.danger + "22", C.danger), border: `1px solid ${C.danger}`, width: "100%" }}>🗑️ Delete Pet</button>
    </div>
  );
}

// ─── Services Tab ─────────────────────────────────────────────────────────────
function ServicesTab({ profile }) {
  const [filterState, setFilterState] = useState(profile?.state || "");
  const [filterService, setFilterService] = useState("");
  const filtered = SEED_PROVIDERS.filter(p => (!filterState || p.state === filterState) && (!filterService || p.service === filterService));
  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Services Near You 🛎️</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Showing providers based on your location</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
        <div><span style={label}>State</span><select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ ...input, appearance: "none" }}><option value="">All States</option>{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><span style={label}>Service</span><select value={filterService} onChange={e => setFilterService(e.target.value)} style={{ ...input, appearance: "none" }}><option value="">All</option>{["Grooming","Dog Walking","Veterinary","Training","Boarding"].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      </div>
      {filtered.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No providers found. Try a different state!</div>}
      {filtered.map(p => (
        <div key={p.id} style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <Avatar emoji={p.logo} size={50} />
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 900, fontSize: 16 }}>{p.name}</div>
              <div style={{ color: C.muted, fontSize: 13 }}>📍 {p.city}, {p.state}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                <Badge text={p.service} color={C.green} />
                <Badge text={p.price} color={C.gold} />
                <Badge text={"⭐ " + p.rating + " (" + p.reviews + ")"} color={C.muted} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button style={{ ...btn(C.green), fontSize: 13, padding: "9px 18px" }}>Book Now</button>
            <a href={p.googleReview} target="_blank" rel="noreferrer" style={{ ...btn(C.cardBorder, C.muted), fontSize: 13, padding: "9px 18px", textDecoration: "none" }}>⭐ Reviews</a>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Smart Recipe Builder Tab ─────────────────────────────────────────────────
// Replaces RecipesTab in App.js
// Paste this after AITab function and before AdoptionTab
// Then change: {tab === "recipes" && isOwner && <RecipesTab profile={currentProfile} />}
// To:          {tab === "recipes" && isOwner && <RecipesTab profile={currentProfile} user={user} pets={pets} />}
// Also update PetsTab to pass pets up, OR load pets inside this component (we do it here)

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
    { id: "cucumber", label: "🥒 Cucumber", popular: false },
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

const HEALTH_CONDITIONS = [
  { id: "healthy", label: "✅ Healthy / Maintenance", default: true },
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

function RecipesTab({ profile, user }) {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [step, setStep] = useState(1); // 1=pet, 2=ingredients, 3=health, 4=result
  const [selected, setSelected] = useState({
    proteins: [], carbs: [], fats: [], veggies: [], fruits: [],
  });
  const [showAll, setShowAll] = useState({
    proteins: false, carbs: false, fats: false, veggies: false, fruits: false,
  });
  const [healthCondition, setHealthCondition] = useState("healthy");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [excludeIngredients, setExcludeIngredients] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recipe, setRecipe] = useState(null);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [viewSaved, setViewSaved] = useState(false);

  // Load pets
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

  // Load saved recipes
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
      // Max 2 fats
      if (category === "fats" && !isSelected && current.length >= 2) return prev;
      return {
        ...prev,
        [category]: isSelected ? current.filter(i => i !== id) : [...current, id],
      };
    });
  };

  const totalSelected = Object.values(selected).flat().length;

  const generateRecipe = async () => {
    if (!selectedPet || selected.proteins.length === 0) return;
    setGenerating(true);
    setRecipe(null);

    const petInfo = `${selectedPet.name}, ${selectedPet.type || "Dog"}, ${selectedPet.breed || "mixed breed"}, ${selectedPet.age || "adult"}, ${selectedPet.weight || "unknown weight"}`;
    const selectedIngredients = Object.entries(selected)
      .map(([cat, ids]) => {
        if (ids.length === 0) return null;
        const items = ids.map(id => INGREDIENTS[cat].find(i => i.id === id)?.label.replace(/[^\w\s,]/g, "").trim()).join(", ");
        return `${cat}: ${items}`;
      })
      .filter(Boolean)
      .join("\n");

    const healthLabel = HEALTH_CONDITIONS.find(h => h.id === healthCondition)?.label || "Healthy";
    const activityLabel = ACTIVITY_LEVELS.find(a => a.id === activityLevel)?.label || "Moderate";

    const prompt = `You are a veterinary nutritionist creating a balanced homemade pet food recipe.

Pet: ${petInfo}
Health condition: ${healthLabel}
Activity level: ${activityLabel}
Selected ingredients:
${selectedIngredients}
${excludeIngredients ? `Ingredients to exclude: ${excludeIngredients}` : ""}

Create a single balanced recipe using ONLY the selected ingredients. Return your response in this EXACT JSON format (no markdown, no backticks):
{
  "name": "Recipe name",
  "emoji": "single emoji",
  "prepTime": "X minutes",
  "servings": "X days worth",
  "dailyAmount": "X cups or X grams per day",
  "calories": "approximately X kcal per day",
  "ingredients": [
    {"item": "ingredient name", "amount": "X grams or cups", "note": "optional note"}
  ],
  "steps": [
    "Step 1 description",
    "Step 2 description"
  ],
  "nutrition": {
    "protein": "X%",
    "fat": "X%",
    "carbs": "X%",
    "moisture": "X%"
  },
  "tips": "One helpful tip specific to this pet and recipe",
  "disclaimer": "Always consult your veterinarian before changing your pet's diet."
}`;

    try {
      const response = await fetch(
        "https://us-central1-mypetdex-c4315.cloudfunctions.net/aiProxy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );
      const data = await response.json();
      const text = data?.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setRecipe(parsed);
      setStep(4);
    } catch (err) {
      setRecipe({ error: "Could not generate recipe. Please try again." });
      setStep(4);
    }
    setGenerating(false);
  };

  const saveRecipe = async () => {
    if (!recipe || !user) return;
    await addDoc(collection(db, "savedRecipes"), {
      ...recipe,
      uid: user.uid,
      petId: selectedPet?.id,
      petName: selectedPet?.name,
      createdAt: new Date().toISOString(),
    });
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

  // Gate for free users
  if (!hasFeature(profile, 'recipes')) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Recipe Builder 🍽️</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>AI-powered balanced meal generator</p>
        <UpgradePrompt feature="Recipe Builder" requiredPlan="Plus" />
      </div>
    );
  }

  // Saved recipes view
  if (viewSaved) return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={() => setViewSaved(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font }}>← Back</button>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 20, margin: 0 }}>Saved Recipes 📚</h2>
      </div>
      {savedRecipes.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 40, color: C.muted }}>No saved recipes yet. Generate one!</div>
      )}
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

  // Result view
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
          {/* Header */}
          <div style={{ ...card, marginBottom: 14, background: `linear-gradient(135deg, ${C.card}, #1a2e1e)` }}>
            <div style={{ fontSize: 48, textAlign: "center", marginBottom: 8 }}>{recipe.emoji}</div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 22, textAlign: "center", marginBottom: 4 }}>{recipe.name}</div>
            <div style={{ color: C.muted, fontSize: 13, textAlign: "center", marginBottom: 16 }}>Made for {selectedPet?.name} · {recipe.prepTime}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["🔥 Daily Calories", recipe.calories], ["🍽️ Daily Amount", recipe.dailyAmount], ["📦 Servings", recipe.servings], ["⏱️ Prep Time", recipe.prepTime]].map(([k, v]) => (
                <div key={k} style={{ background: C.inputBg, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{k}</div>
                  <div style={{ color: C.green, fontWeight: 800, fontSize: 13, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Nutrition */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>Nutrition Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[["Protein", recipe.nutrition?.protein, C.green], ["Fat", recipe.nutrition?.fat, C.gold], ["Carbs", recipe.nutrition?.carbs, "#a78bfa"], ["Moisture", recipe.nutrition?.moisture, "#38bdf8"]].map(([k, v, color]) => (
                <div key={k} style={{ background: C.inputBg, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ color, fontWeight: 900, fontSize: 16 }}>{v}</div>
                  <div style={{ color: C.muted, fontSize: 10, marginTop: 2 }}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🛒 Ingredients</div>
            {(recipe.ingredients || []).map((ing, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < recipe.ingredients.length - 1 ? `1px solid ${C.cardBorder}` : "none" }}>
                <span style={{ color: C.text, fontSize: 13 }}>{ing.item}</span>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: C.green, fontWeight: 700, fontSize: 13 }}>{ing.amount}</span>
                  {ing.note && <div style={{ color: C.muted, fontSize: 11 }}>{ing.note}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>👨‍🍳 Preparation</div>
            {(recipe.steps || []).map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.green, color: "#0F1A14", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, flexShrink: 0 }}>{i + 1}</div>
                <span style={{ color: C.text, fontSize: 13, lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
          </div>

          {/* Tip */}
          {recipe.tips && (
            <div style={{ ...card, marginBottom: 14, background: C.gold + "11", border: `1px solid ${C.gold}33` }}>
              <div style={{ color: C.gold, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>💡 Pro Tip</div>
              <div style={{ color: C.text, fontSize: 13 }}>{recipe.tips}</div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ ...card, marginBottom: 14, background: C.danger + "11", border: `1px solid ${C.danger}22` }}>
            <div style={{ color: C.muted, fontSize: 12 }}>⚕️ {recipe.disclaimer}</div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button onClick={saveRecipe} style={{ ...btn(C.green), flex: 1 }}>💾 Save Recipe</button>
            <button onClick={resetBuilder} style={{ ...btn(C.cardBorder, C.muted), flex: 1 }}>🔄 New Recipe</button>
          </div>
        </div>
      ) : null}
    </div>
  );

  // Builder steps 1-3
  const stepTitles = ["", "Which pet?", "Pick ingredients", "Health & lifestyle"];
  const stepSubs = ["", "Select the pet you're cooking for", "Choose what you have available", "Tell us about your pet's needs"];

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
              <button key={item.id} onClick={() => toggleIngredient(category, item.id)} style={{
                background: isSelected ? C.green : C.cardBorder,
                color: isSelected ? "#0F1A14" : C.muted,
                border: `1.5px solid ${isSelected ? C.green : C.cardBorder}`,
                borderRadius: 20,
                padding: "7px 14px",
                fontFamily: font,
                fontWeight: isSelected ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.15s",
              }}>
                {item.label}
              </button>
            );
          })}
          {hasMore && (
            <button onClick={() => setShowAll(prev => ({ ...prev, [category]: !prev[category] }))} style={{
              background: "none",
              border: `1.5px dashed ${C.cardBorder}`,
              color: C.muted,
              borderRadius: 20,
              padding: "7px 14px",
              fontFamily: font,
              fontSize: 12,
              cursor: "pointer",
            }}>
              {showAll[category] ? "Show less ↑" : "More ↓"}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>Recipe Builder 🍽️</h2>
        <button onClick={() => setViewSaved(true)} style={{ background: "none", border: `1px solid ${C.cardBorder}`, borderRadius: 8, padding: "5px 12px", color: C.muted, fontFamily: font, fontSize: 12, cursor: "pointer" }}>
          📚 Saved ({savedRecipes.length})
        </button>
      </div>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>AI-powered balanced meals for your pet</p>

      {/* Step indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: step >= s ? C.green : C.cardBorder,
            transition: "background 0.3s",
          }} />
        ))}
      </div>

      {/* Step title */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{stepTitles[step]}</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 2 }}>{stepSubs[step]}</div>
      </div>

      {/* STEP 1 — Pet selection */}
      {step === 1 && (
        <div>
          {pets.length === 0 ? (
            <div style={{ ...card, textAlign: "center", padding: 40, color: C.muted }}>Add a pet first to generate recipes!</div>
          ) : (
            <div>
              {pets.map(pet => (
                <div key={pet.id} onClick={() => setSelectedPet(pet)} style={{
                  ...card, marginBottom: 12, cursor: "pointer",
                  border: `2px solid ${selectedPet?.id === pet.id ? C.green : C.cardBorder}`,
                  background: selectedPet?.id === pet.id ? C.green + "11" : C.card,
                }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <Avatar emoji={pet.type === "Cat" ? "🐱" : "🐶"} size={52} img={pet.photoURL} />
                    <div>
                      <div style={{ color: C.text, fontWeight: 900, fontSize: 17 }}>{pet.name}</div>
                      <div style={{ color: C.muted, fontSize: 13 }}>{pet.breed} · {pet.age} · {pet.weight}</div>
                    </div>
                    {selectedPet?.id === pet.id && <div style={{ marginLeft: "auto", color: C.green, fontSize: 22 }}>✓</div>}
                  </div>
                </div>
              ))}
              <button onClick={() => selectedPet && setStep(2)} disabled={!selectedPet} style={{ ...btn(C.green), width: "100%", marginTop: 8, opacity: selectedPet ? 1 : 0.4 }}>
                Continue →
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2 — Ingredients */}
      {step === 2 && (
        <div>
          <div style={{ ...card, marginBottom: 20, background: C.green + "11", border: `1px solid ${C.green}33` }}>
            <div style={{ color: C.green, fontSize: 13, fontWeight: 700 }}>Building for: {selectedPet?.name} ({selectedPet?.weight})</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Select what you have available. Portions will be calculated by AI.</div>
          </div>

          {renderIngredientSection("proteins", "🥩", "Proteins (required)")}
          {renderIngredientSection("carbs", "🍚", "Carbs")}
          {renderIngredientSection("fats", "🫒", "Fats (max 2)")}
          {renderIngredientSection("veggies", "🥦", "Vegetables")}
          {renderIngredientSection("fruits", "🍎", "Fruits")}

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 8 }}>🚫 Any ingredients to exclude?</div>
            <input
              value={excludeIngredients}
              onChange={e => setExcludeIngredients(e.target.value)}
              placeholder="e.g. dairy, fish, nuts..."
              style={{
                background: C.inputBg,
                border: `1.5px solid ${C.cardBorder}`,
                borderRadius: 10,
                padding: "11px 14px",
                color: C.text,
                fontFamily: font,
                fontSize: 14,
                width: "100%",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(1)} style={{ ...btn(C.cardBorder, C.muted) }}>← Back</button>
            <button onClick={() => selected.proteins.length > 0 && setStep(3)} disabled={selected.proteins.length === 0} style={{ ...btn(C.green), flex: 1, opacity: selected.proteins.length > 0 ? 1 : 0.4 }}>
              Continue ({totalSelected} selected) →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Health & lifestyle */}
      {step === 3 && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 10 }}>Health condition</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {HEALTH_CONDITIONS.map(h => (
                <div key={h.id} onClick={() => setHealthCondition(h.id)} style={{
                  ...card,
                  cursor: "pointer",
                  padding: "12px 16px",
                  border: `2px solid ${healthCondition === h.id ? C.green : C.cardBorder}`,
                  background: healthCondition === h.id ? C.green + "11" : C.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
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
                <div key={a.id} onClick={() => setActivityLevel(a.id)} style={{
                  ...card,
                  cursor: "pointer",
                  padding: "12px 16px",
                  border: `2px solid ${activityLevel === a.id ? C.green : C.cardBorder}`,
                  background: activityLevel === a.id ? C.green + "11" : C.card,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <span style={{ color: C.text, fontSize: 14 }}>{a.label}</span>
                  {activityLevel === a.id && <span style={{ color: C.green }}>✓</span>}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{ ...btn(C.cardBorder, C.muted) }}>← Back</button>
            <button onClick={generateRecipe} disabled={generating} style={{ ...btn(C.green), flex: 1 }}>
              {generating ? "Generating recipe... 🤖" : "✨ Generate Recipe"}
            </button>
          </div>

          {generating && (
            <div style={{ ...card, marginTop: 16, textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
              <div style={{ color: C.green, fontWeight: 800, fontSize: 15 }}>Creating {selectedPet?.name}'s recipe...</div>
              <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Calculating portions based on weight & health needs</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ─── AI Assistant Tab ─────────────────────────────────────────────────────────
// Add this function anywhere in App.js (e.g. after RecipesTab)
// Make sure hasFeature and UpgradePrompt are already imported from './planUtils'

function AITab({ profile, user }) {
  const [pets, setPets] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [petsLoaded, setPetsLoaded] = useState(false);
  const messagesEndRef = useRef(null);

  // Load pets for context
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

  // Set greeting message once pets are loaded
  useEffect(() => {
    if (!petsLoaded) return;
    const firstName = profile?.name?.split(" ")[0] || "there";
    let greeting = "";
    if (pets.length === 0) {
      greeting = `Hi ${firstName}! 🐾 I'm your MyPetDex AI assistant. Add a pet to your profile and I can give you personalized advice!`;
    } else if (pets.length === 1) {
      const pet = pets[0];
      greeting = `Hi ${firstName}! 🐾 How can I help you and ${pet.name} today? I'm here for all things ${pet.breed || pet.type} care!`;
    } else {
      const petNames = pets.map(p => p.name).join(", ");
      greeting = `Hi ${firstName}! 🐾 How can I help you and your pets (${petNames}) today?`;
    }
    setMessages([{ role: "assistant", content: greeting }]);
  }, [petsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build system prompt with pet context
  const buildSystemPrompt = () => {
    const firstName = profile?.name?.split(" ")[0] || "the user";
    let petContext = "";
    if (pets.length === 0) {
      petContext = "The user has not added any pets yet.";
    } else {
      petContext = pets.map(p =>
        `- ${p.name}: ${p.type}${p.breed ? `, ${p.breed}` : ""}${p.age ? `, age ${p.age}` : ""}${p.weight ? `, ${p.weight}` : ""}${p.nextVet ? `, next vet: ${p.nextVet}` : ""}${p.notes ? `, notes: ${p.notes}` : ""}`
      ).join("\n");
    }
    return `You are a warm, knowledgeable pet care assistant for MyPetDex. You are talking to ${firstName}.

Their pets:
${petContext}

Guidelines:
- Always reference the user's actual pets by name when relevant
- Give breed-specific advice when you know the breed
- Be warm, friendly, and concise — this is a mobile app
- Use relevant emojis sparingly
- If asked about medical emergencies, always recommend seeing a vet immediately
- Do not make up medications, dosages, or diagnoses
- Keep responses under 150 words unless a detailed explanation is truly needed`;
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch(
        "https://us-central1-mypetdex-c4315.cloudfunctions.net/aiProxy",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: buildSystemPrompt(),
            messages: newMessages
              .filter(m => m.role !== "assistant" || newMessages.indexOf(m) > 0)
              .map(m => ({ role: m.role, content: m.content })),
          }),
        }
      );
      const data = await response.json();
      const reply = data?.content?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Couldn't connect. Please check your connection and try again." }]);
    }
    setLoading(false);
  };

  // Gate for free users
  if (!hasFeature(profile, 'ai')) {
    return (
      <div style={{ padding: 24 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>AI Assistant 🤖</h2>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 24 }}>Your personal pet care expert</p>
        <UpgradePrompt
          feature="AI Assistant"
          requiredPlan="Plus"
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, margin: 0 }}>AI Assistant 🤖</h2>
        <p style={{ color: C.muted, fontSize: 13, margin: "4px 0 0" }}>
          Personalized advice for {pets.length > 0 ? pets.map(p => p.name).join(" & ") : "your pets"}
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        paddingBottom: 12,
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "82%",
              padding: "12px 16px",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "user"
                ? C.green
                : C.card,
              border: msg.role === "assistant" ? `1px solid ${C.cardBorder}` : "none",
              color: msg.role === "user" ? "#0F1A14" : C.text,
              fontFamily: font,
              fontSize: 14,
              fontWeight: msg.role === "user" ? 700 : 400,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "12px 16px",
              borderRadius: "18px 18px 18px 4px",
              background: C.card,
              border: `1px solid ${C.cardBorder}`,
              color: C.muted,
              fontFamily: font,
              fontSize: 14,
            }}>
              <style>{`@keyframes blink { 0%,80%,100%{opacity:0} 40%{opacity:1} }`}</style>
              <span style={{ animation: "blink 1.4s infinite", animationDelay: "0s" }}>●</span>
              <span style={{ animation: "blink 1.4s infinite", animationDelay: "0.2s" }}>●</span>
              <span style={{ animation: "blink 1.4s infinite", animationDelay: "0.4s" }}>●</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        display: "flex",
        gap: 10,
        paddingTop: 12,
        borderTop: `1px solid ${C.cardBorder}`,
      }}>
      <input
  value={input}
  onChange={e => setInput(e.target.value)}
  onKeyDown={e => e.key === "Enter" && sendMessage()}
  placeholder={`Ask about ${pets[0]?.name || "your pet"}...`}
  style={{
    background: C.inputBg,
    border: `1.5px solid ${C.cardBorder}`,
    borderRadius: 24,
    padding: "12px 18px",
    color: C.text,
    fontFamily: font,
    fontSize: 14,
    flex: 1,
    boxSizing: "border-box",
    outline: "none",
  }}
/>
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            ...btn(C.green),
            borderRadius: "50%",
            width: 46,
            height: 46,
            padding: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            opacity: loading || !input.trim() ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
// ─── Calorie Calculator Tab ────────────────────────────────────────────────────
// Add this function anywhere in App.js (e.g. after RecipesTab)
// Then add it as a tab inside PetDetail

function CalcTab({ pet, profile }) {
  const [neutered, setNeutered] = useState(true);
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [healthGoal, setHealthGoal] = useState("maintain");
  const [lifeStage, setLifeStage] = useState("adult");
  const [result, setResult] = useState(null);

  // Determine life stage from pet age automatically
  useEffect(() => {
    const age = pet?.age?.toLowerCase() || "";
    const isdog = (pet?.type || "Dog") !== "Cat";
    if (age.includes("puppy") || age.includes("kitten") || 
        age.includes("month") || age === "0" || age.includes("wk") ||
        (parseFloat(age) < 1 && age !== "")) {
      setLifeStage("puppy");
    } else if (parseFloat(age) >= (isdog ? 7 : 10)) {
      setLifeStage("senior");
    } else {
      setLifeStage("adult");
    }
  }, [pet]);

  // Parse weight to kg
  const parseWeightKg = () => {
    const w = pet?.weight || "";
    const num = parseFloat(w);
    if (isNaN(num)) return null;
    if (w.toLowerCase().includes("kg")) return num;
    return num * 0.453592; // lbs to kg
  };

  // NRC/AAFCO Formula
  // RER = 70 × (body weight in kg)^0.75
  // MER = RER × life stage multiplier
  const calculate = () => {
    const weightKg = parseWeightKg();
    if (!weightKg || weightKg <= 0) {
      setResult({ error: "Could not parse weight. Make sure pet weight is set (e.g. '55 lbs' or '25 kg')." });
      return;
    }

    const RER = 70 * Math.pow(weightKg, 0.75);
    const isCat = (pet?.type || "Dog") === "Cat";

    // Life stage multipliers (NRC/AAFCO standard)
    let multiplier = 1.6; // default adult intact
    if (lifeStage === "puppy") {
      multiplier = weightKg < 2 ? 3.0 : weightKg < 10 ? 2.5 : 2.0;
    } else if (lifeStage === "senior") {
      multiplier = neutered ? 1.2 : 1.4;
    } else {
      // Adult
      if (neutered) {
        multiplier = activityLevel === "low" ? 1.2
          : activityLevel === "moderate" ? 1.4
          : activityLevel === "active" ? 1.6
          : 1.8;
      } else {
        multiplier = activityLevel === "low" ? 1.4
          : activityLevel === "moderate" ? 1.6
          : activityLevel === "active" ? 1.8
          : 2.0;
      }
    }

    // Health goal adjustments
    if (healthGoal === "lose") multiplier = Math.max(multiplier * 0.8, 1.0);
    if (healthGoal === "gain") multiplier *= 1.2;
    if (healthGoal === "pregnant") multiplier = 2.0;
    if (healthGoal === "nursing") multiplier = isCat ? 2.5 : 3.0;

    const dailyKcal = Math.round(RER * multiplier);

    // Common food portions
    // Dry kibble: ~3.5 kcal/gram average
    // Wet food: ~1 kcal/gram average  
    // Raw/homemade: ~1.2 kcal/gram average
    const kibbleCups = (dailyKcal / 350).toFixed(1); // ~350 kcal/cup
    const wetFoodGrams = Math.round(dailyKcal / 1.0);
    const rawGrams = Math.round(dailyKcal / 1.2);

    // Meals per day
    const mealsPerDay = lifeStage === "puppy" ? 3 : 2;
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

  if (!hasFeature(profile, 'ai')) {
    return (
      <div style={{ padding: 16 }}>
        <UpgradePrompt feature="Calorie Calculator" requiredPlan="Plus" />
      </div>
    );
  }

  return (
    <div>
      {/* Pet weight display */}
      <div style={{ ...card, marginBottom: 16, background: C.green + "11", border: `1px solid ${C.green}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>📊 {pet.name}'s Weight</div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 22, marginTop: 2 }}>{pet.weight || "Not set"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: C.muted, fontSize: 11 }}>Formula</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>NRC/AAFCO</div>
            <div style={{ color: C.muted, fontSize: 11 }}>RER = 70 × kg^0.75</div>
          </div>
        </div>
        {!pet.weight && (
          <div style={{ color: C.gold, fontSize: 12, marginTop: 8 }}>⚠️ Add weight to pet profile for accurate results</div>
        )}
      </div>

      {/* Life stage */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Life Stage</div>
        <div style={{ display: "flex", gap: 8 }}>
          {lifeStageOptions.map(o => (
            <button key={o.id} onClick={() => setLifeStage(o.id)} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, fontFamily: font, fontSize: 12,
              fontWeight: lifeStage === o.id ? 800 : 600,
              background: lifeStage === o.id ? C.green : C.cardBorder,
              color: lifeStage === o.id ? "#0F1A14" : C.muted,
              border: `1.5px solid ${lifeStage === o.id ? C.green : C.cardBorder}`,
              cursor: "pointer",
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      {/* Neutered */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Reproductive Status</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[["true", "✂️ Spayed/Neutered"], ["false", "🔵 Intact"]].map(([val, lbl]) => (
            <button key={val} onClick={() => setNeutered(val === "true")} style={{
              flex: 1, padding: "8px 4px", borderRadius: 10, fontFamily: font, fontSize: 12,
              fontWeight: neutered === (val === "true") ? 800 : 600,
              background: neutered === (val === "true") ? C.green : C.cardBorder,
              color: neutered === (val === "true") ? "#0F1A14" : C.muted,
              border: `1.5px solid ${neutered === (val === "true") ? C.green : C.cardBorder}`,
              cursor: "pointer",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* Activity */}
      {lifeStage === "adult" && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Activity Level</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {activityOptions.map(o => (
              <button key={o.id} onClick={() => setActivityLevel(o.id)} style={{
                padding: "10px 8px", borderRadius: 10, fontFamily: font, fontSize: 12,
                fontWeight: activityLevel === o.id ? 800 : 600,
                background: activityLevel === o.id ? C.green : C.cardBorder,
                color: activityLevel === o.id ? "#0F1A14" : C.muted,
                border: `1.5px solid ${activityLevel === o.id ? C.green : C.cardBorder}`,
                cursor: "pointer", textAlign: "left",
              }}>
                <div>{o.label}</div>
                <div style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Health goal */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 13, marginBottom: 8 }}>Goal</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {healthGoalOptions.map(o => (
            <button key={o.id} onClick={() => setHealthGoal(o.id)} style={{
              padding: "10px 14px", borderRadius: 10, fontFamily: font, fontSize: 13,
              fontWeight: healthGoal === o.id ? 800 : 600,
              background: healthGoal === o.id ? C.green + "22" : "none",
              color: healthGoal === o.id ? C.green : C.muted,
              border: `1.5px solid ${healthGoal === o.id ? C.green : C.cardBorder}`,
              cursor: "pointer", textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              {o.label}
              {healthGoal === o.id && <span>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <button onClick={calculate} style={{ ...btn(C.green), width: "100%", fontSize: 16, marginBottom: 20 }}>
        🔢 Calculate Daily Calories
      </button>

      {/* Results */}
      {result?.error && (
        <div style={{ ...card, border: `1px solid ${C.danger}`, color: C.danger, fontSize: 13, padding: 16 }}>
          {result.error}
        </div>
      )}

      {result && !result.error && (
        <div>
          {/* Main result */}
          <div style={{ ...card, marginBottom: 14, background: `linear-gradient(135deg, ${C.card}, #1a2e1e)`, textAlign: "center" }}>
            <div style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Daily Calories for {pet.name}</div>
            <div style={{ color: C.green, fontWeight: 900, fontSize: 52, lineHeight: 1, margin: "12px 0 4px" }}>{result.MER}</div>
            <div style={{ color: C.muted, fontSize: 13 }}>kcal / day</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
              RER: {result.RER} kcal × {result.multiplier} multiplier
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <span style={{ background: C.green + "22", color: C.green, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                {result.weightKg} kg / {result.weightLbs} lbs
              </span>
              <span style={{ background: C.gold + "22", color: C.gold, borderRadius: 8, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                {result.mealsPerDay}x meals/day
              </span>
            </div>
          </div>

          {/* Feeding guide */}
          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ color: C.text, fontWeight: 800, fontSize: 14, marginBottom: 12 }}>🍽️ Feeding Guide</div>
            {[
              {
                icon: "🥣",
                type: "Dry Kibble",
                total: `${result.kibbleCups} cups/day`,
                perMeal: `${result.kibblePerMeal} cups per meal`,
                note: "~350 kcal/cup average",
              },
              {
                icon: "🥫",
                type: "Wet Food",
                total: `${result.wetFoodGrams}g / day`,
                perMeal: `${Math.round(result.wetFoodGrams / result.mealsPerDay)}g per meal`,
                note: "~1 kcal/gram average",
              },
              {
                icon: "🥩",
                type: "Raw / Homemade",
                total: `${result.rawGrams}g / day`,
                perMeal: `${result.rawPerMeal}g per meal`,
                note: "~1.2 kcal/gram average",
              },
            ].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.cardBorder}` : "none" }}>
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

          {/* Goal tip */}
          {healthGoal === "lose" && (
            <div style={{ ...card, marginBottom: 14, background: C.gold + "11", border: `1px solid ${C.gold}33` }}>
              <div style={{ color: C.gold, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>⬇️ Weight Loss Mode</div>
              <div style={{ color: C.text, fontSize: 13 }}>Calories reduced by 20%. Monitor weight weekly and adjust if needed. Aim for 1-2% body weight loss per week.</div>
            </div>
          )}
          {healthGoal === "gain" && (
            <div style={{ ...card, marginBottom: 14, background: C.green + "11", border: `1px solid ${C.green}33` }}>
              <div style={{ color: C.green, fontWeight: 800, fontSize: 13, marginBottom: 4 }}>⬆️ Weight Gain Mode</div>
              <div style={{ color: C.text, fontSize: 13 }}>Calories increased by 20%. Add extra meals rather than larger portions. Recheck weight every 2 weeks.</div>
            </div>
          )}

          {/* Disclaimer */}
          <div style={{ ...card, background: C.danger + "08", border: `1px solid ${C.danger}22`, marginBottom: 14 }}>
            <div style={{ color: C.muted, fontSize: 11 }}>⚕️ This calculator uses the NRC/AAFCO Resting Energy Requirement (RER) formula. Results are estimates — always consult your veterinarian before changing your pet's diet, especially for weight management or health conditions.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Adoption Tab ─────────────────────────────────────────────────────────────
function AdoptionTab({ profile }) {
  const [filterState, setFilterState] = useState(profile?.state || "");
  const [shelters, setShelters] = useState([]);
  const [shelterPets, setShelterPets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "shelter"), where("status", "==", "approved"));
    const unsub1 = onSnapshot(q, snap => setShelters(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsub2 = onSnapshot(collection(db, "shelterPets"), snap => {
      const petsMap = {};
      snap.docs.forEach(d => {
        const pet = { id: d.id, ...d.data() };
        if (!petsMap[pet.uid]) petsMap[pet.uid] = [];
        petsMap[pet.uid].push(pet);
      });
      setShelterPets(petsMap);
      setLoading(false);
    });
    return () => { unsub1(); unsub2(); };
  }, []);

  const filtered = shelters.filter(s => !filterState || s.state === filterState);

  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Adopt a Pet ❤️</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Verified shelters — free access for all shelters</p>
      <div style={{ marginBottom: 18 }}><span style={label}>Filter by State</span><select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ ...input, appearance: "none" }}><option value="">All States</option>{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      {loading && <Spinner />}
      {!loading && filtered.map(shelter => {
        const pets = shelterPets[shelter.uid] || [];
        return (
          <div key={shelter.id} style={{ ...card, marginBottom: 16 }}>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 16, marginBottom: 2 }}>🏠 {shelter.shelterName || shelter.name}</div>
            <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>📍 {shelter.city}, {shelter.state} <Badge text="Verified" color={C.green} /></div>
            {pets.length === 0 && <div style={{ color: C.muted, fontSize: 13, marginBottom: 8 }}>No pets listed yet.</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {pets.map(pet => (
                <div key={pet.id} style={{ background: C.inputBg, borderRadius: 12, padding: 14, border: `1px solid ${C.cardBorder}` }}>
                  <div style={{ fontSize: 32, textAlign: "center" }}>{pet.type === "Cat" ? "🐈" : "🐕"}</div>
                  <div style={{ color: C.text, fontWeight: 800, fontSize: 15, textAlign: "center" }}>{pet.name}</div>
                  <div style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>{pet.breed}</div>
                  <div style={{ color: C.muted, fontSize: 12, textAlign: "center", marginBottom: 10 }}>Age: {pet.age}</div>
                  <button style={{ ...btn(C.green), width: "100%", padding: "8px 0", fontSize: 12 }}>Inquire 🐾</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {!loading && filtered.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No approved shelters found in this state yet. Check back soon!</div>}
    </div>
  );
}

// ─── Provider Profile ─────────────────────────────────────────────────────────
function ProviderProfile({ profile }) {
  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>My Business Profile 📋</h2>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
          <Avatar emoji="🛎️" size={56} />
          <div>
            <div style={{ color: C.text, fontWeight: 900, fontSize: 18 }}>{profile?.businessName || "Your Business"}</div>
            <div style={{ color: C.muted, fontSize: 13 }}>📍 {profile?.city}, {profile?.state}</div>
            <Badge text={profile?.service || "Service"} color={C.green} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["Price Range", profile?.priceRange || "--"],["Rating","New ⭐"],["Bookings","0"],["Reviews","0"]].map(([k,v]) => (
            <div key={k} style={{ background: C.inputBg, borderRadius: 10, padding: 12 }}>
              <div style={{ color: C.muted, fontSize: 11, fontWeight: 700 }}>{k}</div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...card }}>
        <div style={{ color: C.gold, fontWeight: 700, fontSize: 13 }}>30-Day Free Trial Active</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>After your trial, you only pay 10-15% commission on completed bookings. No monthly fees!</div>
      </div>
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

// ─── Delete Account Button ────────────────────────────────────────────────────
function DeleteAccountButton({ user, onLogout }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true); setError("");
    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(user);
      onLogout();
    } catch (e) {
      if (e.code === "auth/requires-recent-login") {
        setError("For security, please sign out and sign back in before deleting your account.");
      } else {
        setError("Could not delete account. Please try again.");
      }
    }
    setDeleting(false);
  };

  if (!confirming) return (
    <button onClick={() => setConfirming(true)} style={{ ...btn(C.danger + "11", C.danger), border: `1px solid ${C.danger}44`, width: "100%", marginBottom: 10 }}>
      🗑️ Delete My Account
    </button>
  );

  return (
    <div style={{ ...card, border: `1.5px solid ${C.danger}`, marginBottom: 10 }}>
      <div style={{ color: C.danger, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>⚠️ Delete Account</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>This will permanently delete your account and all your data. This cannot be undone!</div>
      {error && <div style={{ color: C.danger, fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleDelete} disabled={deleting} style={{ ...btn(C.danger, "#fff"), flex: 1 }}>
          {deleting ? "Deleting..." : "Yes, Delete Everything"}
        </button>
        <button onClick={() => setConfirming(false)} style={{ ...btn(C.cardBorder, C.muted) }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ user, profile, onProfileUpdate, onLogout }) {
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
        <div style={{ color: C.green, fontWeight: 900, fontSize: 15, marginBottom: 6 }}>🔒 Your Data is 100% Private</div>
        <div style={{ color: C.text, fontSize: 13, lineHeight: 1.7 }}>All your personal information and your pet's details are stored securely and are never shared with anyone — not advertisers, not third parties, not anyone.</div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>What we collect</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>We collect your name, email, city, state, and pet information solely to provide our service. We do NOT collect payment info, government IDs, or precise location.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>How we use your data</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Your data is used only to provide pet care services, show local providers, and maintain your pet health records. We never sell your data to third parties.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Your rights</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>You can access, edit, or delete your data at any time. To delete your account, contact us at help@mypetdex.app</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Security</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Your data is protected by Firebase Authentication, Firestore Security Rules, and HTTPS encryption. Only you can access your data.</div></div>
      <div style={{ ...card }}><div style={{ color: C.muted, fontSize: 12 }}>Last updated: March 14, 2026 · Contact: help@mypetdex.app</div></div>
    </div>
  );

  if (section === "terms") return (
    <div>
      <button onClick={() => setSection("main")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: font, marginBottom: 16 }}>← Back</button>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Terms of Service 📋</h2>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Acceptance</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>By using MyPetDex, you agree to these terms. MyPetDex is a pet care management platform currently in beta.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Medical Disclaimer</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>MyPetDex is NOT a substitute for professional veterinary advice. Always consult a licensed veterinarian for medical decisions about your pet.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Service Providers</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>Service providers on MyPetDex are independent businesses. MyPetDex does not guarantee the quality of any service. Always verify credentials before booking.</div></div>
      <div style={{ ...card, marginBottom: 14 }}><div style={{ color: C.green, fontWeight: 800, marginBottom: 8 }}>Acceptable Use</div><div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>You agree not to use MyPetDex for illegal purposes, upload false information, or attempt to access other users' data.</div></div>
      <div style={{ ...card }}><div style={{ color: C.muted, fontSize: 12 }}>Last updated: March 14, 2026 · Contact: help@mypetdex.app</div></div>
    </div>
  );

  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 18 }}>Settings ⚙️</h2>
      <div style={{ ...card, marginBottom: 14, background: C.green + "11", border: `1px solid ${C.green}33` }}>
        <div style={{ color: C.green, fontWeight: 800, fontSize: 13 }}>🔒 Your Privacy is Protected</div>
        <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Your personal details and pet information are private and never shared with anyone.</div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ color: C.text, fontWeight: 800, fontSize: 15 }}>My Profile</div>
          {!editing && (
            <button onClick={() => setEditing(true)} style={{ background: C.green + "22", border: `1.5px solid ${C.green}`, borderRadius: 10, padding: "7px 16px", color: C.green, fontFamily: font, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
          <span style={{ color: C.muted, fontSize: 13 }}>Account Type</span>
          <span style={{ color: C.green, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{profile?.role}</span>
        </div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Legal</div>
        <div onClick={() => setSection("privacy")} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.cardBorder}`, cursor: "pointer" }}>
          <span style={{ color: C.text, fontSize: 13 }}>🔒 Privacy Policy</span><span style={{ color: C.muted }}>›</span>
        </div>
        <div onClick={() => setSection("terms")} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", cursor: "pointer" }}>
          <span style={{ color: C.text, fontSize: 13 }}>📋 Terms of Service</span><span style={{ color: C.muted }}>›</span>
        </div>
      </div>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>Contact Us</div>
        <div style={{ color: C.muted, fontSize: 13 }}>📧 help@mypetdex.app</div>
        <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>🌐 mypetdex.app</div>
      </div>
      <DeleteAccountButton user={user} onLogout={onLogout} />
      <button onClick={onLogout} style={{ ...btn(C.danger + "22", C.danger), border: `1px solid ${C.danger}`, width: "100%", marginTop: 10 }}>Sign Out</button>
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
          <Field label="Type" as="select" value={form.type} onChange={set("type")} options={["Dog","Cat","Rabbit","Bird","Other"]} />
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