import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView,
  Platform, Image, SafeAreaView,
} from "react-native";
import { useState, useEffect } from "react";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "@/contexts/AuthContext";
import { isWeb, webAuth, webDb } from "@/lib/firebase";
import { createUserWithEmailAndPassword as webCreateUser, signInWithEmailAndPassword as webSignIn, sendEmailVerification as webSendVerification, updateProfile as webUpdateProfile } from "firebase/auth";
import { doc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import _nativeAuth from "@react-native-firebase/auth";
import _nativeFirestore from "@react-native-firebase/firestore";

// Web-only Apple Sign In button (the expo-apple-authentication stub renders null on web)
function WebAppleButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.appleButtonWeb} onPress={onPress}>
      <Text style={styles.appleButtonWebText}> Sign in with Apple</Text>
    </Pressable>
  );
}

const BRAND = "#4CAF82";
const BLUE = "#4486F4";

type Screen = "landing" | "role" | "register" | "login" | "verify";
type Role = "owner" | "provider" | "shelter";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// Read ?role= from URL synchronously so the first render already has the right
// screen — prevents the one-frame flash of the landing (3-role) screen.
function getInitialRoleAndScreen(): { role: Role; screen: Screen } {
  if (isWeb && typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role") as Role | null;
    if (roleParam === "owner" || roleParam === "provider" || roleParam === "shelter") {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("mypetdex_role", roleParam);
        localStorage.setItem("mypetdex_onboarding_role", roleParam);
      }
      return { role: roleParam, screen: "register" };
    }
  }
  return { role: "owner", screen: "landing" };
}

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple, signInAnonymously, appleAvailable, user, loading: authLoading } = useAuth();
  const [screen, setScreen] = useState<Screen>(() => getInitialRoleAndScreen().screen);
  const [role, setRole] = useState<Role>(() => getInitialRoleAndScreen().role);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    petName: "", petType: "Dog", petBreed: "", petAge: "", petWeight: "",
    state: "NJ", city: "",
    businessName: "", service: "Grooming", phone: "", website: "", address: "", bio: "", priceRange: "",
    shelterName: "", ein: "", license: "",
  });

  // Show nothing while Firebase resolves auth state, or if already signed in.
  // AuthGuard in _layout.tsx handles the redirect — this prevents any flash of
  // the sign-in screen for users who are already authenticated.
  if (authLoading || user) return null;

  function set(key: string) {
    return (val: string) => setForm(f => ({ ...f, [key]: val }));
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    // Save intended role so AuthContext and onboarding can read it after the popup
    if (isWeb && typeof localStorage !== "undefined") {
      localStorage.setItem("mypetdex_role", role);
      localStorage.setItem("mypetdex_onboarding_role", role);
    }
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError("Could not sign in with Google. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setError("");
    // Save intended role so AuthContext and onboarding can read it after the popup
    if (isWeb && typeof localStorage !== "undefined") {
      localStorage.setItem("mypetdex_role", role);
      localStorage.setItem("mypetdex_onboarding_role", role);
    }
    try {
      await signInWithApple();
    } catch (e: any) {
      // Ignore user cancellation
      if (e.code !== "ERR_REQUEST_CANCELED" && e.code !== "1001") {
        setError("Could not sign in with Apple. Please try again.");
      }
    }
  }

  async function handleGuest() {
    setError("");
    setLoading(true);
    try {
      await signInAnonymously();
    } catch (e: any) {
      setError("Could not continue as guest.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterStep1() {
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields."); return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) {
      setError('Password must include at least one special character (e.g. @, #, !)'); return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match."); return;
    }
    setLoading(true); setError("");
    try {
      const cred = isWeb
        ? await webCreateUser(webAuth, form.email, form.password)
        : await _nativeAuth().createUserWithEmailAndPassword(form.email, form.password);
      if (isWeb) { await webUpdateProfile(cred.user, { displayName: form.name }); } else { await cred.user.updateProfile({ displayName: form.name }); }
      setPendingUser(cred.user);
      setStep(2);
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError(e.message || "Registration failed.");
      }
    }
    setLoading(false);
  }

  async function handleRegisterStep2() {
    if (!form.city) { setError("Please enter your city."); return; }
    setLoading(true); setError("");
    try {
      const u = pendingUser || (isWeb ? webAuth.currentUser : _nativeAuth().currentUser);
      if (!u) throw new Error("No user found.");

      const userDoc: any = {
        uid: u.uid,
        email: u.email,
        displayName: form.name,
        role,
        plan: role === "owner" ? "free" : role,
        state: form.state,
        city: form.city,
        // createdAt is set per-platform below
      };

      if (role === "provider") {
        Object.assign(userDoc, {
          businessName: form.businessName, service: form.service,
          phone: form.phone, website: form.website, address: form.address,
          bio: form.bio, priceRange: form.priceRange, approved: false,
        });
      }

      if (role === "shelter") {
        Object.assign(userDoc, {
          shelterName: form.shelterName, ein: form.ein, license: form.license,
          phone: form.phone, website: form.website, address: form.address, approved: false,
        });
      }

      if (isWeb) {
        await setDoc(doc(webDb, "users", u.uid), { ...userDoc, createdAt: serverTimestamp() });
        if (role === "owner" && form.petName) {
          await addDoc(collection(webDb, "users", u.uid, "pets"), {
            name: form.petName,
            species: form.petType.toLowerCase(),
            breed: form.petBreed,
            age: form.petAge,
            weight: form.petWeight,
            weightUnit: "lbs",
            createdAt: serverTimestamp(),
          });
        }
      } else {
        await _nativeFirestore().collection("users").doc(u.uid).set({
          ...userDoc,
          createdAt: _nativeFirestore.FieldValue.serverTimestamp(),
        });
        if (role === "owner" && form.petName) {
          await _nativeFirestore().collection("users").doc(u.uid).collection("pets").add({
            name: form.petName,
            species: form.petType.toLowerCase(),
            breed: form.petBreed,
            age: form.petAge,
            weight: form.petWeight,
            weightUnit: "lbs",
            createdAt: _nativeFirestore.FieldValue.serverTimestamp(),
          });
        }
      }

      if (isWeb) { await webSendVerification(u); } else { await u.sendEmailVerification(); }
      setScreen("verify");
    } catch (e: any) {
      setError(e.message || "Could not complete registration.");
    }
    setLoading(false);
  }

  async function handleLogin() {
    if (!form.email || !form.password) {
      setError("Please enter your email and password."); return;
    }
    setLoading(true); setError("");
    try {
      const cred = isWeb
        ? await webSignIn(webAuth, form.email, form.password)
        : await _nativeAuth().signInWithEmailAndPassword(form.email, form.password);
      if (!cred.user.emailVerified) {
        setScreen("verify");
        setPendingUser(cred.user);
      }
    } catch (e: any) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  }

  async function resendVerification() {
    try {
      const u = pendingUser || (isWeb ? webAuth.currentUser : _nativeAuth().currentUser);
      await u?.sendEmailVerification();
      Alert.alert("Sent!", "Verification email sent. Check your inbox.");
    } catch {
      Alert.alert("Error", "Could not send verification email.");
    }
  }

  // ── Shared header for sub-screens ──────────────────────────────────────────
  function BackHeader({ onBack, label = "Back" }: { onBack: () => void; label?: string }) {
    return (
      <SafeAreaView style={styles.safeHeader}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={16}>
          <Text style={styles.backBtnText}>‹ {label}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Landing ─────────────────────────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <Image
              source={require("../../assets/images/logo-transparent.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>MyPetDex</Text>
            <Text style={styles.subtitle}>Your pets' health & life, all in one place.</Text>
          </View>

          <View style={styles.roleCards}>
            <Pressable style={styles.roleCard} onPress={() => { setRole("owner"); setScreen("register"); }}>
              <Text style={styles.roleCardEmoji}>🐾</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleCardTitle}>Pet Owner</Text>
                <Text style={styles.roleCardDesc}>Manage health records, reminders, AI tips & more</Text>
              </View>
              <Text style={styles.roleCardArrow}>›</Text>
            </Pressable>

            <Pressable style={styles.roleCard} onPress={() => { setRole("provider"); setScreen("register"); }}>
              <Text style={styles.roleCardEmoji}>🛎️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleCardTitle}>Service Provider</Text>
                <Text style={styles.roleCardDesc}>Grow your pet business & get discovered locally</Text>
              </View>
              <Text style={styles.roleCardArrow}>›</Text>
            </Pressable>

            <Pressable style={styles.roleCard} onPress={() => { setRole("shelter"); setScreen("register"); }}>
              <Text style={styles.roleCardEmoji}>🏠</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleCardTitle}>Animal Shelter</Text>
                <Text style={styles.roleCardDesc}>List adoptable pets & connect with loving families</Text>
              </View>
              <Text style={styles.roleCardArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.bottomLinks}>
            <Text style={styles.legalText}>Already have an account? </Text>
            <Pressable onPress={() => setScreen("login")}>
              <Text style={styles.linkText}>Sign In</Text>
            </Pressable>
          </View>

          <Pressable onPress={handleGuest}>
            <Text style={styles.guestText}>Continue as Guest</Text>
          </Pressable>

          <Text style={styles.legal}>🔒 Your data is encrypted and never shared with third parties.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Verify ──────────────────────────────────────────────────────────────────
  if (screen === "verify") {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <BackHeader onBack={() => setScreen("login")} label="Sign In" />
        <View style={styles.container}>
          <View style={styles.hero}>
            <Text style={{ fontSize: 64 }}>📧</Text>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We sent a verification link to {form.email}. Please verify to continue.
            </Text>
          </View>
          <View style={styles.buttons}>
            <Pressable style={styles.primaryBtn} onPress={resendVerification}>
              <Text style={styles.primaryBtnText}>Resend Verification Email</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setScreen("login")}>
              <Text style={styles.secondaryBtnText}>Back to Sign In</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  if (screen === "login") {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <BackHeader onBack={() => setScreen("landing")} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Image
              source={require("../../assets/images/logo-transparent.png")}
              style={styles.logoSmall}
              resizeMode="contain"
            />
            <Text style={styles.title}>Welcome back 👋</Text>

            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={set("email")}
              placeholder="you@email.com" placeholderTextColor="#aaa"
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput style={styles.input} value={form.password} onChangeText={set("password")}
              placeholder="password" placeholderTextColor="#aaa" secureTextEntry />

            <Pressable style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
            </Pressable>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {appleAvailable && (
              isWeb ? (
                <WebAppleButton onPress={handleApple} />
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={handleApple}
                />
              )
            )}

            <Pressable style={styles.googleButton} onPress={handleGoogle} disabled={loading}>
              <Text style={styles.googleText}>Continue with Google</Text>
            </Pressable>

            <Pressable onPress={() => setScreen("landing")} style={{ marginTop: 20, alignItems: "center" }}>
              <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Register ────────────────────────────────────────────────────────────────
  const roleConfig = {
    owner: {
      badge: "🐾 For Pet Owners",
      badgeColor: BRAND,
      title: "Your Pet's World,\nAll in One App",
      titleColor: BLUE,
      desc: "Everything your pet needs — in one simple app.",
      subdesc: "Health records · Reminders · AI Assistant · Nutrition · Adoption",
      pills: ["🐾 Pet Profiles", "💉 Vaccines", "⏰ Reminders", "🤖 AI Tips", "🍳 Recipes", "❤️ Adoption"],
      cta: "Create Free Account →",
      pricing: "Free plan available · Plus $2.99/mo · Family $4.99/mo",
    },
    provider: {
      badge: "🛎️ For Service Providers",
      badgeColor: BLUE,
      title: "Grow Your Pet\nBusiness",
      titleColor: BLUE,
      desc: "Join MyPetDex and get discovered by local pet owners looking for your services.",
      subdesc: "Grooming · Walking · Veterinary · Training · Boarding & more",
      pills: ["📍 Local Discovery", "⭐ Reviews", "📅 Bookings", "🏢 Business Profile", "📊 Analytics", "🎉 6-Month Free Trial"],
      cta: "Join as Provider →",
      pricing: "🎉 Free for 6 months — then only 5% commission. No monthly fees ever!",
    },
    shelter: {
      badge: "🏠 For Animal Shelters",
      badgeColor: BRAND,
      title: "Help Pets Find\nForever Homes",
      titleColor: BLUE,
      desc: "List your adoptable pets and connect with loving families in your area.",
      subdesc: "Dogs · Cats · Rabbits · Birds · and more",
      pills: ["🐾 Pet Listings", "❤️ Adoption Requests", "📍 Local Visibility", "🔔 Notifications", "📋 Pet Profiles", "✅ Always Free"],
      cta: "Register Your Shelter →",
      pricing: "Shelter access is always FREE on MyPetDex!",
    },
  };
  const rc = roleConfig[role];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <BackHeader
        onBack={() => step === 1 ? setScreen("landing") : setStep(1)}
        label={step === 1 ? "Back" : "Previous step"}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Top row: back link (non-owner) + sign in */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            {role !== "owner" ? (
              <Pressable onPress={() => setScreen("landing")}>
                <Text style={[styles.linkText, { color: "#888" }]}>← Not a {role === "provider" ? "provider" : "shelter"}?</Text>
              </Pressable>
            ) : <View />}
            <Pressable onPress={() => setScreen("login")}>
              <Text style={styles.linkText}>Already have an account? <Text style={{ color: BLUE }}>Sign In</Text></Text>
            </Pressable>
          </View>

          {/* Logo */}
          <Image source={require("../../assets/images/logo-transparent.png")} style={[styles.logoSmall, { alignSelf: "center" }]} resizeMode="contain" />

          {/* Role badge */}
          <View style={[styles.roleBadge, { backgroundColor: rc.badgeColor, alignSelf: "center", marginBottom: 14 }]}>
            <Text style={styles.roleBadgeText}>{rc.badge}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: BLUE, textAlign: "center", marginBottom: 10 }]}>{rc.title}</Text>

          {/* Description */}
          <Text style={styles.roleDesc}>{rc.desc}</Text>
          <Text style={styles.roleSubdesc}>{rc.subdesc}</Text>

          {/* Feature pills */}
          <View style={styles.pillsWrap}>
            {rc.pills.map(p => (
              <View key={p} style={styles.pill}><Text style={styles.pillText}>{p}</Text></View>
            ))}
          </View>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          {step === 1 && (
            <>
              {/* Checkbox — agree to terms */}
              <Pressable style={styles.checkRow} onPress={() => setAgreedToTerms(v => !v)}>
                <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                  {agreedToTerms && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✓</Text>}
                </View>
                <Text style={styles.checkLabel}>
                  I confirm I am signing up as a{" "}
                  {role === "owner" ? "Pet Owner" : role === "provider" ? "Service Provider" : "an Animal Shelter"}
                  {" "}and agree to the{" "}
                  <Text style={{ color: BLUE }}>Terms of Service</Text>.
                </Text>
              </Pressable>

              {/* Extra age checkbox for shelter */}
              {role === "shelter" && (
                <Pressable style={styles.checkRow} onPress={() => setConfirmedAge(v => !v)}>
                  <View style={[styles.checkbox, confirmedAge && styles.checkboxChecked]}>
                    {confirmedAge && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✓</Text>}
                  </View>
                  <Text style={styles.checkLabel}>I confirm I am 13 years of age or older.</Text>
                </Pressable>
              )}

              {/* Social auth */}
              {appleAvailable && (
                isWeb ? (
                  <WebAppleButton onPress={handleApple} />
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                    cornerRadius={12}
                    style={styles.appleButton}
                    onPress={handleApple}
                  />
                )
              )}

              <Pressable style={styles.googleButton} onPress={handleGoogle} disabled={loading}>
                <Text style={styles.googleText}>Sign up with Google</Text>
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={set("name")} placeholder="Jane Smith" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Email *</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={set("email")} placeholder="you@email.com" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Password (min 8 chars + special character) *</Text>
              <TextInput style={styles.input} value={form.password} onChangeText={set("password")} placeholder="e.g. MyPet@2024" placeholderTextColor="#aaa" secureTextEntry />

              <Text style={styles.fieldLabel}>Confirm Password *</Text>
              <TextInput style={styles.input} value={form.confirmPassword} onChangeText={set("confirmPassword")} placeholder="Re-enter password" placeholderTextColor="#aaa" secureTextEntry />

              <Pressable
                style={[styles.primaryBtn, { backgroundColor: BLUE }, loading && { opacity: 0.6 }]}
                onPress={handleRegisterStep1}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{rc.cta}</Text>}
              </Pressable>

              <Text style={styles.pricingText}>{rc.pricing}</Text>
            </>
          )}

          {step === 2 && role === "owner" && (
            <>
              <Text style={styles.stepDesc}>Tell us about your pet and location</Text>

              <Text style={styles.fieldLabel}>Pet Name</Text>
              <TextInput style={styles.input} value={form.petName} onChangeText={set("petName")} placeholder="Buddy" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Pet Type</Text>
              <View style={styles.toggleRow}>
                {["Dog", "Cat"].map(t => (
                  <Pressable key={t} style={[styles.toggleBtn, form.petType === t && styles.toggleBtnActive]} onPress={() => set("petType")(t)}>
                    <Text style={[styles.toggleBtnText, form.petType === t && styles.toggleBtnTextActive]}>{t === "Dog" ? "🐶 Dog" : "🐱 Cat"}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Breed</Text>
              <TextInput style={styles.input} value={form.petBreed} onChangeText={set("petBreed")} placeholder="e.g. Golden Retriever" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Age</Text>
              <TextInput style={styles.input} value={form.petAge} onChangeText={set("petAge")} placeholder="e.g. 2 years" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Weight</Text>
              <TextInput style={styles.input} value={form.petWeight} onChangeText={set("petWeight")} placeholder="e.g. 55 lbs" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Your State</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {US_STATES.map(s => (
                  <Pressable key={s} style={[styles.stateChip, form.state === s && styles.stateChipActive]} onPress={() => set("state")(s)}>
                    <Text style={[styles.stateChipText, form.state === s && styles.stateChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Your City *</Text>
              <TextInput style={styles.input} value={form.city} onChangeText={set("city")} placeholder="e.g. Princeton" placeholderTextColor="#aaa" />

              <Pressable style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleRegisterStep2} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
              </Pressable>
            </>
          )}

          {step === 2 && role === "provider" && (
            <>
              <Text style={styles.stepDesc}>Tell us about your business</Text>

              <Text style={styles.fieldLabel}>Business Name *</Text>
              <TextInput style={styles.input} value={form.businessName} onChangeText={set("businessName")} placeholder="Happy Paws Grooming" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Service Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {["Grooming","Dog Walking","Veterinary","Training","Boarding","Daycare","Other"].map(s => (
                  <Pressable key={s} style={[styles.stateChip, form.service === s && styles.stateChipActive]} onPress={() => set("service")(s)}>
                    <Text style={[styles.stateChipText, form.service === s && styles.stateChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Price Range</Text>
              <TextInput style={styles.input} value={form.priceRange} onChangeText={set("priceRange")} placeholder="e.g. $40-$80" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={set("phone")} placeholder="+1 (555) 000-0000" placeholderTextColor="#aaa" keyboardType="phone-pad" />

              <Text style={styles.fieldLabel}>State</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {US_STATES.map(s => (
                  <Pressable key={s} style={[styles.stateChip, form.state === s && styles.stateChipActive]} onPress={() => set("state")(s)}>
                    <Text style={[styles.stateChipText, form.state === s && styles.stateChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>City *</Text>
              <TextInput style={styles.input} value={form.city} onChangeText={set("city")} placeholder="Newark" placeholderTextColor="#aaa" />

              <View style={styles.trialBadge}>
                <Text style={styles.trialBadgeText}>🎉 6-Month Free Trial — then only 5% commission on bookings!</Text>
              </View>

              <Pressable style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleRegisterStep2} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Provider Account</Text>}
              </Pressable>
            </>
          )}

          {step === 2 && role === "shelter" && (
            <>
              <Text style={styles.stepDesc}>Shelter verification (approved within 24hr)</Text>

              <Text style={styles.fieldLabel}>Shelter Name *</Text>
              <TextInput style={styles.input} value={form.shelterName} onChangeText={set("shelterName")} placeholder="Second Chance Animal Shelter" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>EIN Number</Text>
              <TextInput style={styles.input} value={form.ein} onChangeText={set("ein")} placeholder="xx-xxxxxxx" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>State License #</Text>
              <TextInput style={styles.input} value={form.license} onChangeText={set("license")} placeholder="NJ-2024-xxxxx" placeholderTextColor="#aaa" />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput style={styles.input} value={form.phone} onChangeText={set("phone")} placeholder="+1 (555) 000-0000" placeholderTextColor="#aaa" keyboardType="phone-pad" />

              <Text style={styles.fieldLabel}>State</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                {US_STATES.map(s => (
                  <Pressable key={s} style={[styles.stateChip, form.state === s && styles.stateChipActive]} onPress={() => set("state")(s)}>
                    <Text style={[styles.stateChipText, form.state === s && styles.stateChipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>City *</Text>
              <TextInput style={styles.input} value={form.city} onChangeText={set("city")} placeholder="Camden" placeholderTextColor="#aaa" />

              <View style={[styles.trialBadge, { backgroundColor: BRAND + "15", borderColor: BRAND + "44" }]}>
                <Text style={[styles.trialBadgeText, { color: BRAND }]}>Shelter access is always FREE on MyPetDex!</Text>
              </View>

              <Pressable style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleRegisterStep2} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Submit for Approval</Text>}
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: { flex: 1, backgroundColor: "#fff" },
  safeHeader: { backgroundColor: "#fff" },
  container: { flex: 1, paddingHorizontal: 28, paddingVertical: 20, justifyContent: "space-between" },
  scrollContent: { padding: 24, paddingBottom: 60 },
  hero: { alignItems: "center", gap: 8, marginTop: 8 },
  logoImage: { width: 100, height: 100, marginBottom: 4 },
  logoSmall: { width: 60, height: 60, alignSelf: "center", marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a1a", marginBottom: 4 },
  subtitle: { fontSize: 15, color: "#666", textAlign: "center", lineHeight: 22 },
  roleCards: { gap: 12 },
  roleCard: { backgroundColor: "#f8f8f8", borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 },
  roleCardEmoji: { fontSize: 28 },
  roleCardTitle: { fontSize: 16, fontWeight: "700", color: "#1a1a1a" },
  roleCardDesc: { fontSize: 12, color: "#888", marginTop: 2 },
  roleCardArrow: { fontSize: 22, color: "#ccc" },
  bottomLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  legalText: { fontSize: 14, color: "#888" },
  linkText: { fontSize: 14, color: BRAND, fontWeight: "700" },
  guestText: { textAlign: "center", fontSize: 14, color: "#aaa" },
  legal: { fontSize: 11, color: "#bbb", textAlign: "center" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  backBtnText: { fontSize: 17, color: BRAND, fontWeight: "600" },
  roleBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12 },
  roleBadgeText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  stepDesc: { fontSize: 13, color: "#888", marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#f8f8f8", borderRadius: 12, borderWidth: 1, borderColor: "#E5E5E5", paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: "#1a1a1a", marginBottom: 4 },
  primaryBtn: { backgroundColor: BRAND, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { backgroundColor: "#f0f0f0", borderRadius: 12, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  secondaryBtnText: { color: "#333", fontSize: 16, fontWeight: "600" },
  appleButton: { height: 54, width: "100%", marginBottom: 12 },
  googleButton: { height: 54, backgroundColor: "#f2f2f2", borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#e0e0e0" },
  googleText: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#eee" },
  dividerText: { fontSize: 13, color: "#aaa" },
  errorBox: { backgroundColor: "#FFEBEE", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#FFCDD2", marginBottom: 12 },
  errorText: { fontSize: 13, color: "#E53935" },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 4 },
  toggleBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", backgroundColor: "#f0f0f0", borderWidth: 1.5, borderColor: "transparent" },
  toggleBtnActive: { backgroundColor: BRAND + "15", borderColor: BRAND },
  toggleBtnText: { fontSize: 14, fontWeight: "600", color: "#666" },
  toggleBtnTextActive: { color: BRAND },
  stateChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#f0f0f0", borderWidth: 1, borderColor: "transparent" },
  stateChipActive: { backgroundColor: BRAND + "15", borderColor: BRAND },
  stateChipText: { fontSize: 13, color: "#666" },
  stateChipTextActive: { color: BRAND, fontWeight: "700" },
  roleDesc: { fontSize: 14, color: "#555", textAlign: "center", lineHeight: 20, marginBottom: 4 },
  roleSubdesc: { fontSize: 12, color: "#999", textAlign: "center", marginBottom: 16 },
  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 20 },
  pill: { backgroundColor: "#EEF2FF", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: "600", color: "#4486F4" },
  pricingText: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 10 },
  checkRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: "#ccc", alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: BLUE, borderColor: BLUE },
  checkLabel: { fontSize: 13, color: "#555", lineHeight: 18, flex: 1 },
  trialBadge: { backgroundColor: "#EEF4FF", borderRadius: 12, padding: 14, borderWidth: 1, borderColor: "#c7d9ff", marginVertical: 12 },
  trialBadgeText: { fontSize: 13, color: BLUE, fontWeight: "600", textAlign: "center" },
  buttons: { gap: 14, paddingHorizontal: 28 },
  appleButtonWeb: { height: 54, backgroundColor: "#000", borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  appleButtonWebText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
});