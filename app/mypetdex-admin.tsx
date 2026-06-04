import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { webDb } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";

const ADMIN_PASSWORD = "MPD@admin2026";
const BRAND = "#4486F4";
const PLAN_PRICES: Record<string, number> = { plus: 3.0, family: 5.0 };

// ── Styles (plain CSS injected once) ──────────────────────────────────────────
const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  body { background: #F1F5F9; }
  .wrap { max-width: 900px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 28px; font-weight: 900; color: #1E293B; }
  h2 { font-size: 16px; font-weight: 700; color: #1E293B; margin: 28px 0 12px; }
  .subtitle { color: #64748B; font-size: 14px; margin-top: 4px; margin-bottom: 28px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-bottom: 8px; }
  .stat { background: #fff; border-radius: 14px; padding: 16px; border-left: 4px solid #4486F4; }
  .stat-num { font-size: 28px; font-weight: 900; color: #1E293B; }
  .stat-label { font-size: 12px; color: #64748B; margin-top: 4px; }
  .revenue { background: #1E293B; border-radius: 18px; padding: 24px; text-align: center; margin-bottom: 8px; }
  .revenue-label { color: rgba(255,255,255,0.6); font-size: 13px; font-weight: 600; }
  .revenue-num { color: #fff; font-size: 48px; font-weight: 900; margin: 6px 0; }
  .revenue-sub { color: rgba(255,255,255,0.4); font-size: 12px; }
  .card { background: #fff; border-radius: 14px; padding: 16px; margin-bottom: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
  .card-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .card-name { font-size: 16px; font-weight: 700; color: #1E293B; }
  .card-meta { font-size: 13px; color: #64748B; margin-top: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  .badge-pending { background: #FEF9C3; color: #92400E; }
  .badge-approved { background: #DCFCE7; color: #166534; }
  .badge-rejected { background: #FEE2E2; color: #991B1B; }
  .actions { display: flex; gap: 8px; }
  .btn { border: none; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
  .btn-approve { background: #DCFCE7; color: #166534; }
  .btn-approve:hover { background: #4486F4; color: #fff; }
  .btn-reject { background: #FEE2E2; color: #991B1B; }
  .btn-reject:hover { background: #EF4444; color: #fff; }
  .stars { color: #F5C842; font-size: 14px; }
  .review-text { color: #64748B; font-size: 14px; margin-top: 8px; line-height: 1.6; }
  .empty { text-align: center; padding: 32px; color: #94A3B8; font-size: 15px; }
  .divider { border: none; border-top: 1px solid #E2E8F0; margin: 8px 0 16px; }
  .refresh { background: #4486F4; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; float: right; margin-top: -4px; }
  .refresh:hover { background: #3a9e6f; }
  /* Login screen */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F1F5F9; }
  .login-box { background: #fff; border-radius: 20px; padding: 40px; width: 340px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
  .login-box h1 { margin-bottom: 6px; }
  .login-box p { color: #64748B; font-size: 14px; margin-bottom: 28px; }
  .login-input { width: 100%; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; font-size: 15px; margin-bottom: 14px; outline: none; }
  .login-input:focus { border-color: #4486F4; }
  .login-btn { width: 100%; background: #4486F4; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer; }
  .login-btn:hover { background: #3a9e6f; }
  .login-error { color: #EF4444; font-size: 13px; margin-bottom: 10px; }
`;

export default function AdminPortal() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [loading, setLoading] = useState(false);

  // Inject CSS once
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="login-box">
          <h1>🐾 MyPetDex</h1>
          <p>Admin Portal — Enter your password</p>
          {pwError && <div className="login-error">{pwError}</div>}
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e: any) => setPw(e.target.value)}
            onKeyDown={(e: any) => { if (e.key === "Enter") checkPw(); }}
            autoFocus
          />
          <button className="login-btn" onClick={checkPw}>Enter Dashboard</button>
        </div>
      </div>
    );
  }

  function checkPw() {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else { setPwError("Incorrect password. Try again."); setPw(""); }
  }

  return <Dashboard />;
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState({ owners: 0, providers: 0, shelters: 0, plusUsers: 0, familyUsers: 0, freeUsers: 0 });
  const [pendingProviders, setPendingProviders] = useState<any[]>([]);
  const [pendingShelters, setPendingShelters] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => { loadAll(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function loadAll() {
    setLoading(true);
    try {
      // Users
      const usersSnap = await getDocs(collection(webDb, "users"));
      let owners = 0, providers = 0, shelters = 0, plusUsers = 0, familyUsers = 0;
      const pendProv: any[] = [], pendShelt: any[] = [];
      usersSnap.forEach(d => {
        const data = { id: d.id, ...d.data() } as any;
        if (data.role === "owner") owners++;
        else if (data.role === "provider") { providers++; if (!data.approved) pendProv.push(data); }
        else if (data.role === "shelter") { shelters++; if (!data.approved) pendShelt.push(data); }
        if (data.plan === "plus") plusUsers++;
        if (data.plan === "family") familyUsers++;
      });
      setStats({ owners, providers, shelters, plusUsers, familyUsers, freeUsers: owners - plusUsers - familyUsers });
      setPendingProviders(pendProv);
      setPendingShelters(pendShelt);

      // Reviews
      const revSnap = await getDocs(query(collection(webDb, "reviews"), where("published", "==", false)));
      setPendingReviews(revSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } finally { setLoading(false); }
  }

  async function approveUser(uid: string, type: "provider" | "shelter") {
    await updateDoc(doc(webDb, "users", uid), { approved: true });
    showToast(`✅ ${type === "provider" ? "Provider" : "Shelter"} approved!`);
    if (type === "provider") setPendingProviders(p => p.filter(x => x.id !== uid));
    else setPendingShelters(p => p.filter(x => x.id !== uid));
  }

  async function rejectUser(uid: string, type: "provider" | "shelter") {
    await updateDoc(doc(webDb, "users", uid), { approved: false, rejected: true });
    showToast(`❌ ${type === "provider" ? "Provider" : "Shelter"} rejected.`);
    if (type === "provider") setPendingProviders(p => p.filter(x => x.id !== uid));
    else setPendingShelters(p => p.filter(x => x.id !== uid));
  }

  async function approveReview(id: string) {
    await updateDoc(doc(webDb, "reviews", id), { published: true });
    setPendingReviews(p => p.filter(x => x.id !== id));
    showToast("✅ Review published!");
  }

  async function rejectReview(id: string) {
    await updateDoc(doc(webDb, "reviews", id), { published: false, rejected: true });
    setPendingReviews(p => p.filter(x => x.id !== id));
    showToast("❌ Review rejected.");
  }

  const totalUsers = stats.owners + stats.providers + stats.shelters;
  const revenue = stats.plusUsers * PLAN_PRICES.plus + stats.familyUsers * PLAN_PRICES.family;
  const pendingCount = pendingProviders.length + pendingShelters.length + pendingReviews.length;

  if (loading) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <ActivityIndicator color={BRAND} size="large" />
    </View>
  );

  return (
    <div className="wrap">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: "#1E293B", color: "#fff", borderRadius: 12, padding: "12px 20px", fontWeight: 700, fontSize: 14, zIndex: 999 }}>
          {toast}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1>🐾 MyPetDex Admin</h1>
          <p className="subtitle">
            {totalUsers} total users · {pendingCount > 0 ? `⚠️ ${pendingCount} pending action${pendingCount > 1 ? "s" : ""}` : "✅ All clear"}
          </p>
        </div>
        <button className="refresh" onClick={loadAll}>↻ Refresh</button>
      </div>

      {/* Revenue */}
      <div className="revenue">
        <div className="revenue-label">EST. MONTHLY REVENUE</div>
        <div className="revenue-num">${revenue.toFixed(2)}</div>
        <div className="revenue-sub">{stats.plusUsers} Plus × $3.00 + {stats.familyUsers} Family × $5.00</div>
      </div>

      {/* Stats grid */}
      <h2>Users ({totalUsers} total)</h2>
      <div className="grid">
        <StatBox num={stats.owners} label="Pet Owners" color="#4486F4" />
        <StatBox num={stats.providers} label="Providers" color="#3B82F6" />
        <StatBox num={stats.shelters} label="Shelters" color="#F5A623" />
        <StatBox num={stats.plusUsers} label="Plus Plans" color="#8B5CF6" />
        <StatBox num={stats.familyUsers} label="Family Plans" color="#EC4899" />
        <StatBox num={stats.freeUsers} label="Free Plans" color="#64748B" />
      </div>

      {/* Pending Providers */}
      <h2>⏳ Pending Provider Approvals ({pendingProviders.length})</h2>
      {pendingProviders.length === 0
        ? <div className="empty">No pending providers</div>
        : pendingProviders.map(p => (
          <div key={p.id} className="card">
            <div className="card-top">
              <div>
                <div className="card-name">{p.businessName || p.displayName || "Unknown"}</div>
                <div className="card-meta">{p.email} · {p.service || p.serviceType} · {p.city}, {p.state}</div>
                {p.phone && <div className="card-meta">📞 {p.phone}</div>}
                {p.website && <div className="card-meta">🌐 {p.website}</div>}
              </div>
              <div className="actions">
                <button className="btn btn-approve" onClick={() => approveUser(p.id, "provider")}>✓ Approve</button>
                <button className="btn btn-reject" onClick={() => rejectUser(p.id, "provider")}>✕ Reject</button>
              </div>
            </div>
          </div>
        ))
      }

      {/* Pending Shelters */}
      <h2>⏳ Pending Shelter Approvals ({pendingShelters.length})</h2>
      {pendingShelters.length === 0
        ? <div className="empty">No pending shelters</div>
        : pendingShelters.map(s => (
          <div key={s.id} className="card">
            <div className="card-top">
              <div>
                <div className="card-name">{s.shelterName || s.displayName || "Unknown"}</div>
                <div className="card-meta">{s.email} · {s.city}, {s.state}</div>
                {s.ein && <div className="card-meta">EIN: {s.ein}</div>}
                {s.license && <div className="card-meta">License: {s.license}</div>}
                {s.phone && <div className="card-meta">📞 {s.phone}</div>}
              </div>
              <div className="actions">
                <button className="btn btn-approve" onClick={() => approveUser(s.id, "shelter")}>✓ Approve</button>
                <button className="btn btn-reject" onClick={() => rejectUser(s.id, "shelter")}>✕ Reject</button>
              </div>
            </div>
          </div>
        ))
      }

      {/* Pending Reviews */}
      <h2>⭐ Pending Review Approvals ({pendingReviews.length})</h2>
      {pendingReviews.length === 0
        ? <div className="empty">No pending reviews</div>
        : pendingReviews.map(r => (
          <div key={r.id} className="card">
            <div className="card-top">
              <div style={{ flex: 1 }}>
                <div className="card-name">{r.clientName || "Pet Owner"}</div>
                <div className="card-meta">For: {r.providerName || r.providerId}</div>
                <div className="stars">{"★".repeat(r.rating || 0)}{"☆".repeat(5 - (r.rating || 0))} &nbsp;{r.rating}/5</div>
                <div className="review-text">{r.text || r.comment || "(no text)"}</div>
              </div>
              <div className="actions" style={{ alignSelf: "flex-start" }}>
                <button className="btn btn-approve" onClick={() => approveReview(r.id)}>✓ Publish</button>
                <button className="btn btn-reject" onClick={() => rejectReview(r.id)}>✕ Reject</button>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}

function StatBox({ num, label, color }: { num: number; label: string; color: string }) {
  return (
    <div className="stat" style={{ borderLeftColor: color }}>
      <div className="stat-num">{num}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
