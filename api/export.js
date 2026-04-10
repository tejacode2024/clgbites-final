import { createClient } from '@supabase/supabase-js'
import ExcelJS from 'exceljs'

export default async function handler(req, res) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Orders')

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Items', key: 'items', width: 40 },
      { header: 'Total', key: 'total', width: 10 },
      { header: 'Payment', key: 'payment', width: 10 },
      { header: 'Time', key: 'created_at', width: 25 }
    ]

    orders.forEach(order => {
      worksheet.addRow({
        name: order.name,
        phone: order.phone,
        items: JSON.stringify(order.items),
        total: order.total,
        payment: order.payment,
        created_at: order.created_at
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

    res.setHeader(
      'Content-Disposition',
      'attachment; filename=orders.xlsx'
    )

    res.status(200).send(Buffer.from(buffer))

    // clear orders AFTER sending
    await supabase.from('orders').delete().neq('id', 0)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
}