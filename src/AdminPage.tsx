/**
 * CLGBITES Admin — Drop-in replacement for the admin section in App.tsx
 *
 * HOW TO USE:
 *   1. Copy this file to your src/ folder (e.g. src/AdminPage.tsx)
 *   2. In App.tsx, replace:
 *        if (page === "admin") return <AdminPage onExit={() => setPage("home")} />;
 *      with the same line — it will now import from this file.
 *   3. Add at the top of App.tsx:
 *        import { AdminPage } from "./AdminPage";
 *      (and remove the old AdminPage, AdminLogin, AdminDrawer, AdminNavbar,
 *       AdminOverview, AdminMenuItems, AdminOrders, AdminShowOff functions)
 *
 * No Tailwind needed — all styles are scoped inside this file.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Menu, X, LogOut, LayoutDashboard, UtensilsCrossed, ClipboardList, Star,
  Lock, Eye, EyeOff, TrendingUp, ShoppingBag, Banknote, CreditCard,
  Search, Download, AlertCircle, MessageCircle, Phone, CheckCircle2,
} from "lucide-react";

/* ── env & api ─────────────────────────────────────────────────────────── */
const API = (import.meta as any).env?.VITE_API_URL ?? "";

async function fetchConfig(): Promise<{ site_online: boolean; item_flags: Record<string, boolean> }> {
  try {
    const r = await fetch(`${API}/api/config`);
    if (!r.ok) throw new Error();
    return r.json();
  } catch { return { site_online: true, item_flags: {} }; }
}

async function patchConfigAPI(update: object, secret: string) {
  const r = await fetch(`${API}/api/config`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-admin-secret": secret },
    body: JSON.stringify(update),
  });
  return r.json();
}

async function fetchOrders(secret: string): Promise<any[]> {
  try {
    const r = await fetch(`${API}/api/orders`, { headers: { "x-admin-secret": secret } });
    const data = await r.json();
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

/* ── menu data (mirrors App.tsx) ───────────────────────────────────────── */
const MENU_DATA = {
  biryani: {
    label: "Biryani", emoji: "🍚",
    items: [
      { id: "b1", name: "Chicken Dum Biryani",       price: 199 },
      { id: "b2", name: "Chicken Fry Piece Biryani",  price: 219 },
      { id: "b3", name: "Chicken Mixed Biryani",      price: 219 },
      { id: "b4", name: "Chicken Mughali Biryani",    price: 249 },
      { id: "b5", name: "Chicken Special Biryani",    price: 249 },
      { id: "b6", name: "Veg Biryani",                price: 179 },
      { id: "b7", name: "Special Veg Biryani",        price: 189 },
      { id: "b8", name: "Paneer Biryani",             price: 229 },
    ],
  },
  pulaoRice: {
    label: "Pulao & Fried Rice", emoji: "🍛",
    items: [
      { id: "p1", name: "Bagara Rice Chicken Fry", price: 219 },
      { id: "p2", name: "Veg Fried Rice",           price: 169 },
      { id: "p3", name: "Sp Veg Fried Rice",        price: 229 },
    ],
  },
  tandoori: {
    label: "Tandoori Specialties", emoji: "🔥",
    items: [
      { id: "t1",  name: "Tandoori Chicken Full",    price: 550 },
      { id: "t2",  name: "Tandoori Chicken Half",    price: 300 },
      { id: "t3",  name: "Tangdi Kabab (4 Pcs)",     price: 390 },
      { id: "t4",  name: "Kalmi Kabab (4 Pcs)",      price: 390 },
      { id: "t5",  name: "Reshmi Kabab",             price: 350 },
      { id: "t6",  name: "Chicken Tikka",            price: 350 },
      { id: "t7",  name: "Murg Malai Kabab",         price: 350 },
      { id: "t8",  name: "Fish Tikka",               price: 350 },
      { id: "t9",  name: "Prawns Tikka",             price: 450 },
      { id: "t10", name: "Boti Kabab",               price: 400 },
      { id: "t11", name: "Chicken Seekh Kebab",      price: 350 },
      { id: "t12", name: "Non Veg Tandoori Platter", price: 450 },
      { id: "t13", name: "Paneer Tikka",             price: 300 },
      { id: "t14", name: "Haraba Kabab",             price: 250 },
      { id: "t15", name: "Veg Seekh Kebab",          price: 250 },
      { id: "t16", name: "Veg Tandoori Platter",     price: 450 },
    ],
  },
};

type AdminTab = "overview" | "menu-items" | "orders" | "showoff";

/* ── design tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:        "#FAF7F2",
  white:     "#FFFFFF",
  brand:     "#3D2C1E",
  orange:    "#E8762C",
  orangeHov: "#D0681F",
  muted:     "#8B7355",
  border:    "#EDE5D8",
  borderSub: "#E8DDD0",
  chip:      "#F5EFE7",
  stripe:    "#FAF7F2",
} as const;

/* ── shared style helpers ────────────────────────────────────────────────── */
const S = {
  screen: { minHeight: "100vh", background: C.bg, fontFamily: "'Inter', system-ui, sans-serif" } as React.CSSProperties,
  navbar: {
    position: "fixed", top: 0, left: 0, right: 0, zIndex: 40,
    background: C.white, borderBottom: `1px solid ${C.borderSub}`,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 16px", height: 56,
  } as React.CSSProperties,
  iconBtn: {
    padding: 8, borderRadius: 10, border: "none", background: "transparent",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background .15s",
  } as React.CSSProperties,
  card: {
    background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
    boxShadow: "0 1px 4px rgba(0,0,0,.05)", padding: 16,
  } as React.CSSProperties,
  pill: (active: boolean): React.CSSProperties => ({
    display: "flex", alignItems: "center", gap: 12,
    width: "100%", padding: "10px 16px", borderRadius: 12,
    border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500,
    textAlign: "left", transition: "all .15s",
    background: active ? C.orange : "transparent",
    color: active ? "#fff" : C.brand,
  }),
  toggle: (on: boolean): React.CSSProperties => ({
    position: "relative", display: "inline-flex", alignItems: "center",
    width: 44, height: 26, borderRadius: 99, border: "none", cursor: "pointer",
    transition: "background .25s", background: on ? C.orange : "#C8BBAA", flexShrink: 0,
  }),
  toggleThumb: (on: boolean): React.CSSProperties => ({
    position: "absolute", top: 3, left: on ? 21 : 3,
    width: 20, height: 20, borderRadius: "50%", background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .25s",
  }),
  input: {
    width: "100%", background: C.stripe, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: "10px 12px 10px 36px",
    fontSize: 14, color: C.brand, outline: "none", boxSizing: "border-box",
  } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase" as const, letterSpacing: ".06em" },
  tagOrange: { fontSize: 11, fontWeight: 700, color: C.orange, background: "#FEF0E6", padding: "3px 8px", borderRadius: 8 } as React.CSSProperties,
  tagCOD:    { fontSize: 11, fontWeight: 600, color: "#6F42C1", background: "#F0EBFD", padding: "2px 8px", borderRadius: 99 } as React.CSSProperties,
  tagPre:    { fontSize: 11, fontWeight: 600, color: "#2C7BE8", background: "#E6EFFD", padding: "2px 8px", borderRadius: 99 } as React.CSSProperties,
  tagGreen:  { fontSize: 11, fontWeight: 600, color: "#28A745", background: "#E6F5EA", padding: "2px 8px", borderRadius: 99 } as React.CSSProperties,
  tagAmber:  { fontSize: 11, fontWeight: 600, color: "#E8882C", background: "#FEF7E6", padding: "2px 8px", borderRadius: 99 } as React.CSSProperties,
  divider:   { borderTop: `1px solid ${C.chip}`, margin: 0 } as React.CSSProperties,
};

/* ══════════════════════════════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════════════════════════════ */
function AdminLogin({ onLogin, onExit, adminSecret }: {
  onLogin: (pwd: string) => void; onExit: () => void; adminSecret: string;
}) {
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    setTimeout(() => {
      if (password === adminSecret || password === ((import.meta as any).env?.VITE_ADMIN_PASSWORD ?? "")) {
        onLogin(password);
      } else {
        setError("Incorrect password. Please try again.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{ ...S.screen, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px" }}>
      {/* brand */}
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, background: C.orange, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(232,118,44,.35)" }}>
          <UtensilsCrossed size={32} color="#fff" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.brand, margin: 0 }}>CLGBITES</h1>
        <p style={{ fontSize: 13, color: C.muted, fontWeight: 500, marginTop: 2 }}>Admin Portal</p>
      </div>

      {/* card */}
      <div style={{ width: "100%", maxWidth: 360, background: C.white, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 4px 20px rgba(0,0,0,.07)", padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.brand, margin: "0 0 4px" }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px" }}>Enter your password to access the dashboard</p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Password</label>
            <div style={{ position: "relative", marginTop: 6 }}>
              <Lock size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter admin password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                required autoFocus
                style={{ ...S.input, paddingRight: 40 }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex" }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "10px 12px" }}>
              <AlertCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#EF4444" }}>{error}</span>
            </div>
          )}

          <button type="submit" disabled={loading || !password}
            style={{ background: C.orange, color: "#fff", border: "none", borderRadius: 12, padding: "12px 0", fontWeight: 700, fontSize: 15, cursor: loading || !password ? "not-allowed" : "pointer", opacity: loading || !password ? .6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background .15s" }}>
            {loading ? <><Spinner />Signing in…</> : "Login →"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "#C4B49E", marginTop: 20 }}>CLGBITES Admin · Restricted Access</p>
      </div>

      <button onClick={onExit} style={{ marginTop: 16, background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted }}>
        ← Back to Site
      </button>
      <p style={{ fontSize: 11, color: "#C4B49E", marginTop: 24 }}>© 2026 CLGBITES</p>
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", display: "inline-block", animation: "clg-spin 0.7s linear infinite" }} />
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DRAWER + NAVBAR
══════════════════════════════════════════════════════════════════════════ */
const NAV_ITEMS: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview",    label: "Overview",       icon: LayoutDashboard },
  { id: "menu-items",  label: "Menu Items",     icon: UtensilsCrossed },
  { id: "orders",      label: "Today's Orders", icon: ClipboardList },
  { id: "showoff",     label: "Show Off",       icon: Star },
];

function AdminDrawer({ open, onClose, currentTab, onNavigate, onLogout }: {
  open: boolean; onClose: () => void; currentTab: AdminTab;
  onNavigate: (t: AdminTab) => void; onLogout: () => void;
}) {
  return (
    <>
      {open && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,.4)", backdropFilter: "blur(2px)" }} />
      )}
      <aside style={{
        position: "fixed", top: 0, left: 0, height: "100%", width: 280, background: C.white,
        zIndex: 51, boxShadow: "4px 0 32px rgba(0,0,0,.12)",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform .3s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 56, borderBottom: `1px solid ${C.borderSub}`, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.brand }}>CLGBITES <span style={{ color: C.orange }}>Admin</span></span>
          <button onClick={onClose} style={S.iconBtn}><X size={18} color={C.brand} /></button>
        </div>

        <nav style={{ padding: 16, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { onNavigate(id); onClose(); }} style={S.pill(currentTab === id)}>
              <Icon size={18} style={{ flexShrink: 0 }} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "16px", borderTop: `1px solid ${C.border}` }}>
          <button onClick={onLogout} style={{ ...S.pill(false), color: "#EF4444" }}>
            <LogOut size={18} style={{ flexShrink: 0 }} />Logout
          </button>
        </div>
      </aside>
    </>
  );
}

function AdminNavbar({ onHamburger, onLogout, onExit, statusMsg }: {
  onHamburger: () => void; onLogout: () => void; onExit: () => void; statusMsg: string;
}) {
  return (
    <header style={S.navbar}>
      <button onClick={onHamburger} style={S.iconBtn}><Menu size={20} color={C.brand} /></button>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: C.brand }}>
          CLGBITES <span style={{ color: C.orange }}>Admin</span>
        </span>
        {statusMsg && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99, background: statusMsg.includes("✓") ? "#D1FAE5" : "#FEE2E2", color: statusMsg.includes("✓") ? "#065F46" : "#B91C1C" }}>
            {statusMsg}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button onClick={onExit} style={{ ...S.iconBtn, fontSize: 12, fontWeight: 600, color: C.muted, padding: "6px 10px" }}>← Site</button>
        <button onClick={onLogout} style={S.iconBtn}><LogOut size={18} color={C.brand} /></button>
      </div>
    </header>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   OVERVIEW TAB
══════════════════════════════════════════════════════════════════════════ */
function AdminOverview({ siteOnline, setSiteOnline, patchConfig, saving, orders, loading, onRefresh }: {
  siteOnline: boolean; setSiteOnline: (v: boolean) => void;
  patchConfig: (u: object) => Promise<void>; saving: boolean;
  orders: any[]; loading: boolean; onRefresh: () => void;
}) {
  const todayTotal = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const stats = [
    { label: "Revenue",      value: `₹${todayTotal}`,    icon: TrendingUp,  color: "#E8762C", bg: "#FEF0E6" },
    { label: "Total Orders", value: `${orders.length}`,   icon: ShoppingBag, color: "#2C7BE8", bg: "#E6EFFD" },
    { label: "COD Orders",   value: `${orders.filter((o: any) => o.payment_mode === "cod").length}`,  icon: Banknote,  color: "#6F42C1", bg: "#F0EBFD" },
    { label: "Prepaid",      value: `${orders.filter((o: any) => o.payment_mode !== "cod").length}`,  icon: CreditCard, color: "#20C997", bg: "#E6FBF6" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Site Status */}
      <div style={S.card}>
        <p style={{ ...S.label, marginBottom: 12 }}>Site Status</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: C.brand, margin: 0 }}>{siteOnline ? "Orders Open" : "Orders Closed"}</p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{siteOnline ? "Accepting new orders" : "Not accepting orders"}</p>
          </div>
          <button
            onClick={() => { const n = !siteOnline; setSiteOnline(n); patchConfig({ site_online: n }); }}
            disabled={saving}
            style={S.toggle(siteOnline)}>
            <span style={S.toggleThumb(siteOnline)} />
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
          <p style={S.label}>Today's Stats</p>
          <button onClick={onRefresh} disabled={loading} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.orange }}>
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {stats.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={S.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={color} />
                </div>
              </div>
              <p style={{ fontSize: 22, fontWeight: 800, color: C.brand, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div style={S.card}>
        <p style={{ ...S.label, marginBottom: 12 }}>Recent Orders</p>
        {loading ? (
          <p style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: C.muted }}>Loading…</p>
        ) : orders.length === 0 ? (
          <p style={{ textAlign: "center", padding: "24px 0", fontSize: 13, color: C.muted }}>No orders yet today 🎉</p>
        ) : (
          <div>
            {orders.slice(0, 5).map((o: any, i: number) => (
              <div key={o.id}>
                {i > 0 && <hr style={S.divider} />}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={S.tagOrange}>#{String(o.id).slice(-3)}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: C.brand, margin: 0 }}>{o.customer_name}</p>
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{(o.items ?? []).map((it: any) => it.name).join(", ")}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: C.brand, margin: 0 }}>₹{o.total}</p>
                    <span style={o.payment_mode === "cod" ? S.tagCOD : S.tagPre}>{o.payment_mode === "cod" ? "COD" : "Prepaid"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MENU ITEMS TAB
══════════════════════════════════════════════════════════════════════════ */
function AdminMenuItems({ itemFlags, toggleItem }: {
  itemFlags: Record<string, boolean>; toggleItem: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = Object.entries(MENU_DATA)
    .map(([k, cat]) => ({ k, ...cat, items: cat.items.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) }))
    .filter(c => c.items.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input type="text" placeholder="Search menu items…" value={search} onChange={e => setSearch(e.target.value)} style={S.input} />
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
          <Search size={36} color={C.muted} style={{ opacity: .3, display: "block", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13 }}>No items match your search</p>
        </div>
      )}

      {filtered.map(cat => (
        <div key={cat.k} style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: C.stripe, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 16 }}>{cat.emoji}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.brand }}>{cat.label}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 500, color: C.muted, background: C.border, padding: "2px 8px", borderRadius: 99 }}>{cat.items.length} items</span>
          </div>
          {cat.items.map((item, i) => {
            const enabled = itemFlags[item.id] !== false;
            return (
              <div key={item.id}>
                {i > 0 && <hr style={S.divider} />}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: enabled ? C.brand : C.muted, margin: 0, textDecoration: enabled ? "none" : "line-through" }}>{item.name}</p>
                    <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>₹{item.price}</p>
                  </div>
                  <button onClick={() => toggleItem(item.id)} style={S.toggle(enabled)}>
                    <span style={S.toggleThumb(enabled)} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ORDERS TAB
══════════════════════════════════════════════════════════════════════════ */
function AdminOrders({ orders, loading, onRefresh, onExportAndClear, exporting }: {
  orders: any[]; loading: boolean; onRefresh: () => void;
  onExportAndClear: () => void; exporting: boolean;
}) {
  const [search, setSearch] = useState("");
  const filtered = orders.filter((o: any) =>
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customer_phone?.includes(search) ||
    String(o.id).includes(search)
  );
  const total = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input type="text" placeholder="Search orders…" value={search} onChange={e => setSearch(e.target.value)} style={S.input} />
        </div>
        <button onClick={onRefresh} disabled={loading}
          style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0 14px", cursor: "pointer", fontSize: 14, color: C.brand, opacity: loading ? .5 : 1 }}>
          {loading ? "…" : "↻"}
        </button>
        <button onClick={onExportAndClear} disabled={exporting || orders.length === 0}
          style={{ display: "flex", alignItems: "center", gap: 6, background: C.white, border: `1px solid ${C.border}`, borderRadius: 12, padding: "0 14px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: C.brand, opacity: (exporting || orders.length === 0) ? .5 : 1 }}>
          <Download size={13} />{exporting ? "…" : "Export"}
        </button>
      </div>

      <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
        <strong style={{ color: C.brand }}>{orders.length} orders</strong> · ₹{total} total
      </p>

      {loading ? (
        <p style={{ textAlign: "center", padding: "48px 0", fontSize: 13, color: C.muted }}>Loading orders…</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
          <ClipboardList size={36} style={{ opacity: .3, display: "block", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13 }}>{orders.length === 0 ? "No orders yet today 🎉" : "No orders match your search"}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((o: any) => (
            <div key={o.id} style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 1px 4px rgba(0,0,0,.05)", overflow: "hidden" }}>
              {/* header row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={S.tagOrange}>#{String(o.id).slice(-3)}</span>
                  <span style={o.payment_mode === "cod" ? S.tagCOD : S.tagPre}>
                    {o.payment_mode === "cod" ? "💵 COD" : "📱 Prepaid"}
                  </span>
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: C.brand }}>₹{o.total}</span>
              </div>

              {/* body */}
              <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: C.brand, margin: 0 }}>{o.customer_name}</p>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.muted, marginTop: 3 }}>
                    <Phone size={11} />{o.customer_phone}
                  </span>
                </div>

                <div style={{ background: C.stripe, borderRadius: 10, padding: "8px 12px", display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {(o.items ?? []).map((it: any, idx: number) => (
                    <span key={idx} style={{ fontSize: 11, background: C.white, border: `1px solid ${C.border}`, color: C.brand, padding: "2px 8px", borderRadius: 8 }}>
                      {it.name} ×{it.qty}
                    </span>
                  ))}
                </div>

             <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
  <p style={{ fontSize: 11, color: "#C4B49E", margin: 0 }}>
    {new Date(o.created_at).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: true
    })}
  </p>
{o.deliver_status !== "delivered" ? (
  <div>

    {/* ✅ RADIO BUTTON */}
    <label>
      <input
        type="radio"
        name={`pay-${o.id}`}
        onChange={() =>
          setPayMap(prev => ({ ...prev, [o.id]: "paid" }))
        }
      />
      Paid
    </label>

    <label style={{ marginLeft: "10px" }}>
      <input
        type="radio"
        name={`pay-${o.id}`}
        onChange={() =>
          setPayMap(prev => ({ ...prev, [o.id]: "unpaid" }))
        }
      />
      Unpaid
    </label>

    {/* ✅ TOKEN INPUT */}
    <input
      type="number"
      placeholder="Token No"
      onChange={(e) =>
        setTokenMap(prev => ({
          ...prev,
          [o.id]: Number(e.target.value)
        }))
      }
      style={{ marginLeft: "10px" }}
    />

    {/* ✅ DELIVER BUTTON */}
    <button
      onClick={async () => {

        const pay = payMap[o.id]
        const token = tokenMap[o.id]

        if (!pay) {
          alert("Select payment status")
          return
        }

        await fetch("/api/orders", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            id: o.id,
            deliver_status: "delivered",
            pay_status: pay,
            token_number: token
          })
        })

        onRefresh()
      }}
    >
      Delivered
    </button>

  </div>
) : (
  <div style={{ textAlign: "right" }}>
    <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>
      ✓ Delivered
    </span>

    {o.delivered_at && (
      <div style={{ fontSize: 10, color: "#64748b" }}>
        {new Date(o.delivered_at).toLocaleString("en-IN")}
      </div>
    )}
  </div>
)}
</div>
</div>
</div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SHOW OFF TAB
══════════════════════════════════════════════════════════════════════════ */
function AdminShowOff({ orders }: { orders: any[] }) {
  const tally: Record<string, { name: string; qty: number }> = {};
  orders.forEach((o: any) => {
    (o.items ?? []).forEach((it: any) => {
      if (!tally[it.name]) tally[it.name] = { name: it.name, qty: 0 };
      tally[it.name].qty += it.qty ?? 1;
    });
  });
  const items = Object.values(tally).sort((a, b) => b.qty - a.qty);
  const total = items.reduce((s, i) => s + i.qty, 0);
  const top   = items[0];

  const shareWA = () => {
    const lines = items.map(i => `${i.name} — ${i.qty}`).join("\n");
    const msg   = `🍛 *CLGBITES — Today's Bestsellers*\n\n${lines}\n\nTotal items sold: ${total}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* WhatsApp share */}
      <button onClick={shareWA} disabled={items.length === 0}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#25D366", color: "#fff", border: "none", borderRadius: 14, padding: "14px 0", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: items.length === 0 ? .5 : 1 }}>
        <MessageCircle size={16} />Share on WhatsApp
      </button>

      {/* Performance card */}
      <div style={{ background: C.orange, borderRadius: 18, padding: 18, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <TrendingUp size={18} /><span style={{ fontSize: 14, fontWeight: 600 }}>Today's Performance</span>
        </div>
        <p style={{ fontSize: 36, fontWeight: 800, margin: 0 }}>{total}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.75)", marginTop: 4 }}>Total items sold today</p>
        {top && (
          <div style={{ marginTop: 12, background: "rgba(255,255,255,.2)", borderRadius: 12, padding: "8px 14px" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.7)", margin: 0 }}>Top Seller</p>
            <p style={{ fontSize: 14, fontWeight: 700, margin: "2px 0 0" }}>{top.name} — {top.qty}</p>
          </div>
        )}
      </div>

      {/* Bestsellers list */}
      {items.length > 0 ? (
        <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
          <div style={{ padding: "12px 16px", background: C.stripe, borderBottom: `1px solid ${C.border}` }}>
            <p style={S.label}>Bestsellers</p>
          </div>
          {items.map((item, idx) => {
            const pct = Math.round((item.qty / items[0].qty) * 100);
            return (
              <div key={item.name}>
                {idx > 0 && <hr style={S.divider} />}
                <div style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, width: 20, textAlign: "right" }}>{idx + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: C.brand }}>{item.name}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: C.orange }}>{item.qty}</span>
                  </div>
                  <div style={{ marginLeft: 28, height: 5, background: C.stripe, borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: C.orange, borderRadius: 99, transition: "width .5s" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
          <TrendingUp size={36} style={{ opacity: .3, display: "block", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13 }}>No orders yet — start taking orders!</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT AdminPage — drop-in replacement
══════════════════════════════════════════════════════════════════════════ */
export function AdminPage({ onExit }: { onExit: () => void }) {
  const ADMIN_SECRET = (import.meta as any).env?.VITE_ADMIN_SECRET ?? "clgbites123";
  const adminSecret  = useRef(ADMIN_SECRET);

  const [authed,      setAuthed]      = useState(false);
  const [siteOnline,  setSiteOnline]  = useState(true);
  const [itemFlags,   setItemFlags]   = useState<Record<string, boolean>>({});
  const [orders,      setOrders]      = useState<any[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [statusMsg,   setStatusMsg]   = useState("");
  const [tab,         setTab]         = useState<AdminTab>("overview");
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  const flash = (msg: string) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(""), 2000); };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [cfg, ords] = await Promise.all([fetchConfig(), fetchOrders(adminSecret.current)]);
    setSiteOnline(cfg.site_online);
    setItemFlags(cfg.item_flags ?? {});
    setOrders(ords);
    setLoading(false);
  }, []);

  const patchConfig = async (update: object) => {
    setSaving(true);
    try {
      const cfg = await patchConfigAPI(update, adminSecret.current);
      setSiteOnline(cfg.site_online);
      setItemFlags(cfg.item_flags ?? {});
      flash("Saved ✓");
    } catch { flash("Save failed ✗"); }
    setSaving(false);
  };

  const toggleItem = (id: string) => {
    const newFlags = { ...itemFlags, [id]: !(itemFlags[id] !== false) };
    setItemFlags(newFlags);
    patchConfig({ item_flags: newFlags });
  };

  const exportAndClear = () => {
    setExporting(true);
    window.location.href = window.location.origin + "/api/export";
    setTimeout(() => setExporting(false), 1500);
  };

  const handleLogin = (pwd: string) => {
    adminSecret.current = pwd;
    setAuthed(true);
    loadData();
  };

  const handleLogout = () => { setAuthed(false); setOrders([]); setTab("overview"); };

  /* keyframe injection — once */
  useEffect(() => {
    const id = "clg-admin-keyframes";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id  = id;
    s.textContent = `
      @keyframes clg-spin  { to { transform: rotate(360deg); } }
      @keyframes clg-pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
    `;
    document.head.appendChild(s);
  }, []);

  const TAB_TITLES: Record<AdminTab, string> = {
    overview: "Overview", "menu-items": "Menu Items", orders: "Today's Orders", showoff: "Show Off",
  };

  if (!authed) return <AdminLogin onLogin={handleLogin} onExit={onExit} adminSecret={ADMIN_SECRET} />;

  return (
    <div style={S.screen}>
      <AdminNavbar onHamburger={() => setDrawerOpen(true)} onLogout={handleLogout} onExit={onExit} statusMsg={statusMsg} />
      <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} currentTab={tab} onNavigate={setTab} onLogout={() => { handleLogout(); setDrawerOpen(false); }} />

      <main style={{ paddingTop: 56 }}>
        <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: C.brand, margin: "0 0 16px" }}>{TAB_TITLES[tab]}</h1>

          {tab === "overview"   && <AdminOverview siteOnline={siteOnline} setSiteOnline={setSiteOnline} patchConfig={patchConfig} saving={saving} orders={orders} loading={loading} onRefresh={loadData} />}
          {tab === "menu-items" && <AdminMenuItems itemFlags={itemFlags} toggleItem={toggleItem} />}
          {tab === "orders"     && <AdminOrders orders={orders} loading={loading} onRefresh={loadData} onExportAndClear={exportAndClear} exporting={exporting} />}
          {tab === "showoff"    && <AdminShowOff orders={orders} />}
        </div>
      </main>
    </div>
  );
}

export default AdminPage;
