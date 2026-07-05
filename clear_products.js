const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./service-account.json");

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function clear() {
  const col = db.collection("featured_products");
  const snap = await col.get();
  await Promise.all(snap.docs.map(d => d.ref.delete()));
  console.log(`✅ Cleared ${snap.size} products.`);
  process.exit(0);
}

clear().catch(e => { console.error("❌", e.message); process.exit(1); });
