import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {

  // GET ORDERS
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error })

    return res.status(200).json(data)
  }

  // CREATE ORDER
  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('orders')
      .insert([req.body])
      .select()

    if (error) return res.status(500).json({ error })

    return res.status(200).json(data)
  }

  // UPDATE DELIVERED
if (req.method === 'PATCH') {
  const { id, deliver_status } = req.body
  const { data, error } = await supabase
    .from('orders')
    .update({
      deliver_status,
      delivered_at: new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).replace(" ", "T")
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return res.status(500).json({ error })
  return res.status(200).json(data)
}
}