import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, ScrollView, Alert, KeyboardAvoidingView,
  Platform, Image, SafeAreaView, Linking,
} from "react-native";
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import * as WebBrowser from "expo-web-browser";
import { Animated, Easing } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { useAuth } from "@/contexts/AuthContext";
import {
  auth, db,
  doc, setDoc, addDoc, collection, serverTimestamp,
  GoogleAuthProvider, signInWithCredential, callFunction,
} from "@/lib/firebase";
import { useResponsive } from "@/hooks/useResponsive";

WebBrowser.maybeCompleteAuthSession();

const BRAND = "#4486F4";
const BLUE = "#4486F4";

type Screen = "landing" | "role" | "register" | "login";
type Role = "owner" | "provider" | "shelter";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

function RoleCard({ index, icon, title, desc, onPress }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay: 120 + index * 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
      }}
    >
      <Pressable style={styles.roleCard} onPress={onPress}>
        <View style={styles.roleIconWrap}>
          <Ionicons name={icon} size={22} color={BRAND} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleCardTitle}>{title}</Text>
          <Text style={styles.roleCardDesc}>{desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#C7D2E5" />
      </Pressable>
    </Animated.View>
  );
}

const IOS_CLIENT_ID = "209772699227-eibpfptsff0h497q956hlru2qbeu9pm9.apps.googleusercontent.com";
const WEB_CLIENT_ID = "209772699227-ilqlulmvqp12fau8bbvmq5ufvnbkoguc.apps.googleusercontent.com";

export default function SignInScreen() {
  const { signInWithGoogle, setGooglePrompt, signInWithApple, signUpWithEmail, signInWithEmail, appleAvailable, user, loading: authLoading, setPendingRole } = useAuth();
  const { isTablet } = useResponsive();
  const [screen, setScreen] = useState<Screen>("landing");
  const [role, setRole] = useState<Role>("owner");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [age13, setAge13] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ── Google Sign In via expo-auth-session ──────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    redirectUri: Platform.OS === "ios"
      ? "com.googleusercontent.apps.209772699227-eibpfptsff0h497q956hlru2qbeu9pm9:/"
      : makeRedirectUri(),
  });

  // Register promptAsync with AuthContext so signInWithGoogle() can trigger it
  useEffect(() => {
    setGooglePrompt(request ? () => promptAsync() : null);
    return () => setGooglePrompt(null);
  }, [request]);

  // Handle Google auth response
  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch((e) => {
          console.error("Google sign-in error:", e);
          setError("Could not sign in with Google. Please try again.");
          Alert.alert("Sign-in failed", "Please try again.");
        })
        .finally(() => setLoading(false));
    } else if (response?.type === "error") {
      setError("Could not sign in with Google. Please try again.");
      setLoading(false);
    } else if (response) {
      // Any other outcome (dismiss, cancel, locked) — clear loading so the
      // screen renders again. Without this the user is stuck on a blank view.
      setLoading(false);
    }
  }, [response]);
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    petName: "", petType: "Dog", petBreed: "", petAge: "", petWeight: "",
    state: "NJ", city: "",
    businessName: "", service: "Grooming", phone: "", website: "", address: "", bio: "", priceRange: "",
    shelterName: "", ein: "", license: "",
  });

  if (authLoading || user || loading) return null;

  function set(key: string) {
    return (val: string) => setForm(f => ({ ...f, [key]: val }));
  }

  async function handleGoogle() {
    setError("");
    setPendingRole(role);
    if (!request) {
      try {
        await promptAsync();
      } catch {
        Alert.alert("Not ready", "Google sign-in is loading. Please try again in a moment.");
      }
      return;
    }
    setLoading(true);
    try {
      signInWithGoogle();
    } catch {
      setLoading(false);
      Alert.alert("Error", "Google sign-in failed. Please try again.");
    }
  }

  async function handleApple() {
    setError("");
    setPendingRole(role);
    try { await signInWithApple(); }
    catch (e: any) {
      if (e.code !== "ERR_REQUEST_CANCELED" && e.code !== "1001") {
        setError("Could not sign in with Apple. Please try again.");
      }
    }
  }

  async function handleRegisterStep1() {
    if (!form.name || !form.email || !form.password) { setError("Please fill in all fields."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(form.password)) { setError('Password must include at least one special character (e.g. @, #, !)'); return; }
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (!age13) { setError("You must confirm you are 13 years of age or older to sign up."); return; }
    if (!acceptedTerms) { setError("Please accept the Terms and Conditions to continue."); return; }
    setPendingRole(role);
    setLoading(true); setError("");
    try {
      const u = await signUpWithEmail(form.email, form.password, form.name);
      setPendingUser(u);
      setStep(2);
    } catch (e: any) {
      const code = e?.code || "";
      if (code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 8 characters.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/network-request-failed") {
        setError("Network error. Check your connection and try again.");
      } else {
        setError("Registration failed. Please try again.");
      }
    }
    setLoading(false);
  }

  async function handleRegisterStep2() {
    if (!form.city) { setError("Please enter your city."); return; }
    setLoading(true); setError("");
    try {
      const u = pendingUser || auth.currentUser;
      if (!u) throw new Error("No user found.");

      // Providers start as "pending_provider" until admin approves them.
      // This keeps them out of the explore search and grants them a "pending" holding screen.
      const savedRole = role === "provider" ? "pending_provider" : role;
      const userDoc: any = {
        uid: u.uid, email: u.email, displayName: form.name,
        role: savedRole, plan: role === "owner" ? "free" : role,
        state: form.state, city: form.city,
        onboardingComplete: true,
        createdAt: serverTimestamp(),
      };
      if (role === "provider") Object.assign(userDoc, {
        businessName: form.businessName, service: form.service,
        phone: form.phone, website: form.website, address: form.address,
        bio: form.bio, priceRange: form.priceRange, approved: false,
      });
      if (role === "shelter") Object.assign(userDoc, {
        shelterName: form.shelterName, ein: form.ein, license: form.license,
        phone: form.phone, website: form.website, address: form.address, approved: false,
      });

      await setDoc(doc(db, "users", u.uid), userDoc, { merge: true });

      if (role === "owner" && form.petName) {
        await addDoc(collection(db, "users", u.uid, "pets"), {
          name: form.petName, species: form.petType.toLowerCase(),
          breed: form.petBreed, age: form.petAge, weight: form.petWeight,
          weightUnit: "lbs", createdAt: serverTimestamp(),
        });
      }
      // Verification email is sent from check-email.tsx — AuthGuard routes there automatically.
    } catch {
      setError("Could not complete registration. Please try again.");
    }
    setLoading(false);
  }

  async function handleLogin() {
    if (!form.email || !form.password) { setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      const cred = await signInWithEmail(form.email, form.password);
    } catch {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!form.email) {
      Alert.alert("Enter your email", "Type your email address above, then tap Forgot Password.");
      return;
    }
    setLoading(true);
    try {
      const fn = callFunction("sendPasswordResetEmail");
      await fn({ email: form.email });
      Alert.alert("Check your inbox", `We sent a password reset link to ${form.email}.`);
    } catch {
      Alert.alert("Check your inbox", `If ${form.email} has an account, a reset link was sent.`);
    }
    setLoading(false);
  }

  // mypetdex.app/terms redirects (App Store, etc.) which breaks Linking.openURL on iOS —
  // WebBrowser handles redirects safely in an in-app browser sheet instead.
  async function handleOpenTerms() {
    try {
      await WebBrowser.openBrowserAsync("https://mypetdex.app/terms");
    } catch {
      try { await Linking.openURL("https://mypetdex.app/terms"); } catch {}
    }
  }

  function Checkbox({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
    return (
      <Pressable style={styles.checkboxRow} onPress={onToggle} hitSlop={8}>
        <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
          {checked ? <Text style={styles.checkboxMark}>✓</Text> : null}
        </View>
        <Text style={styles.checkboxLabel}>{children}</Text>
      </Pressable>
    );
  }

  function BackHeader({ onBack, label = "Back" }: { onBack: () => void; label?: string }) {
    return (
      <SafeAreaView style={styles.safeHeader}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={16}>
          <Text style={styles.backBtnText}>‹ {label}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Landing ──────────────────────────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={[styles.container, isTablet && { width: 480, alignSelf: "center" }]}>
          <View style={styles.hero}>
            <Image source={require("../../assets/images/logo-transparent.png")} style={styles.logoImage} resizeMode="contain" />
            <Text style={styles.title}>MyPetDex</Text>
            <Text style={styles.subtitle}>Your pets' health & life, all in one place.</Text>
          </View>
          <View style={styles.roleCards}>
            {([
              { role: "owner" as Role, icon: "paw", title: "Pet Owner", desc: "Manage health records, reminders & personalized tips" },
              { role: "provider" as Role, icon: "briefcase", title: "Service Provider", desc: "Grow your pet business & get discovered locally" },
              { role: "shelter" as Role, icon: "home", title: "Animal Shelter", desc: "List adoptable pets & connect with loving families" },
            ]).map(({ role: r, icon, title, desc }, i) => (
              <RoleCard
                key={r}
                index={i}
                icon={icon}
                title={title}
                desc={desc}
                onPress={() => { setRole(r); setScreen("register"); }}
              />
            ))}
          </View>
          <View style={styles.bottomLinks}>
            <Text style={styles.legalText}>Already have an account? </Text>
            <Pressable onPress={() => setScreen("login")}><Text style={styles.linkText}>Sign In</Text></Pressable>
          </View>
          <Text style={styles.legal}>🔒 Your data is encrypted and never shared with third parties.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Login ────────────────────────────────────────────────────────────────────
  if (screen === "login") {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <BackHeader onBack={() => setScreen("landing")} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
          <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && { width: 480, alignSelf: "center" }]} keyboardShouldPersistTaps="handled" bounces={false}>
            <Image source={require("../../assets/images/logo-transparent.png")} style={styles.logoSmall} resizeMode="contain" />
            <Text style={styles.title}>Welcome back 👋</Text>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input} value={form.email} onChangeText={set("email")} placeholder="you@email.com" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none" />
            <Text style={styles.fieldLabel}>Password</Text>
            <TextInput style={styles.input} value={form.password} onChangeText={set("password")} placeholder="password" placeholderTextColor="#aaa" secureTextEntry />
            <Pressable style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
            </Pressable>
            <Pressable onPress={handleForgotPassword} style={{ alignItems: "center", marginTop: 12, marginBottom: 4 }}>
              <Text style={{ color: BLUE, fontSize: 14, fontWeight: "600" }}>Forgot Password?</Text>
            </Pressable>
            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12} style={styles.appleButton} onPress={handleApple}
              />
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

  // ── Register ─────────────────────────────────────────────────────────────────
  const roleConfig = {
    owner: { badge: "🐾 For Pet Owners", badgeColor: BRAND, title: "Your Pet's World,\nAll in One App", cta: "Create Free Account →", pricing: "Free plan available · Plus $2.99/mo · Family $4.99/mo" },
    provider: { badge: "🛎️ For Service Providers", badgeColor: BLUE, title: "Grow Your Pet\nBusiness", cta: "Join as Provider →", pricing: "🎉 Free for 6 months — then only 5% commission. No monthly fees ever!" },
    shelter: { badge: "🏠 For Animal Shelters", badgeColor: BRAND, title: "Help Pets Find\nForever Homes", cta: "Register Your Shelter →", pricing: "Shelter access is always FREE on MyPetDex!" },
  };
  const rc = roleConfig[role];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <BackHeader onBack={() => step === 1 ? setScreen("landing") : setStep(1)} label={step === 1 ? "Back" : "Previous step"} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}>
        <ScrollView contentContainerStyle={[styles.scrollContent, isTablet && { width: 480, alignSelf: "center" }]} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: 8 }}>
            <Pressable onPress={() => setScreen("login")}><Text style={styles.linkText}>Already have an account? <Text style={{ color: BLUE }}>Sign In</Text></Text></Pressable>
          </View>
          <Image source={require("../../assets/images/logo-transparent.png")} style={[styles.logoSmall, { alignSelf: "center" }]} resizeMode="contain" />
          <View style={[styles.roleBadge, { backgroundColor: rc.badgeColor, alignSelf: "center", marginBottom: 14 }]}>
            <Text style={styles.roleBadgeText}>{rc.badge}</Text>
          </View>
          <Text style={[styles.title, { color: BLUE, textAlign: "center", marginBottom: 10 }]}>{rc.title}</Text>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          {step === 1 && (
            <>
              {appleAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={12} style={styles.appleButton} onPress={handleApple}
                />
              )}
              <Pressable style={styles.googleButton} onPress={handleGoogle} disabled={loading}>
                <Text style={styles.googleText}>Sign up with Google</Text>
              </Pressable>
              <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>or</Text><View style={styles.dividerLine} /></View>
              <Text style={styles.fieldLabel}>Full Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={set("name")} placeholder="Jane Smith" placeholderTextColor="#aaa" />
              <Text style={styles.fieldLabel}>Email *</Text>
              <TextInput style={styles.input} value={form.email} onChangeText={set("email")} placeholder="you@email.com" placeholderTextColor="#aaa" keyboardType="email-address" autoCapitalize="none" />
              <Text style={styles.fieldLabel}>Password (min 8 chars + special character) *</Text>
              <TextInput style={styles.input} value={form.password} onChangeText={set("password")} placeholder="e.g. MyPet@2024" placeholderTextColor="#aaa" secureTextEntry />
              <Text style={styles.fieldLabel}>Confirm Password *</Text>
              <TextInput style={styles.input} value={form.confirmPassword} onChangeText={set("confirmPassword")} placeholder="Re-enter password" placeholderTextColor="#aaa" secureTextEntry />

              <View style={{ marginTop: 14, gap: 10 }}>
                <Checkbox checked={age13} onToggle={() => setAge13(v => !v)}>
                  I am 13 years of age or older
                </Checkbox>
                <Checkbox checked={acceptedTerms} onToggle={() => setAcceptedTerms(v => !v)}>
                  I accept the{" "}
                  <Text
                    style={styles.checkboxLink}
                    onPress={handleOpenTerms}
                  >
                    Terms and Conditions
                  </Text>
                </Checkbox>
              </View>

              <Pressable
                style={[styles.primaryBtn, { backgroundColor: BLUE }, (loading || !age13 || !acceptedTerms) && { opacity: 0.6 }]}
                onPress={handleRegisterStep1}
                disabled={loading || !age13 || !acceptedTerms}
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
  roleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: "#E8EDF6",
    shadowColor: "#4486F4",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  roleIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "#4486F415",
    alignItems: "center", justifyContent: "center",
  },
  roleCardTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  roleCardDesc: { fontSize: 12, color: "#7A8699", marginTop: 3, lineHeight: 17 },
  bottomLinks: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  legalText: { fontSize: 14, color: "#888" },
  linkText: { fontSize: 14, color: BRAND, fontWeight: "700" },
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
  pricingText: { fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 10 },
  checkboxRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkboxBox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#ccc", alignItems: "center", justifyContent: "center", marginTop: 1, backgroundColor: "#fff" },
  checkboxBoxChecked: { backgroundColor: BRAND, borderColor: BRAND },
  checkboxMark: { color: "#fff", fontSize: 13, fontWeight: "800" },
  checkboxLabel: { flex: 1, fontSize: 13, color: "#444", lineHeight: 19 },
  checkboxLink: { color: BRAND, fontWeight: "700", textDecorationLine: "underline" },
});
