import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  // GET /api/orders — fetch all orders sorted oldest-first
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error })
    return res.status(200).json(data)
  }

  // POST /api/orders — place a new order
  // Token number is assigned atomically via a DB sequence so two simultaneous
  // orders NEVER receive the same token, even under concurrent requests.
  if (req.method === 'POST') {
    // Step 1: Atomically claim the next token number from the dedicated sequence.
    const { data: tokenData, error: tokenError } = await supabase.rpc('next_order_token')
    if (tokenError) return res.status(500).json({ error: tokenError })

    const tokenNumber = tokenData  // nextval() returns a scalar bigint

    // Step 2: Insert the order with the claimed token number.
    const { data, error } = await supabase
      .from('orders')
      .insert([{ ...req.body, token_number: tokenNumber }])
      .select()

    if (error) return res.status(500).json({ error })

    // Return the inserted row — orderId == token_number == what the frontend shows.
    const row = Array.isArray(data) ? data[0] : data
    return res.status(200).json({ orderId: row.token_number, row })
  }

  // PATCH /api/orders?id=X — update items / total / status on an order
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
    }
    if (pay_status !== undefined) update.pay_status = pay_status
    if ('pending_amount' in req.body) update.pending_amount = pending_amount ?? null

    // id param is the token_number (what the admin page uses as the identifier)
    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('token_number', id)
      .select()

    if (error) return res.status(500).json({ error })
    return res.status(200).json(data)
  }

  // DELETE /api/orders?id=X — delete one order by token_number
  // DELETE /api/orders        — clear ALL orders
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (id) {
      // Delete by token_number
      const { error } = await supabase.from('orders').delete().eq('token_number', id)
      if (error) return res.status(500).json({ error })
    } else {
      // Clear all orders — token sequence is intentionally NOT reset so past
      // tokens are never reused. Call reset_token_sequence() manually if needed.
      const { error } = await supabase.from('orders').delete().neq('id', 0)
      if (error) return res.status(500).json({ error })
    }

    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}