// api/config.js — Vercel Serverless Function
// GET   /api/config       → public: returns site_online + item_flags
// PATCH /api/config       → admin: update toggles (needs x-admin-secret header)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/config — public ──────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('config')
      .select('site_online, item_flags')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Config fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch config' });
    }

    return res.status(200).json(data);
  }

  // ── PATCH /api/config — admin only ───────────────────────────────
  if (req.method === 'PATCH') {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { site_online, item_flags } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (typeof site_online === 'boolean') updates.site_online = site_online;
    if (item_flags && typeof item_flags === 'object') updates.item_flags = item_flags;

    const { data, error } = await supabase
      .from('config')
      .update(updates)
      .eq('id', 1)
      .select('site_online, item_flags')
      .single();

    if (error) {
      console.error('Config update error:', error);
      return res.status(500).json({ error: 'Failed to update config' });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
