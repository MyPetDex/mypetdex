import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { webDb } from "@/lib/firebase";
import {
  collection, getDocs, doc, updateDoc, addDoc,
  deleteDoc, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";

const ADMIN_PASSWORD = "MPD@admin2026";
const BRAND = "#4486F4";
const PLAN_PRICES: Record<string, number> = { plus: 3.0, family: 5.0 };
const CATEGORIES = ["Food", "Toys", "Health", "Grooming", "Beds", "Other"];

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  body { background: #F1F5F9; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 28px; font-weight: 900; color: #1E293B; }
  h2 { font-size: 16px; font-weight: 700; color: #1E293B; margin: 32px 0 12px; display:flex; align-items:center; gap:8px; }
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
  .badge-free { background: #F1F5F9; color: #64748B; }
  .badge-plus { background: #EDE9FE; color: #5B21B6; }
  .badge-family { background: #FCE7F3; color: #831843; }
  .badge-owner { background: #DBEAFE; color: #1E40AF; }
  .badge-provider { background: #D1FAE5; color: #065F46; }
  .badge-shelter { background: #FEF3C7; color: #92400E; }
  .badge-pending { background: #FEF9C3; color: #92400E; }
  .badge-approved { background: #DCFCE7; color: #166534; }
  .badge-rejected { background: #FEE2E2; color: #991B1B; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .btn { border: none; border-radius: 8px; padding: 8px 18px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
  .btn-approve { background: #DCFCE7; color: #166534; }
  .btn-approve:hover { background: #4486F4; color: #fff; }
  .btn-reject { background: #FEE2E2; color: #991B1B; }
  .btn-reject:hover { background: #EF4444; color: #fff; }
  .btn-delete { background: #FEE2E2; color: #991B1B; }
  .btn-delete:hover { background: #EF4444; color: #fff; }
  .btn-add { background: #4486F4; color: #fff; }
  .btn-add:hover { background: #3366CC; }
  .btn-signout { background: #EF4444; color: #fff; }
  .stars { color: #F5C842; font-size: 14px; }
  .review-text { color: #64748B; font-size: 14px; margin-top: 8px; line-height: 1.6; }
  .empty { text-align: center; padding: 32px; color: #94A3B8; font-size: 15px; }
  .divider { border: none; border-top: 1px solid #E2E8F0; margin: 8px 0 16px; }
  .refresh { background: #4486F4; color: #fff; border: none; border-radius: 10px; padding: 10px 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
  /* Login */
  .login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #F1F5F9; }
  .login-box { background: #fff; border-radius: 20px; padding: 40px; width: 340px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); text-align: center; }
  .login-box h1 { margin-bottom: 6px; }
  .login-box p { color: #64748B; font-size: 14px; margin-bottom: 28px; }
  .login-input { width: 100%; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; font-size: 15px; margin-bottom: 14px; outline: none; }
  .login-input:focus { border-color: #4486F4; }
  .login-btn { width: 100%; background: #4486F4; color: #fff; border: none; border-radius: 10px; padding: 14px; font-size: 16px; font-weight: 700; cursor: pointer; }
  .login-error { color: #EF4444; font-size: 13px; margin-bottom: 10px; }
  /* Table */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #F8FAFC; color: #64748B; font-weight: 700; padding: 10px 12px; text-align: left; border-bottom: 1px solid #E2E8F0; }
  td { padding: 10px 12px; border-bottom: 1px solid #F1F5F9; color: #1E293B; vertical-align: middle; }
  tr:hover td { background: #F8FAFC; }
  /* Product form */
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .form-input { width: 100%; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 9px 12px; font-size: 14px; outline: none; }
  .form-input:focus { border-color: #4486F4; }
  .form-select { width: 100%; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 9px 12px; font-size: 14px; outline: none; background: #fff; }
  .product-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: #fff; border-radius: 12px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .product-emoji { font-size: 24px; width: 40px; text-align: center; }
  .product-info { flex: 1; }
  .product-name { font-weight: 700; color: #1E293B; font-size: 14px; }
  .product-meta { color: #64748B; font-size: 12px; margin-top: 2px; }
  .store-chewy { color: #E53935; font-weight: 700; }
  .store-amazon { color: #FF9900; font-weight: 700; }
  .section-nav { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .nav-btn { border: none; border-radius: 20px; padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer; background: #fff; color: #64748B; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .nav-btn.active { background: #4486F4; color: #fff; }
  .toggle-inactive { opacity: 0.4; }
  .url-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #4486F4; font-size: 12px; }
`;

export default function AdminPortal() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => { document.head.removeChild(el); };
  }, []);

  function checkPw() {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwError(""); }
    else { setPwError("Incorrect password."); setPw(""); }
  }

  if (!authed) {
    return (
      <div className="login-wrap">
        <div className="login-box">
          <h1>🐾 MyPetDex</h1>
          <p>Admin Portal</p>
          {pwError && <div className="login-error">{pwError}</div>}
          <input className="login-input" type="password" placeholder="Password" value={pw}
            onChange={(e: any) => setPw(e.target.value)}
            onKeyDown={(e: any) => { if (e.key === "Enter") checkPw(); }} autoFocus />
          <button className="login-btn" onClick={checkPw}>Enter Dashboard</button>
        </div>
      </div>
    );
  }

  return <Dashboard onSignOut={() => setAuthed(false)} />;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [section, setSection] = useState("overview");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [pendingProviders, setPendingProviders] = useState<any[]>([]);
  const [pendingShelters, setPendingShelters] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({ owners: 0, providers: 0, shelters: 0, plusUsers: 0, familyUsers: 0, freeUsers: 0 });
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
      const users: any[] = [];
      let owners = 0, providers = 0, shelters = 0, plusUsers = 0, familyUsers = 0;
      const pendProv: any[] = [], pendShelt: any[] = [];
      usersSnap.forEach(d => {
        const data = { id: d.id, ...d.data() } as any;
        users.push(data);
        if (data.role === "owner") owners++;
        else if (data.role === "provider") { providers++; if (!data.approved) pendProv.push(data); }
        else if (data.role === "shelter") { shelters++; if (!data.approved) pendShelt.push(data); }
        if (data.plan === "plus") plusUsers++;
        if (data.plan === "family") familyUsers++;
      });
      setAllUsers(users.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setStats({ owners, providers, shelters, plusUsers, familyUsers, freeUsers: owners - plusUsers - familyUsers });
      setPendingProviders(pendProv);
      setPendingShelters(pendShelt);

      // Reviews
      const revSnap = await getDocs(query(collection(webDb, "reviews"), where("published", "==", false)));
      setPendingReviews(revSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Products
      const prodSnap = await getDocs(collection(webDb, "shopProducts"));
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
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
    showToast(`❌ Rejected.`);
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

  async function addProduct(product: any) {
    const ref = await addDoc(collection(webDb, "shopProducts"), { ...product, active: true, createdAt: serverTimestamp() });
    setProducts(p => [...p, { id: ref.id, ...product, active: true }]);
    showToast("✅ Product added!");
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    await deleteDoc(doc(webDb, "shopProducts", id));
    setProducts(p => p.filter(x => x.id !== id));
    showToast("🗑️ Product deleted.");
  }

  async function toggleProduct(id: string, active: boolean) {
    await updateDoc(doc(webDb, "shopProducts", id), { active: !active });
    setProducts(p => p.map(x => x.id === id ? { ...x, active: !active } : x));
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

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1>🐾 MyPetDex Admin</h1>
          <p className="subtitle">
            {totalUsers} users · {pendingCount > 0 ? `⚠️ ${pendingCount} pending` : "✅ All clear"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="refresh btn" onClick={loadAll}>↻ Refresh</button>
          <button className="btn btn-signout" onClick={onSignOut}>Sign Out</button>
        </div>
      </div>

      {/* Nav */}
      <div className="section-nav">
        {[
          { key: "overview", label: "📊 Overview" },
          { key: "users",    label: `👥 All Users (${totalUsers})` },
          { key: "shelters", label: `🏠 Shelters (${stats.shelters})` },
          { key: "products", label: `🛒 Products (${products.length})` },
          { key: "pending",  label: `⏳ Pending (${pendingCount})` },
        ].map(n => (
          <button key={n.key} className={`nav-btn${section === n.key ? " active" : ""}`} onClick={() => setSection(n.key)}>
            {n.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {section === "overview" && (
        <>
          <div className="revenue">
            <div className="revenue-label">EST. MONTHLY REVENUE</div>
            <div className="revenue-num">${revenue.toFixed(2)}</div>
            <div className="revenue-sub">{stats.plusUsers} Plus × $3.00 + {stats.familyUsers} Family × $5.00</div>
          </div>
          <div className="grid" style={{ marginTop: 16 }}>
            <StatBox num={stats.owners}      label="Pet Owners"    color="#4486F4" />
            <StatBox num={stats.providers}   label="Providers"     color="#3B82F6" />
            <StatBox num={stats.shelters}    label="Shelters"      color="#F5A623" />
            <StatBox num={stats.plusUsers}   label="Plus Plans"    color="#8B5CF6" />
            <StatBox num={stats.familyUsers} label="Family Plans"  color="#EC4899" />
            <StatBox num={stats.freeUsers}   label="Free Plans"    color="#64748B" />
          </div>
          <div className="grid" style={{ marginTop: 12 }}>
            <StatBox num={products.filter(p => p.store === "chewy").length}  label="Chewy Products"  color="#E53935" />
            <StatBox num={products.filter(p => p.store === "amazon").length} label="Amazon Products" color="#FF9900" />
          </div>
        </>
      )}

      {/* ── All Users ── */}
      {section === "users" && (
        <>
          <h2>👥 All Users</h2>
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.displayName || u.name || u.businessName || u.shelterName || "—"}</div>
                      <div style={{ color: "#64748B", fontSize: 12 }}>{u.email}</div>
                    </td>
                    <td><span className={`badge badge-${u.role || "owner"}`}>{u.role || "owner"}</span></td>
                    <td><span className={`badge badge-${u.plan || "free"}`}>{u.plan || "free"}</span></td>
                    <td style={{ color: "#64748B", fontSize: 12 }}>
                      {u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      {u.role === "provider" || u.role === "shelter"
                        ? <span className={`badge badge-${u.rejected ? "rejected" : u.approved ? "approved" : "pending"}`}>
                            {u.rejected ? "Rejected" : u.approved ? "Approved" : "Pending"}
                          </span>
                        : <span className="badge badge-approved">Active</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Shelters ── */}
      {section === "shelters" && (
        <>
          <h2>🏠 All Shelters</h2>
          {allUsers.filter(u => u.role === "shelter").length === 0
            ? <div className="empty">No shelters yet.</div>
            : allUsers.filter(u => u.role === "shelter").map(s => (
              <div key={s.id} className="card">
                <div className="card-top">
                  <div>
                    <div className="card-name">{s.shelterName || s.displayName || "Unnamed Shelter"}</div>
                    <div className="card-meta">{s.email}</div>
                    {s.city && <div className="card-meta">📍 {s.city}{s.state ? `, ${s.state}` : ""}</div>}
                    {s.phone && <div className="card-meta">📞 {s.phone}</div>}
                    {s.website && <div className="card-meta">🌐 {s.website}</div>}
                    {s.ein && <div className="card-meta">EIN: {s.ein}</div>}
                    {s.license && <div className="card-meta">License: {s.license}</div>}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                    <span className={`badge badge-${s.rejected ? "rejected" : s.approved ? "approved" : "pending"}`}>
                      {s.rejected ? "Rejected" : s.approved ? "Approved" : "Pending"}
                    </span>
                    <span className={`badge badge-${s.plan || "free"}`}>{s.plan || "free"}</span>
                  </div>
                </div>
              </div>
            ))
          }
        </>
      )}

      {/* ── Products ── */}
      {section === "products" && (
        <>
          <h2>🛒 Shop Products</h2>
          <AddProductForm onAdd={addProduct} />
          <hr className="divider" />
          <h2 style={{ marginTop: 8 }}>Chewy Products ({products.filter(p => p.store === "chewy").length})</h2>
          {products.filter(p => p.store === "chewy").length === 0
            ? <div className="empty">No Chewy products yet. Add one above.</div>
            : products.filter(p => p.store === "chewy").map(p => (
              <ProductRow key={p.id} product={p} onDelete={deleteProduct} onToggle={toggleProduct} />
            ))
          }
          <h2>Amazon Products ({products.filter(p => p.store === "amazon").length})</h2>
          {products.filter(p => p.store === "amazon").length === 0
            ? <div className="empty">No Amazon products yet.</div>
            : products.filter(p => p.store === "amazon").map(p => (
              <ProductRow key={p.id} product={p} onDelete={deleteProduct} onToggle={toggleProduct} />
            ))
          }
        </>
      )}

      {/* ── Pending ── */}
      {section === "pending" && (
        <>
          <h2>⏳ Pending Providers ({pendingProviders.length})</h2>
          {pendingProviders.length === 0
            ? <div className="empty">✅ No pending providers</div>
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

          <h2>⏳ Pending Shelters ({pendingShelters.length})</h2>
          {pendingShelters.length === 0
            ? <div className="empty">✅ No pending shelters</div>
            : pendingShelters.map(s => (
              <div key={s.id} className="card">
                <div className="card-top">
                  <div>
                    <div className="card-name">{s.shelterName || s.displayName || "Unknown"}</div>
                    <div className="card-meta">{s.email} · {s.city}, {s.state}</div>
                    {s.ein && <div className="card-meta">EIN: {s.ein}</div>}
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

          <h2>⭐ Pending Reviews ({pendingReviews.length})</h2>
          {pendingReviews.length === 0
            ? <div className="empty">✅ No pending reviews</div>
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
        </>
      )}
    </div>
  );
}

// ── Add Product Form ───────────────────────────────────────────────────────────
function AddProductForm({ onAdd }: { onAdd: (p: any) => void }) {
  const empty = { name: "", category: "Food", price: "", store: "chewy", url: "", emoji: "🛒" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!form.name.trim() || !form.url.trim() || !form.price.trim()) {
      alert("Name, price and URL are required."); return;
    }
    setSaving(true);
    await onAdd(form);
    setForm(empty);
    setSaving(false);
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>➕ Add New Product</div>
      <div className="form-row">
        <div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Store *</div>
          <select className="form-select" value={form.store} onChange={(e: any) => setForm(f => ({ ...f, store: e.target.value, emoji: e.target.value === "chewy" ? "🛒" : "📦" }))}>
            <option value="chewy">🛒 Chewy</option>
            <option value="amazon">📦 Amazon</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Category *</div>
          <select className="form-select" value={form.category} onChange={(e: any) => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Product Name *</div>
          <input className="form-input" placeholder="e.g. Royal Canin Adult Dog Food" value={form.name} onChange={(e: any) => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Price *</div>
          <input className="form-input" placeholder="e.g. $54.99" value={form.price} onChange={(e: any) => setForm(f => ({ ...f, price: e.target.value }))} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4 }}>Affiliate URL * (paste your Impact.com tracking link for Chewy, or Amazon link with tag)</div>
        <input className="form-input" placeholder="https://..." value={form.url} onChange={(e: any) => setForm(f => ({ ...f, url: e.target.value }))} />
      </div>
      <button className="btn btn-add" onClick={submit} disabled={saving}>
        {saving ? "Saving…" : "Add Product"}
      </button>
    </div>
  );
}

// ── Product Row ────────────────────────────────────────────────────────────────
function ProductRow({ product: p, onDelete, onToggle }: { product: any; onDelete: (id: string) => void; onToggle: (id: string, active: boolean) => void }) {
  return (
    <div className={`product-card${p.active ? "" : " toggle-inactive"}`}>
      <div className="product-emoji">{p.emoji}</div>
      <div className="product-info">
        <div className="product-name">{p.name}</div>
        <div className="product-meta">
          <span className={`store-${p.store}`}>{p.store === "chewy" ? "Chewy" : "Amazon"}</span>
          {" · "}{p.category}{" · "}{p.price}
        </div>
        <div className="url-cell" title={p.url}>{p.url}</div>
      </div>
      <div className="actions">
        <button className="btn" style={{ background: p.active ? "#FEF9C3" : "#DCFCE7", color: p.active ? "#92400E" : "#166534" }}
          onClick={() => onToggle(p.id, p.active)}>
          {p.active ? "Hide" : "Show"}
        </button>
        <button className="btn btn-delete" onClick={() => onDelete(p.id)}>🗑️</button>
      </div>
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
