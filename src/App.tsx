import { useState, useEffect, useRef, useCallback, memo } from "react";

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
    try {
      await saveOrder({
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
        delivery_type: "delivery",
        payment_mode: paymentMode,
        total: cartTotal,
      });
    } catch (err) {
      setCheckoutError("Could not save order to server. Please try again.");
      setCheckoutStep("checkout");
      return;
    }

    // Order saved — open WhatsApp
    const lines   = cart.map(c => `• ${c.name} ×${c.qty} = ₹${c.price * c.qty}`).join("\n");
    const confirm = paymentMode === "cod" ? "Confirm my order on COD" : "Confirm my order and send QR";
    const msg = `🍛 *Order from CLGBITES × Nelakuditi*\n\n${lines}\n\n*Total: ₹${cartTotal}*\n\n👤 Name: ${customerName}\n📞 Phone: ${customerPhone}\n\n${confirm}`;
    window.open(`https://wa.me/917396018423?text=${encodeURIComponent(msg)}`, "_blank");
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
   ADMIN PAGE
───────────────────────────────────────────── */
function AdminPage({ onExit }: { onExit: () => void }) {
  const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET ?? "";

  const [authed, setAuthed]       = useState(false);
  const [password, setPassword]   = useState("");
  const [authError, setAuthError] = useState("");

  const [siteOnline, setSiteOnline]   = useState(true);
  const [itemFlags, setItemFlags]     = useState<Record<string, boolean>>({});
  const [orders, setOrders]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [saving, setSaving]           = useState(false);
  const [statusMsg, setStatusMsg]     = useState("");

  const adminSecret = useRef(ADMIN_SECRET);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cfg, ords] = await Promise.all([
        fetch(`${API}/api/config`).then(r => r.json()),
        fetch(`${API}/api/orders`, { headers: { "x-admin-secret": adminSecret.current } }).then(r => r.json()),
      ]);
      setSiteOnline(cfg.site_online ?? true);
      setItemFlags(cfg.item_flags ?? {});
      setOrders(Array.isArray(ords) ? ords : []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    if (password === ADMIN_SECRET || password === import.meta.env.VITE_ADMIN_PASSWORD) {
      adminSecret.current = password;
      setAuthed(true);
      loadData();
    } else {
      setAuthError("Wrong password. Try again.");
    }
  };

  const patchConfig = async (update: object) => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-secret": adminSecret.current },
        body: JSON.stringify(update),
      });
      const cfg = await r.json();
      setSiteOnline(cfg.site_online);
      setItemFlags(cfg.item_flags ?? {});
      setStatusMsg("Saved ✓");
      setTimeout(() => setStatusMsg(""), 2000);
    } catch {
      setStatusMsg("Save failed ✗");
    }
    setSaving(false);
  };

  const toggleItem = (id: string) => {
    const newFlags = { ...itemFlags, [id]: !(itemFlags[id] !== false) };
    setItemFlags(newFlags);
    patchConfig({ item_flags: newFlags });
  };

  const exportAndClear = () => {
  setExporting(true)
  window.open('/api/export', '_blank')

  setTimeout(() => {
    setExporting(false)
  }, 1500)
}
  const todayTotal = orders.reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  if (!authed) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <div className="admin-login-logo">🍛</div>
          <h1>Admin Login</h1>
          <p>CLGBITES × Nelakuditi</p>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            className="admin-input"
            autoFocus
          />
          {authError && <div className="admin-error">{authError}</div>}
          <button className="admin-btn-primary" onClick={handleLogin}>Login →</button>
          <button className="admin-btn-back" onClick={onExit}>← Back to Site</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-brand">⚙️ CLGBITES Admin</div>
        <div className="admin-header-right">
          {statusMsg && <span className="admin-status-msg">{statusMsg}</span>}
          <button className="admin-btn-back" onClick={onExit}>← Site</button>
        </div>
      </header>

      <div className="admin-body">

        {/* ── SITE TOGGLE ── */}
        <section className="admin-card">
          <h2>Site Status</h2>
          <div className="toggle-row">
            <div>
              <div className="toggle-label">{siteOnline ? "🟢 Orders Open" : "🔴 Orders Closed"}</div>
              <div className="toggle-sub">{siteOnline ? "Customers can place orders" : "Offline banner shown to customers"}</div>
            </div>
            <button
              className={`big-toggle ${siteOnline ? "on" : "off"}`}
              onClick={() => { const next = !siteOnline; setSiteOnline(next); patchConfig({ site_online: next }); }}
              disabled={saving}
            >
              {siteOnline ? "ON" : "OFF"}
            </button>
          </div>
        </section>

        {/* ── ITEM TOGGLES ── */}
        <section className="admin-card">
          <h2>Menu Item Toggles</h2>
          <p className="admin-hint">Toggle items to show/hide them for customers.</p>
          {Object.entries(MENU_DATA).map(([catKey, cat]) => (
            <div key={catKey} className="admin-cat">
              <div className="admin-cat-label">{cat.emoji} {cat.label}</div>
              {cat.items.map(item => {
                const enabled = itemFlags[item.id] !== false;
                return (
                  <div key={item.id} className="item-toggle-row">
                    <span className={`item-toggle-name ${!enabled ? "disabled-item" : ""}`}>{item.name}</span>
                    <span className="item-toggle-price">₹{item.price}</span>
                    <label className="switch">
                      <input type="checkbox" checked={enabled} onChange={() => toggleItem(item.id)} />
                      <span className="slider" />
                    </label>
                  </div>
                );
              })}
            </div>
          ))}
        </section>

        {/* ── ORDERS ── */}
        <section className="admin-card">
          <div className="admin-card-top">
            <div>
              <h2>Today's Orders</h2>
              <p className="admin-hint">{orders.length} order{orders.length !== 1 ? "s" : ""} · ₹{todayTotal} total</p>
            </div>
            <div className="admin-card-actions">
              <button className="admin-btn-sm" onClick={loadData} disabled={loading}>
                {loading ? "…" : "↻ Refresh"}
              </button>
              <button className="admin-btn-export" onClick={exportAndClear} disabled={exporting || orders.length === 0}>
                {exporting ? "Exporting…" : "📥 Export & Clear"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="admin-loading">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="admin-empty">No orders yet today 🎉</div>
          ) : (
            <div className="orders-list">
              {orders.map((order: any) => (
                <div key={order.id} className="order-card">
                  <div className="order-card-top">
                    <div className="order-customer">
                      <strong>{order.customer_name}</strong>
                      <span className="order-phone">📞 {order.customer_phone}</span>
                    </div>
                    <div className="order-meta">
                      <span className={`order-payment ${order.payment_mode}`}>
                        {order.payment_mode === "cod" ? "💵 COD" : "📱 Prepaid"}
                      </span>
                      <span className="order-total">₹{order.total}</span>
                    </div>
                  </div>
                  <div className="order-items-list">
                    {(order.items ?? []).map((it: any, i: number) => (
                      <span key={i} className="order-item-chip">
                        {it.name} ×{it.qty}
                      </span>
                    ))}
                  </div>
                  <div className="order-time">
                    {new Date(order.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: true })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
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
          <a href="https://wa.me/917396018423" target="_blank" rel="noopener noreferrer" className="contact-wa">
            WhatsApp: +91 7396018423
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
            <a href="tel:+917396018423" className="contact-link">+91 73960 18423</a>
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
