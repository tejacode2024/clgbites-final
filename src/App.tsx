import { useState, useEffect, useRef, useCallback, memo } from "react";
import { AdminPage } from "./AdminPage";

const API = import.meta.env.VITE_API_URL ?? "";

async function fetchConfig(): Promise<{ site_online: boolean; item_flags: Record<string, boolean> }> {
  try {
    const r = await fetch(`${API}/api/config`);
    if (!r.ok) throw new Error("config fetch failed");
    return r.json();
  } catch {
    return { site_online: true, item_flags: {} };
  }
}

async function saveOrder(payload: object): Promise<{ orderId?: number }> {
  const r = await fetch(`${API}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

const MENU_DATA = {
  biryani: {
    label: "Biryani", emoji: "🍚",
    items: [
      { id: "b1", name: "Chicken Dum Biryani",      price: 199, veg: false, img: "/images/chicken-dum-biryani.webp" },
      { id: "b2", name: "Chicken Fry Piece Biryani", price: 219, veg: false, img: "/images/chicken-fry-biryani.webp" },
      { id: "b3", name: "Chicken Mixed Biryani",     price: 219, veg: false, img: "/images/chicken-dum-biryani.webp" },
      { id: "b4", name: "Chicken Mughali Biryani",   price: 249, veg: false, img: "/images/chicken-mughali-biryani.webp" },
      { id: "b5", name: "Chicken Special Biryani",   price: 279, veg: false, img: "/images/chicken-special-biryani.webp" },
      { id: "b6", name: "Veg Biryani",               price: 179, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "b7", name: "Special Veg Biryani",       price: 189, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "b8", name: "Paneer Biryani",             price: 229, veg: true,  img: "/images/paneer-biryani.webp" },
    ],
  },
  pulaoRice: {
    label: "Pulao & Fried Rice", emoji: "🍛",
    items: [
      { id: "p1", name: "Bagara Rice Chicken Fry", price: 219, veg: false, img: "/images/chicken-fry-biryani.webp" },
      { id: "p2", name: "Veg Fried Rice",          price: 169, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "p3", name: "Sp Veg Fried Rice",       price: 229, veg: true,  img: "/images/veg-biryani.webp" },
    ],
  },
  tandoori: {
    label: "Starters & Platters", emoji: "🔥",
    items: [
      { id: "t1",  name: "Tandoori Chicken Full",   price: 550, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t2",  name: "Tandoori Chicken Half",   price: 300, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t3",  name: "Tangdi Kabab (4 Pcs)",    price: 390, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t4",  name: "Kalmi Kabab (4 Pcs)",     price: 390, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t5",  name: "Reshmi Kabab",             price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t6",  name: "Chicken Tikka",            price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t7",  name: "Murg Malai Kabab",         price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t8",  name: "Fish Tikka",               price: 350, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t9",  name: "Prawns Tikka",             price: 450, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t10", name: "Boti Kabab",               price: 400, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t11", name: "Chicken Seekh Kebab",      price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t12", name: "Non Veg Tandoori Platter", price: 450, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t13", name: "Paneer Tikka",             price: 300, veg: true,  img: "/images/paneer-biryani.webp" },
      { id: "t14", name: "Haraba Kabab",             price: 250, veg: true,  img: "" },
      { id: "t15", name: "Veg Seekh Kebab",          price: 250, veg: true,  img: "" },
      { id: "t16", name: "Veg Tandoori Platter",     price: 450, veg: true,  img: "" },
    ],
  },
};

const CAROUSEL_ITEMS = MENU_DATA.biryani.items;
type CartItem = { id: string; name: string; price: number; qty: number; img: string };
type Page = "home" | "about" | "reviews" | "admin";

/* ── ICONS ── */
const IcoUser  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcoPhone = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.35 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IcoWallet= () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>;
const IcoEdit  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoLock  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IcoCheck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoPlus  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoMinus = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoTrash = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const IcoBag   = () => <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
const IcoStar  = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="var(--gold)"/></svg>;
const IcoWA    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 0C5.374 0 0 5.373 0 12c0 2.117.554 4.1 1.522 5.822L.048 23.998l6.352-1.656A11.954 11.954 0 0012.004 24C18.628 24 24 18.627 24 12S18.628 0 12.004 0zm0 21.818a9.817 9.817 0 01-5.002-1.368l-.36-.214-3.72.97.999-3.645-.236-.375a9.817 9.817 0 01-1.499-5.186C2.186 6.58 6.591 2.18 12.004 2.18 17.41 2.18 21.814 6.58 21.814 12c0 5.41-4.404 9.818-9.81 9.818z"/></svg>;

/* ── ADD/QTY BUTTON ── */
function AddButton({ item, addItem, removeItem, qty }: {
  item: { id: string; name: string; price: number; img: string };
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void; qty: number;
}) {
  if (qty === 0) return <button className="btn-add" onClick={e => { e.stopPropagation(); addItem(item); }}>+ Add</button>;
  return (
    <div className="qty-counter" onClick={e => e.stopPropagation()}>
      <button onClick={() => removeItem(item.id)}>−</button>
      <span>{qty}</span>
      <button onClick={() => addItem(item)}>+</button>
    </div>
  );
}


/* ── ORDER PANEL ── */
function OrderPanel({
  cart, cartTotal, addItem, removeItem, siteOnline,
  custName, setCustName, custPhone, setCustPhone,
  custMode, setCustMode, custLocked, setCustLocked,
  onOrderDone,
}: {
  cart: CartItem[]; cartTotal: number;
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void;
  siteOnline: boolean;
  custName: string;    setCustName:   (v: string) => void;
  custPhone: string;   setCustPhone:  (v: string) => void;
  custMode: "cod" | "prepaid"; setCustMode: (m: "cod" | "prepaid") => void;
  custLocked: boolean; setCustLocked: (v: boolean) => void;
  onClose: () => void;
  onOrderDone: () => void;
}) {
  const [sending,  setSending]  = useState(false);
  const [done,     setDone]     = useState(false);
  const [fieldErr, setFieldErr] = useState("");
  const [dbErr,    setDbErr]    = useState("");

  const detailsFilled = custName.trim().length > 0 && custPhone.trim().length >= 10;
  const getItemQty    = (id: string) => cart.find(c => c.id === id)?.qty ?? 0;

  const handleLock = () => {
    if (!custName.trim())             { setFieldErr("Please enter your name."); return; }
    if (custPhone.trim().length < 10) { setFieldErr("Enter a valid 10-digit mobile number."); return; }
    setFieldErr(""); setCustLocked(true);
  };

  /* Single button: open WA immediately + save to DB concurrently */
  const handleSendAndSave = async () => {
    if (!custLocked || sending || cart.length === 0) return;
    setSending(true); setDbErr("");

    const lines = cart.map(c => `• ${c.name} ×${c.qty} = ₹${c.price * c.qty}`).join("\n");
    const confirmLine = custMode === "cod" ? "Confirm my order on COD" : "Confirm my order and send QR";
    const msg = `Order from SRM-AP\n\nName: ${custName}\n\nPhone: ${custPhone}\n\n${lines}\n\nTotal: ₹${cartTotal}\n\n${confirmLine}`;
    const waUrl = `https://wa.me/919989955833?text=${encodeURIComponent(msg)}`;

    // Open WA without waiting for DB — atomic token RPC handles concurrent orders
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Save to DB concurrently — non-blocking for the user
    saveOrder({
      customer_name:  custName,
      customer_phone: custPhone,
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      payment_mode:   custMode,
      total:          cartTotal,
    }).catch(err => {
      console.error("DB save failed:", err);
      setDbErr("Saved on WhatsApp. DB sync pending.");
    }).finally(() => setDone(true));

    // Show done screen immediately (don't wait for DB)
    setDone(true);
  };

  if (done) {
    return (
      <div className="op-done">
        <div className="op-done-icon"><IcoStar /></div>
        <h3>Order Sent! 🎉</h3>
        <p>Your order is on WhatsApp and saved to our records.<br />We'll confirm it shortly!</p>
        {dbErr && <p style={{ fontSize: 12, color: "#e67e22", marginTop: 4 }}>{dbErr}</p>}
        <button className="btn-primary" onClick={onOrderDone}>Start New Order</button>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="op-empty">
        <div className="op-empty-icon"><IcoBag /></div>
        <p>Your cart is empty</p>
        <span>Add something delicious from the menu</span>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => { onClose(); setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }), 80); }}>Browse Menu</button>
      </div>
    );
  }

  return (
    <div className="op-root">

      <div className="op-scroll-body">
        {/* Section 1: Cart Items */}
        <div className="op-section">
          <div className="op-section-head">
            <span className="op-label">Your Order</span>
            <button className="op-add-more-btn" onClick={() => { onClose(); setTimeout(() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }), 80); }}>
              <IcoPlus /> Add Items
            </button>
          </div>
          <div className="op-items">
            {cart.map(item => (
              <div key={item.id} className="op-item">
                <img src={item.img} alt={item.name} className="op-item-img"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <span className="op-item-name">{item.name}</span>
                <div className="op-qty">
                  <button className="op-qty-btn" onClick={() => removeItem(item.id)} aria-label="decrease">
                    {item.qty === 1 ? <IcoTrash /> : <IcoMinus />}
                  </button>
                  <span>{item.qty}</span>
                  <button className="op-qty-btn"
                    onClick={() => addItem({ id: item.id, name: item.name, price: item.price, img: item.img })}
                    aria-label="increase"><IcoPlus /></button>
                </div>
                <span className="op-item-price">₹{item.price * item.qty}</span>
              </div>
            ))}
          </div>
          <div className="op-total"><span>Total</span><span>₹{cartTotal}</span></div>
        </div>

        {/* Section 2: Customer Details */}
        <div className="op-section">
          <div className="op-section-head">
            <span className="op-label">Your Details</span>
            {custLocked && (
              <button className="op-tap-edit-btn" onClick={() => setCustLocked(false)}>
                <IcoEdit /> Tap to Edit
              </button>
            )}
          </div>

          {custLocked ? (
            <div className="op-locked-details">
              <div className="op-locked-row"><span className="op-locked-icon"><IcoUser /></span><span className="op-locked-val">{custName}</span></div>
              <div className="op-locked-row"><span className="op-locked-icon"><IcoPhone /></span><span className="op-locked-val">{custPhone}</span></div>
              <div className="op-locked-row"><span className="op-locked-icon"><IcoWallet /></span><span className="op-locked-val">{custMode === "cod" ? "Cash on Delivery" : "Prepaid (QR)"}</span></div>
              <div className="op-locked-badge"><IcoCheck /> Details confirmed</div>
            </div>
          ) : (
            <div className="op-fields">
              <div className="op-field">
                <span className="op-field-ico"><IcoUser /></span>
                <input className="op-field-input" type="text" placeholder="Your name"
                  value={custName} onChange={e => { setCustName(e.target.value); setFieldErr(""); }} />
              </div>
              <div className="op-field">
                <span className="op-field-ico"><IcoPhone /></span>
                <input className="op-field-input" type="tel" placeholder="10-digit mobile"
                  value={custPhone} onChange={e => { setCustPhone(e.target.value.replace(/\D/g, "")); setFieldErr(""); }}
                  maxLength={10} inputMode="numeric" />
              </div>
              <div className="op-field op-field-pay">
                <span className="op-field-ico"><IcoWallet /></span>
                <label className={`op-pay-pill ${custMode === "cod" ? "active" : ""}`}>
                  <input type="radio" name="op-mode" checked={custMode === "cod"} onChange={() => setCustMode("cod")} />
                  Cash on Delivery
                </label>
                <label className={`op-pay-pill ${custMode === "prepaid" ? "active" : ""}`}>
                  <input type="radio" name="op-mode" checked={custMode === "prepaid"} onChange={() => setCustMode("prepaid")} />
                  Prepaid (QR)
                </label>
              </div>
              {fieldErr && <p className="op-field-err">{fieldErr}</p>}
              {detailsFilled ? (
                <button className="op-lock-btn" onClick={handleLock}>
                  <IcoLock /> Save &amp; Confirm Details
                </button>
              ) : (
                <p className="op-fill-hint">Fill your name &amp; phone to proceed</p>
              )}
            </div>
          )}
        </div>

        {/* How it works */}
        {custLocked && cart.length > 0 && siteOnline && (
          <div className="op-wa-instruction">
            <p className="op-wa-instruction-label">📲 How it works</p>
            <div className="op-wa-steps">
              <div className="op-wa-step"><span className="op-wa-step-num">1</span>Tap the green button below</div>
              <div className="op-wa-step"><span className="op-wa-step-num">2</span>WhatsApp opens with your order ready</div>
              <div className="op-wa-step"><span className="op-wa-step-num">3</span>Tap <strong>Send ▶</strong> to confirm</div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer CTA */}
      <div className="op-footer">
        {!siteOnline ? (
          <div className="op-offline">We're closed right now. Check back soon!</div>
        ) : !custLocked ? (
          <div className="op-footer-hint"><IcoLock /> Confirm your details above to place order</div>
        ) : cart.length === 0 ? (
          <div className="op-footer-hint">Add items to your order first</div>
        ) : (
          <>
            <button className="btn-whatsapp" disabled={sending} onClick={handleSendAndSave}>
              <IcoWA />
              {sending ? "Sending…" : "Send Order on WhatsApp"}
            </button>
            <p className="op-send-hint">Order is saved automatically when you tap Send</p>
          </>
        )}
      </div>
    </div>
  );
}

/* ── ROOT APP ── */
function App() {
  const [splashDone, setSplashDone]     = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const [page, setPage]                 = useState<Page>(() => window.location.pathname === "/admin" ? "admin" : "home");
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [cartOpen, setCartOpen]         = useState(false);
  const [openCats, setOpenCats]         = useState<Record<string, boolean>>({ biryani: true, pulaoRice: false, tandoori: false });
  const [custName, setCustName]         = useState("");
  const [custPhone, setCustPhone]       = useState("");
  const [custMode, setCustMode]         = useState<"cod" | "prepaid">("cod");
  const [custLocked, setCustLocked]     = useState(false);
  const [siteOnline, setSiteOnline]     = useState(true);
  const [itemFlags, setItemFlags]       = useState<Record<string, boolean>>({});
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    window.history.replaceState(null, "", page === "admin" ? "/admin" : "/");
  }, [page]);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 2800);
    const t2 = setTimeout(() => setSplashDone(true), 3500);
    fetchConfig().then(cfg => { setSiteOnline(cfg.site_online); setItemFlags(cfg.item_flags ?? {}); setConfigLoaded(true); });
    const poll = setInterval(() => fetchConfig().then(cfg => { setSiteOnline(cfg.site_online); setItemFlags(cfg.item_flags ?? {}); }).catch(() => {}), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(poll); };
  }, []);

  const isItemEnabled = (id: string) => itemFlags[id] !== false;

  const addItem = useCallback((item: { id: string; name: string; price: number; img: string }) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === id);
      if (!ex) return prev;
      if (ex.qty === 1) return prev.filter(c => c.id !== id);
      return prev.map(c => c.id === id ? { ...c, qty: c.qty - 1 } : c);
    });
  }, []);

  const getQty    = (id: string) => cart.find(c => c.id === id)?.qty ?? 0;
  const cartTotal  = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const cartCount  = cart.reduce((s, c) => s + c.qty, 0);

  if (!splashDone) return <SplashScreen fading={splashFading} />;
  if (page === "admin") return <AdminPage onExit={() => setPage("home")} />;

  return (
    <div className="clg-root">
      {configLoaded && !siteOnline && (
        <div className="offline-banner">We're currently closed. Orders are not being accepted right now. Check back soon!</div>
      )}
      <header className="clg-header">
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <div className="clg-brand" onClick={() => { setPage("home"); setCartOpen(false); }}>
          CLGBITES <span className="brand-x">×</span> Nelakuditi
        </div>
        <button className="cart-btn" onClick={() => { setCartOpen(true); setMenuOpen(false); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </header>

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <nav className="menu-panel" onClick={e => e.stopPropagation()}>
            <button className="menu-close" onClick={() => setMenuOpen(false)}>✕</button>
            <div className="menu-brand-logo">
              <img src="/images/biryani-hero.webp" alt="Logo" className="menu-logo-img" />
              <span>CLGBITES × Nelakuditi</span>
            </div>
            {(["home", "about", "reviews"] as Page[]).map(p => (
              <button key={p} className={`menu-item ${page === p ? "active" : ""}`}
                onClick={() => { setPage(p); setMenuOpen(false); }}>
                {p === "home" ? "🏠" : p === "about" ? "ℹ️" : "⭐"}&nbsp;{p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      )}

      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-panel" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Your Order</h2>
              <button className="cart-close-btn" onClick={() => setCartOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <OrderPanel
              cart={cart} cartTotal={cartTotal} addItem={addItem} removeItem={removeItem}
              siteOnline={siteOnline}
              custName={custName} setCustName={setCustName}
              custPhone={custPhone} setCustPhone={setCustPhone}
              custMode={custMode} setCustMode={setCustMode}
              custLocked={custLocked} setCustLocked={setCustLocked}
              onOrderDone={() => { setCart([]); setCustName(""); setCustPhone(""); setCustMode("cod"); setCustLocked(false); setCartOpen(false); }}
            />
          </div>
        </div>
      )}

      <main className="clg-main">
        {page === "home" && <HomePage cart={cart} addItem={addItem} removeItem={removeItem} getQty={getQty} openCats={openCats} setOpenCats={setOpenCats} isItemEnabled={isItemEnabled} />}
        {page === "about"   && <AboutPage />}
        {page === "reviews" && <ReviewsPage />}
      </main>

      {cartCount > 0 && !cartOpen && (
        <button className="floating-cart" onClick={() => { setCartOpen(true); setMenuOpen(false); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          <span>{cartCount} item{cartCount > 1 ? "s" : ""} · ₹{cartTotal}</span>
        </button>
      )}
    </div>
  );
}

/* ── SPLASH ── */
function SplashScreen({ fading }: { fading: boolean }) {
  return (
    <div className={`splash ${fading ? "splash-fade" : ""}`}>
      <div className="splash-glow" />
      <div className="splash-bowl">
        <img src="/images/biryani-hero.webp" alt="Biryani" className="splash-img" />
        <div className="splash-steam">{[...Array(5)].map((_, i) => <div key={i} className="steam-particle" style={{ animationDelay: `${i * 0.3}s`, left: `${15 + i * 15}%` }} />)}</div>
      </div>
      <div className="splash-text">
        <h1 className="splash-title"><span className="splash-clg">CLGBITES</span><span className="splash-x"> × </span><span className="splash-nel">Nelakuditi</span></h1>
        <p className="splash-tagline">Authentic Flavors, Delivered Fresh</p>
        <div className="splash-dots">{[0, 1, 2].map(i => <span key={i} style={{ animationDelay: `${i * 0.2}s` }} />)}</div>
      </div>
    </div>
  );
}

/* ── HOME PAGE ── */
function HomePage({ cart, addItem, removeItem, getQty, openCats, setOpenCats, isItemEnabled }: {
  cart: CartItem[]; addItem: (i: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void; getQty: (id: string) => number;
  openCats: Record<string, boolean>; setOpenCats: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isItemEnabled: (id: string) => boolean;
}) {
  return (
    <>
      <HeroBanner />
      <section className="section-label"><div className="section-pill">⭐ Chef's Picks</div><h2 className="section-title">Today's Specials</h2></section>
      <CylindricalCarousel items={CAROUSEL_ITEMS.filter(i => isItemEnabled(i.id))} addItem={addItem} removeItem={removeItem} getQty={getQty} />
      <section className="section-label" style={{ marginTop: "1.5rem" }}><div className="section-pill">📋 Full Menu</div><h2 className="section-title">Explore Menu</h2></section>
      <MenuSection categories={MENU_DATA} addItem={addItem} removeItem={removeItem} getQty={getQty} openCats={openCats} setOpenCats={setOpenCats} isItemEnabled={isItemEnabled} />
      <DailyReviewsSection />
      <MediaPartnerSection />
      <ContactSection />
    </>
  );
}

const HeroBanner = memo(function HeroBanner() {
  return (
    <div className="hero-banner">
      <img src="/images/biryani-hero.webp" alt="CLGBITES" className="hero-bg" />
      <div className="hero-overlay" />
      <div className="hero-content">
        <div className="hero-badge">🔥 Now Open</div>
        <h1 className="hero-title">Biryani & Tandoori<br /><span>Done Right</span></h1>
        <p className="hero-sub">Authentic Amrutha Culinaria flavors · Free delivery</p>
        <a href="#menu" className="hero-cta">Order Now →</a>
      </div>
    </div>
  );
});

const CylindricalCarousel = memo(function CylindricalCarousel({ items, addItem, removeItem, getQty }: {
  items: typeof CAROUSEL_ITEMS;
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void; getQty: (id: string) => number;
}) {
  const angleRef = useRef(0); const velocityRef = useRef(0); const lastX = useRef<number | null>(null);
  const lastTime = useRef<number>(0); const dragStartX = useRef<number>(0); const hasDragged = useRef(false);
  const rafRef = useRef<number>(0); const dragging = useRef(false); const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centerIdx, setCenterIdx] = useState(0);
  const STEP = 360 / Math.max(items.length, 1);
  const norm = (a: number) => ((a % 360) + 360) % 360;
  const applyCards = useCallback((isDragging: boolean) => {
    const angle = angleRef.current; let nextCenter = -1;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      let diff = ((i * STEP - norm(-angle)) % 360 + 360) % 360;
      if (diff > 180) diff -= 360;
      const abs = Math.abs(diff);
      el.style.transform  = `translateX(${diff * 2.6}px) rotateY(${-diff * 0.4}deg) scale(${Math.max(0.58, 1 - abs / 180 * 0.5)})`;
      el.style.opacity    = String(Math.max(0.25, 1 - abs / 180 * 0.8));
      el.style.zIndex     = String(Math.round(100 - abs));
      el.style.transition = isDragging ? "none" : "transform 0.1s ease-out, opacity 0.1s ease-out";
      if (abs < 20) nextCenter = i;
    });
    return nextCenter;
  }, [STEP]);
  const runInertia = useCallback(() => {
    velocityRef.current *= 0.93;
    if (Math.abs(velocityRef.current) < 0.05) { velocityRef.current = 0; const ci = applyCards(false); if (ci >= 0) setCenterIdx(ci); return; }
    angleRef.current += velocityRef.current; const ci = applyCards(false); if (ci >= 0) setCenterIdx(ci);
    rafRef.current = requestAnimationFrame(runInertia);
  }, [applyCards]);
  const animateTo = useCallback((target: number) => {
    cancelAnimationFrame(rafRef.current);
    const step = () => {
      const delta = target - angleRef.current;
      if (Math.abs(delta) < 0.15) { angleRef.current = target; const ci = applyCards(false); if (ci >= 0) setCenterIdx(ci); return; }
      angleRef.current += delta * 0.14; applyCards(false); rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [applyCards]);
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true; hasDragged.current = false; dragStartX.current = e.clientX;
    lastX.current = e.clientX; lastTime.current = Date.now(); velocityRef.current = 0;
    cancelAnimationFrame(rafRef.current); (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || lastX.current === null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 6) hasDragged.current = true;
    const dx = e.clientX - lastX.current; const dt = Date.now() - lastTime.current;
    velocityRef.current = dt > 0 ? (dx / dt) * 16 : 0; angleRef.current += dx * 0.3;
    applyCards(true); lastX.current = e.clientX; lastTime.current = Date.now();
  };
  const onPointerUp = () => { dragging.current = false; rafRef.current = requestAnimationFrame(runInertia); };
  const handleCardTap = (i: number) => {
    if (hasDragged.current) return;
    let diff = ((i * STEP - norm(-angleRef.current)) % 360 + 360) % 360;
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) < 20) return;
    animateTo(angleRef.current - diff);
  };
  useEffect(() => { applyCards(false); return () => cancelAnimationFrame(rafRef.current); }, [applyCards]);
  if (!items.length) return null;
  return (
    <div className="carousel-container" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
      <div className="carousel-scene">
        {items.map((item, i) => (
          <div key={item.id} ref={el => { cardRefs.current[i] = el; }} className={`carousel-card ${centerIdx === i ? "center" : "side-card"}`} style={{ opacity: 0 }} onClick={() => handleCardTap(i)}>
            {centerIdx !== i && <div className="tap-to-center-hint">Tap to view</div>}
            <div className="card-img-wrap">
              <img src={item.img} alt={item.name} className="card-img" draggable={false} loading="eager" />
              {centerIdx === i && <div className="card-shine" />}
            </div>
            <div className="card-body">
              <div className="card-name">{item.name}</div>
              <div className="card-price">₹{item.price}</div>
              <AddButton item={item} addItem={addItem} removeItem={removeItem} qty={getQty(item.id)} />
            </div>
          </div>
        ))}
      </div>
      <div className="carousel-hint">← Swipe or tap a card →</div>
    </div>
  );
});

function MenuSection({ categories, addItem, removeItem, getQty, openCats, setOpenCats, isItemEnabled }: {
  categories: typeof MENU_DATA; addItem: (i: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void; getQty: (id: string) => number;
  openCats: Record<string, boolean>; setOpenCats: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isItemEnabled: (id: string) => boolean;
}) {
  return (
    <div className="menu-section" id="menu">
      {Object.entries(categories).map(([key, cat]) => (
        <div key={key} className="menu-category">
          <button className="category-header" onClick={() => setOpenCats(p => ({ ...p, [key]: !p[key] }))}>
            <div className="category-label"><span className="cat-emoji">{cat.emoji}</span><span className="cat-name">{cat.label}</span><span className="cat-count">{cat.items.length} items</span></div>
            <span className={`cat-arrow ${openCats[key] ? "open" : ""}`}>▾</span>
          </button>
          {openCats[key] && (
            <div className="category-items">
              {cat.items.filter(item => isItemEnabled(item.id)).map(item => (
                <div key={item.id} className="menu-item-row">
                  <div className="menu-item-left">
                    <div className={`veg-icon ${item.veg ? "veg" : "nonveg"}`}><span /></div>
                    <div className="menu-item-info"><div className="menu-item-name">{item.name}</div><div className="menu-item-price">₹{item.price}</div></div>
                  </div>
                  <div className="menu-item-right">
                    <img src={item.img} alt={item.name} className="menu-item-img" loading="lazy" decoding="async" />
                    <AddButton item={item} addItem={addItem} removeItem={removeItem} qty={getQty(item.id)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const DAILY_REVIEWS = [
  { name: "Ravi Kumar", rating: 5, comment: "Best biryani I've ever had! The dum biryani is absolutely out of this world. Ordered thrice this week!", item: "Chicken Dum Biryani" },
  { name: "Anjali",     rating: 4, comment: "Very tasty and great packaging. My whole family loved the Paneer Biryani. Will order again!", item: "Paneer Biryani" },
  { name: "Suresh",     rating: 5, comment: "Fast delivery and amazing taste. The Tandoori Chicken was perfectly marinated — restaurant quality!", item: "Tandoori Chicken" },
  { name: "Meera G.",   rating: 5, comment: "Special Biryani is a feast! So flavorful and aromatic. CLGBITES never disappoints!", item: "Chicken Special Biryani" },
  { name: "Venkat R.",  rating: 5, comment: "Ordered for office lunch — everyone loved it! The portion sizes are very generous too.", item: "Chicken Mixed Biryani" },
  { name: "Lakshmi D.", rating: 4, comment: "Veg Biryani was absolutely delicious and fresh. Great option for vegetarians like me!", item: "Veg Biryani" },
];

const DailyReviewsSection = memo(function DailyReviewsSection() {
  return (
    <section className="daily-reviews-section">
      <div className="section-label" style={{ padding: "24px 20px 12px" }}><div className="section-pill">🌟 Previous Day Reviews</div><h2 className="section-title">What People Are Saying</h2></div>
      <div className="daily-reviews-scroll">
        {DAILY_REVIEWS.map((r, i) => (
          <div key={i} className="daily-review-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="dr-top"><div className="dr-avatar">{r.name[0]}</div><div className="dr-info"><div className="dr-name">{r.name}</div><div className="dr-item">Ordered: {r.item}</div></div></div>
            <div className="dr-stars">{[...Array(5)].map((_, si) => <span key={si} className={si < r.rating ? "star-filled" : "star-empty"}>★</span>)}</div>
            <p className="dr-comment">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

const MediaPartnerSection = memo(function MediaPartnerSection() {
  const avatarColors  = ["#e74c3c", "#2ecc71", "#3498db", "#9b59b6", "#e67e22"];
  const avatarLetters = ["R", "S", "A", "P", "K"];
  return (
    <section className="media-partner-section">
      <div className="section-label" style={{ padding: "24px 20px 12px" }}><div className="section-pill">📡 Media Partner</div><h2 className="section-title">Stay in the Loop</h2></div>
      <div className="mp-card">
        <div className="mp-left">
          <div className="mp-avatar-wrap"><img src="/images/jilebi-logo.jpeg" alt="Jilebi Updates" className="mp-avatar" /><span className="mp-trending-badge">🔥 Trending</span></div>
          <div className="mp-channel-name">Jilebi Updates</div>
          <div className="mp-channel-tagline">Stay Ahead at SRM-AP</div>
          <div className="mp-followers"><span className="mp-dot" />12,000+ Followers</div>
        </div>
        <div className="mp-divider" />
        <div className="mp-right">
          <p className="mp-desc">Stay updated with <strong>SRM-AP events, exams &amp; campus life</strong> — all in one WhatsApp channel.</p>
          <div className="mp-social-proof">
            <div className="mp-avatars">{avatarLetters.map((l, i) => <div key={i} className="mp-mini-avatar" style={{ background: avatarColors[i], marginLeft: i === 0 ? 0 : -8 }}>{l}</div>)}</div>
            <div className="mp-proof-text"><span className="mp-proof-count">12K+ students</span> already joined<div className="mp-proof-sub">Trusted by SRM-AP community</div></div>
          </div>
          <div className="mp-bottom-row">
            <span className="mp-meta">Free · No spam · SRM-AP only</span>
            <a href="https://whatsapp.com/channel/0029Va5vs6RFMqrfr1YnW31P" target="_blank" rel="noopener noreferrer" className="mp-join-btn">Join Now</a>
          </div>
        </div>
      </div>
    </section>
  );
});

const ContactSection = memo(function ContactSection() {
  return (
    <section className="contact-section">
      <div className="contact-inner">
        <div className="contact-brand"><img src="/images/biryani-hero.webp" alt="CLGBITES" className="contact-logo" /><div><div className="contact-brand-name">CLGBITES × Nelakuditi</div><div className="contact-brand-sub">Amrutha Culinaria</div></div></div>
        <div className="contact-details">
          <div className="contact-row"><span className="contact-icon-wrap phone-icon">📞</span><a href="tel:+919989955833" className="contact-link">+91 99899 55833</a></div>
          <div className="contact-row"><span className="contact-icon-wrap mail-icon">✉️</span><a href="mailto:clgbites@gmail.com" className="contact-link">clgbites@gmail.com</a></div>
        </div>
        <div className="contact-footer-note">© 2025 CLGBITES × Nelakuditi · Made with ❤️ in Nelakuditi</div>
      </div>
    </section>
  );
});

const REVIEWS = [
  { name: "Rahul M.", rating: 5, comment: "Best biryani near college! The dum biryani is absolutely divine. Will order again!", date: "2 days ago" },
  { name: "Priya K.", rating: 5, comment: "Chicken Fry Piece Biryani is out of this world! Delivery was super fast too. 10/10!", date: "1 week ago" },
  { name: "Arjun S.", rating: 5, comment: "Amazing tandoori chicken! The marinade is perfect. Great value for money.", date: "1 week ago" },
  { name: "Sneha P.", rating: 4, comment: "Paneer Biryani was lovely! Great for vegetarians. The portion size is very generous.", date: "2 weeks ago" },
  { name: "Kiran R.", rating: 5, comment: "CLGBITES is my go-to for biryani. The Mughlai Biryani is absolutely royal!", date: "3 weeks ago" },
  { name: "Divya L.", rating: 5, comment: "Tried the Non Veg Tandoori Platter — a feast! Everything was perfectly cooked.", date: "1 month ago" },
];

const ReviewsPage = memo(function ReviewsPage() {
  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1>Customer Reviews</h1>
        <div className="overall-rating"><div className="big-rating">4.8</div><div className="stars-row">{"⭐".repeat(5)}</div><div className="rating-count">Based on 500+ reviews</div></div>
      </div>
      <div className="reviews-grid">
        {REVIEWS.map((r, i) => (
          <div key={i} className="review-card">
            <div className="review-top"><div className="reviewer-avatar">{r.name[0]}</div><div className="reviewer-info"><div className="reviewer-name">{r.name}</div><div className="review-date">{r.date}</div></div><div className="review-stars">{"⭐".repeat(r.rating)}</div></div>
            <p className="review-text">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

const AboutPage = memo(function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-hero"><img src="/images/biryani-hero.webp" alt="About" className="about-img" /><div className="about-overlay" /></div>
      <div className="about-content">
        <h1 className="about-title">About Us</h1>
        <div className="about-badge">Amrutha Culinaria</div>
        <p className="about-desc">We are CLGBITES × Nelakuditi — bringing you the authentic flavors of Amrutha Culinaria, a kitchen dedicated to the art of Biryani and Tandoori.</p>
        <p className="about-desc">Every grain of our basmati rice is slow-cooked to perfection using traditional dum cooking methods, infusing rich aromatic spices passed down through generations.</p>
        <div className="about-stats">
          {[{ num: "5+", label: "Years Experience" }, { num: "20+", label: "Menu Items" }, { num: "1000+", label: "Happy Customers" }, { num: "⭐ 4.8", label: "Avg Rating" }].map(s => (
            <div key={s.label} className="stat-box"><div className="stat-num">{s.num}</div><div className="stat-label">{s.label}</div></div>
          ))}
        </div>
        <div className="about-contact"><h3>Contact Us</h3><a href="https://wa.me/919989955833" target="_blank" rel="noopener noreferrer" className="contact-wa">WhatsApp: +91 9989955833</a></div>
      </div>
    </div>
  );
});

export default App;