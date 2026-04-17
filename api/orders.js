import { createClient } from '@supabase/supabase-js'

// ── Guard: catch missing env vars immediately so the error is obvious ──
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error(
    '[orders] FATAL: SUPABASE_URL or SUPABASE_SERVICE_KEY is not set. ' +
    'Add both env vars in Vercel → Project Settings → Environment Variables, then redeploy.'
  )
}

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
    if (tokenError) {
      console.error('[orders POST] next_order_token RPC failed:', tokenError)
      return res.status(500).json({
        error: tokenError,
        hint: 'Make sure you ran supabase-schema.sql in the Supabase SQL Editor to create the next_order_token function and order_token_seq sequence.'
      })
    }

    const tokenNumber = tokenData  // nextval() returns a scalar bigint

    // Step 2: Insert the order with the claimed token number.
    const { data, error } = await supabase
      .from('orders')
      .insert([{ ...req.body, token_number: tokenNumber }])
      .select()

    if (error) {
      console.error('[orders POST] insert failed:', error)
      return res.status(500).json({
        error,
        hint: 'If this is a permissions error, make sure SUPABASE_SERVICE_KEY in Vercel is the service_role key (not the anon key).'
      })
    }

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
      // Clear all orders AND reset token sequence so the next order starts at #001
      const { error } = await supabase.from('orders').delete().neq('id', 0)
      if (error) return res.status(500).json({ error })

      // Reset the token sequence back to 1 so the next order gets token #001
      const { error: seqError } = await supabase.rpc('reset_token_sequence')
      if (seqError) {
        console.error('[orders DELETE] reset_token_sequence RPC failed:', seqError)
        // Non-fatal — orders are cleared, only the sequence reset failed
      }
    }

    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}