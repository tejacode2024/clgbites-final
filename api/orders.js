// api/orders.js — Vercel Serverless Function
// POST /api/orders  → save new order
// GET  /api/orders  → list today's orders (admin, needs ADMIN_SECRET header)

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // service role key — never exposed to frontend
);

module.exports = async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── POST /api/orders — place an order ────────────────────────────
  if (req.method === 'POST') {
    const { customer_name, customer_phone, items, delivery_type, payment_mode, total } = req.body;

    if (!customer_name || !customer_phone || !items?.length || !total) {
      return res.status(400).json({ error: 'customer_name, customer_phone, items and total are required' });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([{ customer_name, customer_phone, items, delivery_type, payment_mode, total }])
      .select('id')
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save order' });
    }

    return res.status(201).json({ success: true, orderId: data.id });
  }

  // ── GET /api/orders — list today's orders (admin only) ───────────
  if (req.method === 'GET') {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Default: orders placed today (local IST midnight → now)
    const now = new Date();
    // Start of day in IST (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const todayIST  = new Date(Math.floor((now.getTime() + istOffset) / 86400000) * 86400000 - istOffset);

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', todayIST.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase select error:', error);
      return res.status(500).json({ error: 'Failed to fetch orders' });
    }

    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
