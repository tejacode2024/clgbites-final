import ExcelJS from 'exceljs'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error })

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Orders')

  sheet.columns = [
    { header: 'Name', key: 'name' },
    { header: 'Phone', key: 'phone' },
    { header: 'Items', key: 'items' },
    { header: 'Total', key: 'total' },
    { header: 'Payment', key: 'payment' },
    { header: 'Time', key: 'created_at' }
  ]

  orders.forEach(o => {
    sheet.addRow({
      name: o.name,
      phone: o.phone,
      items: JSON.stringify(o.items),
      total: o.total,
      payment: o.payment,
      created_at: o.created_at
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()

  await supabase.from('orders').delete().neq('id', 0)

  res.setHeader(
    'Content-Disposition',
    'attachment; filename=orders.xlsx'
  )

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )

  res.send(Buffer.from(buffer))
}