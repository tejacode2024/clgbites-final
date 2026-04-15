import { useState, useEffect, useRef, useCallback, memo } from "react";
import { AdminPage } from "./AdminPage";
/* ─────────────────────────────────────────────
   CONFIG & API
───────────────────────────────────────────── */
const API = import.meta.env.VITE_API_URL ?? "";   // leave empty → same origin (Vercel)

async function fetchConfig(): Promise<{ site_online: boolean; item_flags: Record<string, boolean> }> {
  try {
    const r = await fetch(`${API}/api/config`);
    if (!r.ok) throw new Error("config fetch failed");
    return r.json();
  } catch {
    return { site_online: true, item_flags: {} };  // fail-open
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

/* ─────────────────────────────────────────────
   MENU DATA  (Amrutha Culinaria)
───────────────────────────────────────────── */
const MENU_DATA = {
  biryani: {
    label: "Biryani",
    emoji: "🍚",
    items: [
      { id: "b1", name: "Chicken Dum Biryani",      price: 199, veg: false, img: "/images/chicken-dum-biryani.webp" },
      { id: "b2", name: "Chicken Fry Piece Biryani", price: 219, veg: false, img: "/images/chicken-fry-biryani.webp" },
      { id: "b3", name: "Chicken Mixed Biryani",     price: 219, veg: false, img: "/images/chicken-dum-biryani.webp" },
      { id: "b4", name: "Chicken Mughali Biryani",   price: 249, veg: false, img: "/images/chicken-mughali-biryani.webp" },
      { id: "b5", name: "Chicken Special Biryani",   price: 249, veg: false, img: "/images/chicken-special-biryani.webp" },
      { id: "b6", name: "Veg Biryani",               price: 179, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "b7", name: "Special Veg Biryani",       price: 189, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "b8", name: "Paneer Biryani",             price: 229, veg: true,  img: "/images/paneer-biryani.webp" },
    ],
  },
  pulaoRice: {
    label: "Pulao & Fried Rice",
    emoji: "🍛",
    items: [
      { id: "p1", name: "Bagara Rice Chicken Fry", price: 219, veg: false, img: "/images/chicken-fry-biryani.webp" },
      { id: "p2", name: "Veg Fried Rice",          price: 169, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "p3", name: "Sp Veg Fried Rice",       price: 229, veg: true,  img: "/images/veg-biryani.webp" },
    ],
  },
  tandoori: {
    label: "Tandoori Specialties",
    emoji: "🔥",
    items: [
      { id: "t1",  name: "Tandoori Chicken Full",     price: 550, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t2",  name: "Tandoori Chicken Half",     price: 300, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t3",  name: "Tangdi Kabab (4 Pcs)",      price: 390, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t4",  name: "Kalmi Kabab (4 Pcs)",       price: 390, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t5",  name: "Reshmi Kabab",               price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t6",  name: "Chicken Tikka",              price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t7",  name: "Murg Malai Kabab",           price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t8",  name: "Fish Tikka",                 price: 350, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t9",  name: "Prawns Tikka",               price: 450, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t10", name: "Boti Kabab",                 price: 400, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t11", name: "Chicken Seekh Kebab",        price: 350, veg: false, img: "/images/chicken-tikka.webp" },
      { id: "t12", name: "Non Veg Tandoori Platter",   price: 450, veg: false, img: "/images/tandoori-chicken.webp" },
      { id: "t13", name: "Paneer Tikka",               price: 300, veg: true,  img: "/images/paneer-biryani.webp" },
      { id: "t14", name: "Haraba Kabab",               price: 250, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "t15", name: "Veg Seekh Kebab",            price: 250, veg: true,  img: "/images/veg-biryani.webp" },
      { id: "t16", name: "Veg Tandoori Platter",       price: 450, veg: true,  img: "/images/veg-biryani.webp" },
    ],
  },
};

const ALL_ITEMS = Object.values(MENU_DATA).flatMap(c => c.items);
const CAROUSEL_ITEMS = MENU_DATA.biryani.items;

/* ─── TYPES ─── */
type CartItem = { id: string; name: string; price: number; qty: number; img: string };
type Page = "home" | "cart" | "about" | "reviews" | "admin";

/* ─────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────── */
function App() {
  const [splashDone, setSplashDone]     = useState(false);
  const [splashFading, setSplashFading] = useState(false);
  const [page, setPage]                 = useState<Page>(() =>
    window.location.pathname === "/admin" ? "admin" : "home"
  );
  const [cart, setCart]                 = useState<CartItem[]>([]);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [cartOpen, setCartOpen]         = useState(false);
  const [openCats, setOpenCats]         = useState<Record<string, boolean>>({ biryani: true, pulaoRice: false, tandoori: false });
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout" | "saving" | "done">("cart");
  const [paymentMode, setPaymentMode]   = useState<"cod" | "prepaid">("cod");
  const [customerName, setCustomerName]     = useState("");
  const [customerPhone, setCustomerPhone]   = useState("");
  const [checkoutError, setCheckoutError]   = useState("");

  // Config state
  const [siteOnline, setSiteOnline]   = useState(true);
  const [itemFlags, setItemFlags]     = useState<Record<string, boolean>>({});
  const [configLoaded, setConfigLoaded] = useState(false);

  // Sync URL
  useEffect(() => {
    const path = page === "admin" ? "/admin" : "/";
    window.history.replaceState(null, "", path);
  }, [page]);

  useEffect(() => {
    const t1 = setTimeout(() => setSplashFading(true), 2800);
    const t2 = setTimeout(() => setSplashDone(true), 3500);
    // Fetch config while splash shows
    fetchConfig().then(cfg => {
      setSiteOnline(cfg.site_online);
      setItemFlags(cfg.item_flags ?? {});
      setConfigLoaded(true);
    });
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const isItemEnabled = (id: string) => itemFlags[id] !== false; // default true if not set

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

  const handleWhatsApp = async () => {
    setCheckoutError("");
    setCheckoutStep("saving");
    let tokenId: number | undefined;
    try {
      const result = await saveOrder({
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
        payment_mode: paymentMode,
        total: cartTotal,
      });
      // result from supabase insert is an array; grab the id of the new row
      tokenId = Array.isArray(result) ? result[0]?.id : result?.orderId ?? result?.[0]?.id;
    } catch (err) {
      setCheckoutError("Could not save order to server. Please try again.");
      setCheckoutStep("checkout");
      return;
    }

    const tokenStr = tokenId ? `#${String(tokenId).padStart(3, "0")}` : "";
    const lines   = cart.map(c => `• ${c.name} ×${c.qty} = ₹${c.price * c.qty}`).join("\n");
    const confirm = paymentMode === "cod" ? "Confirm my order on COD" : "Confirm my order and send QR";
    const msg = `*Order from SRM-AP*\n\n*Token: ${tokenStr}*\n\n${lines}\n\n *Total: ₹${cartTotal}*\n\nName: ${customerName}\nPhone: ${customerPhone}\n\n${confirm}`;
    window.open(`https://wa.me/919989955833?text=${encodeURIComponent(msg)}`, "_blank");
     setCart([]);
    setCheckoutStep("done");
  };
  if (!splashDone) return <SplashScreen fading={splashFading} />;

  // Admin page takes over completely
  if (page === "admin") return <AdminPage onExit={() => setPage("home")} />;

  return (
    <div className="clg-root">
      {/* ── OFFLINE BANNER ── */}
      {configLoaded && !siteOnline && (
        <div className="offline-banner">
          🔴 We're currently closed. Orders are not being accepted right now. Check back soon!
        </div>
      )}

      {/* ─ HEADER ─ */}
      <header className="clg-header">
        <button className="hamburger-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu">
          <span /><span /><span />
        </button>
        <div className="clg-brand" onClick={() => { setPage("home"); setCartOpen(false); }}>
          CLGBITES <span className="brand-x">×</span> Nelakuditi
        </div>
        <button className="cart-btn" onClick={() => { setCartOpen(true); setMenuOpen(false); setCheckoutStep("cart"); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </header>

      {/* ─ HAMBURGER MENU ─ */}
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
                {p === "home" ? "🏠" : p === "about" ? "ℹ️" : "⭐"}&nbsp; {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ─ CART DRAWER ─ */}
      {cartOpen && (
        <div className="cart-overlay" onClick={() => setCartOpen(false)}>
          <div className="cart-panel" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Your Order</h2>
              <button onClick={() => setCartOpen(false)}>✕</button>
            </div>

            {checkoutStep === "done" ? (
              <div className="checkout-done">
                <div className="done-icon">🎉</div>
                <h3>Order Sent!</h3>
                <p>Your order has been saved and sent via WhatsApp. We'll confirm it shortly!</p>
                <button className="btn-primary" onClick={() => { setCartOpen(false); setCart([]); setCheckoutStep("cart"); }}>
                  Back to Menu
                </button>
              </div>
            ) : checkoutStep === "saving" ? (
              <div className="checkout-done">
                <div className="done-icon" style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>⏳</div>
                <h3>Saving order…</h3>
                <p>Please wait a moment.</p>
              </div>
            ) : checkoutStep === "checkout" ? (
              <CheckoutForm
                cart={cart}
                cartTotal={cartTotal}
                paymentMode={paymentMode}
                setPaymentMode={setPaymentMode}
                customerName={customerName}
                setCustomerName={setCustomerName}
                customerPhone={customerPhone}
                setCustomerPhone={setCustomerPhone}
                onConfirm={handleWhatsApp}
                onBack={() => setCheckoutStep("cart")}
                error={checkoutError}
                disabled={!siteOnline}
              />
            ) : (
              <>
                {cart.length === 0 ? (
                  <div className="cart-empty">
                    <div className="empty-icon">🛒</div>
                    <p>Your cart is empty</p>
                    <span>Add items from our delicious menu!</span>
                  </div>
                ) : (
                  <>
                    <div className="cart-items">
                      {cart.map(item => (
                        <div key={item.id} className="cart-item-row">
                          <img src={item.img} alt={item.name} className="cart-item-img" />
                          <div className="cart-item-info">
                            <div className="cart-item-name">{item.name}</div>
                            <div className="cart-item-price">₹{item.price}</div>
                          </div>
                          <div className="qty-control">
                            <button onClick={() => removeItem(item.id)}>−</button>
                            <span>{item.qty}</span>
                            <button onClick={() => addItem({ id: item.id, name: item.name, price: item.price, img: item.img })}>+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="cart-footer">
                      <div className="cart-totals">
                        <div className="total-row"><span>Subtotal</span><span>₹{cartTotal}</span></div>
                        <div className="total-row"><span>Delivery</span><span className="free">FREE</span></div>
                        <div className="total-row total-final"><span>Total</span><span>₹{cartTotal}</span></div>
                      </div>
                      {!siteOnline ? (
                        <div className="offline-cart-note">🔴 We're closed right now. Come back soon!</div>
                      ) : (
                        <button className="btn-primary" onClick={() => setCheckoutStep("checkout")}>
                          Proceed to Checkout →
                        </button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─ MAIN CONTENT ─ */}
      <main className="clg-main">
        {page === "home" && (
          <HomePage
            cart={cart} addItem={addItem} removeItem={removeItem} getQty={getQty}
            openCats={openCats} setOpenCats={setOpenCats}
            isItemEnabled={isItemEnabled}
          />
        )}
        {page === "about"   && <AboutPage />}
        {page === "reviews" && <ReviewsPage />}
      </main>

      {/* ─ FLOATING CART BUTTON ─ */}
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



/* ─────────────────────────────────────────────
   SPLASH SCREEN
───────────────────────────────────────────── */
function SplashScreen({ fading }: { fading: boolean }) {
  return (
    <div className={`splash ${fading ? "splash-fade" : ""}`}>
      <div className="splash-glow" />
      <div className="splash-bowl">
        <img src="/images/biryani-hero.webp" alt="Biryani" className="splash-img" />
        <div className="splash-steam">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="steam-particle" style={{ animationDelay: `${i * 0.3}s`, left: `${15 + i * 15}%` }} />
          ))}
        </div>
      </div>
      <div className="splash-text">
        <h1 className="splash-title">
          <span className="splash-clg">CLGBITES</span>
          <span className="splash-x"> × </span>
          <span className="splash-nel">Nelakuditi</span>
        </h1>
        <p className="splash-tagline">Authentic Flavors, Delivered Fresh</p>
        <div className="splash-dots">
          {[0, 1, 2].map(i => <span key={i} style={{ animationDelay: `${i * 0.2}s` }} />)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WHATSAPP CHANNEL BANNER
─────────────────────────────────────────────
*/
function CountUp({ end, duration = 1400 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setCount(Math.floor(ease * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [end, duration]);
  return <>{count.toLocaleString()}</>;
}

const WA_FEATURES = [
  { emoji: "🔔", title: "Exam Updates",   desc: "Never miss a change",     accent: "#facc15" },
  { emoji: "🎉", title: "Campus Events",  desc: "Fests, flash mobs & fun",  accent: "#a78bfa" },
  { emoji: "📍", title: "Nearby Spots",   desc: "PGs, food & essentials",   accent: "#fb923c" },
  { emoji: "⚡", title: "Instant Alerts", desc: "Real-time campus news",    accent: "#4ade80" },
];

const WaIcon = () => (
  <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function WhatsAppBanner() {
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [btnDown,   setBtnDown]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Check if user already dismissed this session
    if (sessionStorage.getItem("wa_banner_dismissed")) return;
    timerRef.current = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setDismissed(true);
      sessionStorage.setItem("wa_banner_dismissed", "1");
    }, 320);
  };

  if (dismissed || !visible) return null;

  return (
    <>
      <style>{`
        @keyframes wa-overlay-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes wa-modal-in {
          from { opacity: 0; transform: scale(0.92) translateY(24px); filter: blur(4px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    filter: blur(0); }
        }
        @keyframes wa-modal-out {
          from { opacity: 1; transform: scale(1)    translateY(0);    filter: blur(0); }
          to   { opacity: 0; transform: scale(0.94) translateY(12px); filter: blur(2px); }
        }
        @keyframes wa-dot-pulse {
          0%,100% { opacity: 1; box-shadow: 0 0 6px #4ade80; }
          50%      { opacity: 0.55; box-shadow: 0 0 14px #4ade80; }
        }
        @keyframes wa-btn-glow {
          0%,100% { box-shadow: 0 8px 28px rgba(37,211,102,0.45), 0 0 0 0 rgba(37,211,102,0.2); }
          50%      { box-shadow: 0 8px 44px rgba(37,211,102,0.72), 0 0 0 6px rgba(37,211,102,0); }
        }
        @keyframes wa-shimmer {
          0%   { background-position: -220% center; }
          100% { background-position:  220% center; }
        }
        @keyframes wa-badge-pop {
          0%   { transform: translateX(-50%) scale(0) rotate(-8deg); }
          65%  { transform: translateX(-50%) scale(1.14) rotate(2deg); }
          100% { transform: translateX(-50%) scale(1) rotate(0deg); }
        }
        .wa-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: wa-overlay-in 0.25s ease forwards;
        }
        .wa-modal {
          width: 100%; max-width: 360px; max-height: 90vh; overflow-y: auto;
          border-radius: 24px;
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(37,211,102,0.1);
          animation: wa-modal-in 0.42s cubic-bezier(0.22,1,0.36,1) forwards;
          font-family: 'Inter', system-ui, sans-serif;
          scrollbar-width: none;
        }
        .wa-modal::-webkit-scrollbar { display: none; }
        .wa-modal.closing { animation: wa-modal-out 0.30s ease-in forwards; }
        .wa-shimmer-txt {
          background: linear-gradient(92deg, #fbbf24 0%, #fde68a 35%, #f59e0b 50%, #fde68a 65%, #fbbf24 100%);
          background-size: 220% auto;
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: wa-shimmer 2.8s linear infinite;
        }
        .wa-btn-idle { animation: wa-btn-glow 2.8s ease-in-out infinite; }
        .wa-glow-dot {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%;
          background: #4ade80; flex-shrink: 0;
          animation: wa-dot-pulse 2s ease-in-out infinite;
        }
        .wa-badge-pop {
          animation: wa-badge-pop 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.55s both;
        }
        .wa-feature-card {
          border-radius: 14px; padding: 10px; cursor: default;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .wa-feature-card:hover {
          transform: translateY(-3px) scale(1.02);
        }
      `}</style>

      <div className="wa-overlay" onClick={handleClose}>
        <div className={`wa-modal${closing ? " closing" : ""}`} onClick={e => e.stopPropagation()}>

          {/* ── Header strip ── */}
          <div style={{
            background: "linear-gradient(135deg, #0a1628 0%, #0d1f0d 50%, #0a1628 100%)",
            borderRadius: "24px 24px 0 0",
            padding: "28px 20px 24px",
            textAlign: "center",
            position: "relative",
            borderBottom: "1px solid rgba(37,211,102,0.12)",
          }}>
            {/* Close button */}
            <button onClick={handleClose} style={{
              position: "absolute", top: 12, right: 12,
              width: 30, height: 30, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, transition: "all 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)"; }}
            >✕</button>

            {/* Channel avatar */}
            <div style={{ position: "relative", display: "inline-block", marginBottom: 14 }}>
              <div style={{
                width: 88, height: 88, borderRadius: "50%",
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                padding: 3, margin: "0 auto",
              }}>
                <div style={{
                  width: "100%", height: "100%", borderRadius: "50%",
                  background: "#111", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 36,
                }}>📢</div>
              </div>
              {/* Trending badge */}
              <div className="wa-badge-pop" style={{
                position: "absolute", bottom: -6, left: "50%",
                background: "linear-gradient(135deg,#f97316,#ef4444)",
                borderRadius: 20, padding: "2px 8px",
                fontSize: 10, fontWeight: 800, color: "#fff", whiteSpace: "nowrap",
              }}>🔥 Trending</div>
            </div>

            {/* Title */}
            <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 900, margin: "0 0 4px", letterSpacing: "-0.025em" }}>
              Jilebi Updates
            </h2>
            <p className="wa-shimmer-txt" style={{ fontSize: 11, fontWeight: 700, margin: "0 0 12px", letterSpacing: "0.05em" }}>
              Stay Ahead at SRM‑AP
            </p>

            {/* Live pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "4px 12px", borderRadius: 20,
              background: "rgba(37,211,102,0.12)", border: "1px solid rgba(37,211,102,0.28)",
            }}>
              <span className="wa-glow-dot" />
              <span style={{ color: "#4ade80", fontSize: 12, fontWeight: 700 }}>
                <CountUp end={12000} />+ Followers
              </span>
            </div>
          </div>

          {/* ── Body ── */}
          <div style={{ padding: "18px 18px 22px" }}>

            {/* Copy */}
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12.5, lineHeight: 1.65, marginBottom: 16 }}>
              Stay updated with{" "}
              <span style={{ color: "#fff", fontWeight: 600 }}>SRM-AP events, exams & campus life</span>
              {" "}— all in one WhatsApp channel.
            </p>

            {/* Feature grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {WA_FEATURES.map(f => (
                <div key={f.title} className="wa-feature-card" style={{
                  background: `${f.accent}12`,
                  border: `1px solid ${f.accent}28`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 10,
                    background: `${f.accent}1a`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 6, fontSize: 14,
                  }}>{f.emoji}</div>
                  <p style={{ color: "#fff", fontSize: 11, fontWeight: 700, margin: "0 0 2px", lineHeight: 1.3 }}>{f.title}</p>
                  <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 10, margin: 0, lineHeight: 1.3 }}>{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ display: "flex", marginRight: 2 }}>
                {["#ec4899","#3b82f6","#22c55e","#f97316","#8b5cf6"].map((bg, i) => (
                  <div key={i} style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: bg, border: "2px solid #0d1117",
                    marginLeft: i === 0 ? 0 : -8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, fontWeight: 700, color: "#fff",
                  }}>{"RSAPK"[i]}</div>
                ))}
              </div>
              <div>
                <p style={{ color: "#fff", fontSize: 11, fontWeight: 600, margin: "0 0 1px" }}>12K+ students already joined</p>
                <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 10, margin: 0 }}>Trusted by SRM-AP community</p>
              </div>
            </div>

            {/* Urgency text */}
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.38)", fontSize: 11, marginBottom: 10 }}>
              Free · No spam · SRM-AP only
            </p>

            {/* CTA */}
            <a
              href="https://whatsapp.com/channel/0029Va5vs6RFMqrfr1YnW31P"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", textDecoration: "none" }}
            >
              <button
                className="wa-btn-idle"
                style={{
                  width: "100%", padding: "15px 0", borderRadius: 16,
                  background: "linear-gradient(135deg, #25D366 0%, #20b05a 45%, #128C7E 100%)",
                  border: "none", color: "#fff", fontWeight: 900, fontSize: 15,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  cursor: "pointer", letterSpacing: "-0.01em",
                  transform: btnDown ? "scale(0.97)" : "scale(1)",
                  transition: "transform 0.1s ease, filter 0.1s ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.1)"; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = ""; (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                onMouseDown={() => setBtnDown(true)}
                onMouseUp={() => setBtnDown(false)}
              >
                <WaIcon />
                Join Now on WhatsApp
              </button>
            </a>

          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────── */
function HomePage({ cart, addItem, removeItem, getQty, openCats, setOpenCats, isItemEnabled }: {
  cart: CartItem[];
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void;
  getQty: (id: string) => number;
  openCats: Record<string, boolean>;
  setOpenCats: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isItemEnabled: (id: string) => boolean;
}) {
  return (
    <>
      <WhatsAppBanner />
      <HeroBanner />
      <section className="section-label">
        <div className="section-pill">⭐ Chef's Picks</div>
        <h2 className="section-title">Today's Specials</h2>
      </section>
      <CylindricalCarousel items={CAROUSEL_ITEMS.filter(i => isItemEnabled(i.id))} addItem={addItem} removeItem={removeItem} getQty={getQty} />
      <section className="section-label" style={{ marginTop: "1.5rem" }}>
        <div className="section-pill">📋 Full Menu</div>
        <h2 className="section-title">Explore Menu</h2>
      </section>
      <MenuSection categories={MENU_DATA} addItem={addItem} removeItem={removeItem} getQty={getQty}
        openCats={openCats} setOpenCats={setOpenCats} isItemEnabled={isItemEnabled} />
      <DailyReviewsSection />
      <ContactSection />
    </>
  );
}

/* ─────────────────────────────────────────────
   HERO BANNER
───────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────
   CYLINDRICAL CAROUSEL  (physics-based swipe)
───────────────────────────────────────────── */
const CylindricalCarousel = memo(function CylindricalCarousel({ items, addItem, removeItem, getQty }: {
  items: typeof CAROUSEL_ITEMS;
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void;
  getQty: (id: string) => number;
}) {
  const angleRef    = useRef(0);
  const velocityRef = useRef(0);
  const lastX       = useRef<number | null>(null);
  const lastTime    = useRef<number>(0);
  const dragStartX  = useRef<number>(0);
  const hasDragged  = useRef(false);
  const rafRef      = useRef<number>(0);
  const dragging    = useRef(false);
  const cardRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const [centerIdx, setCenterIdx] = useState(0);

  const STEP = 360 / Math.max(items.length, 1);
  const norm = (a: number) => ((a % 360) + 360) % 360;

  const applyCards = useCallback((isDragging: boolean) => {
    const angle = angleRef.current;
    let nextCenter = -1;
    cardRefs.current.forEach((el, i) => {
      if (!el) return;
      const itemAngle = i * STEP;
      let diff = ((itemAngle - norm(-angle)) % 360 + 360) % 360;
      if (diff > 180) diff -= 360;
      const abs     = Math.abs(diff);
      const scale   = Math.max(0.58, 1 - abs / 180 * 0.5);
      const opacity = Math.max(0.25, 1 - abs / 180 * 0.8);
      el.style.transform  = `translateX(${diff * 2.6}px) rotateY(${-diff * 0.4}deg) scale(${scale})`;
      el.style.opacity    = String(opacity);
      el.style.zIndex     = String(Math.round(100 - abs));
      el.style.transition = isDragging ? "none" : "transform 0.1s ease-out, opacity 0.1s ease-out";
      if (abs < 20) nextCenter = i;
    });
    return nextCenter;
  }, [STEP]);

  const runInertia = useCallback(() => {
    velocityRef.current *= 0.93;
    if (Math.abs(velocityRef.current) < 0.05) {
      velocityRef.current = 0;
      const ci = applyCards(false);
      if (ci >= 0) setCenterIdx(ci);
      return;
    }
    angleRef.current += velocityRef.current;
    const ci = applyCards(false);
    if (ci >= 0) setCenterIdx(ci);
    rafRef.current = requestAnimationFrame(runInertia);
  }, [applyCards]);

  const animateTo = useCallback((target: number) => {
    cancelAnimationFrame(rafRef.current);
    const step = () => {
      const delta = target - angleRef.current;
      if (Math.abs(delta) < 0.15) {
        angleRef.current = target;
        const ci = applyCards(false);
        if (ci >= 0) setCenterIdx(ci);
        return;
      }
      angleRef.current += delta * 0.14;
      applyCards(false);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [applyCards]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current    = true;
    hasDragged.current  = false;
    dragStartX.current  = e.clientX;
    lastX.current       = e.clientX;
    lastTime.current    = Date.now();
    velocityRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || lastX.current === null) return;
    if (Math.abs(e.clientX - dragStartX.current) > 6) hasDragged.current = true;
    const dx = e.clientX - lastX.current;
    const dt = Date.now() - lastTime.current;
    velocityRef.current  = dt > 0 ? (dx / dt) * 16 : 0;
    angleRef.current    += dx * 0.3;
    applyCards(true);
    lastX.current    = e.clientX;
    lastTime.current = Date.now();
  };

  const onPointerUp = () => {
    dragging.current = false;
    rafRef.current   = requestAnimationFrame(runInertia);
  };

  const handleCardTap = (i: number) => {
    if (hasDragged.current) return;
    const itemAngle = i * STEP;
    let diff = ((itemAngle - norm(-angleRef.current)) % 360 + 360) % 360;
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) < 20) return;
    animateTo(angleRef.current - diff);
  };

  useEffect(() => {
    applyCards(false);
    return () => cancelAnimationFrame(rafRef.current);
  }, [applyCards]);

  if (!items.length) return null;

  return (
    <div className="carousel-container"
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}    onPointerLeave={onPointerUp}>
      <div className="carousel-scene">
        {items.map((item, i) => (
          <div key={item.id}
            ref={el => { cardRefs.current[i] = el; }}
            className={`carousel-card ${centerIdx === i ? "center" : "side-card"}`}
            style={{ opacity: 0 }}
            onClick={() => handleCardTap(i)}
          >
            {centerIdx !== i && (
              <div className="tap-to-center-hint">Tap to view</div>
            )}
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

/* ─────────────────────────────────────────────
   ADD / QTY BUTTON
───────────────────────────────────────────── */
function AddButton({ item, addItem, removeItem, qty }: {
  item: { id: string; name: string; price: number; img: string };
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void;
  qty: number;
}) {
  if (qty === 0) {
    return (
      <button className="btn-add" onClick={e => { e.stopPropagation(); addItem(item); }}>
        + Add
      </button>
    );
  }
  return (
    <div className="qty-counter" onClick={e => e.stopPropagation()}>
      <button onClick={() => removeItem(item.id)}>−</button>
      <span>{qty}</span>
      <button onClick={() => addItem(item)}>+</button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MENU SECTION
───────────────────────────────────────────── */
function MenuSection({ categories, addItem, removeItem, getQty, openCats, setOpenCats, isItemEnabled }: {
  categories: typeof MENU_DATA;
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void;
  getQty: (id: string) => number;
  openCats: Record<string, boolean>;
  setOpenCats: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  isItemEnabled: (id: string) => boolean;
}) {
  return (
    <div className="menu-section" id="menu">
      {Object.entries(categories).map(([key, cat]) => (
        <div key={key} className="menu-category">
          <button className="category-header"
            onClick={() => setOpenCats(p => ({ ...p, [key]: !p[key] }))}>
            <div className="category-label">
              <span className="cat-emoji">{cat.emoji}</span>
              <span className="cat-name">{cat.label}</span>
              <span className="cat-count">{cat.items.length} items</span>
            </div>
            <span className={`cat-arrow ${openCats[key] ? "open" : ""}`}>▾</span>
          </button>

          {openCats[key] && (
            <div className="category-items">
              {cat.items.filter(item => isItemEnabled(item.id)).map(item => (
                <div key={item.id} className="menu-item-row">
                  <div className="menu-item-left">
                    <div className={`veg-icon ${item.veg ? "veg" : "nonveg"}`}><span /></div>
                    <div className="menu-item-info">
                      <div className="menu-item-name">{item.name}</div>
                      <div className="menu-item-price">₹{item.price}</div>
                    </div>
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

/* ─────────────────────────────────────────────
   CHECKOUT FORM
───────────────────────────────────────────── */
function CheckoutForm({ cart, cartTotal, paymentMode, setPaymentMode, customerName, setCustomerName,
  customerPhone, setCustomerPhone, onConfirm, onBack, error, disabled }: {
  cart: CartItem[];
  cartTotal: number;
  paymentMode: "cod" | "prepaid";
  setPaymentMode: (m: "cod" | "prepaid") => void;
  customerName: string;
  setCustomerName: (v: string) => void;
  customerPhone: string;
  setCustomerPhone: (v: string) => void;
  onConfirm: () => void;
  onBack: () => void;
  error: string;
  disabled: boolean;
}) {
  return (
    <div className="checkout-form">
      <h3>Checkout Details</h3>
      <div className="order-summary">
        {cart.map(c => (
          <div key={c.id} className="summary-row">
            <span>{c.name} × {c.qty}</span>
            <span>₹{c.price * c.qty}</span>
          </div>
        ))}
        <div className="summary-total"><span>Total</span><span>₹{cartTotal}</span></div>
      </div>
      <div className="form-group">
        <label>Payment Mode</label>
        <div className="payment-options">
          <label className={`payment-opt ${paymentMode === "cod" ? "selected" : ""}`}>
            <input type="radio" name="payment" checked={paymentMode === "cod"} onChange={() => setPaymentMode("cod")} />
            💵 Cash on Delivery
          </label>
          <label className={`payment-opt ${paymentMode === "prepaid" ? "selected" : ""}`}>
            <input type="radio" name="payment" checked={paymentMode === "prepaid"} onChange={() => setPaymentMode("prepaid")} />
            📱 Prepaid (QR)
          </label>
        </div>
      </div>
      <div className="form-group">
        <label>Your Name</label>
        <input type="text" placeholder="Enter your name" value={customerName}
          onChange={e => setCustomerName(e.target.value)} className="form-input" />
      </div>
      <div className="form-group">
        <label>Mobile Number</label>
        <input type="tel" placeholder="Enter mobile number" value={customerPhone}
          onChange={e => setCustomerPhone(e.target.value)} className="form-input" />
      </div>
      {error && <div className="checkout-error">{error}</div>}
      <button className="btn-whatsapp"
        disabled={disabled || !customerName.trim() || !customerPhone.trim()}
        onClick={onConfirm}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12.004 0C5.374 0 0 5.373 0 12c0 2.117.554 4.1 1.522 5.822L.048 23.998l6.352-1.656A11.954 11.954 0 0012.004 24C18.628 24 24 18.627 24 12S18.628 0 12.004 0zm0 21.818a9.817 9.817 0 01-5.002-1.368l-.36-.214-3.72.97.999-3.645-.236-.375a9.817 9.817 0 01-1.499-5.186C2.186 6.58 6.591 2.18 12.004 2.18 17.41 2.18 21.814 6.58 21.814 12c0 5.41-4.404 9.818-9.81 9.818z"/>
        </svg>
        Confirm via WhatsApp
      </button>
      <button className="btn-back" onClick={onBack}>← Back to Cart</button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ABOUT PAGE
───────────────────────────────────────────── */
const AboutPage = memo(function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-hero">
        <img src="/images/biryani-hero.webp" alt="About" className="about-img" />
        <div className="about-overlay" />
      </div>
      <div className="about-content">
        <h1 className="about-title">About Us</h1>
        <div className="about-badge">Amrutha Culinaria</div>
        <p className="about-desc">
          We are CLGBITES × Nelakuditi — bringing you the authentic flavors of Amrutha Culinaria,
          a kitchen dedicated to the art of Biryani and Tandoori.
        </p>
        <p className="about-desc">
          Every grain of our basmati rice is slow-cooked to perfection using traditional dum cooking
          methods, infusing rich aromatic spices passed down through generations.
        </p>
        <div className="about-stats">
          {[
            { num: "5+",    label: "Years Experience" },
            { num: "20+",   label: "Menu Items" },
            { num: "1000+", label: "Happy Customers" },
            { num: "⭐ 4.8", label: "Avg Rating" },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div className="stat-num">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="about-contact">
          <h3>Contact Us</h3>
          <a href="https://wa.me/919989955833" target="_blank" rel="noopener noreferrer" className="contact-wa">
            WhatsApp: +91 9989955833
          </a>
        </div>
      </div>
    </div>
  );
});

/* ─────────────────────────────────────────────
   DAILY REVIEWS SECTION
───────────────────────────────────────────── */
const DAILY_REVIEWS = [
  { name: "Ravi Kumar",   rating: 5, comment: "Best biryani I've ever had! The dum biryani is absolutely out of this world. Ordered thrice this week!", item: "Chicken Dum Biryani" },
  { name: "Anjali",       rating: 4, comment: "Very tasty and great packaging. My whole family loved the Paneer Biryani. Will order again!", item: "Paneer Biryani" },
  { name: "Suresh",       rating: 5, comment: "Fast delivery and amazing taste. The Tandoori Chicken was perfectly marinated — restaurant quality!", item: "Tandoori Chicken" },
  { name: "Meera G.",     rating: 5, comment: "Special Biryani is a feast! So flavorful and aromatic. CLGBITES never disappoints!", item: "Chicken Special Biryani" },
  { name: "Venkat R.",    rating: 5, comment: "Ordered for office lunch — everyone loved it! The portion sizes are very generous too.", item: "Chicken Mixed Biryani" },
  { name: "Lakshmi D.",   rating: 4, comment: "Veg Biryani was absolutely delicious and fresh. Great option for vegetarians like me!", item: "Veg Biryani" },
];

const DailyReviewsSection = memo(function DailyReviewsSection() {
  return (
    <section className="daily-reviews-section">
      <div className="section-label" style={{ padding: "24px 20px 12px" }}>
        <div className="section-pill">🌟 Previous Day Reviews</div>
        <h2 className="section-title">What People Are Saying</h2>
      </div>
      <div className="daily-reviews-scroll">
        {DAILY_REVIEWS.map((r, i) => (
          <div key={i} className="daily-review-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="dr-top">
              <div className="dr-avatar">{r.name[0]}</div>
              <div className="dr-info">
                <div className="dr-name">{r.name}</div>
                <div className="dr-item">Ordered: {r.item}</div>
              </div>
            </div>
            <div className="dr-stars">
              {[...Array(5)].map((_, si) => (
                <span key={si} className={si < r.rating ? "star-filled" : "star-empty"}>★</span>
              ))}
            </div>
            <p className="dr-comment">{r.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
});

/* ─────────────────────────────────────────────
   CONTACT SECTION
───────────────────────────────────────────── */
const ContactSection = memo(function ContactSection() {
  return (
    <section className="contact-section">
      <div className="contact-inner">
        <div className="contact-brand">
          <img src="/images/biryani-hero.webp" alt="CLGBITES" className="contact-logo" />
          <div>
            <div className="contact-brand-name">CLGBITES × Nelakuditi</div>
            <div className="contact-brand-sub">Amrutha Culinaria</div>
          </div>
        </div>
        <div className="contact-details">
          <div className="contact-row">
            <span className="contact-icon-wrap phone-icon">📞</span>
            <a href="tel:+919989955833" className="contact-link">+91 73960 18423</a>
          </div>
          <div className="contact-row">
            <span className="contact-icon-wrap mail-icon">✉️</span>
            <a href="mailto:clgbites@gmail.com" className="contact-link">clgbites@gmail.com</a>
          </div>
        </div>
        <div className="contact-footer-note">
          © 2025 CLGBITES × Nelakuditi · Made with ❤️ in Nelakuditi
        </div>
      </div>
    </section>
  );
});

/* ─────────────────────────────────────────────
   REVIEWS PAGE
───────────────────────────────────────────── */
const REVIEWS = [
  { name: "Rahul M.",   rating: 5, comment: "Best biryani near college! The dum biryani is absolutely divine. Will order again!", date: "2 days ago" },
  { name: "Priya K.",   rating: 5, comment: "Chicken Fry Piece Biryani is out of this world! Delivery was super fast too. 10/10!", date: "1 week ago" },
  { name: "Arjun S.",   rating: 5, comment: "Amazing tandoori chicken! The marinade is perfect. Great value for money.", date: "1 week ago" },
  { name: "Sneha P.",   rating: 4, comment: "Paneer Biryani was lovely! Great for vegetarians. The portion size is very generous.", date: "2 weeks ago" },
  { name: "Kiran R.",   rating: 5, comment: "CLGBITES is my go-to for biryani. The Mughlai Biryani is absolutely royal!", date: "3 weeks ago" },
  { name: "Divya L.",   rating: 5, comment: "Tried the Non Veg Tandoori Platter — a feast! Everything was perfectly cooked.", date: "1 month ago" },
];

const ReviewsPage = memo(function ReviewsPage() {
  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <h1>Customer Reviews</h1>
        <div className="overall-rating">
          <div className="big-rating">4.8</div>
          <div className="stars-row">{"⭐".repeat(5)}</div>
          <div className="rating-count">Based on 500+ reviews</div>
        </div>
      </div>
      <div className="reviews-grid">
        {REVIEWS.map((r, i) => (
          <div key={i} className="review-card">
            <div className="review-top">
              <div className="reviewer-avatar">{r.name[0]}</div>
              <div className="reviewer-info">
                <div className="reviewer-name">{r.name}</div>
                <div className="review-date">{r.date}</div>
              </div>
              <div className="review-stars">{"⭐".repeat(r.rating)}</div>
            </div>
            <p className="review-text">{r.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

export default App;