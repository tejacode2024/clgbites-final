// import { createClient } from '@supabase/supabase-js'

// const supabase = createClient(
//   process.env.SUPABASE_URL,
//   process.env.SUPABASE_SERVICE_KEY
// )

// export default async function handler(req, res) {

//   // GET ORDERS
//   if (req.method === 'GET') {
//     const { data, error } = await supabase
//       .from('orders')
//       .select('*')
//       .order('created_at', { ascending: false })

//     if (error) return res.status(500).json({ error })

//     return res.status(200).json(data)
//   }

//   // CREATE ORDER
//   if (req.method === 'POST') {
//     const { data, error } = await supabase
//       .from('orders')
//       .insert([req.body])
//       .select()

//     if (error) return res.status(500).json({ error })

//     return res.status(200).json(data)
//   }

//   // UPDATE DELIVERED
// // if (req.method === 'PATCH') {
// //   const { id, deliver_status } = req.body
// //   const { data, error } = await supabase
// //     .from('orders')
// //     .update({
// //       deliver_status,
// //       delivered_at: new Date().toISOString()  // ✅ proper UTC ISO with Z suffix
// //     })
// //     .eq('id', id)
// //     .select()
// //   if (error) return res.status(500).json({ error })
// //   return res.status(200).json(data)
// // }
// // }

// if (req.method === 'PATCH') {
//   const { id, deliver_status, pay_status, token_number } = req.body

//   const updateData = {
//     deliver_status,
//     delivered_at: new Date().toISOString()
//   }

//   if (pay_status) updateData.pay_status = pay_status
//   if (token_number) updateData.token_number = token_number

//   const { data, error } = await supabase
//     .from('orders')
//     .update(updateData)
//     .eq('id', id)
//     .select()

//   if (error) return res.status(500).json({ error })

//   return res.status(200).json(data)
// }
// }


import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {

  // ✅ GET ORDERS
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return res.status(500).json({ error })
    }

    return res.status(200).json(data)
  }

  // ✅ CREATE ORDER (FIXED)
  if (req.method === 'POST') {
  console.log("BODY:", req.body)

  const {
    customer_name,
    customer_phone,
    items,
    payment_mode,
    total
  } = req.body

  const { data, error } = await supabase
    .from('orders')
    .insert([
      {
        customer_name,
        customer_phone,
        items,
        payment_mode,
        total,
        pay_status: "unpaid",
        deliver_status: "pending"
      }
    ])
    .select()

  if (error) {
    console.error("INSERT ERROR:", error)
    return res.status(500).json({ error })
  }

  return res.status(200).json(data)
}

  // ✅ UPDATE ORDER (DELIVER + PAYMENT + TOKEN)
  if (req.method === 'PATCH') {
    const { id, deliver_status, pay_status, token_number } = req.body

    const updateData = {
      deliver_status,
      delivered_at: new Date().toISOString()
    }

    if (pay_status !== undefined) updateData.pay_status = pay_status
    if (token_number !== undefined) updateData.token_number = token_number

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()

    if (error) {
      console.error(error)
      return res.status(500).json({ error })
    }

    return res.status(200).json(data)
  }
}