/**
 * MyPetDex — Demo Account Seeder
 * Seeds demo@mypetdex.app with a realistic pet profile for Apple App Review.
 *
 * Run: node scripts/seed-demo-account.js
 * Requires: service-account.json in project root (never commit this file)
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const serviceAccount = require("/Users/john/Downloads/mypetdex-c4315-firebase-adminsdk-fbsvc-9ce96b1a62.json");

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const auth = getAuth();

const DEMO_EMAIL = "demo@mypetdex.app";

async function seed() {
  // ── 1. Get demo user UID + force email verified ───────────────────────────
  const user = await auth.getUserByEmail(DEMO_EMAIL);
  const uid = user.uid;
  await auth.updateUser(uid, { emailVerified: true });
  console.log(`✅ Demo user found + email verified: ${uid}`);

  // ── 2. Create pet document ────────────────────────────────────────────────
  const petsRef = db.collection("users").doc(uid).collection("pets");

  // Delete any existing demo pets first (clean slate)
  const existing = await petsRef.get();
  for (const d of existing.docs) await d.ref.delete();

  const petRef = await petsRef.add({
    name: "Buddy",
    species: "dog",
    breed: "Golden Retriever",
    age: 3,
    weight: 65,
    weightUnit: "lbs",
    neutered: true,
    activityLevel: "active",
    photoURL: "",
    createdAt: FieldValue.serverTimestamp(),

    // ── Vet contact ──────────────────────────────────────────────────────────
    vet: {
      name: "Greenfield Animal Clinic",
      phone: "6099885500",
      address: "120 Main St, Princeton, NJ 08540",
      notes: "Dr. Sarah Chen — annual checkup due October",
    },

    // ── Vaccine / health records ──────────────────────────────────────────────
    vaccines: [
      {
        id: "v1",
        title: "Rabies Vaccine",
        type: "Vaccination",
        date: "2025-10-15",
        note: "3-year booster — next due Oct 2028",
      },
      {
        id: "v2",
        title: "DHPP (Distemper/Parvo)",
        type: "Vaccination",
        date: "2025-10-15",
        note: "Annual booster completed",
      },
      {
        id: "v3",
        title: "Bordetella",
        type: "Vaccination",
        date: "2026-01-08",
        note: "Required for daycare and boarding",
      },
      {
        id: "v4",
        title: "Annual Wellness Exam",
        type: "Vet Visit",
        date: "2025-10-15",
        note: "All vitals normal. Weight stable at 65 lbs.",
      },
      {
        id: "v5",
        title: "Dental Cleaning",
        type: "Vet Visit",
        date: "2026-03-20",
        note: "Mild tartar — advised brushing 3x/week",
      },
    ],

    // ── Medications ───────────────────────────────────────────────────────────
    medications: [
      {
        id: "m1",
        name: "NexGard (Flea & Tick)",
        dosage: "68mg chewable",
        frequency: "Monthly",
        refillDate: "2026-09-01",
        note: "Give with food on the 1st of each month",
        active: true,
      },
      {
        id: "m2",
        name: "Heartgard Plus",
        dosage: "136mcg",
        frequency: "Monthly",
        refillDate: "2026-09-01",
        note: "Heartworm prevention — give same day as NexGard",
        active: true,
      },
      {
        id: "m3",
        name: "Fish Oil Supplement",
        dosage: "1000mg",
        frequency: "Daily",
        refillDate: "",
        note: "For coat and joint health",
        active: true,
      },
    ],
  });

  console.log(`✅ Pet created: Buddy (${petRef.id})`);

  // ── 3. Create reminders ───────────────────────────────────────────────────
  const remindersRef = db
    .collection("users")
    .doc(uid)
    .collection("reminders");

  const existingR = await remindersRef.get();
  for (const d of existingR.docs) await d.ref.delete();

  await remindersRef.add({
    title: "NexGard & Heartgard due",
    date: "2026-09-01",
    petId: petRef.id,
    petName: "Buddy",
    done: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  await remindersRef.add({
    title: "Annual vet checkup",
    date: "2026-10-15",
    petId: petRef.id,
    petName: "Buddy",
    done: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ Reminders created`);

  // ── 4. Set user plan to "plus" so all features are visible ───────────────
  await db.collection("users").doc(uid).set(
    {
      email: DEMO_EMAIL,
      plan: "plus",
      displayName: "Demo User",
      role: "owner",
      isDemo: true,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log(`✅ User document set (plan: plus, isDemo: true)`);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Demo account ready for Apple App Review:`);
  console.log(`  Email:    demo@mypetdex.app`);
  console.log(`  Password: Demo1234!`);
  console.log(`  UID:      ${uid}`);
  console.log(`\nAdd this UID to your Firestore security rules`);
  console.log(`to restrict write access for the demo account.`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
