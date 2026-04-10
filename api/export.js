// api/export.js — Vercel Serverless Function
// POST /api/export  → admin: download today's orders as .xlsx then wipe the table
//   Headers: x-admin-secret: <ADMIN_SECRET>
//   Returns: application/vnd.openxmlformats binary

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 1. Fetch all orders
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Export fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }

  if (!orders.length) {
    return res.status(200).json({ message: 'No orders to export' });
  }

  // 2. Build xlsx
  const workbook  = new ExcelJS.Workbook();
  const sheet     = workbook.addWorksheet('Orders');

  // Header row
  sheet.addRow(['#', 'Time (IST)', 'Customer', 'Phone', 'Delivery', 'Payment', 'Items', 'Total (₹)']);

  // Style header
  const headerRow = sheet.getRow(1);
  headerRow.font  = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  // Column widths
  sheet.columns = [
    { width: 5 },   // #
    { width: 18 },  // Time
    { width: 20 },  // Customer
    { width: 15 },  // Phone
    { width: 12 },  // Delivery
    { width: 12 },  // Payment
    { width: 50 },  // Items
    { width: 12 },  // Total
  ];

  let totalRevenue = 0;
  orders.forEach((order, idx) => {
    const istTime = new Date(order.created_at);
    const timeStr = istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
    const itemsStr = (order.items || [])
      .map(i => `${i.name} ×${i.qty} (₹${i.price * i.qty})`)
      .join(', ');

    sheet.addRow([
      idx + 1,
      timeStr,
      order.customer_name,
      order.customer_phone,
      order.delivery_type || 'delivery',
      order.payment_mode || 'cod',
      itemsStr,
      order.total,
    ]);
    totalRevenue += order.total;
  });

  // Total row
  const totalRow = sheet.addRow(['', '', '', '', '', '', 'TOTAL', totalRevenue]);
  totalRow.font  = { bold: true };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3cd' } };
  totalRow.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3cd' } };

  // 3. Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // 4. Delete all orders (wipe)
  const { error: delError } = await supabase.from('orders').delete().neq('id', 0);
  if (delError) console.error('Wipe error (non-fatal):', delError);

  // 5. Stream the xlsx back
  const today    = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const filename = `clgbites_orders_${today}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(Buffer.from(buffer));
};
