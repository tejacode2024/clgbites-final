/**
 * CLGBITES Admin — Dashboard
 *
 * Changes in this version:
 *  - Global "New Order" toast (WiFi popup) shown on ALL tabs when a new order arrives
 *  - Overview recent orders: shows last 5 orders immediately from live state
 *  - ShowOff Clear: only clears the UI list (does NOT touch DB), only enabled after Export clicked AND orders DB is empty
 *  - Today's Orders Clear: only enabled after Export is clicked at least once
 *  - ShowOff Clear: same export-first rule
 *  - Export (Orders): calls /api/export → real .xlsx matching reference format
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu, X, LogOut, LayoutDashboard, UtensilsCrossed, ClipboardList, Star,
  Lock, Eye, EyeOff, AlertCircle, TrendingUp, ShoppingBag, Clock,
  CheckCircle, Banknote, CreditCard, Search, Download, Trash2,
  CheckCircle2, Phone, Pencil, Plus, Minus, Wifi, FileSpreadsheet,
  MessageCircle,
} from "lucide-react";

/* ─── ENV / API ──────────────────────────────────────────────────────────── */
const API = (import.meta as any).env?.VITE_API_URL ?? "";

async function fetchConfig(): Promise<{ site_online: boolean; item_flags: Record<string, boolean> }> {
  try { const r = await fetch(`${API}/api/config`); if (!r.ok) throw 0; return r.json(); }
  catch { return { site_online: true, item_flags: {} }; }
}
async function patchConfigAPI(update: object, secret: string) {
  return fetch(`${API}/api/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-secret": secret },
    body: JSON.stringify(update),
  }).then(r => r.json());
}
async function fetchOrders(secret: string): Promise<any[]> {
  try {
    const r = await fetch(`${API}/api/orders`, { headers: { "x-admin-secret": secret } });
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}
async function patchOrder(id: number | string, body: object, secret: string) {
  const r = await fetch(`${API}/api/orders?id=${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-secret": secret },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function deleteOrder(id: number | string, secret: string) {
  const r = await fetch(`${API}/api/orders?id=${id}`, {
    method: "DELETE",
    headers: { "x-admin-secret": secret },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function clearAllOrders(secret: string) {
  const r = await fetch(`${API}/api/orders`, {
    method: "DELETE",
    headers: { "x-admin-secret": secret },
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function exportXLSX(secret: string) {
  const r = await fetch(`${API}/api/export`, { headers: { "x-admin-secret": secret } });
  if (!r.ok) throw new Error(await r.text());
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clgbites-orders-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Menu data ──────────────────────────────────────────────────────────── */
const MENU_DATA = {
  biryani: { label: "Biryani", emoji: "🍚", items: [
    { id: "b1", name: "Chicken Dum Biryani", price: 199 }, { id: "b2", name: "Chicken Fry Piece Biryani", price: 219 },
    { id: "b3", name: "Chicken Mixed Biryani", price: 219 }, { id: "b4", name: "Chicken Mughali Biryani", price: 249 },
    { id: "b5", name: "Chicken Special Biryani", price: 249 }, { id: "b6", name: "Veg Biryani", price: 179 },
    { id: "b7", name: "Special Veg Biryani", price: 189 }, { id: "b8", name: "Paneer Biryani", price: 229 },
  ]},
  pulaoRice: { label: "Pulao & Fried Rice", emoji: "🍛", items: [
    { id: "p1", name: "Bagara Rice Chicken Fry", price: 219 }, { id: "p2", name: "Veg Fried Rice", price: 169 }, { id: "p3", name: "Sp Veg Fried Rice", price: 229 },
  ]},
  tandoori: { label: "Tandoori Specialties", emoji: "🔥", items: [
    { id: "t1", name: "Tandoori Chicken Full", price: 550 }, { id: "t2", name: "Tandoori Chicken Half", price: 300 },
    { id: "t3", name: "Tangdi Kabab (4 Pcs)", price: 390 }, { id: "t4", name: "Kalmi Kabab (4 Pcs)", price: 390 },
    { id: "t5", name: "Reshmi Kabab", price: 350 }, { id: "t6", name: "Chicken Tikka", price: 350 },
    { id: "t7", name: "Murg Malai Kabab", price: 350 }, { id: "t8", name: "Fish Tikka", price: 350 },
    { id: "t9", name: "Prawns Tikka", price: 450 }, { id: "t10", name: "Boti Kabab", price: 400 },
    { id: "t11", name: "Chicken Seekh Kebab", price: 350 }, { id: "t12", name: "Non Veg Tandoori Platter", price: 450 },
    { id: "t13", name: "Paneer Tikka", price: 300 }, { id: "t14", name: "Haraba Kabab", price: 250 },
    { id: "t15", name: "Veg Seekh Kebab", price: 250 }, { id: "t16", name: "Veg Tandoori Platter", price: 450 },
  ]},
};
const MENU_SUGGESTIONS = Object.values(MENU_DATA).flatMap(c => c.items.map(i => i.name));

type AdminTab = "overview" | "menu-items" | "orders" | "showoff";

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const C = {
  bg: "#FAF7F2", white: "#FFFFFF", brand: "#3D2C1E", orange: "#E8762C",
  muted: "#8B7355", mutedLt: "#B5A494", border: "#EDE5D8", borderSub: "#E8DDD0",
  stripe: "#FAF7F2", chip: "#F5EFE7", font: "'Inter', system-ui, sans-serif",
} as const;

/* ─── Style helpers ──────────────────────────────────────────────────────── */
const screen: React.CSSProperties = { minHeight: "100vh", background: C.bg, fontFamily: C.font };
const navbar: React.CSSProperties = { position: "fixed", top: 0, left: 0, right: 0, zIndex: 40, background: C.white, borderBottom: `1px solid ${C.borderSub}`, boxShadow: "0 1px 3px rgba(0,0,0,.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 56 };
const iconBtn: React.CSSProperties = { padding: 8, borderRadius: 10, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const card: React.CSSProperties = { background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.05)", padding: 16 };
const labelCap: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: ".06em" };
const inputStyle: React.CSSProperties = { width: "100%", background: C.stripe, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px 10px 38px", fontSize: 14, color: C.brand, outline: "none", boxSizing: "border-box" };
const divider: React.CSSProperties = { borderTop: `1px solid ${C.chip}`, margin: 0 };
const tagOrange: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.orange, background: "#FEF0E6", padding: "3px 8px", borderRadius: 8 };
const tagCOD: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#6F42C1", background: "#F0EBFD", padding: "2px 8px", borderRadius: 99 };
const tagPre: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#2C7BE8", background: "#E6EFFD", padding: "2px 8px", borderRadius: 99 };

function toggle(on: boolean): React.CSSProperties { return { position: "relative", display: "inline-flex", alignItems: "center", width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer", background: on ? C.orange : "#C8BBAA", flexShrink: 0, transition: "background .25s" }; }
function toggleThumb(on: boolean): React.CSSProperties { return { position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .25s" }; }
function navPill(active: boolean): React.CSSProperties { return { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 16px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, textAlign: "left", background: active ? C.orange : "transparent", color: active ? "#fff" : C.brand, transition: "all .15s" }; }
function btn(v: "orange" | "red" | "ghost" | "dark"): React.CSSProperties {
  const base: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", borderRadius: 12, cursor: "pointer", fontWeight: 600, transition: "all .15s" };
  if (v === "orange") return { ...base, background: C.orange, color: "#fff" };
  if (v === "red")    return { ...base, background: "#EF4444", color: "#fff" };
  if (v === "dark")   return { ...base, background: C.brand, color: "#fff" };
  return { ...base, background: C.stripe, color: C.brand, border: `1px solid ${C.border}` };
}
const sheetOverlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "flex-end", justifyContent: "center" };
const sheet: React.CSSProperties = { position: "relative", width: "100%", maxWidth: 440, background: C.white, borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(0,0,0,.15)", padding: "20px 20px 32px", fontFamily: C.font };

/* ─── keyframes injected once ────────────────────────────────────────────── */
function injectKF() {
  const id = "clg-kf"; if (document.getElementById(id)) return;
  const s = document.createElement("style"); s.id = id;
  s.textContent = `@keyframes clg-spin{to{transform:rotate(360deg)}}@keyframes clg-pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes clg-slidein{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
  document.head.appendChild(s);
}

/* ─── Local order type ───────────────────────────────────────────────────── */
interface OrderItem { name: string; qty: number }
interface LocalOrder {
  id: number | string; token: string; name: string; phone: string;
  items: OrderItem[]; total: number; status: "pending" | "delivered";
  payment: "COD" | "Prepaid"; paymentStatus?: "paid" | "unpaid" | "pending";
  pendingAmount?: number; orderedAt: Date; isNew?: boolean; fadingOut?: boolean;
}
interface NewOrderInfo { name: string; count: number; }
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDT(d: Date) { const dd = String(d.getDate()).padStart(2,"0"), mon = MONTHS[d.getMonth()]; let h = d.getHours(); const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${dd} ${mon} | ${String(h).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")} ${ap}`; }
function tokenNum(t: string) { return parseInt(t.replace(/\D/g,""), 10) || 0; }
function fmtMoney(n: number) { return `₹${n}`; }

function apiToLocal(o: any): LocalOrder {
  return {
    id: o.id,
    token: `#${String(o.token_number ?? o.id).padStart(3, "0")}`,
    name: o.customer_name ?? "—",
    phone: o.customer_phone ?? "—",
    items: (o.items ?? []).map((it: any) => ({ name: it.name, qty: it.qty ?? 1 })),
    total: o.total ?? 0,
    status: o.deliver_status === "delivered" ? "delivered" : "pending",
    payment: o.payment_mode === "cod" ? "COD" : "Prepaid",
    paymentStatus: o.pay_status !== "pending" ? o.pay_status : undefined,
    pendingAmount: o.pending_amount ?? undefined,
    orderedAt: new Date(o.created_at ?? Date.now()),
  };
}
/* ─── NAV ────────────────────────────────────────────────────────────────── */
const NAV: [AdminTab, string, typeof LayoutDashboard][] = [
  ["overview", "Overview", LayoutDashboard], ["menu-items", "Menu Items", UtensilsCrossed],
  ["orders", "Today's Orders", ClipboardList], ["showoff", "Show Off", Star],
];

/* ══════════════════════════════════════════════════════════════════════════
   GLOBAL NEW-ORDER TOAST — shown on every tab
══════════════════════════════════════════════════════════════════════════ */
function GlobalToast({ msg, onClose }: { msg: NewOrderInfo | null; onClose: () => void }) {
  if (!msg) return null;
  return (
    <div style={{
      position: "fixed", top: 68, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, display: "flex", alignItems: "center", gap: 10,
      background: "#FFF3E6", color: C.brand,
      padding: "10px 16px 10px 14px", borderRadius: 99,
      boxShadow: "0 4px 20px rgba(232,118,44,.22)",
      border: `1.5px solid ${C.orange}`,
      animation: "clg-slidein .3s ease", maxWidth: "85vw",
    }}>
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Wifi size={13} color="#fff" />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: C.muted, fontWeight: 500 }}>New order from</p>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: C.brand }}>{msg.name}</p>
      </div>
      <button onClick={onClose} style={{ marginLeft: 4, background: C.chip, border: `1px solid ${C.border}`, borderRadius: 99, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
        <X size={11} color={C.brand} />
      </button>
    </div>
  );
}
/* ══════════════════════════════════════════════════════════════════════════
   DRAWER
══════════════════════════════════════════════════════════════════════════ */
function Drawer({ open, onClose, current, onNav, onLogout }: { open: boolean; onClose: () => void; current: AdminTab; onNav: (t: AdminTab) => void; onLogout: () => void; }) {
  return (<>
    {open && <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)" }} />}
    <aside style={{ position: "fixed", top: 0, left: 0, height: "100%", width: 272, background: C.white, zIndex: 51, boxShadow: "4px 0 32px rgba(0,0,0,.12)", transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform .3s cubic-bezier(.4,0,.2,1)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, borderBottom: `1px solid ${C.borderSub}`, flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.brand }}>CLGBITES <span style={{ color: C.orange }}>Admin</span></span>
        <button onClick={onClose} style={iconBtn}><X size={18} color={C.brand} /></button>
      </div>
      <nav style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
        {NAV.map(([id, label, Icon]) => (
          <button key={id} onClick={() => { onNav(id); onClose(); }} style={navPill(current === id)}>
            <Icon size={18} style={{ flexShrink: 0 }} />{label}
          </button>
        ))}
      </nav>
      <div style={{ padding: 16, borderTop: `1px solid ${C.border}` }}>
        <button onClick={onLogout} style={{ ...navPill(false), color: "#EF4444" }}><LogOut size={18} style={{ flexShrink: 0 }} />Logout</button>
      </div>
    </aside>
  </>);
}

/* ══════════════════════════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════════════════════════ */
function Navbar({ onMenu, onLogout, onExit, msg }: { onMenu: () => void; onLogout: () => void; onExit: () => void; msg: string; }) {
  return (
    <header style={navbar}>
      <button onClick={onMenu} style={iconBtn}><Menu size={20} color={C.brand} /></button>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.brand }}>CLGBITES <span style={{ color: C.orange }}>Admin</span></span>
        {msg && <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: msg.includes("✓") ? "#D1FAE5" : "#FEE2E2", color: msg.includes("✓") ? "#065F46" : "#B91C1C" }}>{msg}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={onExit} style={{ ...iconBtn, fontSize: 12, fontWeight: 600, color: C.muted, padding: "6px 10px" }}>← Site</button>
        <button onClick={onLogout} style={iconBtn}><LogOut size={18} color={C.brand} /></button>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════════════════ */
function AdminLogin({ onLogin, onExit, secret }: { onLogin: (p: string) => void; onExit: () => void; secret: string; }) {
  const [pw, setPw] = useState(""); const [show, setShow] = useState(false);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);
  const submit = (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setLoading(true);
    setTimeout(() => {
      if (pw === secret || pw === ((import.meta as any).env?.VITE_ADMIN_PASSWORD ?? "")) onLogin(pw);
      else { setErr("Incorrect password. Please try again."); setLoading(false); }
    }, 600);
  };
  return (
    <div style={{ ...screen, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, background: C.orange, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(232,118,44,.35)" }}>
          <UtensilsCrossed size={32} color="#fff" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.brand, margin: 0, letterSpacing: "-.5px" }}>CLGBITES</h1>
        <p style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 2 }}>Admin Portal</p>
      </div>
      <div style={{ width: "100%", maxWidth: 360, background: C.white, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 4px 24px rgba(0,0,0,.08)", padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.brand, margin: "0 0 4px" }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px" }}>Enter your password to access the dashboard</p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelCap}>Password</label>
            <div style={{ position: "relative", marginTop: 6 }}>
              <Lock size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input type={show ? "text" : "password"} placeholder="Enter admin password" value={pw}
                onChange={e => { setPw(e.target.value); setErr(""); }} required autoFocus autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: 40 }} />
              <button type="button" onClick={() => setShow(!show)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 12px" }}>
              <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} /><span style={{ fontSize: 12, color: "#EF4444" }}>{err}</span>
            </div>
          )}
          <button type="submit" disabled={loading || !pw}
            style={{ ...btn("orange"), padding: "13px 0", fontSize: 15, borderRadius: 12, opacity: loading || !pw ? .55 : 1, cursor: loading || !pw ? "not-allowed" : "pointer" }}>
            {loading ? <><span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", display: "inline-block", animation: "clg-spin .7s linear infinite" }} /> Signing in…</> : "Login"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 12, color: "#C4B49E", marginTop: 20 }}>CLGBITES Admin · Restricted Access</p>
      </div>
      <button onClick={onExit} style={{ marginTop: 14, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted }}>← Back to Site</button>
      <p style={{ fontSize: 11, color: "#C4B49E", marginTop: 24 }}>© 2026 CLGBITES</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   OVERVIEW
══════════════════════════════════════════════════════════════════════════ */
function AdminOverview({ siteOnline, setSiteOnline, patchConfig, saving, orders, loading }: {
  siteOnline: boolean; setSiteOnline: (v: boolean) => void; patchConfig: (u: object) => Promise<void>; saving: boolean;
  orders: any[]; loading: boolean;
}) {
  const rev    = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const codRev = orders.filter((o: any) => o.payment_mode === "cod").reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const preRev = orders.filter((o: any) => o.payment_mode !== "cod").reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const stats = [
    { label: "Revenue",      value: `₹${rev}`,         Icon: TrendingUp,  color: "#E8762C", bg: "#FEF0E6" },
    { label: "Total Orders", value: `${orders.length}`, Icon: ShoppingBag, color: "#2C7BE8", bg: "#E6EFFD" },
    { label: "Pending",      value: `${orders.length}`, Icon: Clock,       color: "#E8B22C", bg: "#FEF7E6" },
    { label: "Delivered",    value: "0",                Icon: CheckCircle, color: "#28A745", bg: "#E6F5EA" },
    { label: "COD",          value: `₹${codRev}`,      Icon: Banknote,    color: "#6F42C1", bg: "#F0EBFD" },
    { label: "Prepaid",      value: `₹${preRev}`,      Icon: CreditCard,  color: "#20C997", bg: "#E6FBF6" },
  ];

  // Last 5 orders, most recent first — derived directly from orders prop (no delay)
  const recentOrders = [...orders].reverse().slice(0, 5);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Site status */}
      <div style={card}>
        <p style={{ ...labelCap, marginBottom: 12 }}>Site Status</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.brand, margin: 0 }}>{siteOnline ? "Orders Open" : "Orders Closed"}</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{siteOnline ? "Accepting new orders" : "Not accepting orders"}</p>
          </div>
          <button onClick={() => { const n = !siteOnline; setSiteOnline(n); patchConfig({ site_online: n }); }} disabled={saving} style={toggle(siteOnline)}>
            <span style={toggleThumb(siteOnline)} />
          </button>
        </div>
        <div style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: siteOnline ? "#ECFDF5" : "#FEF2F2", fontSize: 12, fontWeight: 600, color: siteOnline ? "#065F46" : "#B91C1C" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: siteOnline ? "#10B981" : "#EF4444", animation: siteOnline ? "clg-pulse 1.5s infinite" : "none" }} />
          {siteOnline ? "Live" : "Offline"}
        </div>
      </div>
      {/* Stats */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={labelCap}>Today's Stats</p>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#065F46" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", animation: "clg-pulse 1.5s infinite", display: "inline-block" }} />Live
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {stats.map(({ label, value, Icon, color, bg }) => (
            <div key={label} style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={15} color={color} /></div>
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: C.brand, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
      {/* Recent orders — last 5, newest first, immediate from live state */}
      <div style={card}>
        <p style={{ ...labelCap, marginBottom: 12 }}>Recent Orders</p>
        {loading && orders.length === 0
          ? <p style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: C.muted }}>Loading…</p>
          : recentOrders.length === 0
          ? <p style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: C.muted }}>No orders yet today 🎉</p>
          : <div>
              {recentOrders.map((o: any, i: number) => {
                const tokenIdx = orders.indexOf(o) + 1;
                return (
                  <div key={o.id}>
                    {i > 0 && <hr style={divider} />}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={tagOrange}>#{String(tokenIdx).padStart(3, "0")}</span>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: C.brand, margin: 0 }}>{o.customer_name}</p>
                          <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{(o.items ?? []).map((it: any) => it.name).join(", ")}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: C.brand, margin: 0 }}>₹{o.total}</p>
                        <span style={o.payment_mode === "cod" ? tagCOD : tagPre}>{o.payment_mode === "cod" ? "COD" : "Prepaid"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MENU ITEMS
══════════════════════════════════════════════════════════════════════════ */
function AdminMenuItems({ itemFlags, toggleItem }: { itemFlags: Record<string, boolean>; toggleItem: (id: string) => void; }) {
  const [search, setSearch] = useState("");
  const filtered = Object.entries(MENU_DATA).map(([k, cat]) => ({ k, ...cat, items: cat.items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) })).filter(c => c.items.length > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ position: "relative" }}>
        <Search size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input type="text" placeholder="Search menu items…" value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}><Search size={36} style={{ opacity: .3, display: "block", margin: "0 auto 8px" }} /><p style={{ fontSize: 13 }}>No items match</p></div>}
      {filtered.map(cat => (
        <div key={cat.k} style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: C.stripe, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 16 }}>{cat.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.brand }}>{cat.label}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: C.muted, background: C.border, padding: "2px 8px", borderRadius: 99 }}>{cat.items.length} items</span>
          </div>
          {cat.items.map((item, i) => { const on = itemFlags[item.id] !== false; return (
            <div key={item.id}>
              {i > 0 && <hr style={divider} />}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: on ? C.brand : C.muted, margin: 0, textDecoration: on ? "none" : "line-through" }}>{item.name}</p>
                  <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>₹{item.price}</p>
                </div>
                <button onClick={() => toggleItem(item.id)} style={toggle(on)}><span style={toggleThumb(on)} /></button>
              </div>
            </div>
          ); })}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ORDERS — modals
══════════════════════════════════════════════════════════════════════════ */
function UpdateModal({ order, onSave, onClose }: { order: LocalOrder; onSave: (items: OrderItem[]) => void; onClose: () => void; }) {
  const [items, setItems] = useState<OrderItem[]>(order.items.map(i => ({ ...i })));
  const [newName, setNewName] = useState(""); const [newQty, setNewQty] = useState(1);
  const [showSugg, setShowSugg] = useState(false); const [hiIdx, setHiIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const sugg = newName.trim().length > 0 ? MENU_SUGGESTIONS.filter(s => s.toLowerCase().includes(newName.toLowerCase())) : [];
  const selSugg = (name: string) => { setNewName(name); setShowSugg(false); setHiIdx(-1); setTimeout(() => inputRef.current?.focus(), 0); };
  const chQty = (idx: number, d: number) => setItems(p => p.map((it, i) => i === idx && (it.qty + d) >= 1 ? { ...it, qty: it.qty + d } : it));
  const remItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx));
  const addItem = () => { const n = newName.trim(); if (!n) return; const ex = items.findIndex(i => i.name.toLowerCase() === n.toLowerCase()); setItems(p => ex >= 0 ? p.map((it, i) => i === ex ? { ...it, qty: it.qty + newQty } : it) : [...p, { name: n, qty: newQty }]); setNewName(""); setNewQty(1); setShowSugg(false); };
  const kd = (e: React.KeyboardEvent<HTMLInputElement>) => { if (!showSugg || !sugg.length) { if (e.key === "Enter") addItem(); return; } if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx(i => Math.min(i + 1, sugg.length - 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHiIdx(i => Math.max(i - 1, -1)); } else if (e.key === "Enter") { e.preventDefault(); hiIdx >= 0 ? selSugg(sugg[hiIdx]) : addItem(); } else if (e.key === "Escape") setShowSugg(false); };
  const qBtn: React.CSSProperties = { width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, cursor: "pointer" };
  return (
    <div style={sheetOverlay}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div style={sheet}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div><h3 style={{ fontSize: 15, fontWeight: 700, color: C.brand, margin: 0 }}>Update Order</h3><p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{order.token} · {order.name}</p></div>
          <button onClick={onClose} style={iconBtn}><X size={16} color={C.brand} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {items.length === 0 && <p style={{ textAlign: "center", fontSize: 12, color: C.muted, padding: "12px 0" }}>No items — add below.</p>}
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, background: C.stripe, borderRadius: 12, padding: "10px 12px" }}>
              <span style={{ flex: 1, fontSize: 13, color: C.brand }}>{item.name}</span>
              <button onClick={() => chQty(idx, -1)} disabled={item.qty <= 1} style={{ ...qBtn, opacity: item.qty <= 1 ? .4 : 1 }}><Minus size={11} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.brand, width: 20, textAlign: "center" }}>{item.qty}</span>
              <button onClick={() => chQty(idx, 1)} style={qBtn}><Plus size={11} /></button>
              <button onClick={() => remItem(idx)} style={{ ...qBtn, background: "#FEF2F2", border: "1px solid #FECACA", marginLeft: 4 }}><Trash2 size={11} color="#EF4444" /></button>
            </div>
          ))}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginBottom: 20 }}>
          <p style={{ ...labelCap, marginBottom: 8 }}>Add New Item</p>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input ref={inputRef} type="text" placeholder="Type to search menu…" value={newName}
                onChange={e => { setNewName(e.target.value); setShowSugg(true); setHiIdx(-1); }}
                onFocus={() => newName.trim() && setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 150)} onKeyDown={kd}
                style={{ ...inputStyle, paddingLeft: 12 }} />
              {showSugg && sugg.length > 0 && (
                <div style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,.1)", zIndex: 10, maxHeight: 160, overflowY: "auto" }}>
                  {sugg.map((s, i) => (
                    <button key={s} type="button" onMouseDown={() => selSugg(s)}
                      style={{ width: "100%", textAlign: "left", padding: "8px 12px", fontSize: 13, border: "none", cursor: "pointer", background: i === hiIdx ? C.orange : C.white, color: i === hiIdx ? "#fff" : C.brand }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onClick={() => setNewQty(q => Math.max(1, q - 1))} style={qBtn}><Minus size={11} /></button>
              <span style={{ fontSize: 13, fontWeight: 700, width: 20, textAlign: "center" }}>{newQty}</span>
              <button onClick={() => setNewQty(q => q + 1)} style={qBtn}><Plus size={11} /></button>
            </div>
            <button onClick={addItem} style={{ ...btn("dark"), padding: "6px 12px", fontSize: 12, borderRadius: 10 }}><Plus size={12} />Add</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ ...btn("ghost"), flex: 1, padding: "11px 0", fontSize: 13 }}>Cancel</button>
          <button onClick={() => onSave(items)} style={{ ...btn("orange"), flex: 1, padding: "11px 0", fontSize: 13 }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function PayModal({ order, onConfirm, onClose }: { order: LocalOrder; onConfirm: (s: "paid" | "unpaid" | "pending", a?: number) => void; onClose: () => void; }) {
  const [sel, setSel] = useState<"paid" | "unpaid" | "pending" | null>(null);
  const [amt, setAmt] = useState("");
  const ok = sel === "paid" || sel === "unpaid" || (sel === "pending" && amt.trim() !== "");
  const optSt = (opt: string): React.CSSProperties => ({ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 14px", borderRadius: 12, border: `1px solid ${sel === opt ? (opt === "paid" ? "#86EFAC" : opt === "unpaid" ? "#FCA5A5" : "#FCD34D") : C.border}`, background: sel === opt ? (opt === "paid" ? "#F0FDF4" : opt === "unpaid" ? "#FEF2F2" : "#FFFBEB") : C.white, color: sel === opt ? (opt === "paid" ? "#166534" : opt === "unpaid" ? "#B91C1C" : "#92400E") : C.brand, fontSize: 13, fontWeight: 500, cursor: "pointer" });
  return (
    <div style={sheetOverlay}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div style={sheet}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: C.brand, margin: 0 }}>Payment Status</h3>
          <button onClick={onClose} style={iconBtn}><X size={16} color={C.brand} /></button>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 20px" }}>{order.token} · {order.name} · {fmtMoney(order.total)}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          <button onClick={() => setSel("paid")} style={optSt("paid")}><CheckCircle2 size={16} />Paid</button>
          <button onClick={() => setSel("unpaid")} style={optSt("unpaid")}><X size={16} />Not Paid</button>
          <button onClick={() => setSel("pending")} style={optSt("pending")}><FileSpreadsheet size={16} />Pending</button>
          {sel === "pending" && <div style={{ position: "relative" }}><span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.muted }}>₹</span><input type="number" placeholder="Enter amount" value={amt} onChange={e => setAmt(e.target.value)} style={{ ...inputStyle, paddingLeft: 24 }} /></div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ ...btn("ghost"), flex: 1, padding: "11px 0", fontSize: 13 }}>Cancel</button>
          <button disabled={!ok} onClick={() => onConfirm(sel!, sel === "pending" ? Number(amt) : undefined)} style={{ ...btn("orange"), flex: 1, padding: "11px 0", fontSize: 13, opacity: ok ? 1 : .45, cursor: ok ? "pointer" : "not-allowed" }}>Confirm &amp; Deliver</button>
        </div>
      </div>
    </div>
  );
}

function DelConfirm({ order, onConfirm, onClose }: { order: LocalOrder; onConfirm: () => void; onClose: () => void; }) {
  return (
    <div style={sheetOverlay}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.45)", backdropFilter: "blur(3px)" }} onClick={onClose} />
      <div style={sheet}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, background: "#FEF2F2", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Trash2 size={18} color="#EF4444" /></div>
          <div><h3 style={{ fontSize: 15, fontWeight: 700, color: C.brand, margin: 0 }}>Delete Order?</h3><p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{order.token} · {order.name}</p></div>
        </div>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>This will permanently remove this order.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ ...btn("ghost"), flex: 1, padding: "11px 0", fontSize: 13 }}>Cancel</button>
          <button onClick={onConfirm} style={{ ...btn("red"), flex: 1, padding: "11px 0", fontSize: 13 }}>Delete Order</button>
        </div>
      </div>
    </div>
  );
}

function PayBadge({ s, a }: { s?: string; a?: number }) {
  const base: React.CSSProperties = { fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99 };
  if (s === "paid")    return <span style={{ ...base, background: "#ECFDF5", color: "#065F46" }}>Paid</span>;
  if (s === "unpaid")  return <span style={{ ...base, background: "#FEF2F2", color: "#B91C1C" }}>Unpaid</span>;
  if (s === "pending") return <span style={{ ...base, background: "#FEF9C3", color: "#92400E" }}>Pending {a ? `₹${a}` : ""}</span>;
  return null;
}

function OrderCard({ order, onUpd, onDel, onDlv }: { order: LocalOrder; onUpd: () => void; onDel: () => void; onDlv: () => void; }) {
  const dlvd = order.status === "delivered";
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.05)", overflow: "hidden", opacity: order.fadingOut ? .3 : dlvd ? .55 : 1, transform: order.fadingOut ? "scale(.97)" : "scale(1)", transition: "all .5s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {order.isNew && <span style={{ fontSize: 10, fontWeight: 800, background: C.orange, color: "#fff", padding: "2px 7px", borderRadius: 99, animation: "clg-pulse 1.5s infinite" }}>NEW</span>}
          <span style={tagOrange}>{order.token}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={order.payment === "COD" ? tagCOD : tagPre}>{order.payment}</span>
          <PayBadge s={order.paymentStatus} a={order.pendingAmount} />
        </div>
      </div>
      <div style={{ padding: "0 14px 8px" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: C.brand, margin: 0 }}>{order.name}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 12, color: C.muted }}><Phone size={11} />{order.phone}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2, fontSize: 11, color: C.mutedLt }}><Clock size={10} />{fmtDT(order.orderedAt)}</div>
      </div>
      <div style={{ margin: "0 14px 10px", background: C.stripe, borderRadius: 10, padding: "8px 12px" }}>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < order.items.length - 1 ? 4 : 0 }}>
            <span style={{ fontSize: 12, color: C.brand }}>{item.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginLeft: 8 }}>×{item.qty}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px 12px" }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: C.brand }}>{fmtMoney(order.total)}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={onUpd} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${C.border}`, background: C.stripe, cursor: "pointer" }}><Pencil size={13} color={C.brand} /></button>
          <button onClick={onDel} style={{ width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA", cursor: "pointer" }}><Trash2 size={13} color="#EF4444" /></button>
          <button onClick={() => !dlvd && onDlv()} disabled={dlvd} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 600, cursor: dlvd ? "default" : "pointer", background: dlvd ? "#ECFDF5" : C.orange, color: dlvd ? "#065F46" : "#fff" }}>
            <CheckCircle2 size={13} />{dlvd ? "Delivered" : "Deliver"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TODAY'S ORDERS TAB
   - Export: /api/export → real .xlsx
   - Clear: only enabled after Export clicked at least once; clears DB
══════════════════════════════════════════════════════════════════════════ */
function AdminOrders({ apiOrders, loading, onRefresh, secret, onOrdersChanged }: {
  apiOrders: any[]; loading: boolean; onRefresh: () => void; secret: string; onOrdersChanged: () => void;
}) {
  const [orders, setOrders] = useState<LocalOrder[]>(() => apiOrders.map(apiToLocal));
  const [search, setSearch] = useState("");
  const [upd, setUpd] = useState<LocalOrder | null>(null);
  const [pay, setPay] = useState<LocalOrder | null>(null);
  const [del, setDel] = useState<LocalOrder | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Clear only enabled after Export has been clicked at least once
  const [exported, setExported] = useState(false);
   const prevOrderCount = useRef(0);

  useEffect(() => {
    // If new orders arrive after export, require re-export before clearing
    if (apiOrders.length > prevOrderCount.current && exported) {
      setExported(false);
    }
    prevOrderCount.current = apiOrders.length;
  }, [apiOrders.length]);

 useEffect(() => {
    setOrders(prev => {
  const prevMap = new Map(prev.map(o => [o.id, o]));
return apiOrders.map((o) => {
  const existing = prevMap.get(o.id);
  const fresh = apiToLocal(o);
  if (!existing) return fresh;
  return { ...fresh, status: existing.status, paymentStatus: existing.paymentStatus, pendingAmount: existing.pendingAmount };
}).filter(Boolean) as LocalOrder[];
});
  }, [apiOrders]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);

  const showToast = (m: string) => setToast(m);

 const doUpd = async (items: OrderItem[]) => {
  if (!upd) return; setBusy(true);
  // Recalculate total from MENU_DATA prices
  const allMenuItems = Object.values(MENU_DATA).flatMap(c => c.items);
  const newTotal = items.reduce((sum, item) => {
    const menuItem = allMenuItems.find(m => m.name === item.name);
    return sum + (menuItem ? menuItem.price * item.qty : 0);
  }, 0) || upd.total; // fallback to old total if items not in menu
  try {
    await patchOrder(upd.id, { items, total: newTotal }, secret);
    setOrders(p => p.map(o => o.id === upd.id ? { ...o, items, total: newTotal } : o));
    showToast("Order updated ✓"); onOrdersChanged();
  }
  catch { showToast("Update failed ✗"); }
  setBusy(false); setUpd(null);
};

  const doDel = async () => {
    if (!del) return; setBusy(true);
    try { await deleteOrder(del.id, secret); setOrders(p => p.filter(o => o.id !== del.id)); showToast("Order deleted ✓"); onOrdersChanged(); }
    catch { showToast("Delete failed ✗"); }
    setBusy(false); setDel(null);
  };
const doDlv = async (status: "paid" | "unpaid" | "pending", amount?: number) => {
    if (!pay) return;
    const id = pay.id;
    setOrders(p => p.map(o => o.id === id ? { ...o, fadingOut: true, paymentStatus: status, pendingAmount: amount } : o));
    setTimeout(() => setOrders(p => p.map(o => o.id === id ? { ...o, fadingOut: false, status: "delivered" } : o)), 600);
    setPay(null);
    try {
      await patchOrder(id, {
        deliver_status: "delivered",
        pay_status: status,
        pending_amount: status === "pending" ? (amount ?? null) : null,
      }, secret);
    } catch { showToast("Deliver save failed ✗"); }
  };
  /* Export → /api/export → .xlsx; enables Clear button */
  const doExport = async () => {
    setBusy(true);
    try { await exportXLSX(secret); setExported(true); showToast("Exported ✓"); }
    catch { showToast("Export failed ✗"); }
    setBusy(false);
  };

  /* Clear — only available after Export clicked; clears DB */
  const doClear = async () => {
    if (!exported) return;
    if (!window.confirm("Clear ALL orders from the database?\n\nToken numbers will restart from #001 on the next order.")) return;
    setBusy(true);
    try { await clearAllOrders(secret); setOrders([]); setExported(false); showToast("All orders cleared ✓"); onOrdersChanged(); }
    catch { showToast("Clear failed ✗"); }
    setBusy(false);
  };

  const q = search.trim().toLowerCase();
  const match = (o: LocalOrder) => !q || o.name.toLowerCase().includes(q) || o.token.toLowerCase().includes(q) || o.phone.includes(q);
  const pending   = orders.filter(o => o?.status === "pending"   && match(o));
  const delivered = orders.filter(o => o?.status === "delivered" && match(o)).sort((a, b) => tokenNum(a.token) - tokenNum(b.token));

  const secLabel = (label: string, count: number, color: string, bg: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 600, background: bg, color, padding: "1px 7px", borderRadius: 99 }}>{count}</span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {upd && <UpdateModal order={upd} onSave={doUpd} onClose={() => setUpd(null)} />}
      {pay && <PayModal order={pay} onConfirm={doDlv} onClose={() => setPay(null)} />}
      {del && <DelConfirm order={del} onConfirm={doDel} onClose={() => setDel(null)} />}
    {toast && <div style={{ position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: 8, background: "#FFF3E6", color: C.brand, fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 99, boxShadow: "0 4px 16px rgba(232,118,44,.18)", border: `1px solid ${C.orange}`, maxWidth: "85vw" }}><Wifi size={13} color={C.orange} style={{ flexShrink: 0 }} />{toast}</div>}
      {/* toolbar */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input type="text" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
        </div>
        <button onClick={onRefresh} disabled={loading || busy} style={{ ...btn("ghost"), padding: "0 13px", fontSize: 15, opacity: loading ? .5 : 1 }}>{loading ? "…" : "↻"}</button>
        <button onClick={doExport} disabled={busy || orders.length === 0} style={{ ...btn("orange"), padding: "0 13px", fontSize: 12, opacity: orders.length === 0 ? .5 : 1 }}><Download size={13} />Export</button>
        <button
          onClick={doClear}
          disabled={!exported || busy || orders.length === 0}
          title={!exported ? "Export first to enable Clear" : "Clear all orders from DB"}
          style={{ ...btn(exported ? "red" : "ghost"), padding: "0 13px", fontSize: 12, opacity: exported && orders.length > 0 ? 1 : .4, cursor: exported && orders.length > 0 ? "pointer" : "not-allowed" }}
        ><Trash2 size={13} />Clear</button>
      </div>
      {/* summary */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: C.muted }}><strong style={{ color: C.brand }}>{orders.length}</strong> orders · <span style={{ color: "#D97706" }}>{orders.filter(o => o.status === "pending").length}</span> pending · <span style={{ color: "#065F46" }}>{orders.filter(o => o.status === "delivered").length}</span> delivered</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#065F46" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", animation: "clg-pulse 1.5s infinite", display: "inline-block" }} />Live</span>
      </div>
      {/* pending */}
      {(pending.length > 0 || (!q && orders.filter(o => o.status === "pending").length === 0)) && (
        <div>
          {secLabel("Pending Orders", pending.length, "#D97706", "#FEF9C3")}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pending.map(o => <OrderCard key={String(o.id)} order={o} onUpd={() => setUpd(o)} onDel={() => setDel(o)} onDlv={() => setPay(o)} />)}
            {pending.length === 0 && !q && <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}><CheckCircle2 size={32} style={{ opacity: .2, display: "block", margin: "0 auto 8px" }} /><p style={{ fontSize: 13, fontWeight: 500 }}>All caught up!</p></div>}
          </div>
        </div>
      )}
      {/* delivered */}
      {delivered.length > 0 && (
        <div>
          {secLabel("Delivered Orders", delivered.length, "#065F46", "#ECFDF5")}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {delivered.map(o => <OrderCard key={String(o.id)} order={o} onUpd={() => setUpd(o)} onDel={() => setDel(o)} onDlv={() => setPay(o)} />)}
          </div>
        </div>
      )}
      {orders.length === 0 && <div style={{ textAlign: "center", padding: "64px 0", color: C.muted }}><ClipboardList size={40} style={{ opacity: .2, display: "block", margin: "0 auto 8px" }} /><p style={{ fontSize: 13, fontWeight: 500 }}>No orders today</p></div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SHOW OFF
   - Derived from live orders state
   - Export: local CSV of tally (enabled always when items exist)
   - Clear: ONLY clears the UI list (does NOT touch DB)
             Only enabled after Export clicked AND orders DB is empty
══════════════════════════════════════════════════════════════════════════ */
function AdminShowOff({ orders, secret, onOrdersChanged }: { orders: any[]; secret: string; onOrdersChanged: () => void; }) {
  const tally: Record<string, { name: string; qty: number }> = {};
  orders.forEach((o: any) => (o.items ?? []).forEach((it: any) => {
    if (!tally[it.name]) tally[it.name] = { name: it.name, qty: 0 };
    tally[it.name].qty += it.qty ?? 1;
  }));
  const items = Object.values(tally).sort((a, b) => b.qty - a.qty);
  const total = items.reduce((s, i) => s + i.qty, 0);
  const top = items[0];

  // UI-only cleared state — does not touch DB
  const [uiCleared, setUiCleared] = useState(false);
  const [exported, setExported]   = useState(false);
  const [toast, setToast]         = useState<string | null>(null);

  // Reset UI-cleared when new orders come in
  useEffect(() => { if (orders.length > 0) setUiCleared(false); }, [orders.length]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); }, [toast]);

  const display = uiCleared ? [] : items;

  // Clear only allowed when: export done AND orders DB is empty (orders.length === 0)
  const canClear = exported && orders.length === 0 && !uiCleared;

  const doWA = () => {
    const lines = display.map(i => `${i.name} — ${i.qty}`).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(`🍛 *CLGBITES — Today's Bestsellers*\n\n${lines}\n\nTotal: ${total}`)}`, "_blank");
  };

  const doExport = () => {
    const now = new Date();
    const ds = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const rows: string[][] = [[`CLGBITES - Show Off | ${ds}`], [], ["S.No", "Item Name", "Qty"], ...display.map((it, i) => [String(i + 1), it.name, String(it.qty)])];
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `clgbites-showoff-${now.toISOString().slice(0, 10)}.csv`; a.click();
    setExported(true);
    setToast("Exported ✓");
  };

  /* Clear = UI list only; DB must already be empty; export must have been done */
  const doClear = () => {
    if (!canClear) return;
    setUiCleared(true);
    setExported(false);
    setToast("List cleared ✓");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {toast && <div style={{ position: "fixed", top: 64, left: "50%", transform: "translateX(-50%)", zIndex: 50, display: "flex", alignItems: "center", gap: 8, background: "#FFF3E6", color: C.brand, fontSize: 12, fontWeight: 600, padding: "8px 16px", borderRadius: 99, boxShadow: "0 4px 16px rgba(232,118,44,.18)", border: `1px solid ${C.orange}`, maxWidth: "85vw" }}><Wifi size={13} color={C.orange} style={{ flexShrink: 0 }} />{toast}</div>}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={doWA} disabled={display.length === 0} style={{ ...btn("ghost"), flex: 1, padding: "13px 0", fontSize: 13, fontWeight: 700, background: "#25D366", color: "#fff", borderColor: "transparent", opacity: display.length === 0 ? .5 : 1 }}><MessageCircle size={16} />Share on WhatsApp</button>
        <button onClick={doExport} disabled={display.length === 0} style={{ ...btn("orange"), padding: "0 14px", fontSize: 12, opacity: display.length === 0 ? .5 : 1 }}><Download size={14} />Export</button>
        <button
          onClick={doClear}
          disabled={!canClear}
          title={!exported ? "Export first" : orders.length > 0 ? "Clear DB orders first (use Today's Orders → Clear)" : "Clear list"}
          style={{ ...btn(canClear ? "red" : "ghost"), padding: "0 14px", fontSize: 12, opacity: canClear ? 1 : .4, cursor: canClear ? "pointer" : "not-allowed" }}
        ><Trash2 size={14} />Clear</button>
      </div>
      <div style={{ background: C.orange, borderRadius: 18, padding: 18, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}><TrendingUp size={18} /><span style={{ fontSize: 14, fontWeight: 600 }}>Today's Performance</span></div>
        <p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{total}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 4 }}>Total items sold today</p>
        {top && !uiCleared && <div style={{ marginTop: 12, background: "rgba(255,255,255,.2)", borderRadius: 12, padding: "8px 14px" }}><p style={{ fontSize: 11, color: "rgba(255,255,255,.7)", margin: 0 }}>Top Seller</p><p style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 0" }}>{top.name} — {top.qty}</p></div>}
      </div>
      {display.length > 0 ? (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ padding: "12px 16px", background: C.stripe, borderBottom: `1px solid ${C.border}` }}><p style={labelCap}>Bestsellers</p></div>
          {display.map((item, idx) => { const pct = Math.round((item.qty / display[0].qty) * 100); return (
            <div key={item.name}>
              {idx > 0 && <hr style={divider} />}
              <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 12, fontWeight: 700, color: C.muted, width: 20, textAlign: "right" }}>{idx + 1}</span><span style={{ fontSize: 13, fontWeight: 500, color: C.brand }}>{item.name}</span></div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.orange }}>{item.qty}</span>
                </div>
                <div style={{ marginLeft: 28, height: 5, background: C.stripe, borderRadius: 99, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: C.orange, borderRadius: 99, transition: "width .5s" }} /></div>
              </div>
            </div>
          ); })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}><TrendingUp size={36} style={{ opacity: .25, display: "block", margin: "0 auto 8px" }} /><p style={{ fontSize: 13 }}>No orders yet — start taking orders!</p></div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT AdminPage
══════════════════════════════════════════════════════════════════════════ */
export function AdminPage({ onExit }: { onExit: () => void }) {
  const SECRET = (import.meta as any).env?.VITE_ADMIN_SECRET ?? "clgbites123";
  const secRef = useRef(SECRET);
  const [authed, setAuthed]         = useState(false);
  const [siteOnline, setSiteOnline] = useState(true);
  const [itemFlags, setItemFlags]   = useState<Record<string, boolean>>({});
  const [orders, setOrders]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [statusMsg, setStatusMsg]   = useState("");
  const [tab, setTab]               = useState<AdminTab>("overview");
  const [drawer, setDrawer]         = useState(false);

  // Global new-order notification — shown on ALL tabs
  const [globalToast, setGlobalToast] = useState<NewOrderInfo | null>(null);
  const globalToastTimer               = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(injectKF, []);
  const flash = (m: string) => { setStatusMsg(m); setTimeout(() => setStatusMsg(""), 2000); };

  const showGlobalToast = (info: NewOrderInfo) => {
    setGlobalToast(info);
    if (globalToastTimer.current) clearTimeout(globalToastTimer.current);
    globalToastTimer.current = setTimeout(() => setGlobalToast(null), 6000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cfg, ords] = await Promise.all([fetchConfig(), fetchOrders(secRef.current)]);
    setSiteOnline(cfg.site_online); setItemFlags(cfg.item_flags ?? {});
    setOrders(prev => {
      if (prev.length > 0 && ords.length > prev.length) {
        const newest = ords[ords.length - 1];
        showGlobalToast({
          name:  newest.customer_name ?? "Customer",
          count: ords.length - prev.length,
        });
      }
      return ords;
    });
    setLoading(false);
  }, []);

  /* Poll every 15 s — drives live updates everywhere */
  useEffect(() => {
    if (!authed) return;
    const id = setInterval(loadData, 15000);
    return () => clearInterval(id);
  }, [authed, loadData]);

  const patchConfig = async (u: object) => {
    setSaving(true);
    try { const cfg = await patchConfigAPI(u, secRef.current); setSiteOnline(cfg.site_online); setItemFlags(cfg.item_flags ?? {}); flash("Saved ✓"); }
    catch { flash("Save failed ✗"); }
    setSaving(false);
  };
  const toggleItem  = (id: string) => { const f = { ...itemFlags, [id]: !(itemFlags[id] !== false) }; setItemFlags(f); patchConfig({ item_flags: f }); };
  const handleLogin  = (pwd: string) => { secRef.current = pwd; setAuthed(true); loadData(); };
  const handleLogout = () => { setAuthed(false); setOrders([]); setTab("overview"); };

  if (!authed) return <AdminLogin onLogin={handleLogin} onExit={onExit} secret={SECRET} />;

  const titles: Record<AdminTab, string> = { overview: "Overview", "menu-items": "Menu Items", orders: "Today's Orders", showoff: "Show Off" };

  return (
    <div style={screen}>
      {/* Global new-order toast — visible on every tab */}
<GlobalToast msg={globalToast} onClose={() => setGlobalToast(null)} />
      <Navbar onMenu={() => setDrawer(true)} onLogout={handleLogout} onExit={onExit} msg={statusMsg} />
      <Drawer open={drawer} onClose={() => setDrawer(false)} current={tab} onNav={setTab} onLogout={() => { handleLogout(); setDrawer(false); }} />
      <main style={{ paddingTop: 56 }}>
        <div style={{ padding: 16, maxWidth: 600, margin: "0 auto", paddingBottom: 40 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.brand, margin: "0 0 16px" }}>{titles[tab]}</h1>
          {tab === "overview"   && <AdminOverview siteOnline={siteOnline} setSiteOnline={setSiteOnline} patchConfig={patchConfig} saving={saving} orders={orders} loading={loading} />}
          {tab === "menu-items" && <AdminMenuItems itemFlags={itemFlags} toggleItem={toggleItem} />}
          {tab === "orders"     && <AdminOrders apiOrders={orders} loading={loading} onRefresh={loadData} secret={secRef.current} onOrdersChanged={loadData} />}
          {tab === "showoff"    && <AdminShowOff orders={orders} secret={secRef.current} onOrdersChanged={loadData} />}
        </div>
      </main>
    </div>
  );
}

export default AdminPage;