import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  // GET /api/orders — fetch all orders sorted oldest-first (for correct token numbering)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error })
    return res.status(200).json(data)
  }

  // POST /api/orders — place a new order
  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('orders')
      .insert([req.body])
      .select()

    if (error) return res.status(500).json({ error })
    return res.status(200).json(data)
  }

  // PATCH /api/orders?id=X — update items / total on an order
  if (req.method === 'PATCH') {
  const { id } = req.query
  if (!id) return res.status(400).json({ error: 'Missing id' })

   const { items, total, deliver_status, pay_status, pending_amount } = req.body
  const update = {}
  if (items !== undefined) update.items = items
  if (total !== undefined) update.total = total
  if (deliver_status !== undefined) {
  update.deliver_status = deliver_status
  if (deliver_status === 'delivered') update.delivered_at = new Date().toISOString()
}  if (pay_status !== undefined) update.pay_status = pay_status
  if ('pending_amount' in req.body) update.pending_amount = pending_amount ?? null

  const { data, error } = await supabase
    .from('orders')
    .update(update)
    .eq('id', id)
    .select()

  if (error) return res.status(500).json({ error })
  return res.status(200).json(data)
}
  // DELETE /api/orders?id=X — delete one order
  // DELETE /api/orders        — clear ALL orders
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (id) {
      const { error } = await supabase.from('orders').delete().eq('id', id)
      if (error) return res.status(500).json({ error })
    } else {
      const { error } = await supabase.from('orders').delete().neq('id', 0)
      if (error) return res.status(500).json({ error })
      // Reset sequence so next order starts from token #1
      await supabase.rpc('reset_orders_sequence')
    }

    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}