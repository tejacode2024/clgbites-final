import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('config')
      .select('*')
      .single()

    if (error) return res.status(500).json({ error })

    res.status(200).json(data)
  }

  if (req.method === 'PATCH') {
    const body = req.body

    const { data, error } = await supabase
      .from('config')
      .update(body)
      .eq('id', 1)
      .select()
      .single()

    if (error) return res.status(500).json({ error })

    res.status(200).json(data)
  }
}