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
      { id: "b5", name: "Chicken Special Biryani",   price: 279, veg: false, img: "/images/chicken-special-biryani.webp" },
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
    label: "Starters & Platters",
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
      { id: "t14", name: "Haraba Kabab",               price: 250, veg: true,  img: "" },
      { id: "t15", name: "Veg Seekh Kebab",            price: 250, veg: true,  img: "" },
      { id: "t16", name: "Non-Veg Tandoori Platter",       price: 450, veg: false,  img: "" },
      { id: "t16", name: "Veg Tandoori Platter",       price: 450, veg: true,  img: "" },
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
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "checkout" | "saving" | "confirm" | "done">("cart");
  const [waUrl, setWaUrl] = useState<string>("");
  const [confirmDetails, setConfirmDetails] = useState<{
    cart: CartItem[]; name: string; phone: string; mode: "cod" | "prepaid"; total: number;
  } | null>(null);
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
    // Poll config every 5 seconds so online/offline changes from admin
    // are reflected immediately on the user page without a manual reload.
    const poll = setInterval(() => {
      fetchConfig().then(cfg => {
        setSiteOnline(cfg.site_online);
        setItemFlags(cfg.item_flags ?? {});
      }).catch(() => {/* ignore transient errors */});
    }, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearInterval(poll); };
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

  const handleWhatsApp = () => {
    setCheckoutError("");

    // Build a stable snapshot of cart + customer details for the confirm screen.
    const cartSnapshot = cart.map(c => ({ ...c }));
    const nameSnap   = customerName;
    const phoneSnap  = customerPhone;
    const modeSnap   = paymentMode;
    const totalSnap  = cartTotal;

    const lines   = cartSnapshot.map(c => `• ${c.name} ×${c.qty} = ₹${c.price * c.qty}`).join("\n");
    const confirmLine = modeSnap === "cod" ? "Confirm my order on COD" : "Confirm my order and send QR";

    // Build a temporary URL with a placeholder token — we'll update it once DB returns.
    const buildMsg = (tokenStr: string) =>
      `Order from SRM-AP\n\nToken: ${tokenStr}\n\nName: ${nameSnap}\n\nPhone: ${phoneSnap}\n\n${lines}\n\nTotal: ₹${totalSnap}\n\n${confirmLine}`;

    const placeholderUrl = `https://wa.me/919989955833?text=${encodeURIComponent(buildMsg("#..."))}`;
    setWaUrl(placeholderUrl);

    // Pass order summary snapshot to confirm screen immediately — zero lag.
    setConfirmDetails({ cart: cartSnapshot, name: nameSnap, phone: phoneSnap, mode: modeSnap, total: totalSnap });
    setCheckoutStep("confirm");

    // Save to DB in the background — update waUrl with real token when done.
    saveOrder({
      customer_name: nameSnap,
      customer_phone: phoneSnap,
      items: cartSnapshot.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      payment_mode: modeSnap,
      total: totalSnap,
    }).then(result => {
      const tokenId =
        result?.orderId ??
        result?.row?.token_number ??
        (Array.isArray(result) ? result[0]?.token_number ?? result[0]?.id : undefined);
      const tokenStr = tokenId != null ? `#${String(tokenId).padStart(3, "0")}` : "#???";
      setWaUrl(`https://wa.me/919989955833?text=${encodeURIComponent(buildMsg(tokenStr))}`);
    }).catch(() => {
      // Non-blocking — order still goes through WhatsApp even if DB fails
    });
  };
  if (!splashDone) return <SplashScreen fading={splashFading} />;

  // Admin page takes over completely
  if (page === "admin") return <AdminPage onExit={() => setPage("home")} />;

  return (
    <div className="clg-root">
      {/* ── OFFLINE BANNER ── */}
      {configLoaded && !siteOnline && (
        <div className="offline-banner">
           We're currently closed. Orders are not being accepted right now. Check back soon!
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
            ) : checkoutStep === "confirm" ? (
              <WhatsAppConfirmStep
                cart={cart}
                cartTotal={cartTotal}
                addItem={addItem}
                removeItem={removeItem}
                details={confirmDetails}
                onDone={() => { setCart([]); setCheckoutStep("done"); }}
                onAddMore={() => {
                  setCartOpen(false);
                  setCheckoutStep("cart");
                  setTimeout(() => {
                    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
                  }, 50);
                }}
              />
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
      <MediaPartnerSection />
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
   WHATSAPP CONFIRM STEP
───────────────────────────────────────────── */
// Shared icon constants — match the site's warm, food-forward identity
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.35 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.64a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);
const IconWallet = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconPlus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconMinus = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconWA = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12.004 0C5.374 0 0 5.373 0 12c0 2.117.554 4.1 1.522 5.822L.048 23.998l6.352-1.656A11.954 11.954 0 0012.004 24C18.628 24 24 18.627 24 12S18.628 0 12.004 0zm0 21.818a9.817 9.817 0 01-5.002-1.368l-.36-.214-3.72.97.999-3.645-.236-.375a9.817 9.817 0 01-1.499-5.186C2.186 6.58 6.591 2.18 12.004 2.18 17.41 2.18 21.814 6.58 21.814 12c0 5.41-4.404 9.818-9.81 9.818z"/>
  </svg>
);

function WhatsAppConfirmStep({
  cart, cartTotal, addItem, removeItem,
  details, onDone, onAddMore,
}: {
  cart: CartItem[];
  cartTotal: number;
  addItem: (item: { id: string; name: string; price: number; img: string }) => void;
  removeItem: (id: string) => void;
  details: { cart: CartItem[]; name: string; phone: string; mode: "cod" | "prepaid"; total: number; } | null;
  onDone: () => void;
  onAddMore: () => void;
}) {
  const sentRef = useRef(false);

  // Local editable state — starts from saved snapshot, stays in sync as user types
  const [editName,  setEditName]  = useState(details?.name  ?? "");
  const [editPhone, setEditPhone] = useState(details?.phone ?? "");
  const [editMode,  setEditMode]  = useState<"cod" | "prepaid">(details?.mode ?? "cod");

  // When user returns to tab after opening WhatsApp → show done screen
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && sentRef.current) onDone();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [onDone]);

  const handleSend = () => {
    sentRef.current = true;

    const lines       = cart.map(c => `• ${c.name} ×${c.qty} = ₹${c.price * c.qty}`).join("\n");
    const confirmLine = editMode === "cod" ? "Confirm my order on COD" : "Confirm my order and send QR";
    const buildMsg    = (tok: string) =>
      `Order from SRM-AP\n\nToken: ${tok}\n\nName: ${editName}\n\nPhone: ${editPhone}\n\n${lines}\n\nTotal: ₹${cartTotal}\n\n${confirmLine}`;

    const immediateUrl = `https://wa.me/919989955833?text=${encodeURIComponent(buildMsg("#..."))}`;
    window.open(immediateUrl, "_blank", "noopener,noreferrer");

    // Fire-and-forget DB save with latest edits
    saveOrder({
      customer_name: editName,
      customer_phone: editPhone,
      items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
      payment_mode: editMode,
      total: cartTotal,
    }).catch(() => {/* non-blocking */});
  };

  const canSend = editName.trim().length > 0 && editPhone.trim().length > 0 && cart.length > 0;

  return (
    <div className="wa-confirm-step">

      {/* ── Section: Your Order ── */}
      <div className="wac-section">
        <div className="wac-section-head">
          <span className="wac-section-title">Your Order</span>
          <button className="wac-link" onClick={onAddMore}>Add items</button>
        </div>

        <div className="wac-items">
          {cart.map(item => (
            <div key={item.id} className="wac-item">
              <img src={item.img} alt={item.name} className="wac-item-img" onError={e => { (e.target as HTMLImageElement).style.display="none"; }} />
              <span className="wac-item-name">{item.name}</span>
              <div className="wac-qty">
                <button onClick={() => removeItem(item.id)}><IconMinus /></button>
                <span>{item.qty}</span>
                <button onClick={() => addItem({ id: item.id, name: item.name, price: item.price, img: item.img })}><IconPlus /></button>
              </div>
              <span className="wac-item-price">₹{item.price * item.qty}</span>
            </div>
          ))}
        </div>

        <div className="wac-total">
          <span>Total</span>
          <span>₹{cartTotal}</span>
        </div>
      </div>

      {/* ── Section: Details ── */}
      <div className="wac-section">
        <div className="wac-section-head">
          <span className="wac-section-title">Your Details</span>
          <span className="wac-edit-hint"><IconEdit /> tap to edit</span>
        </div>

        <div className="wac-fields">
          <div className="wac-field">
            <span className="wac-field-icon"><IconUser /></span>
            <input
              className="wac-field-input"
              type="text"
              placeholder="Your name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
          </div>
          <div className="wac-field">
            <span className="wac-field-icon"><IconPhone /></span>
            <input
              className="wac-field-input"
              type="tel"
              placeholder="Mobile number"
              value={editPhone}
              onChange={e => setEditPhone(e.target.value)}
            />
          </div>
          <div className="wac-field wac-field-payment">
            <span className="wac-field-icon"><IconWallet /></span>
            <label className={`wac-pay-opt ${editMode === "cod" ? "active" : ""}`}>
              <input type="radio" name="wac-pay" checked={editMode === "cod"} onChange={() => setEditMode("cod")} />
              Cash on Delivery
            </label>
            <label className={`wac-pay-opt ${editMode === "prepaid" ? "active" : ""}`}>
              <input type="radio" name="wac-pay" checked={editMode === "prepaid"} onChange={() => setEditMode("prepaid")} />
              Prepaid (QR)
            </label>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div className="wac-cta">
        <button className="btn-whatsapp" disabled={!canSend} onClick={handleSend}>
          <IconWA />
          Send Order on WhatsApp
        </button>
        <p className="wac-hint">
          WhatsApp opens with your order. Just tap
          <span className="wac-send-badge">Send ▶</span>
          to confirm.
        </p>
      </div>

    </div>
  );
}

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
   MEDIA PARTNER SECTION
───────────────────────────────────────────── */
const MediaPartnerSection = memo(function MediaPartnerSection() {
  const avatarColors = ["#e74c3c", "#2ecc71", "#3498db", "#9b59b6", "#e67e22"];
  const avatarLetters = ["R", "S", "A", "P", "K"];

  return (
    <section className="media-partner-section">
      <div className="section-label" style={{ padding: "24px 20px 12px" }}>
        <div className="section-pill">📡 Media Partner</div>
        <h2 className="section-title">Stay in the Loop</h2>
      </div>
      <div className="mp-card">
        {/* Left: Profile */}
        <div className="mp-left">
          <div className="mp-avatar-wrap">
            <img src="/images/jilebi-logo.jpeg" alt="Jilebi Updates" className="mp-avatar" />
            <span className="mp-trending-badge">🔥 Trending</span>
          </div>
          <div className="mp-channel-name">Jilebi Updates</div>
          <div className="mp-channel-tagline">Stay Ahead at SRM-AP</div>
          <div className="mp-followers">
            <span className="mp-dot" />
            12,000+ Followers
          </div>
        </div>

        {/* Divider */}
        <div className="mp-divider" />

        {/* Right: Info + Join */}
        <div className="mp-right">
          <p className="mp-desc">
            Stay updated with <strong>SRM-AP events, exams &amp; campus life</strong> — all in one WhatsApp channel.
          </p>
          <div className="mp-social-proof">
            <div className="mp-avatars">
              {avatarLetters.map((l, i) => (
                <div key={i} className="mp-mini-avatar" style={{ background: avatarColors[i], marginLeft: i === 0 ? 0 : -8 }}>
                  {l}
                </div>
              ))}
            </div>
            <div className="mp-proof-text">
              <span className="mp-proof-count">12K+ students</span> already joined
              <div className="mp-proof-sub">Trusted by SRM-AP community</div>
            </div>
          </div>
          <div className="mp-bottom-row">
            <span className="mp-meta">Free · No spam · SRM-AP only</span>
            <a
              href="https://whatsapp.com/channel/0029Va5vs6RFMqrfr1YnW31P"
              target="_blank"
              rel="noopener noreferrer"
              className="mp-join-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.859L.057 23.428a.5.5 0 00.614.614l5.569-1.476A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.9a9.9 9.9 0 01-5.031-1.373l-.36-.214-3.733.989.996-3.638-.235-.374A9.86 9.86 0 012.1 12C2.1 6.534 6.534 2.1 12 2.1S21.9 6.534 21.9 12 17.466 21.9 12 21.9z" />
              </svg>
              Join Now
            </a>
          </div>
        </div>
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
            <a href="tel:+919989955833" className="contact-link">+91 99899 55833</a>
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