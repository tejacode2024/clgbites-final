# CLGBITES v2 — Deployment Guide
## Stack: React + Vite (frontend) + Vercel Serverless (API) + Supabase (DB)
## Cost: 100% FREE forever on free tiers

---

## STEP 1 — Set up Supabase (5 minutes)

1. Go to **https://supabase.com** → Sign in with GitHub → **New project**
2. Name it `clgbites`, pick a region close to India (e.g. Singapore), set any DB password
3. Wait ~2 minutes for project to spin up
4. Go to **SQL Editor → New query**, paste the entire contents of `supabase-schema.sql`, click **Run**
5. Go to **Settings → API** and copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (under "Project API keys", click "Reveal") → `SUPABASE_SERVICE_KEY`
   ⚠️ Never expose the service_role key to the frontend

---

## STEP 2 — Push code to GitHub

1. Create a new repo on GitHub (e.g. `clgbites-v2`)
2. Copy your existing frontend files into the new project folder:
   - Everything from `clgbites-frontend/` goes in the root
   - Replace `src/App.tsx` with the new `src/App.tsx` (provided)
   - Add `src/admin.css` and import it in `src/main.tsx`:
     ```tsx
     import './admin.css'
     ```
   - Replace `package.json` and `vercel.json` with the new versions
   - Add the `api/` folder with `orders.js`, `config.js`, `export.js`
3. `git add . && git commit -m "v2: Vercel + Supabase" && git push`

---

## STEP 3 — Deploy to Vercel (3 minutes)

1. Go to **https://vercel.com** → Import your GitHub repo
2. Framework preset: **Vite** (auto-detected)
3. Build command: `npm run build` (default)
4. Output directory: `dist` (default)
5. Before deploying, click **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `SUPABASE_URL` | your Supabase project URL |
   | `SUPABASE_SERVICE_KEY` | your service_role key |
   | `ADMIN_SECRET` | a strong password you choose |
   | `VITE_ADMIN_SECRET` | **same value** as ADMIN_SECRET |
   | `VITE_API_URL` | *(leave empty)* |

6. Click **Deploy** → Wait ~60 seconds → Done! 🎉

---

## STEP 4 — Test everything

### Frontend
- Visit your Vercel URL → splash screen loads → menu shows
- Add items → checkout → fill name/phone → **Confirm via WhatsApp**
- Order should save to Supabase (check Table Editor) AND open WhatsApp

### Config API
- Visit `https://yourapp.vercel.app/api/config` → should return `{"site_online":true,"item_flags":{}}`

### Admin dashboard
- Visit `https://yourapp.vercel.app/admin`
- Enter your `ADMIN_SECRET` password
- Toggle site on/off → refresh frontend → offline banner appears/disappears
- Toggle an item off → refresh frontend → item disappears from menu
- View today's orders live
- Click **Export & Clear** → downloads `.xlsx` → orders wiped from DB

---

## How the system works (flow)

```
Customer clicks "Confirm via WhatsApp"
         │
         ▼
POST /api/orders  ─── saves to Supabase orders table
         │
         ▼
WhatsApp opens with pre-filled message
         │
         ▼
Admin sees order at /admin (live refresh)
         │
         ▼
End of day: Admin clicks Export & Clear
         │
         ▼
.xlsx downloaded  +  orders table wiped
```

---

## Local development

```bash
# Install deps
npm install

# Create .env.local
cp .env.example .env.local
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, ADMIN_SECRET, VITE_ADMIN_SECRET

# Start Vite dev server (frontend only)
npm run dev

# API routes won't work locally without Vercel CLI:
npm i -g vercel
vercel dev    # runs both frontend + API routes locally
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `401 Unauthorized` on admin pages | Check `ADMIN_SECRET` and `VITE_ADMIN_SECRET` are the same value in Vercel |
| Orders not saving | Check `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Vercel env vars |
| Config fetch fails | Check Supabase RLS policies — "Anyone can read config" policy must exist |
| Export fails | Make sure `exceljs` is in `package.json` dependencies (not devDependencies) |
| `/admin` shows 404 | Check `vercel.json` has the SPA rewrite rule `"/(.*)" → "/index.html"` |

---

## File structure reference

```
clgbites/
├── api/
│   ├── orders.js       ← POST (save order) + GET (list orders, admin)
│   ├── config.js       ← GET (public) + PATCH (admin toggles)
│   └── export.js       ← POST (admin: download xlsx + wipe DB)
├── src/
│   ├── App.tsx         ← Full frontend + /admin route
│   ├── admin.css       ← Admin-specific styles (append to index.css)
│   ├── main.tsx        ← Entry (import admin.css here)
│   └── index.css       ← Your existing styles (unchanged)
├── public/
│   └── images/         ← Your existing food images (unchanged)
├── supabase-schema.sql ← Run once in Supabase SQL editor
├── .env.example        ← Template for env vars
├── package.json        ← Updated (adds @supabase/supabase-js, exceljs)
├── vercel.json         ← Updated (API routes + SPA rewrite)
└── vite.config.ts      ← Unchanged
```
