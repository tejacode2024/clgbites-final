import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error })

    res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { data, error } = await supabase
      .from('orders')
      .insert([req.body])
      .select()

    if (error) return res.status(500).json({ error })

    res.status(200).json(data)
  }
}