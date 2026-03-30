import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  deleteUser,
} from "firebase/auth";
import {
  doc, setDoc, getDoc, collection, addDoc,
  updateDoc, deleteDoc, onSnapshot, query, where
} from "firebase/firestore"; 
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
const DOG_RECIPES = [
  { id:1, name:"Chicken & Rice Bowl", time:"25 min", emoji:"🍚", ingredients:["1 cup cooked chicken","1/2 cup brown rice","1 carrot (diced)","1/2 cup peas"], steps:["Cook chicken thoroughly","Boil rice until soft","Steam carrots and peas","Mix all together, cool before serving"] },
  { id:2, name:"Peanut Butter Treats", time:"15 min", emoji:"🥜", ingredients:["1 cup oat flour","1/2 cup peanut butter (xylitol-free)","2 eggs","1/4 cup water"], steps:["Preheat oven to 350F","Mix all ingredients into dough","Roll and cut into shapes","Bake 15 min until golden"] },
  { id:3, name:"Sweet Potato & Turkey", time:"30 min", emoji:"🍠", ingredients:["1 cup ground turkey","1 sweet potato (mashed)","1/2 cup green beans","1 tbsp olive oil"], steps:["Brown turkey in pan","Boil and mash sweet potato","Steam green beans","Combine with olive oil, cool before serving"] },
];
const CAT_RECIPES = [
  { id:1, name:"Tuna & Pumpkin Pate", time:"10 min", emoji:"🐟", ingredients:["1 can tuna in water","2 tbsp pumpkin puree","1 tbsp plain yogurt"], steps:["Drain tuna well","Blend with pumpkin and yogurt","Serve at room temp","Store remainder in fridge max 2 days"] },
  { id:2, name:"Chicken Liver Bites", time:"20 min", emoji:"🍗", ingredients:["1/2 cup chicken liver","1 egg","2 tbsp oat flour"], steps:["Cook liver until fully done","Mash with fork","Mix in egg and flour","Form small bites, bake 12 min at 325F"] },
  { id:3, name:"Salmon Mousse", time:"10 min", emoji:"🍣", ingredients:["1 can salmon (no salt)","1 tbsp plain cream cheese","1 tsp parsley"], steps:["Drain salmon","Blend with cream cheese until smooth","Garnish with parsley","Serve small portions"] },
];
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
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [screen, setScreen] = useState("landing");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) { setProfile(snap.data()); setScreen("app"); }
        else setScreen("app");
      } else {
        setUser(null); setProfile(null); setScreen("landing");
      }
      setLoading(false);
    });
    return unsub;
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

  if (screen === "landing") return <Landing onRegister={() => setScreen("register")} onLogin={() => setScreen("login")} />;
  if (screen === "register") return <RegisterScreen onBack={() => setScreen("landing")} onSuccess={(p) => { setProfile(p); setScreen("app"); }} />;
  if (screen === "login") return <LoginScreen onBack={() => setScreen("landing")} onSuccess={(p) => { setProfile(p); setScreen("app"); }} />;
  return <MainApp user={user} profile={profile} tab={tab} setTab={setTab} onLogout={async () => { await signOut(auth); setScreen("landing"); }} />;
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
      const profile = { ...formWithoutPassword, role, uid: cred.user.uid, createdAt: new Date().toISOString() };
      await setDoc(doc(db, "users", cred.user.uid), profile);
      if (role === "owner" && form.petName) {
        await addDoc(collection(db, "pets"), {
          name: form.petName, type: form.petType, breed: form.petBreed,
          age: form.petAge, weight: form.petWeight, feeding: "",
          nextVet: "", notes: "", vaccines: [], reminders: [],
          photoURL: "", uid: cred.user.uid, createdAt: new Date().toISOString()
        });
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
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const snap = await getDoc(doc(db, "users", cred.user.uid));
      onSuccess(snap.exists() ? snap.data() : { email, role: "owner" });
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

// ─── Main App Shell ───────────────────────────────────────────────────────────
function MainApp({ user, profile, tab, setTab, onLogout }) {
  const [currentProfile, setCurrentProfile] = useState(profile);
  const role = currentProfile?.role || "owner";
  const isOwner = role === "owner";
  const isProvider = role === "provider";
  const isShelter = role === "shelter";
  const ownerTabs = ["home","pets","services","recipes","adoption","settings"];
  const providerTabs = ["home","profile","bookings","settings"];
  const shelterTabs = ["home","listings","settings"];
  const tabs = isOwner ? ownerTabs : isProvider ? providerTabs : shelterTabs;
  const tabIcon = { home:"🏠", pets:"🐾", services:"🛎️", recipes:"🍽️", adoption:"❤️", profile:"📋", bookings:"📅", listings:"🐶", settings:"⚙️" };
  const tabLabel = { home:"Home", pets:"My Pets", services:"Services", recipes:"Recipes", adoption:"Adopt", profile:"My Business", bookings:"Bookings", listings:"Listings", settings:"Settings" };

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
        {tab === "recipes" && isOwner && <RecipesTab profile={currentProfile} />}
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
        <button onClick={() => setTab("pets")} style={{ ...btn(C.cardBorder, C.green), padding: "6px 14px", fontSize: 13, border: `1px solid ${C.green}` }}>+ Add Pet</button>
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
function PetsTab({ user }) {
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
    <PetDetail pet={selectedPet} user={user} onBack={() => setSelectedPetId(null)} onDelete={() => deletePet(selectedPet.id)} />
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
function PetDetail({ pet, user, onBack, onDelete }) {
  const [activeTab, setActiveTab] = useState("info");
  const [vaccines, setVaccines] = useState(pet.vaccines || []);
  const [reminders, setReminders] = useState(pet.reminders || []);
  const [vForm, setVForm] = useState({ name:"", date:"", nextDue:"", vet:"", notes:"" });
  const [rForm, setRForm] = useState({ title:"", date:"", time:"", repeat:"None", notes:"" });
  const [addingV, setAddingV] = useState(false);
  const [addingR, setAddingR] = useState(false);
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
const newR = { ...rForm, id: Date.now().toString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  const updated = [...reminders, newR];
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
                <button onClick={() => deleteReminder(r.id)} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", fontSize: 18 }}>🗑️</button>
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

// ─── Recipes Tab ──────────────────────────────────────────────────────────────
function RecipesTab({ profile }) {
  const petType = profile?.petType || "Dog";
  const [filter, setFilter] = useState(petType);
  const [open, setOpen] = useState(null);
  const recipes = filter === "Cat" ? CAT_RECIPES : DOG_RECIPES;
  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Healthy Recipes 🍽️</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Homemade meals your pet will love</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {["Dog","Cat"].map(t => <button key={t} onClick={() => setFilter(t)} style={{ ...btn(filter === t ? C.green : C.cardBorder, filter === t ? "#0F1A14" : C.muted), padding: "9px 22px", fontSize: 14 }}>{t === "Dog" ? "🐶 Dog" : "🐱 Cat"}</button>)}
      </div>
      {petType !== filter && <div style={{ ...card, background: "#1a2e1e", marginBottom: 16 }}><p style={{ color: C.gold, fontSize: 12, margin: 0 }}>Your pet is a {petType} — make sure you select the right recipes!</p></div>}
      {recipes.map(r => (
        <div key={r.id} style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 32 }}>{r.emoji}</span>
              <div><div style={{ color: C.text, fontWeight: 800, fontSize: 16 }}>{r.name}</div><div style={{ color: C.muted, fontSize: 12 }}>⏱️ {r.time}</div></div>
            </div>
            <button onClick={() => setOpen(open === r.id ? null : r.id)} style={{ background: "none", border: "none", color: C.green, fontFamily: font, fontWeight: 800, cursor: "pointer", fontSize: 13 }}>{open === r.id ? "Hide" : "View"}</button>
          </div>
          {open === r.id && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: C.green, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>INGREDIENTS</div>
                {r.ingredients.map((ing, i) => <div key={i} style={{ color: C.muted, fontSize: 13, padding: "3px 0" }}>• {ing}</div>)}
              </div>
              <div>
                <div style={{ color: C.green, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>STEPS</div>
                {r.steps.map((s, i) => <div key={i} style={{ color: C.text, fontSize: 13, padding: "4px 0" }}>{i + 1}. {s}</div>)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Adoption Tab ─────────────────────────────────────────────────────────────
function AdoptionTab({ profile }) {
  const [filterState, setFilterState] = useState(profile?.state || "");
  const filtered = SHELTERS.filter(s => !filterState || s.state === filterState);
  return (
    <div>
      <h2 style={{ color: C.text, fontWeight: 900, fontSize: 22, marginBottom: 4 }}>Adopt a Pet ❤️</h2>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Verified shelters — free access for all shelters</p>
      <div style={{ marginBottom: 18 }}><span style={label}>Filter by State</span><select value={filterState} onChange={e => setFilterState(e.target.value)} style={{ ...input, appearance: "none" }}><option value="">All States</option>{US_STATES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
      {filtered.map(shelter => (
        <div key={shelter.id} style={{ ...card, marginBottom: 16 }}>
          <div style={{ color: C.text, fontWeight: 900, fontSize: 16, marginBottom: 2 }}>🏠 {shelter.name}</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 14 }}>📍 {shelter.city}, {shelter.state} <Badge text="Verified" color={C.green} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {shelter.pets.map((pet, i) => (
              <div key={i} style={{ background: C.inputBg, borderRadius: 12, padding: 14, border: `1px solid ${C.cardBorder}` }}>
                <div style={{ fontSize: 32, textAlign: "center" }}>{pet.emoji}</div>
                <div style={{ color: C.text, fontWeight: 800, fontSize: 15, textAlign: "center" }}>{pet.name}</div>
                <div style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>{pet.breed}</div>
                <div style={{ color: C.muted, fontSize: 12, textAlign: "center", marginBottom: 10 }}>Age: {pet.age}</div>
                <button style={{ ...btn(C.green), width: "100%", padding: "8px 0", fontSize: 12 }}>Inquire 🐾</button>
              </div>
            ))}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <div style={{ ...card, textAlign: "center", color: C.muted, padding: 40 }}>No shelters found in this state yet. Check back soon!</div>}
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